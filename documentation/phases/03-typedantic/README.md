# Phase 3 — `typedantic` public API

This package turns decorators + classes into `CoreSchema` and runs `@typedantic/core`.

## V1 minimum

| Build now | Defer to V2 |
|-----------|-------------|
| reflect, metadata, registry, Field | computedField / serializers (optional stubs OK) |
| schema builder for String/Number/Boolean + model-fields | unions, special types, JSON Schema |
| BaseModel (`modelValidate`, `modelDump` basic) | RootModel, createModel, TypeAdapter |
| `src/index.ts` + build | settings package |

## Chapters

1. [01-reflect-and-metadata.md](./01-reflect-and-metadata.md)
2. [02-field-and-registry.md](./02-field-and-registry.md)
3. [03-schema-builder-v1.md](./03-schema-builder-v1.md)
4. [04-base-model-v1.md](./04-base-model-v1.md)
5. [05-public-exports-and-smoke.md](./05-public-exports-and-smoke.md)
6. [06-full-api-v2.md](./06-full-api-v2.md)

Deep dives: [../../topics/reflect-metadata.md](../../topics/reflect-metadata.md), [../../topics/decorators.md](../../topics/decorators.md)
