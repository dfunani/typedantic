# Phase 2 — `@typedantic/core`

Core is a **zero-dependency** validation engine.

## V1 scope (do this first)

| Build | Skip until V2 |
|-------|----------------|
| `int`, `bool`, `str` | `float` polish, list, dict, union, date |
| `model-fields` | function wrappers (or add thin stubs) |
| `ValidationError` | — |
| `SchemaValidator` that throws | Serializer (needed before dump; can wait until BaseModel dump) |
| Tests for primitives + model object | Discriminated unions |

## Chapter order

1. [01-schema-types-v1.md](./01-schema-types-v1.md) — minimal IR
2. [02-validation-error.md](./02-validation-error.md)
3. [03-compiler-v1.md](./03-compiler-v1.md) — int/bool/str + model-fields
4. [04-schema-validator.md](./04-schema-validator.md)
5. [05-tests-v1.md](./05-tests-v1.md)
6. [06-full-engine-v2.md](./06-full-engine-v2.md) — rest of main

Full `main` sources: [../../reference/](../../reference/)
