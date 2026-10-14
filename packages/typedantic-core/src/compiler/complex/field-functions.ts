import { ValidatorFunction } from '../compile.js';
import { BaseSchema } from '../../schema/types.js';

function pushValueError(
    ctx: { path: (string | number)[]; errors: { type: string; location: (string | number)[]; message: string; input: unknown }[] },
    input: unknown,
    err: unknown,
): void {
    ctx.errors.push({
        type: 'value_error',
        location: [...ctx.path],
        message: err instanceof Error ? err.message : String(err),
        input,
    });
}

export function compileDefaultFactory(
    schema: Extract<BaseSchema, { type: 'default-factory' }>,
    validator: ValidatorFunction,
): ValidatorFunction {
    return (input, ctx) => {
        if (input === undefined) return schema.factory();
        return validator(input, ctx);
    };
}

export function compileFunctionBefore(
    schema: Extract<BaseSchema, { type: 'function-before' }>,
    validator: ValidatorFunction,
): ValidatorFunction {
    return (input, ctx) => {
        try {
            return validator(schema.fn(input, ctx), ctx);
        } catch (err) {
            pushValueError(ctx, input, err);
            return undefined;
        }
    };
}

export function compileFunctionAfter(
    schema: Extract<BaseSchema, { type: 'function-after' }>,
    validator: ValidatorFunction,
): ValidatorFunction {
    return (input, ctx) => {
        const errorsBefore = ctx.errors.length;
        const validated = validator(input, ctx);
        // Only skip when this subtree produced errors (B7).
        if (ctx.errors.length > errorsBefore) return validated;
        try {
            return schema.fn(validated, ctx);
        } catch (err) {
            pushValueError(ctx, validated, err);
            return undefined;
        }
    };
}

export function compileFunctionWrap(
    schema: Extract<BaseSchema, { type: 'function-wrap' }>,
    validator: ValidatorFunction,
): ValidatorFunction {
    return (input, ctx) => {
        try {
            return schema.fn(input, (v) => validator(v, ctx));
        } catch (err) {
            pushValueError(ctx, input, err);
            return undefined;
        }
    };
}

export function compileFunctionPlain(
    schema: Extract<BaseSchema, { type: 'function-plain' }>,
): ValidatorFunction {
    return (input, ctx) => {
        try {
            return schema.fn(input, ctx);
        } catch (err) {
            pushValueError(ctx, input, err);
            return undefined;
        }
    };
}
