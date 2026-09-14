# Reference: BaseModel

Copied from `main`: `packages/typedantic/src/models/base-model.ts`

```typescript
import {
  SchemaSerializer,
  SchemaValidator,
  ValidationError,
  type CoreSchema,
  type DumpOptions,
} from '@typedantic/core';
import { getModelConfig } from '../config/model-config.js';
import {
  CORE_SCHEMA_KEY,
  SERIALIZER_KEY,
  VALIDATOR_KEY,
  type ConfigDict,
  type ModelClass,
  type ModelFieldMeta,
} from '../internal/metadata.js';
import { buildModelSchema, collectModelFields } from '../internal/schema-builder.js';
import { generateJsonSchema } from '../json-schema/generator.js';
import { getComputedFields } from '../validators/field-validator.js';
import { applyFieldSerializers } from '../serializers/field-serializer.js';

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

  static modelValidateJson<T extends typeof BaseModel>(this: T, json: string): InstanceType<T> {
    const schema = getOrBuildSchema(this);
    const validator = getOrBuildValidator(this, schema);
    const validated = validator.validateJson(json);
    return instantiateModel(this as unknown as ModelClass<T>, validated as Record<string, unknown>);
  }

  static modelConstruct<T extends typeof BaseModel>(
    this: T,
    values: Record<string, unknown>,
  ): InstanceType<T> {
    return instantiateModel(this as unknown as ModelClass<T>, values);
  }

  static modelJsonSchema(this: ModelClass): Record<string, unknown> {
    const schema = getOrBuildSchema(this);
    return generateJsonSchema(schema, this.name);
  }

  modelDump(options?: DumpOptions): Record<string, unknown> {
    const ctor = this.constructor as ModelClass;
    const schema = getOrBuildSchema(ctor);
    const serializer = getOrBuildSerializer(ctor, schema);
    let data = serializer.toPython(this, options) as Record<string, unknown>;

    for (const name of getComputedFields(ctor)) {
      const value = (this as Record<string, unknown>)[name];
      if (typeof value === 'function') {
        data[name] = value.call(this);
      } else {
        data[name] = value;
      }
    }

    return applyFieldSerializers(ctor, data);
  }

  modelDumpJson(options?: DumpOptions): string {
    const ctor = this.constructor as ModelClass;
    const schema = getOrBuildSchema(ctor);
    const serializer = getOrBuildSerializer(ctor, schema);
    return serializer.toJson(this, options);
  }

  modelCopy(update?: Record<string, unknown>): this {
    const ctor = this.constructor as ModelClass<typeof BaseModel>;
    const config = getModelConfig(ctor);
    const data = { ...this.modelDump(), ...update };

    if (config.validateAssignment !== false && update) {
      return ctor.modelValidate(data) as this;
    }

    return instantiateModel(ctor, data) as this;
  }
}

function getOrBuildSchema(ctor: Function): CoreSchema {
  if ((ctor as ModelClass)[CORE_SCHEMA_KEY]) {
    return (ctor as ModelClass)[CORE_SCHEMA_KEY]!;
  }
  collectModelFields(ctor);
  const schema = buildModelSchema(ctor);
  Object.defineProperty(ctor, CORE_SCHEMA_KEY, { value: schema });
  return schema;
}

function getOrBuildValidator(ctor: Function, schema: CoreSchema): SchemaValidator {
  if ((ctor as ModelClass)[VALIDATOR_KEY]) {
    return (ctor as ModelClass)[VALIDATOR_KEY]!;
  }
  const config = getModelConfig(ctor);
  const validator = new SchemaValidator(schema, { strict: config.strict });
  Object.defineProperty(ctor, VALIDATOR_KEY, { value: validator });
  return validator;
}

function getOrBuildSerializer(ctor: Function, schema: CoreSchema): SchemaSerializer {
  if ((ctor as ModelClass)[SERIALIZER_KEY]) {
    return (ctor as ModelClass)[SERIALIZER_KEY]!;
  }
  const serializer = new SchemaSerializer(schema);
  Object.defineProperty(ctor, SERIALIZER_KEY, { value: serializer });
  return serializer;
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

  if (config.frozen) {
    Object.freeze(instance);
  }

  return instance;
}

export { ValidationError };

```
