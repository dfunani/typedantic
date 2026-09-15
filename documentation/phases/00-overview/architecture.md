# Architecture overview

## Two-layer design

```
┌─────────────────────────────────────────────────────────┐
│  typedantic (DX layer = developer experience API)       │
│  BaseModel, @Field, @fieldValidator, TypeAdapter, ...   │
│  Builds CoreSchema from class metadata                  │
└───────────────────────────┬─────────────────────────────┘
                            │ CoreSchema
                            ▼
┌─────────────────────────────────────────────────────────┐
│  @typedantic/core (engine)                              │
│  compileValidator → ValidatorFn                         │
│  SchemaValidator / SchemaSerializer / ValidationError   │
└─────────────────────────────────────────────────────────┘
```

**Core never imports typedantic.**  
**typedantic always depends on core.**

## Runtime lifecycle of `User.modelValidate(data)`

```
1. getOrBuildSchema(User)
2. getOrBuildValidator(User, schema)
3. validator.validatePython(data)  → throw ValidationError if errors
4. instantiateModel(User, plainObject)  // constructor() NOT called
5. return instance
```

## File dependency order

### Core
1. `schema/types.ts`
2. `errors/validation-error.ts`
3. `compiler/compile.ts`
4. `validator/schema-validator.ts`
5. `serializer/schema-serializer.ts`
6. `index.ts`

### Typedantic
1. `internal/reflect.ts`
2. `internal/metadata.ts`
3. `internal/field-registry.ts`
4. `fields/field.ts`
5. `config/model-config.ts`
6. `internal/schema-builder.ts`
7. `models/base-model.ts`
8. `index.ts`

## See also

- [corrections-vs-main.md](./corrections-vs-main.md)
- [../../topics/core-schema-ir.md](../../topics/core-schema-ir.md)
