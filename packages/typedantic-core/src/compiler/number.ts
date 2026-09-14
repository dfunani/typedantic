import type { BaseSchema } from '../schema/types.js';
import type { ValidatorFunction } from './compile.js';

export function compileNumber(schema: Extract<BaseSchema, { type: 'number' }>): ValidatorFunction {
    return (input, ctx) => {
        let value = input;
        const strict = schema.strict ?? ctx.config.strict;

        if (typeof value === 'string' && !strict) {
            const parsed = Number(value);
            if (!Number.isNaN(parsed) && Number.isInteger(parsed)) value = parsed;
        }

        if (typeof value !== 'number' || !Number.isInteger(value)) {
            ctx.errors.push({
                type: 'number_type',
                loc: [...ctx.path],
                msg: 'Input should be a valid integer',
                input,
            });
            return undefined;
        }

        if (schema.ge !== undefined && value < schema.ge) {
            ctx.errors.push({
                type: 'greater_than_equal',
                loc: [...ctx.path],
                msg: `Input should be greater than or equal to ${schema.ge}`,
                input,
                ctx: { ge: schema.ge },
            });
        }
        if (schema.gt !== undefined && value <= schema.gt) {
            ctx.errors.push({
                type: 'greater_than',
                loc: [...ctx.path],
                msg: `Input should be greater than ${schema.gt}`,
                input,
                ctx: { gt: schema.gt },
            });
        }
        if (schema.le !== undefined && value > schema.le) {
            ctx.errors.push({
                type: 'less_than_equal',
                loc: [...ctx.path],
                msg: `Input should be less than or equal to ${schema.le}`,
                input,
                ctx: { le: schema.le },
            });
        }
        if (schema.lt !== undefined && value >= schema.lt) {
            ctx.errors.push({
                type: 'less_than',
                loc: [...ctx.path],
                msg: `Input should be less than ${schema.lt}`,
                input,
                ctx: { lt: schema.lt },
            });
        }
        if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
            ctx.errors.push({
                type: 'multiple_of',
                loc: [...ctx.path],
                msg: `Input should be a multiple of ${schema.multipleOf}`,
                input,
                ctx: { multiple_of: schema.multipleOf },
            });
        }

        return value;
    };
}