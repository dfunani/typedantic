# Phase 3 — `@typedantic/model`

The model package turns decorated classes into the same IR `@typedantic/core` already validates, then hydrates nested models after validation.

**Depends on:** `@typedantic/core`, `reflect-metadata` (peer).

**Does not export in 0.1:** TypeAdapter, `@fieldValidator`, JSON Schema, `SchemaSerializer`.

## V1 chapters (match 0.1 release)

| Chapter | Live files |
|---------|------------|
| Reflect + types | `fields/properties.ts`, `fields/types.ts` |
| `@Field` + registry | `fields/decorator.ts`, `fields/registry.ts` |
| Schema builder | `fields/builders/schema.ts`, `fields/builders/fields.ts` — **`getModelFields`** |
| BaseModel | `models/base-model.ts`, `models/factories.ts` |
| Exports + smoke | `index.ts`, repo root `tests/basic.ts` |

Also: `config/model-config.ts` for `@modelConfig`.

## Runtime flow

```
User.modelValidate(data)
  → buildBaseModelSchema(User)      // cache on ctor[CORE_SCHEMA_KEY]
  → buildBaseModelValidator(...)    // cache on ctor[VALIDATOR_KEY]
  → validator.validateModel(data)
  → buildBaseModelInstance(User, plain)  // hydration in factories.ts
```

See [architecture](../00-overview/architecture.md).

## Constructor → IR mapping (Field decorator)

| `@Field({ type: … })` | IR `schema.type` |
|-----------------------|------------------|
| `String` | `'string'` |
| `Number` (default) | `'int'` |
| `'number'` | `'number'` |
| `Boolean` | `'boolean'` |
| nested class with `modelValidate` | `'model-fields'` |

Use explicit `type:` in tests — Vitest often omits `design:type`. See [common-pitfalls.md](../../topics/common-pitfalls.md).

## Chapter order

1. [01-reflect-and-metadata.md](./01-reflect-and-metadata.md)
2. [02-field-and-registry.md](./02-field-and-registry.md)
3. [03-schema-builder-v1.md](./03-schema-builder-v1.md)
4. [04-base-model-v1.md](./04-base-model-v1.md)
5. [05-public-exports-and-smoke.md](./05-public-exports-and-smoke.md)
6. [06-full-api-v2.md](./06-full-api-v2.md) — unions, arrays, more `FieldInfo` options
7. [07-tests-v2.md](./07-tests-v2.md) — `packages/typedantic/tests/`

## Verify

```bash
bun run build
bun run test -- packages/typedantic
bun run functional-test   # tests/basic.ts
```
