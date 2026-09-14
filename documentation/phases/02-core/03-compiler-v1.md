# Core V1 — Compiler (`int` / `bool` / `str` / `model-fields`)

**Path:** `packages/typedantic-core/src/compiler/compile.ts`

This is the heart of Typedantic. For V1, implement **only** four schema types.  
Full main compiler (all nodes): [../../reference/compile.ts.md](../../reference/compile.ts.md)

## Mental model

```ts
type ValidatorFn = (input: unknown, ctx: ValidationContext) => unknown;

interface ValidationContext {
  path: (string | number)[];
  config: { strict?: boolean };
  errors: ValidationErrorDetail[]; // SHARED mutable array
}
```

Validators **push** errors into `ctx.errors` and return a value (or `undefined`).  
They generally do **not** throw (except you may throw in early experiments — prefer push + SchemaValidator throw).

## Full V1 compiler

```ts
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
    case 'int':
      return compileInt(schema);
    case 'str':
      return compileStr(schema);
    case 'bool':
      return compileBool(schema);
    case 'model-fields':
      return compileModelFields(schema);
    default: {
      const _exhaustive: never = schema;
      return (input, ctx) => {
        ctx.errors.push({
          type: 'unknown_schema',
          loc: [...ctx.path],
          msg: 'Unknown schema type',
          input,
        });
        return undefined;
      };
    }
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

function compileModelFields(
  schema: Extract<CoreSchema, { type: 'model-fields' }>,
): ValidatorFn {
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
```

## Coercion cheat sheet

| Schema | Non-strict | Strict |
|--------|------------|--------|
| `int` | integer-like strings → number | must be integer number |
| `str` | number/boolean → string | must be string |
| `bool` | `"true"/"false"/"1"/"0"/1/0` | must be boolean |

## Model field rules

1. Input must be a non-null non-array object  
2. Lookup canonical name, then alias  
3. Missing → default → defaultFactory → error if required → else skip  
4. Output keys are always canonical names  
5. `extra: forbid | allow | ignore`

Next: [04-schema-validator.md](./04-schema-validator.md)
