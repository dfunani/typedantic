import type { BaseSchema } from '../schema/types.js';
import type { ValidatorFunction, ValidationContext } from './compile.js';
import { compileValidator } from './compile.js';

export function compileModelFields(
    schema: Extract<BaseSchema, { type: 'model-fields' }>,
): ValidatorFunction {
    const fieldValidators: Record<string, ValidatorFunction> = {};
    for (const [name, field] of Object.entries(schema.fields)) {
        fieldValidators[name] = compileValidator(field.schema);
    }

    return (input, ctx) => {
        if (typeof input !== 'object' || input === null || Array.isArray(input)) {
            ctx.errors.push({
                type: 'model_type',
                loc: [...ctx.path],
                msg: 'Input should be a valid object',
                input,
            });
            return undefined;
        }

        const data = input as Record<string, unknown>;
        const result: Record<string, unknown> = {};
        const extra = schema.extra ?? 'ignore';

        for (const [name, field] of Object.entries(schema.fields)) {
            const keys = field.alias ? [name, field.alias] : [name];
            let value: unknown = undefined;
            let found = false;

            for (const key of keys) {
                if (key in data) {
                    value = data[key];
                    found = true;
                    break;
                }
            }

            if (!found) {
                if (field.default !== undefined) {
                    value = field.default;
                } else if (field.defaultFactory) {
                    value = field.defaultFactory();
                } else if (field.required) {
                    ctx.errors.push({
                        type: 'missing',
                        loc: [...ctx.path, name],
                        msg: 'Field required',
                        input,
                    });
                    continue;
                } else {
                    continue;
                }
            }

            const fieldCtx: ValidationContext = {
                path: [...ctx.path, name],
                config: ctx.config,
                errors: ctx.errors,
            };
            result[name] = fieldValidators[name](value, fieldCtx);
        }

        if (extra === 'forbid') {
            const allowed = new Set(Object.keys(schema.fields));
            for (const key of Object.keys(data)) {
                const isAlias = Object.values(schema.fields).some((f) => f.alias === key);
                if (!allowed.has(key) && !isAlias) {
                    ctx.errors.push({
                        type: 'extra_forbidden',
                        loc: [...ctx.path, key],
                        msg: 'Extra inputs are not permitted',
                        input: data[key],
                    });
                }
            }
        } else if (extra === 'allow') {
            for (const [key, val] of Object.entries(data)) {
                if (!(key in result) && !Object.values(schema.fields).some((f) => f.alias === key)) {
                    result[key] = val;
                }
            }
        }

        return result;
    };
}