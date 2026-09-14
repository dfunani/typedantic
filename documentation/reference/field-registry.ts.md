# Reference: field-registry.ts

Copied from `main`: `packages/typedantic/src/internal/field-registry.ts`

```typescript
import type { FieldInfo, ModelFieldMeta } from './metadata.js';
import { getMetadata, defineMetadata } from './reflect.js';

const MODEL_FIELDS_REGISTRY = Symbol('typedantic:fieldsRegistry');

function resolveFieldType(fieldInfo: FieldInfo | undefined, designType?: unknown): unknown {
  if (fieldInfo?.type) return fieldInfo.type;
  if (designType && designType !== Object) return designType;
  return undefined;
}

export function registerModelField(ctor: Function, name: string, fieldInfo: FieldInfo): void {
  const registry = (getMetadata(MODEL_FIELDS_REGISTRY, ctor) as Record<string, ModelFieldMeta>) ?? {};
  const hasDefault = fieldInfo.default !== undefined || fieldInfo.defaultFactory !== undefined;

  registry[name] = {
    name,
    fieldInfo,
    schema: { type: 'any' },
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
  buildSchema: (fieldInfo: FieldInfo | undefined, designType?: unknown) => import('@typedantic/core').CoreSchema,
): Record<string, ModelFieldMeta> {
  const registry = getRegisteredFields(ctor);
  const prototype = ctor.prototype as object;

  for (const [name, meta] of Object.entries(registry)) {
    const designType = getMetadata('design:type', prototype, name);
    const fieldType = resolveFieldType(meta.fieldInfo, designType);
    meta.schema = buildSchema(meta.fieldInfo, fieldType ?? String);
  }

  Object.defineProperty(ctor, 'modelFields', { value: registry, writable: true, configurable: true });
  return registry;
}

```
