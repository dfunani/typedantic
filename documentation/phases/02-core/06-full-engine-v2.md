# Core V2 — Full engine how-to

V1 compiled `int` / `string` / `boolean` / `model-fields`.  
V2 expands `@typedantic/core` to a production-ready IR + compiler.

Do this **after** [05-tests-v1.md](./05-tests-v1.md) is green.

**This chapter is the source of truth for the current tree.**  
Main’s one-file compiler: [../../reference/compile.ts.md](../../reference/compile.ts.md) — copy structure, then apply the corrections below.

---

## What you will have

A `SchemaValidator` that can compile and run:

| Node | Role |
|------|------|
| `int` | Integer (`Number.isInteger`) |
| `number` | JS IEEE-754 number, including fractions + `multipleOf` |
| `string` / `boolean` | V1 primitives |
| `literal` / `enum` | Closed values |
| `array` / `object` | Collections (`object.keysSchema` is enforced) |
| `union` | Untagged try-all, or tagged with **no fallthrough** |
| `nullable` / `optional` / `default` / `default-factory` | Presence |
| `function-before` / `after` / `wrap` / `plain` | Validator wrappers |
| `date` | `Date` or ISO / epoch |
| `any` / `never` | Escape hatches |
| `model-fields` | Nested objects, aliases, cloned defaults |

---

## Corrections vs `main` (must implement)

| Area | `main` | Do this instead |
|------|--------|-----------------|
| Discriminator miss | Falls through to try-every-member | If `discriminator` is set and no branch matches → **error** |
| `object.keysSchema` | Declared, ignored | Run a key validator per entry |
| `number` `multipleOf` | Unused | Enforce with a small epsilon |
| Constraint messages | Interpolate `schema.ge` | Never substitute the **input** into `{placeholder}` |
| Missing-field `location` | `[...path, name]` | Do not leave the error on the parent path |
| Mutable `default: []` | Shared reference | Clone arrays / plain objects when applying defaults |
| `validateJson` | `catch` swallows `ValidationError` | Only map `JSON.parse` failures to `json_invalid` |

Details: [../00-overview/corrections-vs-main.md](../00-overview/corrections-vs-main.md)

---

## File layout

```
packages/typedantic-core/src/
├── schema/
│   ├── types.ts                         ← BaseSchema union
│   └── models/
│       ├── primitives.ts                ← int, number, string, boolean, literal, any, never
│       ├── fields.ts                    ← model-fields
│       └── complex/
│           ├── arrays.ts                ← array
│           ├── objects.ts               ← object
│           ├── dates.ts
│           ├── enums.ts
│           ├── field-properties.ts      ← union, nullable, optional, default
│           └── field-functions.ts
├── compiler/
│   ├── compile.ts                       ← switch only
│   ├── primitives/
│   ├── complex/
│   └── fields/model-fields.ts
├── validator/schema.ts
└── factories/errors/interpolate.ts      ← constraint → message
```

Unit tests live next to the package, not under `src/`:

```
packages/typedantic-core/tests/
├── schema-validator.test.ts
├── validation-error.test.ts
├── compiler-primitives.test.ts
├── compiler-complex.test.ts
├── compiler-unions.test.ts
├── compiler-functions.test.ts
└── compiler-model-fields.test.ts
```

---

## 1. Expand the IR

**Path:** `packages/typedantic-core/src/schema/types.ts`

Keep V1 names (`int` / `string` / `boolean`) and add V2 nodes. JS has no `float`: `number` is IEEE-754. `int` is `Number.isInteger`.

```ts
export type BaseSchema =
  | IntSchema
  | NumbersSchema
  | StringSchema
  | BooleanSchema
  | LiteralSchema
  | EnumsSchema
  | ModelFieldsSchema
  | ArraySchema
  | ObjectSchema
  | UnionSchema
  | NullableSchema
  | OptionalSchema
  | DefaultSchema
  | DefaultFactorySchema
  | FunctionBeforeSchema
  | FunctionAfterSchema
  | FunctionWrapSchema
  | FunctionPlainSchema
  | DateSchema
  | AnySchema
  | NeverSchema;
```

`ObjectSchema` must include `keysSchema?: BaseSchema`.  
`UnionSchema` must include `discriminator?: string`.

Copy the per-node interfaces from the matching files under `schema/models/`. Do **not** declare `DateSchema` twice (it belongs in `complex/dates.ts` only).

---

## 2. Interpolate constraints, not inputs

**Path:** `packages/typedantic-core/src/factories/errors/interpolate.ts`

```ts
export function interpolatePlaceholder(message: string, placeholder: unknown): string {
  if (!message.includes('{placeholder}')) return message;
  return message.replaceAll('{placeholder}', String(placeholder));
}
```

Int / string / number / literal compilers pass `schema.ge`, `schema.minLength`, `re.source`, or `JSON.stringify(expected)` — **never** the invalid input.

If `qty` has `ge: 1` and the input is `0`, the message must be:

```
items.0.qty: Input should be greater than or equal to 1
```

---

## 3. Dispatcher — `compile.ts`

**Path:** `packages/typedantic-core/src/compiler/compile.ts`

Keep this file as a **switch**. Each case delegates to a compiler in `primitives/` or `complex/`. Recurse with `compileValidator` for nested schemas.

```ts
export function compileValidator(schema: BaseSchema): ValidatorFunction {
  switch (schema.type) {
    case 'int':
      return compileInts(schema);
    case 'number':
      return compileNumbers(schema);
    case 'string':
      return compileStrings(schema);
    case 'boolean':
      return compileBooleans(schema);
    case 'literal':
      return compileLiterals(schema);
    case 'enum':
      return compileEnums(schema);
    case 'array':
      return compileArrays(schema, compileValidator(schema.itemsSchema));
    case 'object':
      return compileObjects(
        compileValidator(schema.valuesSchema),
        schema.keysSchema ? compileValidator(schema.keysSchema) : undefined,
      );
    case 'union':
      return compileUnions(schema, schema.choices.map(compileValidator));
    case 'nullable':
      return compileNullables(compileValidator(schema.schema));
    case 'optional':
      return compileOptionals(compileValidator(schema.schema));
    case 'default':
      return compileDefaults(schema, compileValidator(schema.schema));
    case 'default-factory':
      return compileDefaultFactory(schema, compileValidator(schema.schema));
    case 'function-before':
      return compileFunctionBefore(schema, compileValidator(schema.schema));
    case 'function-after':
      return compileFunctionAfter(schema, compileValidator(schema.schema));
    case 'function-wrap':
      return compileFunctionWrap(schema, compileValidator(schema.schema));
    case 'function-plain':
      return compileFunctionPlain(schema);
    case 'date':
      return compileDates();
    case 'any':
      return (input) => input;
    case 'never':
      return (input, ctx) => {
        ctx.errors.push({
          type: 'never',
          location: [...ctx.path],
          message: 'Input is never valid',
          input,
        });
        return undefined;
      };
    case 'model-fields':
      return compileModelFields(schema, createFieldValidators(schema));
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

Implement the leaf compilers next to this file. Match the repo sources under `packages/typedantic-core/src/compiler/`.

---

## 4. Dict keys

**Path:** `packages/typedantic-core/src/compiler/complex/objects.ts`

```ts
export function compileObjects(
  valueValidator: ValidatorFunction,
  keyValidator?: ValidatorFunction,
): ValidatorFunction {
  return (input, ctx) => {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      ctx.errors.push({
        type: 'object_type',
        location: [...ctx.path],
        message: 'Input should be a valid object',
        input,
      });
      return undefined;
    }

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      const itemCtx = {
        path: [...ctx.path, key],
        config: ctx.config,
        errors: ctx.errors,
      };
      if (keyValidator) keyValidator(key, itemCtx);
      result[key] = valueValidator(val, itemCtx);
    }
    return result;
  };
}
```

---

## 5. Tagged unions — no fallthrough

**Path:** `packages/typedantic-core/src/compiler/complex/field-properties.ts`

When `schema.discriminator` is set:

1. Look at `input[discriminator]`.
2. Try only branches whose literal/default tag matches.
3. If none succeed, push `union_tag_invalid` and **return**.
4. Do **not** then try every union member (that is the `main` bug).

Untagged unions still try members in order, splicing errors after each miss.

Also export `cloneDefault()` from this file. `compileDefaults` and `compileModelFields` must clone array / plain-object defaults so instances do not share `[]`.

---

## 6. Model-fields missing path

When a required field is absent, push the error with:

```ts
path: [...ctx.path, name]
```

`extra_forbidden` already uses a nested path — missing fields must too.

---

## 7. `SchemaValidator.validateJson`

**Path:** `packages/typedantic-core/src/validator/schema.ts`

```ts
validateJson(json: string, config?: ValidationConfigSchema): unknown {
  const strict = config?.strict ?? this.config.strict;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new ValidationError([
      createValidationErrorDetail('json_invalid', [], 'Invalid JSON', json, { strict }),
    ]);
  }
  return this.validateModel(parsed, config);
}
```

Each `validateModel` call must use a **fresh** `errors` array so a cached validator can succeed after a failure.

---

## 8. Number `multipleOf`

**Path:** `packages/typedantic-core/src/compiler/primitives/numbers.ts`

`number` accepts any finite JS `number` (after optional string coercion). Integer-only values stay on `int`.

```ts
const quotient = value / multipleOf;
Math.abs(quotient - Math.round(quotient)) < 1e-9
```

---

## Checkpoint

```bash
bun run --filter @typedantic/core build
bunx vitest run packages/typedantic-core
```

All of [07-tests-v2.md](./07-tests-v2.md) must pass before you wire Field.

Next: [../03-typedantic/06-full-api-v2.md](../03-typedantic/06-full-api-v2.md)
