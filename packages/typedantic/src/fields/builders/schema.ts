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
