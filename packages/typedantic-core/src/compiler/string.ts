import type { BaseSchema } from '../schema/types.js';
import type { ValidatorFunction } from './compile.js';

export function compileString(schema: Extract<BaseSchema, { type: 'string' }>): ValidatorFunction {
    return (input, ctx) => {
        let value = input;
        const strict = schema.strict ?? ctx.config.strict;

        if (typeof value === 'number' && !strict) value = String(value);
        if (typeof value === 'boolean' && !strict) value = String(value);

        if (typeof value !== 'string') {
            ctx.errors.push({
                type: 'string_type',
                loc: [...ctx.path],
                msg: 'Input should be a valid string',
                input,
            });
            return undefined;
        }

        if (schema.minLength !== undefined && value.length < schema.minLength) {
            ctx.errors.push({
                type: 'string_too_short',
                loc: [...ctx.path],
                msg: `String should have at least ${schema.minLength} characters`,
                input,
                ctx: { min_length: schema.minLength },
            });
        }
        if (schema.maxLength !== undefined && value.length > schema.maxLength) {
            ctx.errors.push({
                type: 'string_too_long',
                loc: [...ctx.path],
                msg: `String should have at most ${schema.maxLength} characters`,
                input,
                ctx: { max_length: schema.maxLength },
            });
        }
        if (schema.pattern !== undefined) {
            const re = typeof schema.pattern === 'string' ? new RegExp(schema.pattern) : schema.pattern;
            if (!re.test(value)) {
                ctx.errors.push({
                    type: 'string_pattern_mismatch',
                    loc: [...ctx.path],
                    msg: `String should match pattern ${re}`,
                    input,
                });
            }
        }

        return value;
    };
}