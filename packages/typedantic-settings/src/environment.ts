import { readFileSync, existsSync } from 'node:fs';

export function loadEnvFile(path: string): Record<string, string> {
    if (!existsSync(path)) return {};
    const content = readFileSync(path, 'utf8');

    let result: Record<string, string> = {};
    for (const line of content.split('\n')) {
        const parsed = parseEnvLine(line);
        result = { ...result, ...parsed };
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

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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

        if (!prefix) {
            const envKey = extractEnvKeyFromPath(key, delimiter, caseSensitive);
            result[envKey] = value;
            continue;
        }

        if (caseSensitive && !key.startsWith(prefix)) continue;
        if (!caseSensitive && !key.toUpperCase().startsWith(prefix.toUpperCase())) continue;

        const stripped_key = key.slice(prefix.length);
        const envKey = extractEnvKeyFromPath(stripped_key, delimiter, caseSensitive);
        result[envKey] = value;
    }
    return result;
}

function extractEnvKeyFromPath(key: string, delimiter: string, caseSensitive: boolean): string {
    const path = key.split(delimiter).map((p) => (caseSensitive ? p : p.toLowerCase()));
    return path.join('__');
}


export function parseEnvValue(value: string): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (/^-?\d+$/.test(value)) return Number(value);
    if (/^-?\d+\.\d+$/.test(value)) return Number(value);
    if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
    return value;
}
