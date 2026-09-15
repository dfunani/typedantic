import { ValidatorFunction } from "../compile.js";
import { BaseSchema } from "../../schema/types.js";

export function compileEnums(schema: Extract<BaseSchema, { type: 'enum' }>): ValidatorFunction {
  return (input, ctx) => {
    if (typeof input !== 'string' || !schema.members.includes(input)) {
      ctx.errors.push({
        type: 'enum',
        location: [...ctx.path],
        message: `Input should be one of ${schema.members.join(', ')}`,
        input,
        context: { expected: schema.members },
      });
      return undefined;
    }
    return input;
  };
}
