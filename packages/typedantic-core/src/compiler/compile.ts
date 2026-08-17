import type {
  CoreSchema,
  ValidationConfig,
  ValidationErrorDetail,
} from '../schema/types.js';

export interface ValidationContext {
  path: (string | number)[];
  config: ValidationConfig;
  errors: ValidationErrorDetail[];
}

export type ValidatorFn = (input: unknown, ctx: ValidationContext) => unknown;

export function compileValidator(schema: CoreSchema): ValidatorFn {
  switch (schema.type) {
    case 'any':
      return (input) => input;
    case 'never':
      return (input, ctx) => {
        ctx.errors.push({
          type: 'never',
          loc: [...ctx.path],
          msg: 'Input is never valid',
          input,
        });
        return undefined;
      };
    case 'int':
      return compileInt(schema);
    case 'float':
      return compileFloat(schema);
    case 'str':
      return compileStr(schema);
    case 'bool':
      return compileBool(schema);
    case 'literal':
      return compileLiteral(schema);
    case 'enum':
      return compileEnum(schema);
    case 'list':
      return compileList(schema);
    case 'dict':
      return compileDict(schema);
    case 'union':
      return compileUnion(schema);
    case 'nullable':
      return compileNullable(schema);
    case 'optional':
      return compileOptional(schema);
    case 'default':
      return compileDefault(schema);
    case 'default-factory':
      return compileDefaultFactory(schema);
    case 'model-fields':
      return compileModelFields(schema);
    case 'function-before':
      return compileFunctionBefore(schema);
    case 'function-after':
      return compileFunctionAfter(schema);
    case 'function-wrap':
      return compileFunctionWrap(schema);
    case 'function-plain':
      return compileFunctionPlain(schema);
    case 'date':
      return compileDate();
    default:
      return (input, ctx) => {
        ctx.errors.push({
          type: 'unknown_schema',
          loc: [...ctx.path],
          msg: `Unknown schema type`,
          input,
        });
        return undefined;
      };
  }
}

function compileInt(schema: Extract<CoreSchema, { type: 'int' }>): ValidatorFn {
  return (input, ctx) => {
    let value = input;
    const strict = schema.strict ?? ctx.config.strict;

    if (typeof value === 'string' && !strict) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed) && Number.isInteger(parsed)) value = parsed;
    }

    if (typeof value !== 'number' || !Number.isInteger(value)) {
      ctx.errors.push({
        type: 'int_type',
        loc: [...ctx.path],
        msg: 'Input should be a valid integer',
        input,
      });
      return undefined;
    }

    if (schema.ge !== undefined && value < schema.ge) {
      ctx.errors.push({
        type: 'greater_than_equal',
        loc: [...ctx.path],
        msg: `Input should be greater than or equal to ${schema.ge}`,
        input,
        ctx: { ge: schema.ge },
      });
    }
    if (schema.gt !== undefined && value <= schema.gt) {
      ctx.errors.push({
        type: 'greater_than',
        loc: [...ctx.path],
        msg: `Input should be greater than ${schema.gt}`,
        input,
        ctx: { gt: schema.gt },
      });
    }
    if (schema.le !== undefined && value > schema.le) {
      ctx.errors.push({
        type: 'less_than_equal',
        loc: [...ctx.path],
        msg: `Input should be less than or equal to ${schema.le}`,
        input,
        ctx: { le: schema.le },
      });
    }
    if (schema.lt !== undefined && value >= schema.lt) {
      ctx.errors.push({
        type: 'less_than',
        loc: [...ctx.path],
        msg: `Input should be less than ${schema.lt}`,
        input,
        ctx: { lt: schema.lt },
      });
    }
    if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
      ctx.errors.push({
        type: 'multiple_of',
        loc: [...ctx.path],
        msg: `Input should be a multiple of ${schema.multipleOf}`,
        input,
        ctx: { multiple_of: schema.multipleOf },
      });
    }

    return value;
  };
}

function compileFloat(schema: Extract<CoreSchema, { type: 'float' }>): ValidatorFn {
  return (input, ctx) => {
    let value = input;
    const strict = schema.strict ?? ctx.config.strict;

    if (typeof value === 'string' && !strict) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) value = parsed;
    }

    if (typeof value !== 'number' || Number.isNaN(value)) {
      ctx.errors.push({
        type: 'float_type',
        loc: [...ctx.path],
        msg: 'Input should be a valid number',
        input,
      });
      return undefined;
    }

    if (schema.ge !== undefined && value < schema.ge) {
      ctx.errors.push({
        type: 'greater_than_equal',
        loc: [...ctx.path],
        msg: `Input should be greater than or equal to ${schema.ge}`,
        input,
      });
    }
    if (schema.gt !== undefined && value <= schema.gt) {
      ctx.errors.push({
        type: 'greater_than',
        loc: [...ctx.path],
        msg: `Input should be greater than ${schema.gt}`,
        input,
      });
    }
    if (schema.le !== undefined && value > schema.le) {
      ctx.errors.push({
        type: 'less_than_equal',
        loc: [...ctx.path],
        msg: `Input should be less than or equal to ${schema.le}`,
        input,
      });
    }
    if (schema.lt !== undefined && value >= schema.lt) {
      ctx.errors.push({
        type: 'less_than',
        loc: [...ctx.path],
        msg: `Input should be less than ${schema.lt}`,
        input,
      });
    }

    return value;
  };
}

function compileStr(schema: Extract<CoreSchema, { type: 'str' }>): ValidatorFn {
  return (input, ctx) => {
    let value = input;
    const strict = schema.strict ?? ctx.config.strict;

    if (typeof value === 'number' && !strict) value = String(value);
    if (typeof value === 'boolean' && !strict) value = String(value);

    if (typeof value !== 'string') {
      ctx.errors.push({
        type: 'string_type',
        loc: [...ctx.path],
        msg: 'Input should be a valid string',
        input,
      });
      return undefined;
    }

    if (schema.minLength !== undefined && value.length < schema.minLength) {
      ctx.errors.push({
        type: 'string_too_short',
        loc: [...ctx.path],
        msg: `String should have at least ${schema.minLength} characters`,
        input,
        ctx: { min_length: schema.minLength },
      });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      ctx.errors.push({
        type: 'string_too_long',
        loc: [...ctx.path],
        msg: `String should have at most ${schema.maxLength} characters`,
        input,
        ctx: { max_length: schema.maxLength },
      });
    }
    if (schema.pattern !== undefined) {
      const re = typeof schema.pattern === 'string' ? new RegExp(schema.pattern) : schema.pattern;
      if (!re.test(value)) {
        ctx.errors.push({
          type: 'string_pattern_mismatch',
          loc: [...ctx.path],
          msg: `String should match pattern ${re}`,
          input,
        });
      }
    }

    return value;
  };
}

function compileBool(schema: Extract<CoreSchema, { type: 'bool' }>): ValidatorFn {
  return (input, ctx) => {
    let value = input;
    const strict = schema.strict ?? ctx.config.strict;

    if (!strict) {
      if (value === 'true' || value === '1' || value === 1) value = true;
      else if (value === 'false' || value === '0' || value === 0) value = false;
    }

    if (typeof value !== 'boolean') {
      ctx.errors.push({
        type: 'bool_type',
        loc: [...ctx.path],
        msg: 'Input should be a valid boolean',
        input,
      });
      return undefined;
    }

    return value;
  };
}

function compileLiteral(schema: Extract<CoreSchema, { type: 'literal' }>): ValidatorFn {
  return (input, ctx) => {
    if (!schema.expected.includes(input)) {
      ctx.errors.push({
        type: 'literal_error',
        loc: [...ctx.path],
        msg: `Input should be ${JSON.stringify(schema.expected[0])}`,
        input,
        ctx: { expected: schema.expected },
      });
      return undefined;
    }
    return input;
  };
}

function compileEnum(schema: Extract<CoreSchema, { type: 'enum' }>): ValidatorFn {
  return (input, ctx) => {
    if (typeof input !== 'string' || !schema.members.includes(input)) {
      ctx.errors.push({
        type: 'enum',
        loc: [...ctx.path],
        msg: `Input should be one of ${schema.members.join(', ')}`,
        input,
        ctx: { expected: schema.members },
      });
      return undefined;
    }
    return input;
  };
}

function compileList(schema: Extract<CoreSchema, { type: 'list' }>): ValidatorFn {
  const itemValidator = compileValidator(schema.itemsSchema);
  return (input, ctx) => {
    if (!Array.isArray(input)) {
      ctx.errors.push({
        type: 'list_type',
        loc: [...ctx.path],
        msg: 'Input should be a valid array',
        input,
      });
      return undefined;
    }

    if (schema.minLength !== undefined && input.length < schema.minLength) {
      ctx.errors.push({
        type: 'too_short',
        loc: [...ctx.path],
        msg: `List should have at least ${schema.minLength} items`,
        input,
      });
    }
    if (schema.maxLength !== undefined && input.length > schema.maxLength) {
      ctx.errors.push({
        type: 'too_long',
        loc: [...ctx.path],
        msg: `List should have at most ${schema.maxLength} items`,
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
      result.push(itemValidator(input[i], itemCtx));
    }
    return result;
  };
}

function compileDict(schema: Extract<CoreSchema, { type: 'dict' }>): ValidatorFn {
  const valueValidator = compileValidator(schema.valuesSchema);
  return (input, ctx) => {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      ctx.errors.push({
        type: 'dict_type',
        loc: [...ctx.path],
        msg: 'Input should be a valid object',
        input,
      });
      return undefined;
    }

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      const itemCtx: ValidationContext = {
        path: [...ctx.path, key],
        config: ctx.config,
        errors: ctx.errors,
      };
      result[key] = valueValidator(val, itemCtx);
    }
    return result;
  };
}

function compileUnion(schema: Extract<CoreSchema, { type: 'union' }>): ValidatorFn {
  const validators = schema.choices.map(compileValidator);
  return (input, ctx) => {
    if (schema.discriminator && typeof input === 'object' && input !== null) {
      const tag = (input as Record<string, unknown>)[schema.discriminator];
      for (let i = 0; i < schema.choices.length; i++) {
        const choice = schema.choices[i];
        if (choice.type === 'model-fields') {
          const modelChoice = choice as Extract<CoreSchema, { type: 'model-fields' }>;
          const discField = modelChoice.fields[schema.discriminator];
          if (discField) {
            const discSchema = discField.schema;
            if (discSchema.type === 'literal') {
              const literal = discSchema as Extract<CoreSchema, { type: 'literal' }>;
              if (!literal.expected.includes(tag)) continue;
            } else if (discSchema.type === 'default') {
              const defSchema = discSchema as Extract<CoreSchema, { type: 'default' }>;
              if (defSchema.defaultValue !== tag) continue;
            }
          }
        }
        const errorsBefore = ctx.errors.length;
        const result = validators[i](input, ctx);
        if (ctx.errors.length === errorsBefore) return result;
        ctx.errors.splice(errorsBefore);
      }
    }

    for (let i = 0; i < validators.length; i++) {
      const errorsBefore = ctx.errors.length;
      const result = validators[i](input, ctx);
      if (ctx.errors.length === errorsBefore) return result;
      ctx.errors.splice(errorsBefore);
    }

    ctx.errors.push({
      type: 'union_tag_invalid',
      loc: [...ctx.path],
      msg: 'Input did not match any union member',
      input,
    });
    return undefined;
  };
}

function compileNullable(schema: Extract<CoreSchema, { type: 'nullable' }>): ValidatorFn {
  const inner = compileValidator(schema.schema);
  return (input, ctx) => {
    if (input === null) return null;
    return inner(input, ctx);
  };
}

function compileOptional(schema: Extract<CoreSchema, { type: 'optional' }>): ValidatorFn {
  const inner = compileValidator(schema.schema);
  return (input, ctx) => {
    if (input === undefined) return undefined;
    return inner(input, ctx);
  };
}

function compileDefault(schema: Extract<CoreSchema, { type: 'default' }>): ValidatorFn {
  const inner = compileValidator(schema.schema);
  return (input, ctx) => {
    if (input === undefined) return schema.defaultValue;
    return inner(input, ctx);
  };
}

function compileDefaultFactory(schema: Extract<CoreSchema, { type: 'default-factory' }>): ValidatorFn {
  const inner = compileValidator(schema.schema);
  return (input, ctx) => {
    if (input === undefined) return schema.factory();
    return inner(input, ctx);
  };
}

function compileModelFields(schema: Extract<CoreSchema, { type: 'model-fields' }>): ValidatorFn {
  const fieldValidators: Record<string, ValidatorFn> = {};
  for (const [name, field] of Object.entries(schema.fields)) {
    fieldValidators[name] = compileValidator(field.schema);
  }

  return (input, ctx) => {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      ctx.errors.push({
        type: 'model_type',
        loc: [...ctx.path],
        msg: 'Input should be a valid object',
        input,
      });
      return undefined;
    }

    const data = input as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const extra = schema.extra ?? 'ignore';

    for (const [name, field] of Object.entries(schema.fields)) {
      const keys = field.alias ? [name, field.alias] : [name];
      let value: unknown = undefined;
      let found = false;

      for (const key of keys) {
        if (key in data) {
          value = data[key];
          found = true;
          break;
        }
      }

      if (!found) {
        if (field.default !== undefined) {
          value = field.default;
        } else if (field.defaultFactory) {
          value = field.defaultFactory();
        } else if (field.required) {
          ctx.errors.push({
            type: 'missing',
            loc: [...ctx.path, name],
            msg: 'Field required',
            input,
          });
          continue;
        } else {
          continue;
        }
      }

      const fieldCtx: ValidationContext = {
        path: [...ctx.path, name],
        config: ctx.config,
        errors: ctx.errors,
      };
      result[name] = fieldValidators[name](value, fieldCtx);
    }

    if (extra === 'forbid') {
      const allowed = new Set(Object.keys(schema.fields));
      for (const key of Object.keys(data)) {
        const isAlias = Object.values(schema.fields).some((f) => f.alias === key);
        if (!allowed.has(key) && !isAlias) {
          ctx.errors.push({
            type: 'extra_forbidden',
            loc: [...ctx.path, key],
            msg: 'Extra inputs are not permitted',
            input: data[key],
          });
        }
      }
    } else if (extra === 'allow') {
      for (const [key, val] of Object.entries(data)) {
        if (!(key in result) && !Object.values(schema.fields).some((f) => f.alias === key)) {
          result[key] = val;
        }
      }
    }

    return result;
  };
}

function compileFunctionBefore(schema: Extract<CoreSchema, { type: 'function-before' }>): ValidatorFn {
  const inner = compileValidator(schema.schema);
  return (input, ctx) => inner(schema.fn(input), ctx);
}

function compileFunctionAfter(schema: Extract<CoreSchema, { type: 'function-after' }>): ValidatorFn {
  const inner = compileValidator(schema.schema);
  return (input, ctx) => {
    const validated = inner(input, ctx);
    if (ctx.errors.length > 0) return validated;
    return schema.fn(validated);
  };
}

function compileFunctionWrap(schema: Extract<CoreSchema, { type: 'function-wrap' }>): ValidatorFn {
  const inner = compileValidator(schema.schema);
  return (input, ctx) =>
    schema.fn(input, (v) => inner(v, ctx));
}

function compileFunctionPlain(schema: Extract<CoreSchema, { type: 'function-plain' }>): ValidatorFn {
  return (input, _ctx) => schema.fn(input);
}

function compileDate(): ValidatorFn {
  return (input, ctx) => {
    if (input instanceof Date) return input;
    if (typeof input === 'string' || typeof input === 'number') {
      const d = new Date(input);
      if (!Number.isNaN(d.getTime())) return d;
    }
    ctx.errors.push({
      type: 'date_type',
      loc: [...ctx.path],
      msg: 'Input should be a valid date',
      input,
    });
    return undefined;
  };
}
