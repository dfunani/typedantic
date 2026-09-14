import type { BaseSchema } from '../schema/types.js';
import type { ValidatorFunction } from './compile.js';

export function compileBoolean(schema: Extract<BaseSchema, { type: 'boolean' }>): ValidatorFunction {
    return (input, ctx) => {
        let value = input;
        const strict = schema.strict ?? ctx.config.strict;

        if (!strict) {
            if (value === 'true' || value === '1' || value === 1) value = true;
            else if (value === 'false' || value === '0' || value === 0) value = false;
        }

        if (typeof value !== 'boolean') {
            ctx.errors.push({
                type: 'boolean_type',
                loc: [...ctx.path],
                msg: 'Input should be a valid boolean',
                input,
            });
            return undefined;
        }

        return value;
    };
}