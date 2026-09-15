const TRUTHY_VALUES = new Set<unknown>(['true', '1', true, 1]);
const FALSEY_VALUES = new Set<unknown>(['false', '0', false, 0]);
const STRINGIFIABLE_VALUES = new Set<unknown>(['number', 'boolean', 'string']);

export function parseBoolean(value: unknown): unknown {
    if (TRUTHY_VALUES.has(value)) return true;
    if (FALSEY_VALUES.has(value)) return false;
    return value;
}

export function parseString(value: unknown): unknown {
    if (STRINGIFIABLE_VALUES.has(typeof value)) return String(value);
    return value;
}

export function parseNumber(value: unknown): unknown {
    if (typeof value !== 'string') return value;

    const parsed = Number(value);
    if (!Number.isNaN(parsed) && Number.isInteger(parsed)) {
        return parsed;
    }

    return value;
}

export function parseFloatNumber(value: unknown): unknown {
    if (typeof value !== 'string') return value;

    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
        return parsed;
    }

    return value;
}