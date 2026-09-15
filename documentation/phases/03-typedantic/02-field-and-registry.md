# `@Field` + field registry

## Registry — `packages/typedantic/src/internal/field-registry.ts`

Full main: [../../reference/field-registry.ts.md](../../reference/field-registry.ts.md)

Key points:

1. Store registry metadata on the **constructor**
2. Initial `schema: { type: 'str' }` placeholder is OK for V1 — **do not use `any` unless core supports it**
3. `finalizeRegisteredFields(ctor, buildSchema)` fills real schemas later

```ts
import type { CoreSchema } from '@typedantic/core';
import type { FieldInfo, ModelFieldMeta } from './metadata.js';
import { getMetadata, defineMetadata } from './reflect.js';

const MODEL_FIELDS_REGISTRY = Symbol('typedantic:fieldsRegistry');

export function registerModelField(ctor: Function, name: string, fieldInfo: FieldInfo): void {
  const registry = (getMetadata(MODEL_FIELDS_REGISTRY, ctor) as Record<string, ModelFieldMeta>) ?? {};
  const hasDefault = fieldInfo.default !== undefined || fieldInfo.defaultFactory !== undefined;

  registry[name] = {
    name,
    fieldInfo,
    schema: { type: 'str' }, // temporary; finalized later
    required: !hasDefault,
    alias: fieldInfo.alias,
    default: fieldInfo.default,
    defaultFactory: fieldInfo.defaultFactory,
  };

  defineMetadata(MODEL_FIELDS_REGISTRY, registry, ctor);
  Object.defineProperty(ctor, 'modelFields', { value: registry, writable: true, configurable: true });
}

export function getRegisteredFields(ctor: Function): Record<string, ModelFieldMeta> {
  return (getMetadata(MODEL_FIELDS_REGISTRY, ctor) as Record<string, ModelFieldMeta>) ?? {};
}

export function finalizeRegisteredFields(
  ctor: Function,
  buildSchema: (fieldInfo: FieldInfo | undefined, designType?: unknown) => CoreSchema,
): Record<string, ModelFieldMeta> {
  const registry = getRegisteredFields(ctor);
  const prototype = ctor.prototype as object;

  for (const [, meta] of Object.entries(registry)) {
    const designType = getMetadata('design:type', prototype, meta.name);
    const fieldType = meta.fieldInfo?.type ?? (designType !== Object ? designType : undefined);
    meta.schema = buildSchema(meta.fieldInfo, fieldType ?? String);
  }

  Object.defineProperty(ctor, 'modelFields', { value: registry, writable: true, configurable: true });
  return registry;
}
```

## Field — `packages/typedantic/src/fields/field.ts`

Full main: [../../reference/field.ts.md](../../reference/field.ts.md)

```ts
import type { FieldInfo } from '../internal/metadata.js';
import { registerModelField } from '../internal/field-registry.js';
import { getMetadata } from '../internal/reflect.js';

export function Field<T = unknown>(options: FieldInfo<T> = {}) {
  return (target: object, propertyKey: string | symbol): void => {
    const designType = getMetadata('design:type', target, propertyKey);
    const fieldOptions: FieldInfo<T> = { ...options };
    if (!fieldOptions.type && designType && designType !== Object) {
      fieldOptions.type = designType;
    }
    registerModelField(target.constructor, String(propertyKey), fieldOptions);
  };
}
```

### Usage (always prefer explicit type in tests)

```ts
@Field({ type: String, minLength: 1 })
name!: string;

@Field({ type: Number, ge: 0 })  // Number → int in V1 builder
age!: number;

@Field({ type: Boolean })
active!: boolean;

@Field({ type: [String], defaultFactory: () => [] }) // V2 list — skip in V1
tags!: string[];
```

### Model config (tiny)

`packages/typedantic/src/config/model-config.ts`:

```ts
import { defineMetadata } from '../internal/reflect.js';
import type { ConfigDict } from '../internal/metadata.js';
import { MODEL_CONFIG_KEY } from '../internal/metadata.js';

export function modelConfig(config: ConfigDict): ClassDecorator {
  return (target) => {
    Object.defineProperty(target, 'modelConfig', {
      value: { ...(target as { modelConfig?: ConfigDict }).modelConfig, ...config },
      writable: true,
      configurable: true,
    });
    defineMetadata(MODEL_CONFIG_KEY, config, target);
  };
}

export function getModelConfig(ctor: Function): ConfigDict {
  return ((ctor as { modelConfig?: ConfigDict }).modelConfig ?? {}) as ConfigDict;
}
```

Next: [03-schema-builder-v1.md](./03-schema-builder-v1.md)
