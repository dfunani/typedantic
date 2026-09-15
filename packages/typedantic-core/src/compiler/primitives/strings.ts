import { createErrorDetails } from '../../factories/errors/primitives.js';
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
            const error = createStringError(value, context, "type", strict);
            context.errors.push(error);
            return undefined;
        }

        if (schema.minLength !== undefined && value.length < schema.minLength) {
            const error = createStringError(value, context, "min_length", strict);
            context.errors.push(error);
            return undefined;
        }
        if (schema.maxLength !== undefined && value.length > schema.maxLength) {
            const error = createStringError(value, context, "max_length", strict);
            context.errors.push(error);
            return undefined;
        }
        if (schema.pattern !== undefined) {
            const re = typeof schema.pattern === 'string' ? new RegExp(schema.pattern) : schema.pattern;
            if (!re.test(value)) {
                const error = createStringError(value, context, "pattern", strict);
                context.errors.push(error);
                return undefined;
            }
        }

        return value;
    };
}

function createStringError(value: unknown, context: ValidationContext, errorContext: StringErrorContext, strict?: boolean): ValidationErrorDetailSchema {
    const errorDetails = createErrorDetails();
    const errorDetail = errorDetails.string[errorContext];
    const errorType = errorDetail.name;
    const errorMessage = errorDetail.message.replace('{placeholder}', value as string);
    return createValidationErrorDetail(errorType, [...context.path], errorMessage, value, { strict });
}