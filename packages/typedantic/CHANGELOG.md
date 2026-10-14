# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-10-14

- `RootModel`, annotated types (`EmailStr`, `HttpUrl`, `UUID`, constrained ints, `SecretStr`)
- `createModel` / `extendModel`
- `TypeAdapter` accepts annotated types and FieldInfo

## [0.2.0] - 2026-10-14

Milestone **V2 final** — serializers, validators, computed fields, JSON Schema, and TypeAdapter are included (no longer deferred).

### Added (`@typedantic/core`)

- `SchemaSerializer` / `serializeValue` with dump options (`mode`, `byAlias`, `excludeNone`, `excludeUnset`, `include`/`exclude`)
- `toJsonSchema()` JSON Schema generator (`$defs` / `$ref`)
- Dual ValidationError JSON keys: `location`/`message` and FastAPI `loc`/`msg`/`ctx`

### Added (`@typedantic/model`)

- `@fieldValidator` / `@modelValidator` (before / after / wrap / plain)
- `@fieldSerializer` / `@modelSerializer` / `@computedField`
- `modelValidateJson`, `modelCopy`, validating `constructor(data)`, `modelJsonSchema`
- `modelDump` / `modelDumpJson` options
- `TypeAdapter` (`validate`, `validateJson`, `dump`, `dumpJson`)
- Field options: `validationAlias`, `serializationAlias`, `exclude`, `repr`
- Config: `populateByName`, live `validateAssignment` (Proxy)

### Fixed

- Subclass field registry no longer mutates parent (B1)
- Discriminated union tag pre-filter (B2)
- Model `strict` propagates to child fields (B3)
- Union hydration for literal/enum discriminators (B4)
- Empty-string numeric coercion rejected (B5)
- `function-after` local error scoping + thrown errors → validation errors (B7)
- Finalized field registry cache (B10)
- Core schema interfaces exported as types (B13)
- Settings string coercion by field type; camelCase nested env keys (S1/S2)

### Packages

Published names unchanged: `@typedantic/core`, `@typedantic/model`, `@typedantic/settings`.

## [0.1.0] - 2026-09-25

Initial public surface: schema IR, BaseModel / Field, settings env loading.
