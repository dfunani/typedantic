import { BaseSchema, NumbersSchema, StringSchema } from "@typedantic/core";
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
    if (schema.type === 'number') {
        return buildNumbersSchemaConstraints(schema as NumbersSchema, fieldInfo);
    }
    return schema;
}

export function getBaseSchemaFromType(type: unknown, fieldInfo?: FieldInfo): BaseSchema {
    if (type === String || type === 'string') return { type: 'string' };
    if (type === Number || type === 'number') return { type: 'number' }; // V1 choice: Number → int
    if (type === Boolean || type === 'boolean') return { type: 'boolean' };

    if (!fieldInfo) return { type: 'string' };

    if (isNumberConstraint(fieldInfo)) return { type: 'number' };
    if (isStringConstraint(fieldInfo)) return { type: 'string' };

    return { type: type } as BaseSchema; // safe fallback for V1 (never emit unsupported nodes)
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

function buildNumbersSchemaConstraints(schema: BaseSchema, fieldInfo?: FieldInfo): NumbersSchema {
    if (!fieldInfo) return schema as NumbersSchema;
    return {
        ...schema,
        ge: fieldInfo.ge,
        gt: fieldInfo.gt,
        le: fieldInfo.le,
        lt: fieldInfo.lt,
        multipleOf: fieldInfo.multipleOf,
        strict: fieldInfo.strict,
    } as NumbersSchema;
}