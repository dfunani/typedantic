import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getModelFields } from '@typedantic/model';
import type { ModelFieldMeta } from '@typedantic/model';
import type { SettingsConfigDict } from './config.js';
import {
    loadEnvFile,
    flattenEnv,
    coerceEnvForSchema,
    setNestedValue,
    lookupPrefixedEnv,
    findFieldKey,
} from './environment.js';

export type SettingsSourceContext = {
    settingsCls: Function;
    config: SettingsConfigDict;
    /** Process / caller environment map. */
    env: Record<string, string | undefined>;
    /** Explicit init values (highest priority by default). */
    initData: Record<string, unknown>;
};

/** A settings source returns a partial field-keyed object. */
export type SettingsSource = (ctx: SettingsSourceContext) => Record<string, unknown>;

export type CustomiseSourcesFn = (
    init: SettingsSource,
    env: SettingsSource,
    dotenv: SettingsSource,
) => SettingsSource[];

export const SETTINGS_CUSTOMISE_SOURCES_KEY = Symbol('typedantic:settingsCustomiseSources');

function schemaTypeOf(meta: ModelFieldMeta): string | undefined {
    let s = meta.schema;
    while (
        s &&
        (s.type === 'nullable' ||
            s.type === 'optional' ||
            s.type === 'default' ||
            s.type === 'default-factory' ||
            s.type === 'function-before' ||
            s.type === 'function-after' ||
            s.type === 'function-wrap')
    ) {
        s = (s as { schema: typeof s }).schema;
    }
    return s?.type;
}

/** Map a string env map onto model field keys (shared by env + dotenv sources). */
export function envMapToSettingsData(
    settingsCls: Function,
    envMap: Record<string, string | undefined>,
    config: SettingsConfigDict,
): Record<string, unknown> {
    const envPrefix = config.envPrefix ?? '';
    const delimiter = config.envNestedDelimiter ?? '__';
    const caseSensitive = config.caseSensitive ?? false;
    const flat = flattenEnv(envMap, envPrefix, delimiter, caseSensitive);
    const fields = getModelFields(settingsCls);
    const data: Record<string, unknown> = {};

    for (const [flatKey, raw] of Object.entries(flat)) {
        const segments = flatKey.split('__').filter(Boolean);
        if (segments.length <= 1) continue;
        const rootKey = findFieldKey(fields, segments[0]!, caseSensitive);
        if (!rootKey) continue;
        setNestedValue(data, [rootKey, ...segments.slice(1)], raw);
    }

    for (const [name, meta] of Object.entries(fields)) {
        if (name in data) {
            if (typeof data[name] === 'string') {
                data[name] = coerceEnvForSchema(data[name] as string, schemaTypeOf(meta));
            }
            continue;
        }

        const alias =
            meta.fieldInfo?.validationAlias ?? meta.fieldInfo?.alias ?? meta.alias ?? name;
        const fromPrefix = lookupPrefixedEnv(envMap, envPrefix, alias, caseSensitive);
        if (fromPrefix !== undefined) {
            data[name] = coerceEnvForSchema(fromPrefix, schemaTypeOf(meta));
            continue;
        }

        const flatName = caseSensitive ? alias : alias.toLowerCase();
        const flatMatch = Object.entries(flat).find(([k]) =>
            caseSensitive ? k === flatName : k.toLowerCase() === flatName.toLowerCase(),
        );
        if (flatMatch) {
            data[name] = coerceEnvForSchema(flatMatch[1], schemaTypeOf(meta));
            continue;
        }

        if (!envPrefix) {
            const upper = alias.toUpperCase();
            const direct = envMap[alias] ?? envMap[upper] ?? envMap[alias.toLowerCase()];
            if (direct !== undefined) data[name] = coerceEnvForSchema(direct, schemaTypeOf(meta));
        }
    }

    for (const [name, meta] of Object.entries(fields)) {
        const val = data[name];
        if (
            val &&
            typeof val === 'object' &&
            !Array.isArray(val) &&
            meta.schema.type === 'model-fields'
        ) {
            const nestedFields = (
                meta.schema as { fields: Record<string, { schema: { type: string } }> }
            ).fields;
            const obj = val as Record<string, unknown>;
            const remapped: Record<string, unknown> = {};
            for (const [nk, nv] of Object.entries(obj)) {
                const realKey = findFieldKey(nestedFields, nk, caseSensitive) ?? nk;
                let leaf = nv;
                if (typeof leaf === 'string') {
                    const nestedMeta = nestedFields[realKey];
                    if (nestedMeta) leaf = coerceEnvForSchema(leaf, nestedMeta.schema.type);
                }
                remapped[realKey] = leaf;
            }
            data[name] = remapped;
        }
    }

    return data;
}

/** Init / constructor kwargs — highest priority by default. */
export const initSettingsSource: SettingsSource = (ctx) => ({ ...ctx.initData });

/** Process / passed environment variables. */
export const envSettingsSource: SettingsSource = (ctx) =>
    envMapToSettingsData(ctx.settingsCls, ctx.env, ctx.config);

/** Values from `envFile` (.env) only — lower priority than env by default. */
export const dotenvSettingsSource: SettingsSource = (ctx) => {
    const envFile = ctx.config.envFile !== false ? (ctx.config.envFile ?? '.env') : null;
    if (!envFile) return {};
    const fileEnv = loadEnvFile(resolve(process.cwd(), envFile));
    return envMapToSettingsData(ctx.settingsCls, fileEnv, ctx.config);
};

/** Load settings from a JSON file. */
export function jsonFileSettingsSource(path: string): SettingsSource {
    return () => {
        const resolved = resolve(process.cwd(), path);
        if (!existsSync(resolved)) return {};
        try {
            const parsed = JSON.parse(readFileSync(resolved, 'utf8')) as unknown;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as Record<string, unknown>;
            }
            return {};
        } catch {
            return {};
        }
    };
}

/**
 * Read secrets from a directory: each file name is a field name (or alias),
 * file contents (trimmed) are the value — Pydantic-style secrets dir.
 */
export function secretsDirectorySettingsSource(dir: string): SettingsSource {
    return (ctx) => {
        const resolved = resolve(process.cwd(), dir);
        if (!existsSync(resolved)) return {};
        const fields = getModelFields(ctx.settingsCls);
        const data: Record<string, unknown> = {};
        for (const entry of readdirSync(resolved)) {
            const full = join(resolved, entry);
            let content: string;
            try {
                content = readFileSync(full, 'utf8').trim();
            } catch {
                continue;
            }
            const fieldKey =
                findFieldKey(fields, entry, ctx.config.caseSensitive ?? false) ??
                (entry in fields ? entry : undefined);
            if (!fieldKey) continue;
            const meta = fields[fieldKey]!;
            data[fieldKey] = coerceEnvForSchema(content, schemaTypeOf(meta));
        }
        return data;
    };
}

function deepAssign(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
): void {
    for (const [key, value] of Object.entries(source)) {
        const existing = target[key];
        if (
            value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            existing !== null &&
            typeof existing === 'object' &&
            !Array.isArray(existing)
        ) {
            deepAssign(existing as Record<string, unknown>, value as Record<string, unknown>);
        } else {
            target[key] = value;
        }
    }
}

/**
 * Merge sources. `sources` is ordered highest-priority first (Pydantic style).
 * Applied low→high so nested leaves from higher-priority sources win.
 */
export function mergeSettingsSources(
    sources: SettingsSource[],
    ctx: SettingsSourceContext,
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const source of [...sources].reverse()) {
        deepAssign(out, source(ctx));
    }
    return out;
}

export function defaultSettingsSources(): SettingsSource[] {
    return [initSettingsSource, envSettingsSource, dotenvSettingsSource];
}

export function resolveSettingsSources(settingsCls: Function): SettingsSource[] {
    const customise = (
        settingsCls as { [SETTINGS_CUSTOMISE_SOURCES_KEY]?: CustomiseSourcesFn }
    )[SETTINGS_CUSTOMISE_SOURCES_KEY];
    if (!customise) return defaultSettingsSources();
    return customise(initSettingsSource, envSettingsSource, dotenvSettingsSource);
}
