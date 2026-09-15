import { createValidationErrorDetail } from '../../factories/validation-error.js';
import { ValidationErrorDetailSchema } from '../../schema/models/configurations.js';
import type { BaseSchema } from '../../schema/types.js';
import type { ValidationContext, ValidatorFunction } from '../compile.js';
import { createErrorDetails } from '../../factories/errors/primitives.js';
import { parseBoolean } from './utils.js';

type BooleanErrorContext = "type";


export function compileBooleans(schema: Extract<BaseSchema, { type: 'boolean' }>): ValidatorFunction {
    return (input, context) => {
        let value = input;
        const strict = schema.strict ?? context.config.strict;

        if (!strict) {
            value = parseBoolean(value);
        }

        if (typeof value !== 'boolean') {
            const error = createBooleanError(value, context, "type", strict);
            context.errors.push(error);
            return undefined;
        }

        return value;
    };
}

function createBooleanError(value: unknown, context: ValidationContext, errorContext: BooleanErrorContext, strict?: boolean): ValidationErrorDetailSchema {
    const errorDetails = createErrorDetails();
    const errorDetail = errorDetails.boolean[errorContext];
    const errorType = errorDetail.name;
    const errorMessage = errorDetail.message.replace('{placeholder}', value as string);
    return createValidationErrorDetail(errorType, [...context.path], errorMessage, value, { strict });
}