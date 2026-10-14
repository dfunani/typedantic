import {
    defineFieldProperty,
    defineFieldPropertyMetadata,
    getFieldPropertyMetadata,
    getRegisteredFields,
} from './properties.js';
import { FieldInfo, MODEL_FIELDS_REGISTRY, ModelFieldMeta } from './types.js';
import type { BaseSchema } from '@typedantic/core';

type ReflectOwn = {
    getOwnMetadata?(key: string | symbol, target: object): unknown;
};

const reflectOwn = Reflect as ReflectOwn;

/** Own registry only — copies inherited fields so subclasses cannot mutate parents (B1). */
function getOwnRegistry(ctor: Function): Record<string, ModelFieldMeta> {
    const own = reflectOwn.getOwnMetadata?.(MODEL_FIELDS_REGISTRY, ctor) as
        | Record<string, ModelFieldMeta>
        | undefined;
    if (own) return own;
    const inherited =
        (getFieldPropertyMetadata(MODEL_FIELDS_REGISTRY, ctor) as Record<string, ModelFieldMeta>) ??
        {};
    return { ...inherited };
}

export function registerModelField(ctor: Function, name: string, fieldInfo: FieldInfo): void {
    const registry = getOwnRegistry(ctor);
    const hasDefault =
        fieldInfo.default !== undefined || fieldInfo.defaultFactory !== undefined;

    registry[name] = {
        name,
        fieldInfo,
        schema: { type: 'string' },
        required: !hasDefault && !fieldInfo.exclude,
        alias: fieldInfo.alias ?? fieldInfo.validationAlias,
        default: fieldInfo.default,
        defaultFactory: fieldInfo.defaultFactory,
    };

    defineFieldPropertyMetadata(MODEL_FIELDS_REGISTRY, registry, ctor);
    defineFieldProperty(ctor, 'modelFields', registry);
    // Invalidate finalized cache when new fields register.
    if (Object.prototype.hasOwnProperty.call(ctor, FIELDS_FINALIZED)) {
        delete (ctor as unknown as Record<symbol, unknown>)[FIELDS_FINALIZED];
    }
}

export const FIELDS_FINALIZED = Symbol('typedantic:fieldsFinalized');

export function finalizeRegisteredFields(
    ctor: Function,
    buildSchema: (type: unknown, fieldInfo?: FieldInfo) => BaseSchema,
): Record<string, ModelFieldMeta> {
    if (Object.prototype.hasOwnProperty.call(ctor, FIELDS_FINALIZED)) {
        return getRegisteredFields(ctor);
    }

    const registry = getRegisteredFields(ctor);
    const prototype = ctor.prototype as object;

    for (const [, meta] of Object.entries(registry)) {
        const designType = getFieldPropertyMetadata('design:type', prototype, meta.name);
        const fieldType =
            meta.fieldInfo?.type ?? (designType !== Object ? designType : undefined);
        meta.schema = buildSchema(fieldType ?? String, meta.fieldInfo);
    }

    defineFieldProperty(ctor, 'modelFields', registry);
    Object.defineProperty(ctor, FIELDS_FINALIZED, { value: true, configurable: true });
    return registry;
}
