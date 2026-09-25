import { resolve } from 'node:path';
import { BaseModel, getModelFields, modelConfig } from '@typedantic/model';
import {
    loadEnvFile,
    flattenEnv,
    parseEnvValue,
    setNestedValue,
    lookupPrefixedEnv,
} from './environment.js';
import type { SettingsConfigDict } from './config.js';

export type { SettingsConfigDict } from './config.js';

type FieldMeta = {
    name: string;
    alias?: string;
    fieldInfo?: { alias?: string };
};

export abstract class BaseSettings extends BaseModel {
    static modelConfig: SettingsConfigDict = {
        extra: 'ignore',
        populateByName: true,
    };

    static settingsValidate<T extends typeof BaseSettings>(
        this: T,
        env: Record<string, string | undefined> = process.env as Record<
            string,
            string | undefined
        >,
    ): InstanceType<T> {
        const config = (this as { modelConfig?: SettingsConfigDict }).modelConfig ?? {};
        const envPrefix = config.envPrefix ?? '';
        const delimiter = config.envNestedDelimiter ?? '__';
        const caseSensitive = config.caseSensitive ?? false;
        const envFile = config.envFile !== false ? (config.envFile ?? '.env') : null;

        // Precedence: explicit env arg > process.env overlay already in `env` >
        // .env file (file loses to explicit/process keys).
        let merged: Record<string, string | undefined> = { ...env };
        if (envFile) {
            const fileEnv = loadEnvFile(resolve(process.cwd(), envFile));
            merged = { ...fileEnv, ...merged };
        }

        const flat = flattenEnv(merged, envPrefix, delimiter, caseSensitive);
        getModelFields(this);
        const fields =
            (this as { modelFields?: Record<string, FieldMeta> }).modelFields ?? {};

        const data: Record<string, unknown> = {};

        // Nested delimiter paths: DB__HOST → { db: { host } } (after prefix strip).
        for (const [flatKey, raw] of Object.entries(flat)) {
            const segments = flatKey.split('__').filter(Boolean);
            if (segments.length <= 1) continue;
            const root = segments[0]!;
            if (!(root in fields)) continue;
            setNestedValue(data, segments, parseEnvValue(raw));
        }

        for (const [name, meta] of Object.entries(fields)) {
            if (name in data) continue;

            const alias = meta.fieldInfo?.alias ?? meta.alias ?? name;
            const fromPrefix = lookupPrefixedEnv(merged, envPrefix, alias, caseSensitive);
            if (fromPrefix !== undefined) {
                data[name] = parseEnvValue(fromPrefix);
                continue;
            }

            // Flat key after prefix strip (e.g. APP_HOST → host with prefix APP_).
            const flatName = caseSensitive ? alias : alias.toLowerCase();
            if (flat[flatName] !== undefined) {
                data[name] = parseEnvValue(flat[flatName]!);
                continue;
            }

            // Unprefixed uppercase / lowercase direct keys when no prefix.
            if (!envPrefix) {
                const upper = alias.toUpperCase();
                const direct = merged[alias] ?? merged[upper] ?? merged[alias.toLowerCase()];
                if (direct !== undefined) data[name] = parseEnvValue(direct);
            }
        }

        return (this as unknown as typeof BaseModel).modelValidate(data) as InstanceType<T>;
    }
}

export function settingsConfig(config: SettingsConfigDict): ClassDecorator {
    return modelConfig(config);
}
