import { createErrorDetails } from '../../factories/errors/primitives.js';
import { createValidationErrorDetail } from '../../factories/validation-error.js';
import { ValidationErrorDetailSchema } from '../../schema/models/configurations.js';
import type { BaseSchema } from '../../schema/types.js';
import type { ValidationContext, ValidatorFunction } from '../compile.js';
import { parseNumber } from './utils.js';

type NumberErrorContext = "type" | "greater_than_equal" | "greater_than" | "less_than_equal" | "less_than" | "multiple_of";

export function compileNumbers(schema: Extract<BaseSchema, { type: 'number' }>): ValidatorFunction {
    return (input, ctx) => {
        let value = input;
        const strict = schema.strict ?? ctx.config.strict;

        if (!strict) {
            value = parseNumber(value);
        }

        if (typeof value !== 'number' || !Number.isInteger(value)) {
            const error = createNumberError(value, ctx, "type", strict);
            ctx.errors.push(error);
            return undefined;
        }

        if (schema.ge !== undefined && value < schema.ge) {
            const error = createNumberError(value, ctx, "greater_than_equal", strict);
            ctx.errors.push(error);
        }
        if (schema.gt !== undefined && value <= schema.gt) {
            const error = createNumberError(value, ctx, "greater_than", strict);
            ctx.errors.push(error);
        }
        if (schema.le !== undefined && value > schema.le) {
            const error = createNumberError(value, ctx, "less_than_equal", strict);
            ctx.errors.push(error);
        }
        if (schema.lt !== undefined && value >= schema.lt) {
            const error = createNumberError(value, ctx, "less_than", strict);
            ctx.errors.push(error);
        }
        if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
            const error = createNumberError(value, ctx, "multiple_of", strict);
            ctx.errors.push(error);
        }

        return value;
    };
}

function createNumberError(value: unknown, ctx: ValidationContext, errorContext: NumberErrorContext, strict?: boolean): ValidationErrorDetailSchema {
    const errorDetails = createErrorDetails();
    const errorDetail = errorDetails.number[errorContext];
    const errorType = errorDetail.name;
    const errorMessage = errorDetail.message.replace('{placeholder}', value as string);
    return createValidationErrorDetail(errorType, [...ctx.path], errorMessage, value, { strict });
}