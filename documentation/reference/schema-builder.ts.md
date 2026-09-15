# Reference: schema-builder.ts

Copied from `main`: `packages/typedantic/src/internal/schema-builder.ts`

```typescript
import type { CoreSchema } from '@typedantic/core';
import type { ConfigDict, FieldInfo, FieldValidatorMeta, ModelFieldMeta, ModelValidatorMeta } from './metadata.js';
import { FIELD_VALIDATORS_KEY, MODEL_VALIDATORS_KEY } from './metadata.js';
import { getMetadata } from './reflect.js';
import { isFieldInfo } from '../fields/field.js';
import { getRegisteredFields, finalizeRegisteredFields } from './field-registry.js';
import { isSpecialType } from '../types/special.js';

export function inferSchemaFromType(type: unknown, fieldInfo?: FieldInfo): CoreSchema {
  const effectiveType = fieldInfo?.type ?? type;
  if (fieldInfo) {
    const base = inferTypeFromFieldInfo(fieldInfo) ?? buildBaseSchema(effectiveType, fieldInfo);
    return applyFieldConstraints(base, fieldInfo);
  }
  return buildBaseSchema(effectiveType);
}

function inferTypeFromFieldInfo(fieldInfo: FieldInfo): CoreSchema | null {
  if (
    fieldInfo.ge !== undefined ||
    fieldInfo.gt !== undefined ||
    fieldInfo.le !== undefined ||
    fieldInfo.lt !== undefined ||
    fieldInfo.multipleOf !== undefined
  ) {
    return { type: 'float' };
  }
  if (fieldInfo.minLength !== undefined || fieldInfo.maxLength !== undefined || fieldInfo.pattern !== undefined) {
    return { type: 'str' };
  }
  return null;
}

function inferItemSchema(type: unknown): CoreSchema {
  if (Array.isArray(type)) {
    const [item] = type as unknown[];
    return item ? inferSchemaFromType(item) : { type: 'any' };
  }
  if (type === Array) return { type: 'any' };
  return { type: 'str' };
}

function buildBaseSchema(type: unknown, fieldInfo?: FieldInfo): CoreSchema {
  if (fieldInfo?.default !== undefined) {
    const inner = Array.isArray(fieldInfo.default)
      ? { type: 'list' as const, itemsSchema: inferItemSchema(type) }
      : buildBaseSchema(type, undefined);
    return { type: 'default', schema: inner, defaultValue: fieldInfo.default };
  }
  if (fieldInfo?.defaultFactory) {
    return { type: 'default-factory', schema: buildBaseSchema(type), factory: fieldInfo.defaultFactory };
  }

  if (type === String || type === 'string') return { type: 'str' };
  if (type === Number || type === 'number') return { type: 'float' };
  if (type === Boolean || type === 'boolean') return { type: 'bool' };
  if (type === Date) return { type: 'date' };
  if (type === Array) return { type: 'list', itemsSchema: { type: 'any' } };

  if (Array.isArray(type)) {
    const [itemType] = type as unknown[];
    return { type: 'list', itemsSchema: inferSchemaFromType(itemType) };
  }

  if (typeof type === 'object' && type !== null) {
    const typeObj = type as Record<string, unknown>;
    if (isSpecialType(type)) {
      const schema: CoreSchema = { type: 'str' };
      if (type.pattern) {
        return { ...schema, pattern: type.pattern };
      }
      return schema;
    }
    if ('__enum' in typeObj) {
      return { type: 'enum', members: typeObj.__enum as string[] };
    }
    if ('__literal' in typeObj) {
      return { type: 'literal', expected: [typeObj.__literal] };
    }
    if ('__discriminatedUnion' in typeObj) {
      const du = typeObj.__discriminatedUnion as { discriminator: string; models: Function[] };
      return {
        type: 'union',
        discriminator: du.discriminator,
        choices: du.models.map((m) => buildModelSchema(m)),
      };
    }
    if ('__union' in typeObj) {
      return {
        type: 'union',
        choices: (typeObj.__union as unknown[]).map((t) => inferSchemaFromType(t)),
      };
    }
    if ('__nullable' in typeObj) {
      return { type: 'nullable', schema: inferSchemaFromType(typeObj.__nullable) };
    }
    if ('__optional' in typeObj) {
      return { type: 'optional', schema: inferSchemaFromType(typeObj.__optional) };
    }
    if ('__model' in typeObj) {
      return buildModelSchema(typeObj.__model as Function);
    }
  }

  if (typeof type === 'function' && isModelClass(type)) {
    return buildModelSchema(type);
  }

  return { type: 'any' };
}

function applyFieldConstraints(schema: CoreSchema, fieldInfo: FieldInfo): CoreSchema {
  if (schema.type === 'str') {
    return {
      ...schema,
      minLength: fieldInfo.minLength,
      maxLength: fieldInfo.maxLength,
      pattern: fieldInfo.pattern,
      strict: fieldInfo.strict,
    };
  }
  if (schema.type === 'int' || schema.type === 'float') {
    return {
      ...schema,
      ge: fieldInfo.ge,
      gt: fieldInfo.gt,
      le: fieldInfo.le,
      lt: fieldInfo.lt,
      multipleOf: fieldInfo.multipleOf,
      strict: fieldInfo.strict,
    };
  }
  return schema;
}

function isModelClass(type: Function): boolean {
  return 'modelFields' in type || type.prototype?.constructor?.name !== 'Object';
}

export function buildModelSchema(ctor: Function, config?: ConfigDict): CoreSchema {
  const fields = collectModelFields(ctor);
  const modelConfig = config ?? ((ctor as { modelConfig?: ConfigDict }).modelConfig ?? {});

  const modelFields: Record<string, import('@typedantic/core').ModelFieldSchema> = {};

  for (const [name, meta] of Object.entries(fields)) {
    let schema = meta.schema;

    const fieldValidators =
      (getMetadata(FIELD_VALIDATORS_KEY, ctor) as FieldValidatorMeta[]) ?? [];
    for (const v of fieldValidators) {
      if (!v.fields.includes(name)) continue;
      schema = wrapValidator(schema, v);
    }

    modelFields[name] = {
      schema,
      required: meta.required,
      alias: meta.alias,
      default: meta.default,
      defaultFactory: meta.defaultFactory,
    };
  }

  let coreSchema: CoreSchema = {
    type: 'model-fields',
    fields: modelFields,
    modelName: ctor.name,
    extra: modelConfig.extra ?? 'ignore',
    strict: modelConfig.strict,
  };

  const modelValidators =
    (getMetadata(MODEL_VALIDATORS_KEY, ctor) as ModelValidatorMeta[]) ?? [];

  for (const v of modelValidators) {
    if (v.mode === 'before') {
      coreSchema = {
        type: 'function-before',
        schema: coreSchema,
        fn: (data) => v.fn.call(ctor, data),
      };
    } else if (v.mode === 'wrap') {
      coreSchema = {
        type: 'function-wrap',
        schema: coreSchema,
        fn: (data, handler) => v.fn.call(ctor, data, handler),
      };
    } else if (v.mode === 'after') {
      coreSchema = {
        type: 'function-after',
        schema: coreSchema,
        fn: (data) => {
          const instance = Object.assign(Object.create(ctor.prototype), data);
          return v.fn.call(instance);
        },
      };
    }
  }

  return coreSchema;
}

function wrapValidator(schema: CoreSchema, v: FieldValidatorMeta): CoreSchema {
  switch (v.mode) {
    case 'before':
      return { type: 'function-before', schema, fn: v.fn };
    case 'after':
      return { type: 'function-after', schema, fn: v.fn };
    case 'wrap':
      return { type: 'function-wrap', schema, fn: v.fn as (v: unknown, h: (v: unknown) => unknown) => unknown };
    case 'plain':
      return { type: 'function-plain', fn: v.fn };
    default:
      return schema;
  }
}

export function collectModelFields(ctor: Function): Record<string, ModelFieldMeta> {
  const registered = getRegisteredFields(ctor);
  if (Object.keys(registered).length > 0) {
    return finalizeRegisteredFields(ctor, (fieldInfo, designType) =>
      inferSchemaFromType(designType ?? String, fieldInfo),
    );
  }

  const existing = (ctor as { modelFields?: Record<string, ModelFieldMeta> }).modelFields;
  if (existing && Object.keys(existing).length > 0) return existing;

  const fields: Record<string, ModelFieldMeta> = {};
  const prototype = ctor.prototype as Record<string, unknown>;

  for (const key of Object.getOwnPropertyNames(prototype)) {
    if (key === 'constructor') continue;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
    if (!descriptor || typeof descriptor.value === 'function') continue;

    const value = descriptor.value;
    let fieldInfo: FieldInfo | undefined;
    if (isFieldInfo(value)) {
      fieldInfo = value;
    }

    const designType = getMetadata('design:type', prototype, key);
    const schema = inferSchemaFromType(designType ?? String, fieldInfo);

    const hasDefault = fieldInfo?.default !== undefined || fieldInfo?.defaultFactory !== undefined;

    fields[key] = {
      name: key,
      fieldInfo,
      schema,
      required: !hasDefault,
      alias: fieldInfo?.alias,
      default: fieldInfo?.default,
      defaultFactory: fieldInfo?.defaultFactory,
    };
  }

  Object.defineProperty(ctor, 'modelFields', { value: fields, writable: true });
  return fields;
}

export function Literal<T extends string | number | boolean>(value: T): { __literal: T } {
  return { __literal: value };
}

export function DiscriminatedUnion<T extends Function>(
  discriminator: string,
  ...models: T[]
): { __discriminatedUnion: { discriminator: string; models: T[] } } {
  return { __discriminatedUnion: { discriminator, models } };
}

export function Union<T extends unknown[]>(...types: T): { __union: T } {
  return { __union: types };
}

export function Nullable<T>(type: T): { __nullable: T } {
  return { __nullable: type };
}

export function Optional<T>(type: T): { __optional: T } {
  return { __optional: type };
}

export function Enum<T extends string>(members: T[]): { __enum: T[] } {
  return { __enum: members };
}

export function ModelRef<T extends Function>(model: T): { __model: T } {
  return { __model: model };
}

```
