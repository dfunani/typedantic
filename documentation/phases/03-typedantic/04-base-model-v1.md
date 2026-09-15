# BaseModel V1

**Path:** `packages/typedantic/src/models/base-model.ts`  
Full main: [../../reference/base-model.ts.md](../../reference/base-model.ts.md)

## What V1 must do

- `modelValidate(data)` → validate → instance
- `modelConstruct(values)` → instance without validation
- `modelDump()` → plain object of own fields
- Cache schema/validator on the **own** constructor

Skip for V1 if you want: JSON Schema, serializers, computed fields, `modelDumpJson` extras (still implement a simple JSON stringify of dump).

```ts
import { SchemaValidator, ValidationError, type CoreSchema } from '@typedantic/core';
import { getModelConfig } from '../config/model-config.js';
import {
  CORE_SCHEMA_KEY,
  VALIDATOR_KEY,
  type ConfigDict,
  type ModelClass,
  type ModelFieldMeta,
} from '../internal/metadata.js';
import { buildModelSchema, collectModelFields } from '../internal/schema-builder.js';

export class BaseModel {
  static modelConfig: ConfigDict = {};
  static modelFields: Record<string, ModelFieldMeta> = {};

  static modelValidate<T extends typeof BaseModel>(this: T, data: unknown): InstanceType<T> {
    const schema = getOrBuildSchema(this);
    const validator = getOrBuildValidator(this, schema);
    const config = getModelConfig(this);
    const validated = validator.validatePython(data, { strict: config.strict });
    return instantiateModel(this as unknown as ModelClass<T>, validated as Record<string, unknown>);
  }

  static modelConstruct<T extends typeof BaseModel>(
    this: T,
    values: Record<string, unknown>,
  ): InstanceType<T> {
    return instantiateModel(this as unknown as ModelClass<T>, values);
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

function hasOwn(ctor: object, key: string | symbol): boolean {
  return Object.prototype.hasOwnProperty.call(ctor, key);
}

function getOrBuildSchema(ctor: Function): CoreSchema {
  if (hasOwn(ctor, CORE_SCHEMA_KEY)) {
    return (ctor as ModelClass)[CORE_SCHEMA_KEY]!;
  }
  collectModelFields(ctor);
  const schema = buildModelSchema(ctor);
  Object.defineProperty(ctor, CORE_SCHEMA_KEY, { value: schema });
  return schema;
}

function getOrBuildValidator(ctor: Function, schema: CoreSchema): SchemaValidator {
  if (hasOwn(ctor, VALIDATOR_KEY)) {
    return (ctor as ModelClass)[VALIDATOR_KEY]!;
  }
  const config = getModelConfig(ctor);
  const validator = new SchemaValidator(schema, { strict: config.strict });
  Object.defineProperty(ctor, VALIDATOR_KEY, { value: validator });
  return validator;
}

function instantiateModel<T extends new (...args: unknown[]) => object>(
  ctor: ModelClass<T>,
  data: Record<string, unknown>,
): InstanceType<T> {
  const config = getModelConfig(ctor);
  const instance = Object.create(ctor.prototype) as InstanceType<T>;

  for (const [key, value] of Object.entries(data)) {
    Object.defineProperty(instance, key, {
      value,
      writable: !config.frozen,
      enumerable: true,
      configurable: !config.frozen,
    });
  }

  if (config.frozen) Object.freeze(instance);
  return instance;
}

export { ValidationError };
```

### Important

`new User(...)` is **not** the primary API on main — `User.modelValidate(...)` is.  
If you want `new Test({ flag: 10 })` like `test.ts`, add:

```ts
constructor(data: Record<string, unknown> = {}) {
  // cannot easily call static modelValidate as super pattern;
  // prefer documenting modelValidate for V1
}
```

Or support both by documenting:

```ts
const test = Test.modelValidate({ flag: 10 });
```

Next: [05-public-exports-and-smoke.md](./05-public-exports-and-smoke.md)
