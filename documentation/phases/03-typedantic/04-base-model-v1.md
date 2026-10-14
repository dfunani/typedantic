# 3.4 — BaseModel and factories

Files:

- `packages/typedantic/src/models/base-model.ts`
- `packages/typedantic/src/models/factories.ts`
- `packages/typedantic/src/config/model-config.ts`

## `@modelConfig`

`config/model-config.ts` merges onto the class:

```ts
export function modelConfig(config: ConfigDict): ClassDecorator {
    return (target) => {
        const propertyValue = { ...(target as { modelConfig?: ConfigDict }).modelConfig, ...config };
        defineFieldProperty(target, 'modelConfig', propertyValue);
        defineFieldPropertyMetadata(MODEL_CONFIG_KEY, config, target);
    };
}

export function getModelConfig(ctor: Function): ConfigDict {
    return ((ctor as { modelConfig?: ConfigDict }).modelConfig ?? {}) as ConfigDict;
}
```

`ConfigDict`: `strict`, `frozen`, `extra`, `validateAssignment` (see `fields/types.ts`).

## BaseModel API

`base-model.ts` — static methods use **`modelValidate`**, **`modelConstruct`**, **`modelDump`**, **`modelDumpJson`**:

```ts
export class BaseModel {
    static modelConfig: ConfigDict = {};
    static modelFields: Record<string, ModelFieldMeta> = {};

    static modelValidate<T extends typeof BaseModel>(this: T, data: unknown): InstanceType<T> {
        const schema = buildBaseModelSchema(this);
        const validator = buildBaseModelValidator(this, schema);
        const config = getModelConfig(this);
        const validated = validator.validateModel(data, { strict: config.strict });
        return buildBaseModelInstance(this, validated as Record<string, unknown>);
    }

    static modelConstruct<T extends typeof BaseModel>(
        this: T,
        values: Record<string, unknown>,
    ): InstanceType<T> {
        return buildBaseModelInstance(this, values);
    }

    modelDump(): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(this as Record<string, unknown>)) {
            out[key] = value;
        }
        return out;
    }

    modelDumpJson(): string {
        return JSON.stringify(this.modelDump());
    }
}
```

The class **`constructor` is not invoked** for validated instances; instances are built with `Object.create(ctor.prototype)`.

## Factories — cache schema and validator

`factories.ts`:

```ts
export function buildBaseModelSchema(ctor: Function): BaseSchema {
    if (hasOwn(ctor, CORE_SCHEMA_KEY)) {
        return (ctor as ModelClass)[CORE_SCHEMA_KEY]!;
    }
    getModelFields(ctor);
    const schema = buildModelFieldSchema(ctor);
    Object.defineProperty(ctor, CORE_SCHEMA_KEY, { value: schema });
    return schema;
}

export function buildBaseModelValidator(ctor: Function, schema: BaseSchema): SchemaValidator {
    if (hasOwn(ctor, VALIDATOR_KEY)) {
        return (ctor as ModelClass)[VALIDATOR_KEY]!;
    }
    const config = getModelConfig(ctor);
    const validator = new SchemaValidator(schema, { strict: config.strict });
    Object.defineProperty(ctor, VALIDATOR_KEY, { value: validator });
    return validator;
}
```

Uses symbols `CORE_SCHEMA_KEY` and `VALIDATOR_KEY` from `fields/types.ts`.

## Nested hydration (brief)

After core returns a plain object, `buildBaseModelInstance` assigns properties and runs **`hydrateFieldValue`**:

- Array + `fieldInfo.items` model ctor → `modelConstruct` per element
- `fieldInfo.type` model ctor → `modelConstruct` on nested records
- `fieldInfo.union` → pick arm via literal discriminators, else first model arm

Union matching uses `getModelFields` on each candidate class. See full logic in `packages/typedantic/src/models/factories.ts`.

`frozen: true` in config → non-writable properties + `Object.freeze(instance)`.

## Example

```ts
import 'reflect-metadata';
import { BaseModel, Field, modelConfig } from '@typedantic/model';

@modelConfig({ extra: 'ignore' })
class User extends BaseModel {
    @Field({ type: String, minLength: 1 })
    name!: string;
}

const u = User.modelValidate({ name: 'Ada', ignored: 1 });
console.log(u.modelDumpJson());
```

## Checklist

- [ ] `validateModel` on `SchemaValidator`, not renamed wrappers
- [ ] Cached schema/validator on constructor
- [ ] Hydration path for nested models (at least single nested object)

Next: [05-public-exports-and-smoke.md](./05-public-exports-and-smoke.md)
