import { createErrorDetails } from '../../factories/errors/primitives.js';
import { interpolatePlaceholder } from '../../factories/errors/interpolate.js';
import { createValidationErrorDetail } from '../../factories/validation-error.js';
import { ValidationErrorDetailSchema } from '../../schema/models/configurations.js';
import type { BaseSchema } from '../../schema/types.js';
import type { ValidationContext, ValidatorFunction } from '../compile.js';
import { parseString } from './utils.js';

type StringErrorContext = "type" | "min_length" | "max_length" | "pattern";

export function compileStrings(schema: Extract<BaseSchema, { type: 'string' }>): ValidatorFunction {
    return (input, context) => {
        let value = input;
        const strict = schema.strict ?? context.config.strict;

        if (!strict) {
            value = parseString(value);
        }

        if (typeof value !== 'string') {
            context.errors.push(createStringError(value, context, "type", value, strict));
            return undefined;
        }

        if (schema.minLength !== undefined && value.length < schema.minLength) {
            context.errors.push(createStringError(value, context, "min_length", schema.minLength, strict, { minLength: schema.minLength }));
            return undefined;
        }
        if (schema.maxLength !== undefined && value.length > schema.maxLength) {
            context.errors.push(createStringError(value, context, "max_length", schema.maxLength, strict, { maxLength: schema.maxLength }));
            return undefined;
        }
        if (schema.pattern !== undefined) {
            const re = typeof schema.pattern === 'string' ? new RegExp(schema.pattern) : schema.pattern;
            if (!re.test(value)) {
                context.errors.push(createStringError(value, context, "pattern", re.source, strict, { pattern: re.source }));
                return undefined;
            }
        }

        return value;
    };
}

function createStringError(
    value: unknown,
    context: ValidationContext,
    errorContext: StringErrorContext,
    placeholder: unknown,
    strict?: boolean,
    extra?: Record<string, unknown>,
): ValidationErrorDetailSchema {
    const errorDetail = createErrorDetails().string[errorContext];
    const errorMessage = interpolatePlaceholder(errorDetail.message, placeholder);
    return createValidationErrorDetail(errorDetail.name, [...context.path], errorMessage, value, { strict, ...extra });
}
