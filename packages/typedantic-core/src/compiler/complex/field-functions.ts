import { ValidatorFunction } from "../compile.js";
import { BaseSchema } from "../../schema/types.js";




export function compileDefaultFactory(schema: Extract<BaseSchema, { type: 'default-factory' }>, validator: ValidatorFunction): ValidatorFunction {
  return (input, ctx) => {
    if (input === undefined) return schema.factory();
    return validator(input, ctx);
  };
}


export function compileFunctionBefore(schema: Extract<BaseSchema, { type: 'function-before' }>, validator: ValidatorFunction): ValidatorFunction {
  return (input, ctx) => validator(schema.fn(input), ctx);
}

export function compileFunctionAfter(schema: Extract<BaseSchema, { type: 'function-after' }>, validator: ValidatorFunction): ValidatorFunction {
  return (input, ctx) => {
    const validated = validator(input, ctx);
    if (ctx.errors.length > 0) return validated;
    return schema.fn(validated);
  };
}

export function compileFunctionWrap(schema: Extract<BaseSchema, { type: 'function-wrap' }>, validator: ValidatorFunction): ValidatorFunction {
  return (input, ctx) =>
    schema.fn(input, (v: unknown) => validator(v, ctx));
}

export function compileFunctionPlain(schema: Extract<BaseSchema, { type: 'function-plain' }>, validator: ValidatorFunction): ValidatorFunction {
  return (input, _ctx) => validator(schema.fn(input), _ctx);
}