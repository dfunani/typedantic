import { defineFieldProperty, defineFieldPropertyMetadata, getFieldPropertyMetadata, getRegisteredFields } from "./properties.js";
import { FieldInfo, MODEL_FIELDS_REGISTRY, ModelFieldMeta } from "./types.js";
import type { BaseSchema } from "@typedantic/core";

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
    defineFieldProperty(ctor, 'modelFields', registry);
}



export function finalizeRegisteredFields(
    ctor: Function,
    buildSchema: (type: unknown, fieldInfo?: FieldInfo) => BaseSchema,
): Record<string, ModelFieldMeta> {
    const registry = getRegisteredFields(ctor);
    const prototype = ctor.prototype as object;

    for (const [, meta] of Object.entries(registry)) {
        const designType = getFieldPropertyMetadata('design:type', prototype, meta.name);
        const fieldType = meta.fieldInfo?.type ?? (designType !== Object ? designType : undefined);
        meta.schema = buildSchema(fieldType ?? String, meta.fieldInfo);
    }

    defineFieldProperty(ctor, 'modelFields', registry);
    return registry;
}

