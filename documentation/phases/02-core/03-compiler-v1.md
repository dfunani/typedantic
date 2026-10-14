# 2.3 — Compiler V1 (int, string, boolean, model-fields)

Entry: `packages/typedantic-core/src/compiler/compile.ts`  
V1 modules:

- `compiler/primitives/ints.ts` → `compileInts`
- `compiler/primitives/strings.ts` → `compileStrings`
- `compiler/primitives/booleans.ts` → `compileBooleans`
- `compiler/fields/model-fields.ts` → `compileModelFields`

Supporting: `compiler/primitives/utils.ts` (`parseNumber`, `parseString`, `parseBoolean`), `factories/errors/primitives.ts`, `factories/errors/model-fields.ts`, `factories/errors/interpolate.ts`.

## Context passed to every validator

In `compile.ts`:

```ts
export interface ValidationContext {
    path: (string | number)[];
    config: ValidationConfigSchema;
    errors: ValidationErrorDetailSchema[];
}

export type ValidatorFunction = (input: unknown, ctx: ValidationContext) => unknown;
```

Compilers append to `ctx.errors` and return `undefined` when validation fails for that node.

## Teaching version: monolithic switch

For learning, you can implement V1 in one file before splitting:

```ts
export function compileValidator(schema: BaseSchema): ValidatorFunction {
    switch (schema.type) {
        case 'int':
            return compileInts(schema);
        case 'number':
            return compileNumbers(schema); // optional in V1; add in V2
        case 'string':
            return compileStrings(schema);
        case 'boolean':
            return compileBooleans(schema);
        case 'model-fields': {
            const fieldValidators: Record<string, ValidatorFunction> = {};
            for (const [name, field] of Object.entries(schema.fields)) {
                fieldValidators[name] = compileValidator(field.schema);
            }
            return compileModelFields(schema, fieldValidators);
        }
        default:
            return (input, ctx) => {
                ctx.errors.push({
                    type: 'unknown_schema',
                    location: [...ctx.path],
                    message: 'Unknown schema type',
                    input,
                });
                return undefined;
            };
    }
}
```

The live repo uses the same switch in `compile.ts` but delegates every arm to `compiler/primitives/*`, `compiler/complex/*`, and `compiler/fields/model-fields.ts`. After V1 works, align with that layout before [06-full-engine-v2.md](./06-full-engine-v2.md).

## Int (`compileInts`)

Behavior (see `compiler/primitives/ints.ts`):

1. `strict = schema.strict ?? ctx.config.strict`
2. If not strict, coerce with `parseNumber(input)` (strings like `"42"` → number)
3. Require `typeof value === 'number' && Number.isInteger(value)` else push type error
4. Apply `ge`, `gt`, `le`, `lt`, `multipleOf` — push separate errors (live code may accumulate multiple constraint errors on one value)
5. Return the validated integer

## String (`compileStrings`)

1. Optional coercion via `parseString` when not strict
2. Type check `typeof value === 'string'`
3. Enforce `minLength`, `maxLength`, `pattern` (RegExp or string → `RegExp`)

## Boolean (`compileBooleans`)

1. Optional coercion via `parseBoolean` when not strict (`"true"`, `0`, etc.)
2. Require `typeof value === 'boolean'`

## Model fields (`compileModelFields`)

See `compiler/fields/model-fields.ts`:

- Reject non-plain objects (not array, not null)
- For each field: resolve value by `name` or `alias`
- Missing + `required` → error at path `[..., fieldName]`
- Missing + `default` / `defaultFactory` → fill (clone mutable defaults via `cloneDefault` in V2 module)
- Run nested `fieldValidators[name](value, { path: [...ctx.path, name], ... })`
- `extra: 'forbid'` → errors for unknown keys; `'allow'` copies extras; `'ignore'` drops them

## Strict vs coercion

| `strict` | Effect on primitives |
|----------|----------------------|
| `false` / undefined | Coerce string inputs where parsers allow |
| `true` | Input must already be the correct JS type |

`SchemaValidator` passes `{ strict }` in context (see next chapter).

## Checklist

- [ ] `compileValidator` handles `'int' | 'string' | 'boolean' | 'model-fields'`
- [ ] Errors use `location: [...ctx.path]` and `createValidationErrorDetail`
- [ ] Model-fields missing/extra errors include field key in `location`

Next: [04-schema-validator.md](./04-schema-validator.md)
