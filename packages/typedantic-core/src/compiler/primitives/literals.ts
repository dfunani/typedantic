import { createErrorDetails } from "../../factories/errors/primitives.js";
import { createValidationErrorDetail } from "../../factories/validation-error.js";
import { ValidationErrorDetailSchema } from "../../schema/models/configurations.js";
import { BaseSchema } from "../../schema/types.js";
import { ValidationContext, ValidatorFunction } from "../compile.js";

type LiteralErrorContext = "type";

export function compileLiterals(schema: Extract<BaseSchema, { type: 'literal' }>): ValidatorFunction {
  return (input, ctx) => {
    if (!schema.expected.includes(input)) {
      const error = createLiteralError(input, ctx, "type");
      ctx.errors.push(error);
      return undefined;
    }
    return input;
  };
}

function createLiteralError(value: unknown, context: ValidationContext, errorContext: LiteralErrorContext): ValidationErrorDetailSchema {
  const errorDetails = createErrorDetails();
  const errorDetail = errorDetails.literal[errorContext];
  const errorType = errorDetail.name;
  const errorMessage = errorDetail.message.replace('{placeholder}', value as string);
  return createValidationErrorDetail(errorType, [...context.path], errorMessage, value);
}