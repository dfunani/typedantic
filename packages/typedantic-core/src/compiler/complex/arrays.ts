import { ValidationContext, ValidatorFunction } from "../compile.js";
import { BaseSchema } from "../../schema/types.js";

export function compileArrays(schema: Extract<BaseSchema, { type: 'array' }>, validator: ValidatorFunction): ValidatorFunction {
  return (input, ctx) => {
    if (!Array.isArray(input)) {
      ctx.errors.push({
        type: 'array_type',
        location: [...ctx.path],
        message: 'Input should be a valid array',
        input,
      });
      return undefined;
    }

    if (schema.minLength !== undefined && input.length < schema.minLength) {
      ctx.errors.push({
        type: 'too_short',
        location: [...ctx.path],
        message: `Array should have at least ${schema.minLength} items`,
        input,
      });
    }
    if (schema.maxLength !== undefined && input.length > schema.maxLength) {
      ctx.errors.push({
        type: 'too_long',
        location: [...ctx.path],
        message: `Array should have at most ${schema.maxLength} items`,
        input,
      });
    }

    const result: unknown[] = [];
    for (let i = 0; i < input.length; i++) {
      const itemCtx: ValidationContext = {
        path: [...ctx.path, i],
        config: ctx.config,
        errors: ctx.errors,
      };
      result.push(validator(input[i], itemCtx));
    }
    return result;
  };
}
