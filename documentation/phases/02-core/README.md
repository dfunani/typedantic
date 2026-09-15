# Phase 2 — `@typedantic/core`

Core is a **zero-dependency** validation engine.

## V1 scope (do this first)

| Build | Skip until V2 |
|-------|----------------|
| `int`/`number`, `bool`/`boolean`, `str`/`string` | (V2 is [06-full-engine-v2.md](./06-full-engine-v2.md)) |
| `model-fields` | — |
| `ValidationError` | — |
| `SchemaValidator` that throws | Serializer / JSON Schema |
| Tests for primitives + model object | — |

## Chapter order

1. [01-schema-types-v1.md](./01-schema-types-v1.md) — minimal IR
2. [02-validation-error.md](./02-validation-error.md)
3. [03-compiler-v1.md](./03-compiler-v1.md) — int/bool/str + model-fields
4. [04-schema-validator.md](./04-schema-validator.md)
5. [05-tests-v1.md](./05-tests-v1.md)
6. [06-full-engine-v2.md](./06-full-engine-v2.md) — list, dict, union, float, date, functions
7. [07-tests-v2.md](./07-tests-v2.md) — `packages/typedantic-core/tests/`

Full `main` sources: [../../reference/](../../reference/)
