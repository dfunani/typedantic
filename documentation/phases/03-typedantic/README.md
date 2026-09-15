# Phase 3 — `typedantic` public API

This package turns decorators + classes into `CoreSchema` and runs `@typedantic/core`.

## V1 minimum

| Build now | Defer later |
|-----------|-------------|
| reflect, metadata, registry, Field | computedField / field serializers |
| schema builder for primitives **and** V2 Field options | JSON Schema, TypeAdapter |
| BaseModel (`modelValidate`, `modelDump` basic) | RootModel, createModel |
| `src/index.ts` + build | — |

## Chapters

1. [01-reflect-and-metadata.md](./01-reflect-and-metadata.md)
2. [02-field-and-registry.md](./02-field-and-registry.md)
3. [03-schema-builder-v1.md](./03-schema-builder-v1.md)
4. [04-base-model-v1.md](./04-base-model-v1.md)
5. [05-public-exports-and-smoke.md](./05-public-exports-and-smoke.md)
6. [06-full-api-v2.md](./06-full-api-v2.md) — Field → array/object/union/date/number
7. [07-tests-v2.md](./07-tests-v2.md) — `packages/typedantic/tests/` + root `tests/`

Deep dives: [../../topics/reflect-metadata.md](../../topics/reflect-metadata.md), [../../topics/decorators.md](../../topics/decorators.md)
