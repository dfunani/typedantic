# Architecture overview

## Three packages (0.1)

```
┌─────────────────────────────────────────────────────────┐
│  @typedantic/settings                                   │
│  BaseSettings, settingsConfig, customise sources        │
│  env / .env / json / secretsDir loading                 │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  @typedantic/model  (DX layer)                          │
│  BaseModel, RootModel, @Field, modelConfig, TypeAdapter │
│  Annotated types, createModel / extendModel             │
│  @fieldValidator / @modelValidator                      │
│  @fieldSerializer / @modelSerializer / @computedField │
│  Builds BaseSchema; hydrates nested instances           │
└───────────────────────────┬─────────────────────────────┘
                            │ BaseSchema
                            ▼
┌─────────────────────────────────────────────────────────┐
│  @typedantic/core  (engine — no decorators)             │
│  compileValidator → ValidatorFunction                   │
│  SchemaValidator / SchemaSerializer / toJsonSchema      │
│  ValidationError                                        │
└─────────────────────────────────────────────────────────┘
```

**Rules**

- Core never imports `@typedantic/model` or `@typedantic/settings`.
- Model always depends on core.
- Settings always depends on model.

**Also in 0.3.0:** annotated types (`EmailStr`, …), `createModel` / `extendModel`, custom settings sources, `RootModel`.

## Naming: Field options vs IR

| `@Field({ type: … })` | IR `schema.type` |
|-----------------------|------------------|
| `String`              | `'string'`       |
| `Number` (default)    | `'int'`          |
| `'number'`            | `'number'`       |
| `Boolean`             | `'boolean'`      |
| `Date`                | `'date'`         |
| `Array` + `items`     | `'array'`        |
| nested `BaseModel`    | `'model-fields'` |

Keep builder + compiler on the **IR** names (`string` / `int` / `boolean`).

## Runtime lifecycle of `User.modelValidate(data)`

```
1. buildBaseModelSchema(User)     → BaseSchema (cached on ctor)
2. buildBaseModelValidator(...)   → SchemaValidator (cached)
3. validator.validateModel(data)  → plain object or throw ValidationError
4. buildBaseModelInstance(User, plainObject)
     └─ hydrate nested models / unions / array items via modelConstruct
5. return instance  // User constructor() is NOT called
```

## File dependency order (live tree)

### `@typedantic/core`

1. `schema/models/*` + `schema/types.ts` → `BaseSchema`
2. `errors/validation-error.ts` + `errors/utils.ts`
3. `factories/errors/*` + `factories/validation-error.ts`
4. `compiler/primitives/*`, `compiler/complex/*`, `compiler/fields/*`
5. `compiler/compile.ts` → `compileValidator`
6. `validator/schema.ts` → `SchemaValidator`
7. `index.ts`

### `@typedantic/model`

1. `fields/properties.ts` — reflect helpers
2. `fields/types.ts` — `FieldInfo`, `ConfigDict`, symbols
3. `fields/registry.ts` + `fields/decorator.ts` — `@Field`
4. `types/annotated.ts` — `EmailStr`, `SecretStr`, …
5. `config/model-config.ts`
6. `fields/builders/schema.ts` + `fields/builders/fields.ts` — `getModelFields`
7. `models/factories.ts` — schema/validator/instance + hydration
8. `models/base-model.ts` + `models/root-model.ts`
9. `generics/create-model.ts`
10. `index.ts`

### `@typedantic/settings`

1. `config.ts` — `SettingsConfigDict`
2. `environment.ts` — `.env` parse, flatten, coerce, nested assign
3. `sources.ts` — settings sources + merge
4. `index.ts` — `BaseSettings`, `settingsConfig`, `settingsCustomiseSources`

## See also

- [../../topics/core-schema-ir.md](../../topics/core-schema-ir.md)
- [../../README.md](../../README.md) — package map + corrections table
