import type { BaseSchema, ValidationContext, ValidatorFunction } from '@typedantic/core';

/** Marker read by inferSchemaFromType / Field builders. */
export const ANNOTATED_SCHEMA = Symbol.for('typedantic:annotatedSchema');

export type AnnotatedType = {
    [ANNOTATED_SCHEMA]: BaseSchema;
    new (...args: never[]): unknown;
};

function afterString(
    check: (value: string, ctx: ValidationContext) => string | undefined,
    errorType: string,
    message: string,
): BaseSchema {
    const fn: ValidatorFunction = (input, ctx) => {
        if (typeof input !== 'string') {
            ctx.errors.push({
                type: 'string_type',
                location: [...ctx.path],
                message: 'Input should be a valid string',
                input,
            });
            return undefined;
        }
        const err = check(input, ctx);
        if (err !== undefined) {
            ctx.errors.push({
                type: errorType,
                location: [...ctx.path],
                message: err || message,
                input,
            });
            return undefined;
        }
        return input;
    };
    return { type: 'function-after', schema: { type: 'string' }, fn };
}

function afterInt(
    check: (value: number) => string | undefined,
    errorType: string,
    message: string,
): BaseSchema {
    const fn: ValidatorFunction = (input, ctx) => {
        if (typeof input !== 'number' || !Number.isInteger(input)) {
            ctx.errors.push({
                type: 'int_type',
                location: [...ctx.path],
                message: 'Input should be a valid integer',
                input,
            });
            return undefined;
        }
        const err = check(input);
        if (err !== undefined) {
            ctx.errors.push({
                type: errorType,
                location: [...ctx.path],
                message: err || message,
                input,
            });
            return undefined;
        }
        return input;
    };
    return { type: 'function-after', schema: { type: 'int' }, fn };
}

const EMAIL_RE =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function defineAnnotated(name: string, schema: BaseSchema): AnnotatedType {
    const Ctor = {
        [name]: class {
            static [ANNOTATED_SCHEMA] = schema;
        },
    }[name] as AnnotatedType;
    return Ctor;
}

/** RFC-ish email string. */
export const EmailStr = defineAnnotated(
    'EmailStr',
    afterString(
        (v) => (EMAIL_RE.test(v) ? undefined : 'value is not a valid email address'),
        'value_error',
        'value is not a valid email address',
    ),
);

/** http: or https: URL. */
export const HttpUrl = defineAnnotated(
    'HttpUrl',
    afterString((v) => {
        try {
            const u = new URL(v);
            if (u.protocol !== 'http:' && u.protocol !== 'https:') {
                return 'URL scheme should be http or https';
            }
            return undefined;
        } catch {
            return 'invalid or missing URL';
        }
    }, 'url_scheme', 'invalid or missing URL'),
);

/** UUID string (versions 1–8). */
export const UUID = defineAnnotated(
    'UUID',
    afterString(
        (v) => (UUID_RE.test(v) ? undefined : 'Input should be a valid UUID'),
        'uuid_type',
        'Input should be a valid UUID',
    ),
);

export const PositiveInt = defineAnnotated(
    'PositiveInt',
    afterInt((n) => (n > 0 ? undefined : 'Input should be greater than 0'), 'greater_than', ''),
);

export const NegativeInt = defineAnnotated(
    'NegativeInt',
    afterInt((n) => (n < 0 ? undefined : 'Input should be less than 0'), 'less_than', ''),
);

export const NonNegativeInt = defineAnnotated(
    'NonNegativeInt',
    afterInt(
        (n) => (n >= 0 ? undefined : 'Input should be greater than or equal to 0'),
        'greater_than_equal',
        '',
    ),
);

export const NonPositiveInt = defineAnnotated(
    'NonPositiveInt',
    afterInt(
        (n) => (n <= 0 ? undefined : 'Input should be less than or equal to 0'),
        'less_than_equal',
        '',
    ),
);

/**
 * Secret string — validates as string; dumps as `'**********'` in json mode
 * when used with SecretStr.dump helpers (value stored as plain string on model).
 */
export class SecretStr {
    static [ANNOTATED_SCHEMA]: BaseSchema = afterString(() => undefined, 'string_type', '');

    constructor(private readonly value: string) {}

    getSecretValue(): string {
        return this.value;
    }

    toString(): string {
        return '**********';
    }

    toJSON(): string {
        return '**********';
    }

    static wrap(value: unknown): SecretStr | unknown {
        if (typeof value === 'string') return new SecretStr(value);
        if (value instanceof SecretStr) return value;
        return value;
    }
}

// Rebuild SecretStr annotated schema to wrap into SecretStr instances.
SecretStr[ANNOTATED_SCHEMA] = {
    type: 'function-after',
    schema: { type: 'string' },
    fn: (input, ctx) => {
        if (input instanceof SecretStr) return input;
        if (typeof input !== 'string') {
            ctx.errors.push({
                type: 'string_type',
                location: [...ctx.path],
                message: 'Input should be a valid string',
                input,
            });
            return undefined;
        }
        return new SecretStr(input);
    },
};

export function isAnnotatedType(type: unknown): type is AnnotatedType {
    return (
        typeof type === 'function' &&
        ANNOTATED_SCHEMA in type &&
        (type as AnnotatedType)[ANNOTATED_SCHEMA] !== undefined
    );
}

export function getAnnotatedSchema(type: unknown): BaseSchema | undefined {
    if (isAnnotatedType(type)) return type[ANNOTATED_SCHEMA];
    return undefined;
}
