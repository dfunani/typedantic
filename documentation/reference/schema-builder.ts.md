# `packages/typedantic/src/fields/builders/schema.ts` + `fields.ts`

**Package:** `@typedantic/model`  
**Note:** Live source (0.1) — authoritative for rebuild. Prefer phase pages for teaching order.

## `fields/builders/schema.ts`

```ts
import { BaseSchema, IntSchema, NumbersSchema, StringSchema } from "@typedantic/core";
import type { FieldInfo, ModelFieldMeta } from "../types.js";
import { getRegisteredFields } from "../properties.js";
import { finalizeRegisteredFields } from "../registry.js";
import { inferSchemaFromType } from "./fields.js";


export function getModelFields(ctor: Function): Record<string, ModelFieldMeta> {
    const registered = getRegisteredFields(ctor);
    if (Object.keys(registered).length === 0) return {};
    return finalizeRegisteredFields(ctor, inferSchemaFromType)
}

export function getSchemaConstraints(schema: BaseSchema, fieldInfo?: FieldInfo): BaseSchema {
    if (!fieldInfo) return schema;
    if (schema.type === 'string') {
        return buildStringSchemaConstraints(schema as StringSchema, fieldInfo);
    }
    if (schema.type === 'int' || schema.type === 'number') {
        return buildNumbersSchemaConstraints(schema, fieldInfo);
    }
    return schema;
}

export function getBaseSchemaFromType(type: unknown, fieldInfo?: FieldInfo): BaseSchema {
    if (type === String || type === 'string') return { type: 'string' };
    if (type === Number || type === 'int') return { type: 'int' };
    if (type === 'number') return { type: 'number' };
    if (type === Boolean || type === 'boolean') return { type: 'boolean' };
    if (type === Date || type === 'date') return { type: 'date' };

    if (!fieldInfo) return { type: 'string' };

    if (isNumberConstraint(fieldInfo)) return { type: 'int' };
    if (isStringConstraint(fieldInfo)) return { type: 'string' };

    return { type: 'string' };
}


function isNumberConstraint(fieldInfo: FieldInfo): boolean {
    return fieldInfo.ge !== undefined || fieldInfo.gt !== undefined || fieldInfo.le !== undefined || fieldInfo.lt !== undefined || fieldInfo.multipleOf !== undefined;
}

function isStringConstraint(fieldInfo: FieldInfo): boolean {
    return fieldInfo.minLength !== undefined || fieldInfo.maxLength !== undefined || fieldInfo.pattern !== undefined;
}


function buildStringSchemaConstraints(schema: BaseSchema, fieldInfo?: FieldInfo): StringSchema {
    if (!fieldInfo) return schema as StringSchema;
    return {
        ...schema,
        minLength: fieldInfo.minLength,
        maxLength: fieldInfo.maxLength,
        pattern: fieldInfo.pattern,
        strict: fieldInfo.strict,
    } as StringSchema;
}

function buildNumbersSchemaConstraints(schema: BaseSchema, fieldInfo?: FieldInfo): IntSchema | NumbersSchema {
    if (!fieldInfo) return schema as IntSchema | NumbersSchema;
    return {
        ...schema,
        ge: fieldInfo.ge,
        gt: fieldInfo.gt,
        le: fieldInfo.le,
        lt: fieldInfo.lt,
        multipleOf: fieldInfo.multipleOf,
        strict: fieldInfo.strict,
    } as IntSchema | NumbersSchema;
}
```

## `fields/builders/fields.ts`

```ts
import { ConfigDict, FieldInfo } from '../types.js';
import { getBaseSchemaFromType, getModelFields, getSchemaConstraints } from './schema.js';
import { BaseSchema, ModelFieldSchema } from '@typedantic/core';



export function buildModelFieldSchema(ctor: Function, config?: ConfigDict): BaseSchema {
    const fields = getModelFields(ctor);
    const modelConfig = config ?? ((ctor as { modelConfig?: ConfigDict }).modelConfig ?? {});

    const modelFields: Record<string, ModelFieldSchema> = {};
    for (const [name, meta] of Object.entries(fields)) {
        let schema = meta.schema;

        // V1: apply defaults as schema wrappers if you already added default nodes to CoreSchema.
        // If not, rely on ModelFieldSchema.default / defaultFactory (supported by compileModelFields).
        modelFields[name] = {
            schema,
            required: meta.required,
            alias: meta.alias,
            default: meta.default,
            defaultFactory: meta.defaultFactory,
        };
    }

    return {
        type: 'model-fields',
        fields: modelFields,
        modelName: ctor.name,
        extra: modelConfig.extra ?? 'ignore',
        strict: modelConfig.strict,
    };
}

export function inferSchemaFromType(type: unknown, fieldInfo?: FieldInfo): BaseSchema {
    const schema = inferBaseSchema(type, fieldInfo);
    return wrapNullable(schema, fieldInfo);
}

function inferBaseSchema(type: unknown, fieldInfo?: FieldInfo): BaseSchema {
    if (fieldInfo?.literal !== undefined) {
        return inferLiteralSchema(fieldInfo);
    }
    if (fieldInfo?.enum) {
        return { type: 'enum', members: fieldInfo.enum };
    }
    if (fieldInfo?.union) {
        return inferUnionSchema(fieldInfo);
    }

    const effective = fieldInfo?.type ?? type;

    if (effective === Date || effective === 'date') {
        return { type: 'date' };
    }
    if (effective === Array || effective === 'array') {
        return inferArraySchema(fieldInfo);
    }
    if (effective === 'object' || fieldInfo?.values !== undefined || fieldInfo?.keys !== undefined) {
        return inferObjectSchema(fieldInfo);
    }
    if (effective === 'number') {
        return getSchemaConstraints({ type: 'number' }, fieldInfo);
    }
    if (isModelConstructor(effective)) {
        return buildModelFieldSchema(effective);
    }

    const base = getBaseSchemaFromType(effective, fieldInfo);
    return getSchemaConstraints(base, fieldInfo);
}

function wrapNullable(schema: BaseSchema, fieldInfo?: FieldInfo): BaseSchema {
    if (fieldInfo?.nullable) return { type: 'nullable', schema };
    return schema;
}

function isModelConstructor(type: unknown): type is Function {
    return typeof type === 'function'
        && type !== String
        && type !== Number
        && type !== Boolean
        && type !== Date
        && type !== Array
        && type !== Object
        && typeof (type as { modelValidate?: unknown }).modelValidate === 'function';
}


function inferLiteralSchema(fieldInfo: FieldInfo): BaseSchema {
    if (Array.isArray(fieldInfo.literal)) {
        return { type: 'literal', expected: fieldInfo.literal };
    }
    return { type: 'literal', expected: [fieldInfo.literal] };
}

function inferUnionSchema(fieldInfo: FieldInfo): BaseSchema {
    return {
        type: 'union',
        choices: fieldInfo.union?.map((choice) => inferSchemaFromType(choice)) ?? [],
        discriminator: fieldInfo.discriminator,
    };
}

function inferObjectSchema(fieldInfo?: FieldInfo): BaseSchema {
    return {
        type: 'object',
        valuesSchema: inferSchemaFromType(fieldInfo?.values ?? String),
        keysSchema: fieldInfo?.keys ? inferSchemaFromType(fieldInfo.keys) : undefined,
    };
}

function inferArraySchema(fieldInfo?: FieldInfo): BaseSchema {
    return {
        type: 'array',
        itemsSchema: inferSchemaFromType(fieldInfo?.items ?? String),
        minLength: fieldInfo?.minLength,
        maxLength: fieldInfo?.maxLength,
    };
}
```
