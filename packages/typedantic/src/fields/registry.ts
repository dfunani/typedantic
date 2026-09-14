import { BaseSchema } from "@typedantic/core";
import { defineFieldPropertyMetadata, getFieldPropertyMetadata } from "./properties.js";
import type { FieldInfo, ModelFieldMeta } from "./types.js";


const MODEL_FIELDS_REGISTRY = Symbol('typedantic:fieldsRegistry');

export function registerModelField(ctor: Function, name: string, fieldInfo: FieldInfo): void {
    const registry = (getFieldPropertyMetadata(MODEL_FIELDS_REGISTRY, ctor) as Record<string, ModelFieldMeta>) ?? {};
    const hasDefault = fieldInfo.default !== undefined || fieldInfo.defaultFactory !== undefined;

    registry[name] = {
        name,
        fieldInfo,
        schema: { type: 'string' }, // temporary; finalized later
        required: !hasDefault,
        alias: fieldInfo.alias,
        default: fieldInfo.default,
        defaultFactory: fieldInfo.defaultFactory,
    };

    defineFieldPropertyMetadata(MODEL_FIELDS_REGISTRY, registry, ctor);
    Object.defineProperty(ctor, 'modelFields', { value: registry, writable: true, configurable: true });
}

export function getRegisteredFields(ctor: Function): Record<string, ModelFieldMeta> {
    return (getFieldPropertyMetadata(MODEL_FIELDS_REGISTRY, ctor) as Record<string, ModelFieldMeta>) ?? {};
}

export function finalizeRegisteredFields(
    ctor: Function,
    buildSchema: (fieldInfo: FieldInfo | undefined, designType?: unknown) => BaseSchema,
): Record<string, ModelFieldMeta> {
    const registry = getRegisteredFields(ctor);
    const prototype = ctor.prototype as object;

    for (const [, meta] of Object.entries(registry)) {
        const designType = getFieldPropertyMetadata('design:type', prototype, meta.name);
        const fieldType = meta.fieldInfo?.type ?? (designType !== Object ? designType : undefined);
        meta.schema = buildSchema(meta.fieldInfo, fieldType ?? String);
    }

    Object.defineProperty(ctor, 'modelFields', { value: registry, writable: true, configurable: true });
    return registry;
}