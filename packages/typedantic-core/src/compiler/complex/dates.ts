import { ValidatorFunction } from "../compile.js";



export function compileDates(schema: Extract<BaseSchema, { type: 'date' }>): ValidatorFunction {
  return (input, ctx) => {
    if (input instanceof Date) return input;
    if (typeof input === 'string' || typeof input === 'number') {
      const d = new Date(input);
      if (!Number.isNaN(d.getTime())) return d;
    }
    ctx.errors.push({
      type: 'date_type',
      location: [...ctx.path],
      message: 'Input should be a valid date',
      input,
    });
    return undefined;
  };
}