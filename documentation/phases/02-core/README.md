# Phase 2 — `@typedantic/core`

Core is a **zero-dependency** validation engine: plain TypeScript objects describe schemas (IR), `compileValidator` turns them into functions, and `SchemaValidator.validateModel` runs them and throws `ValidationError` on failure.

Model layer (`@typedantic/model`) builds the same IR from classes; core never imports decorators.

## V1 scope (chapters 1–5)

| Build now | Defer to [06-full-engine-v2.md](./06-full-engine-v2.md) |
|-----------|----------------------------------------------------------|
| IR: `int`, `number`, `string`, `boolean`, `model-fields` | `array`, `object`, `union`, `nullable`, `optional`, `default`, `default-factory`, `date`, `enum`, `literal`, `function-*`, `any`, `never` |
| `ValidationError` + `createValidationErrorDetail` | — |
| `compileValidator` switch for V1 types | Full modular `compiler/primitives/*`, `compiler/complex/*` |
| `SchemaValidator.validateModel` | `validateJson`, advanced config |
| Tests under `packages/typedantic-core/tests/` | Extra suites in [07-tests-v2.md](./07-tests-v2.md) |

**0.1 exports** (from `packages/typedantic-core/src/index.ts` only):

- Types: `BaseSchema` (via re-exported schema modules)
- `ValidationError`, `compileValidator`, `SchemaValidator`
- `createSchemaValidator`, `createValidationErrorDetail`
- Schema interfaces: `IntSchema`, `NumbersSchema`, `StringSchema`, `BooleanSchema`, `LiteralSchema`, `ModelFieldSchema`, `ModelFieldsSchema`

Not exported in 0.1 even if source exists: `SchemaSerializer`, JSON Schema helpers, TypeAdapter.

## IR `schema.type` strings (full union in repo)

For V1 you implement: `'int' | 'number' | 'string' | 'boolean' | 'model-fields'`.

The live `BaseSchema` union also includes (V2): `'literal' | 'enum' | 'array' | 'object' | 'union' | 'nullable' | 'optional' | 'default' | 'default-factory' | 'date' | 'function-before' | 'function-after' | 'function-wrap' | 'function-plain' | 'any' | 'never'`.

Field naming in errors uses **`location`** and **`message`** (not Pydantic’s `loc` / `msg`).

## Chapter order

1. [01-schema-types-v1.md](./01-schema-types-v1.md) — minimal IR + config types
2. [02-validation-error.md](./02-validation-error.md)
3. [03-compiler-v1.md](./03-compiler-v1.md) — int / string / boolean + model-fields
4. [04-schema-validator.md](./04-schema-validator.md) — `validator/schema.ts`
5. [05-tests-v1.md](./05-tests-v1.md)
6. [06-full-engine-v2.md](./06-full-engine-v2.md) — rest of `compile.ts` + modular compilers
7. [07-tests-v2.md](./07-tests-v2.md) — full test matrix

## Live dependency order

Build files in this order so imports resolve:

1. `schema/models/primitives.ts`, `schema/models/fields.ts`, `schema/models/configurations.ts`
2. `schema/types.ts` → `BaseSchema`
3. `errors/utils.ts`, `errors/validation-error.ts`
4. `factories/validation-error.ts` (+ `factories/errors/*` as compilers need them)
5. `compiler/primitives/*`, `compiler/fields/model-fields.ts`, then `compiler/compile.ts`
6. `validator/schema.ts`
7. `index.ts`

## Verify

```bash
bun run build
bun run test -- packages/typedantic-core
```

See [common pitfalls](../../topics/common-pitfalls.md) if workspace packages resolve to stale `dist/`.
