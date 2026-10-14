# 3.1 — Reflect helpers and field types

Files:

- `packages/typedantic/src/fields/properties.ts`
- `packages/typedantic/src/fields/types.ts`

Import `reflect-metadata` once before any model class loads (see smoke test).

## Reflect wrappers (`properties.ts`)

Thin helpers over `Reflect.getMetadata` / `defineMetadata`:

```ts
import 'reflect-metadata';
import type { ModelFieldMeta } from './types.js';
import { MODEL_FIELDS_REGISTRY } from './types.js';

export function getFieldPropertyMetadata(
    key: string | symbol,
    target: object,
    propertyKey?: string | symbol,
): unknown {
    return (Reflect as { getMetadata?: Function }).getMetadata?.(key, target, propertyKey);
}

export function getRegisteredFields(ctor: Function): Record<string, ModelFieldMeta> {
    return (getFieldPropertyMetadata(MODEL_FIELDS_REGISTRY, ctor) as Record<string, ModelFieldMeta>) ?? {};
}

export function defineFieldPropertyMetadata(
    key: string | symbol,
    value: unknown,
    target: object,
    propertyKey?: string | symbol,
): void {
    (Reflect as { defineMetadata?: Function }).defineMetadata?.(key, value, target, propertyKey);
}

export function defineFieldProperty(ctor: object, name: string, value: unknown): void {
    Object.defineProperty(ctor, name, { value, writable: true, configurable: true });
}
```

`getRegisteredFields` reads the `@Field` registry stored under `MODEL_FIELDS_REGISTRY`.

## Symbols and types (`types.ts`)

Key exports:

```ts
export const MODEL_CONFIG_KEY = Symbol('typedantic:modelConfig');
export const CORE_SCHEMA_KEY = Symbol('typedantic:coreSchema');
export const VALIDATOR_KEY = Symbol('typedantic:validator');
export const MODEL_FIELDS_REGISTRY = Symbol('typedantic:fieldsRegistry');
// FIELD_VALIDATORS_KEY, MODEL_VALIDATORS_KEY, SERIALIZER_KEY — reserved for V2
```

`FieldInfo` holds decorator options (`type`, constraints, `union`, `items`, `default`, `alias`, …). Full list is in the live file.

`ModelFieldMeta` is the runtime registry entry:

```ts
export interface ModelFieldMeta {
    name: string;
    fieldInfo?: FieldInfo;
    schema: BaseSchema;       // filled in finalizeRegisteredFields
    required: boolean;
    alias?: string;
    default?: unknown;
    defaultFactory?: () => unknown;
}
```

`ModelClass` augments constructors with cached schema/validator and `modelFields`.

## tsconfig requirements

From root `tsconfig.base.json`:

```json
"experimentalDecorators": true,
"emitDecoratorMetadata": true,
"useDefineForClassFields": false
```

Without these, `design:type` metadata is missing and you must pass `@Field({ type: String })` explicitly.

## Checklist

- [ ] `MODEL_FIELDS_REGISTRY` symbol defined
- [ ] `FieldInfo` documents `type`, constraints, nested shapes
- [ ] `properties.ts` does not import `@typedantic/core` beyond types used in `ModelFieldMeta`

Next: [02-field-and-registry.md](./02-field-and-registry.md)
