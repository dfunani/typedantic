import { createErrorDetails } from "../../factories/errors/primitives.js";
import { interpolatePlaceholder } from "../../factories/errors/interpolate.js";
import { createValidationErrorDetail } from "../../factories/validation-error.js";
import { ValidationErrorDetailSchema } from "../../schema/models/configurations.js";
import { BaseSchema } from "../../schema/types.js";
import { ValidationContext, ValidatorFunction } from "../compile.js";

type LiteralErrorContext = "type";

export function compileLiterals(schema: Extract<BaseSchema, { type: 'literal' }>): ValidatorFunction {
    return (input, ctx) => {
        if (!schema.expected.includes(input)) {
            const error = createLiteralError(input, ctx, "type", schema.expected);
            ctx.errors.push(error);
            return undefined;
        }
        return input;
    };
}

function createLiteralError(
    value: unknown,
    context: ValidationContext,
    errorContext: LiteralErrorContext,
    expected: unknown[],
): ValidationErrorDetailSchema {
    const errorDetail = createErrorDetails().literal[errorContext];
    const shown = expected.length === 1 ? JSON.stringify(expected[0]) : expected.map((item) => JSON.stringify(item)).join(', ');
    const errorMessage = interpolatePlaceholder(errorDetail.message, shown);
    return createValidationErrorDetail(errorDetail.name, [...context.path], errorMessage, value, { expected });
}
