import { readFileSync, existsSync } from 'node:fs';

export function loadEnvFile(path: string): Record<string, string> {
    if (!existsSync(path)) return {};
    const content = readFileSync(path, 'utf8');

    const result: Record<string, string> = {};
    for (const line of content.split('\n')) {
        Object.assign(result, parseEnvLine(line));
    }
    return result;
}

function parseEnvLine(line: string): Record<string, string> {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return {};

    const eq = trimmed.indexOf('=');
    if (eq === -1) return {};

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1);
    }

    return { [key]: value };
}

export function flattenEnv(
    env: Record<string, string | undefined>,
    prefix: string,
    delimiter: string,
    caseSensitive: boolean,
): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
        if (value === undefined) continue;

        if (prefix) {
            if (caseSensitive && !key.startsWith(prefix)) continue;
            if (!caseSensitive && !key.toUpperCase().startsWith(prefix.toUpperCase())) continue;
        }

        const stripped = prefix ? key.slice(prefix.length) : key;
        const envKey = extractEnvKeyFromPath(stripped, delimiter, caseSensitive);
        result[envKey] = value;
    }
    return result;
}

function extractEnvKeyFromPath(key: string, delimiter: string, caseSensitive: boolean): string {
    return key
        .split(delimiter)
        .map((p) => (caseSensitive ? p : p.toLowerCase()))
        .join('__');
}

/** Loose shape coercion — prefer coerceEnvForSchema when field type is known. */
export function parseEnvValue(value: string): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (/^-?\d+$/.test(value)) return Number(value);
    if (/^-?\d+\.\d+$/.test(value)) return Number(value);
    if (
        (value.startsWith('[') && value.endsWith(']')) ||
        (value.startsWith('{') && value.endsWith('}'))
    ) {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
    return value;
}

/**
 * Coerce env string by target schema type (S1) — string fields keep "007" / "true".
 */
export function coerceEnvForSchema(value: string, schemaType?: string): unknown {
    if (!schemaType || schemaType === 'string') return value;
    if (schemaType === 'boolean') {
        if (value === 'true' || value === '1') return true;
        if (value === 'false' || value === '0') return false;
        return value;
    }
    if (schemaType === 'int') {
        if (value.trim() === '') return value;
        const n = Number(value);
        return Number.isInteger(n) ? n : value;
    }
    if (schemaType === 'number') {
        if (value.trim() === '') return value;
        const n = Number(value);
        return Number.isNaN(n) ? value : n;
    }
    if (schemaType === 'null' || value === 'null') return value === 'null' ? null : value;
    return parseEnvValue(value);
}

export function setNestedValue(
    target: Record<string, unknown>,
    path: string[],
    value: unknown,
): void {
    let cursor: Record<string, unknown> = target;
    for (let i = 0; i < path.length - 1; i++) {
        const segment = path[i]!;
        const next = cursor[segment];
        if (next === undefined || typeof next !== 'object' || next === null || Array.isArray(next)) {
            cursor[segment] = {};
        }
        cursor = cursor[segment] as Record<string, unknown>;
    }
    cursor[path[path.length - 1]!] = value;
}

export function lookupPrefixedEnv(
    env: Record<string, string | undefined>,
    prefix: string,
    name: string,
    caseSensitive: boolean,
): string | undefined {
    const candidates = caseSensitive
        ? [`${prefix}${name}`]
        : [
              `${prefix}${name}`,
              `${prefix}${name}`.toUpperCase(),
              `${prefix}${name}`.toLowerCase(),
              `${prefix.toUpperCase()}${name.toUpperCase()}`,
              `${prefix.toLowerCase()}${name.toLowerCase()}`,
          ];

    for (const key of candidates) {
        if (env[key] !== undefined) return env[key];
    }
    return undefined;
}

/** Case-insensitive field name lookup (S2). */
export function findFieldKey(
    fields: Record<string, unknown>,
    name: string,
    caseSensitive: boolean,
): string | undefined {
    if (name in fields) return name;
    if (caseSensitive) return undefined;
    const lower = name.toLowerCase();
    for (const key of Object.keys(fields)) {
        if (key.toLowerCase() === lower) return key;
    }
    return undefined;
}
