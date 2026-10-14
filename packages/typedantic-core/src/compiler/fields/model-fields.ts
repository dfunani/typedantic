import { createErrorDetails } from '../../factories/errors/model-fields.js';
import { createValidationErrorDetail } from '../../factories/validation-error.js';
import { ValidationErrorDetailSchema } from '../../schema/models/configurations.js';
import type { BaseSchema } from '../../schema/types.js';
import type { ValidatorFunction, ValidationContext } from '../compile.js';
import { cloneDefault } from '../complex/field-properties.js';

type FieldErrorContext = "type" | "missing" | "extra_forbidden";

export function compileModelFields(
    schema: Extract<BaseSchema, { type: 'model-fields' }>,
    fieldValidators: Record<string, ValidatorFunction>,
): ValidatorFunction {
    return (input, ctx) => {
        const strict = schema.strict ?? ctx.config.strict;

        if (typeof input !== 'object' || input === null || Array.isArray(input)) {
            ctx.errors.push(createFieldError(input, ctx, "type", strict));
            return undefined;
        }

        const data = input as Record<string, unknown>;
        const result: Record<string, unknown> = {};
        const extra = schema.extra ?? 'ignore';

        const populateByName = schema.populateByName !== false;

        for (const [name, field] of Object.entries(schema.fields)) {
            const alias = field.validationAlias ?? field.alias;
            const keys = alias
                ? populateByName
                    ? [alias, name]
                    : [alias]
                : [name];
            let value: unknown = undefined;
            let found = false;

            for (const key of keys) {
                if (Object.prototype.hasOwnProperty.call(data, key) || key in data) {
                    value = data[key];
                    found = true;
                    break;
                }
            }

            if (!found) {
                if (field.default !== undefined) {
                    value = cloneDefault(field.default);
                } else if (field.defaultFactory) {
                    value = field.defaultFactory();
                } else if (field.required) {
                    const missingCtx: ValidationContext = {
                        path: [...ctx.path, name],
                        config: { ...ctx.config, strict },
                        errors: ctx.errors,
                    };
                    ctx.errors.push(createFieldError(input, missingCtx, "missing", strict));
                    continue;
                } else {
                    continue;
                }
            }

            const fieldCtx: ValidationContext = {
                path: [...ctx.path, name],
                config: { ...ctx.config, strict },
                errors: ctx.errors,
            };
            result[name] = fieldValidators[name](value, fieldCtx);
        }

        if (extra === 'forbid') {
            const allowed = new Set(Object.keys(schema.fields));
            for (const key of Object.keys(data)) {
                const isAlias = Object.values(schema.fields).some((f) => f.alias === key);
                if (!allowed.has(key) && !isAlias) {
                    const extraCtx: ValidationContext = {
                        path: [...ctx.path, key],
                        config: ctx.config,
                        errors: ctx.errors,
                    };
                    ctx.errors.push(createFieldError(data[key], extraCtx, "extra_forbidden", strict));
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

function createFieldError(value: unknown, context: ValidationContext, errorContext: FieldErrorContext, strict?: boolean): ValidationErrorDetailSchema {
    const errorDetails = createErrorDetails();
    const errorDetail = errorDetails.model_fields[errorContext];
    const errorType = errorDetail.name;
    let placeholder = '';
    if (typeof value === 'string') placeholder = value;
    else if (value === null || value === undefined) placeholder = String(value);
    else if (typeof value === 'symbol') placeholder = value.toString();
    else if (typeof value === 'object') placeholder = Object.prototype.toString.call(value);
    else placeholder = String(value);
    const errorMessage = errorDetail.message.replace('{placeholder}', placeholder);
    return createValidationErrorDetail(errorType, [...context.path], errorMessage, value, { strict });
}