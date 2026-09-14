# Reference: Field decorator

Copied from `main`: `packages/typedantic/src/fields/field.ts`

```typescript
import type { FieldInfo } from '../internal/metadata.js';
import { registerModelField } from '../internal/field-registry.js';
import { getMetadata } from '../internal/reflect.js';

const FIELD_MARKER = Symbol('typedantic:fieldMarker');

export class FieldInfoImpl<T = unknown> implements FieldInfo<T> {
  readonly [FIELD_MARKER] = true;
  type?: new (...args: unknown[]) => T;
  default?: T;
  defaultFactory?: () => T;
  alias?: string;
  title?: string;
  description?: string;
  examples?: unknown[];
  deprecated?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
  ge?: number;
  gt?: number;
  le?: number;
  lt?: number;
  multipleOf?: number;
  strict?: boolean;
  jsonSchemaExtra?: Record<string, unknown>;

  constructor(options: FieldInfo<T> = {}) {
    Object.assign(this, options);
  }
}

type FieldDecorator = (target: object, propertyKey: string | symbol) => void;

export function Field<T = unknown>(options: FieldInfo<T> = {}): FieldInfoImpl<T> & FieldDecorator {
  const info = new FieldInfoImpl(options);

  const decorator = (target: object, propertyKey: string | symbol): void => {
    const designType = getMetadata('design:type', target, propertyKey);
    const fieldOptions: FieldInfo<T> = { ...options };
    if (!fieldOptions.type && designType && designType !== Object) {
      fieldOptions.type = designType as new (...args: unknown[]) => T;
    }
    registerModelField(target.constructor, String(propertyKey), fieldOptions);
  };

  return Object.assign(decorator, info) as FieldInfoImpl<T> & FieldDecorator;
}

export function isFieldInfo(value: unknown): value is FieldInfoImpl {
  return typeof value === 'object' && value !== null && FIELD_MARKER in value;
}

export type Annotated<T, M> = T & { __annotatedMeta?: M };

export function getAnnotatedMeta(metadata: unknown[]): FieldInfo | undefined {
  for (const item of metadata) {
    if (isFieldInfo(item)) return item;
  }
  return undefined;
}

```
