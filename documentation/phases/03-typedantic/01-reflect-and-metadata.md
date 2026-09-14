# Reflect + metadata contracts

Read first: [../../topics/reflect-metadata.md](../../topics/reflect-metadata.md)

## `packages/typedantic/src/internal/reflect.ts`

Copy from [../../reference/reflect.ts.md](../../reference/reflect.ts.md) (or paste below):

```ts
import 'reflect-metadata';

type ReflectMetadata = {
  getMetadata?(key: string | symbol, target: object, propertyKey?: string | symbol): unknown;
  defineMetadata?(
    key: string | symbol,
    value: unknown,
    target: object,
    propertyKey?: string | symbol,
  ): void;
};

const reflect = Reflect as ReflectMetadata;

export function getMetadata(
  key: string | symbol,
  target: object,
  propertyKey?: string | symbol,
): unknown {
  return reflect.getMetadata?.(key as string, target, propertyKey);
}

export function defineMetadata(
  key: string | symbol,
  value: unknown,
  target: object,
  propertyKey?: string | symbol,
): void {
  reflect.defineMetadata?.(key as string, value, target, propertyKey);
}
```

## `packages/typedantic/src/internal/metadata.ts`

V1 can use a trimmed version; full main file: [../../reference/metadata.ts.md](../../reference/metadata.ts.md)

```ts
import type { CoreSchema, SchemaSerializer, SchemaValidator } from '@typedantic/core';

export const MODEL_CONFIG_KEY = Symbol('typedantic:modelConfig');
export const FIELD_VALIDATORS_KEY = Symbol('typedantic:fieldValidators');
export const MODEL_VALIDATORS_KEY = Symbol('typedantic:modelValidators');
export const CORE_SCHEMA_KEY = Symbol('typedantic:coreSchema');
export const VALIDATOR_KEY = Symbol('typedantic:validator');
export const SERIALIZER_KEY = Symbol('typedantic:serializer');

export interface FieldInfo<T = unknown> {
  /** Prefer explicit runtime type — Vitest often omits design:type */
  type?: unknown;
  default?: T;
  defaultFactory?: () => T;
  alias?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
  ge?: number;
  gt?: number;
  le?: number;
  lt?: number;
  multipleOf?: number;
  strict?: boolean;
  title?: string;
  description?: string;
}

export interface ConfigDict {
  strict?: boolean;
  frozen?: boolean;
  extra?: 'ignore' | 'allow' | 'forbid';
  validateAssignment?: boolean;
}

export interface ModelFieldMeta {
  name: string;
  fieldInfo?: FieldInfo;
  schema: CoreSchema;
  required: boolean;
  alias?: string;
  default?: unknown;
  defaultFactory?: () => unknown;
}

export type ModelClass<T extends new (...args: unknown[]) => object = new (...args: unknown[]) => object> =
  T & {
    modelFields: Record<string, ModelFieldMeta>;
    modelConfig: ConfigDict;
    [CORE_SCHEMA_KEY]?: CoreSchema;
    [VALIDATOR_KEY]?: SchemaValidator;
    [SERIALIZER_KEY]?: SchemaSerializer;
  };
```

**Import rule:** `from '@typedantic/core'` — never relative into core `src/`.  
See [../../topics/workspaces-and-imports.md](../../topics/workspaces-and-imports.md).

Next: [02-field-and-registry.md](./02-field-and-registry.md)
