import {
    COMPUTED_FIELDS_KEY,
    FIELD_SERIALIZERS_KEY,
    MODEL_SERIALIZER_KEY,
    type ComputedFieldMeta,
    type RegisteredFieldSerializer,
    type RegisteredModelSerializer,
} from '../fields/types.js';
import { defineFieldPropertyMetadata, getFieldPropertyMetadata } from '../fields/properties.js';

function ctorOf(target: object | Function): Function {
    return typeof target === 'function' ? target : (target as { constructor: Function }).constructor;
}

export function fieldSerializer(
    field: string,
    options: { whenUsed?: RegisteredFieldSerializer['whenUsed'] } = {},
): MethodDecorator {
    const whenUsed = options.whenUsed ?? 'always';
    return (target, propertyKey, descriptor) => {
        const ctor = ctorOf(target as object);
        const list =
            (getFieldPropertyMetadata(FIELD_SERIALIZERS_KEY, ctor) as
                | RegisteredFieldSerializer[]
                | undefined) ?? [];
        const fn = (descriptor?.value ??
            (target as Record<string | symbol, unknown>)[
                propertyKey
            ]) as RegisteredFieldSerializer['fn'];
        list.push({ field, whenUsed, fn });
        defineFieldPropertyMetadata(FIELD_SERIALIZERS_KEY, list, ctor);
    };
}

export function modelSerializer(
    options: { mode?: RegisteredModelSerializer['mode'] } = {},
): MethodDecorator {
    const mode = options.mode ?? 'wrap';
    return (target, propertyKey, descriptor) => {
        const ctor = ctorOf(target as object);
        const fn = (descriptor?.value ??
            (target as Record<string | symbol, unknown>)[
                propertyKey
            ]) as RegisteredModelSerializer['fn'];
        defineFieldPropertyMetadata(MODEL_SERIALIZER_KEY, { mode, fn }, ctor);
    };
}

export function computedField(
    options: { alias?: string; title?: string; description?: string } = {},
): MethodDecorator {
    return (target, propertyKey) => {
        const ctor = ctorOf(target as object);
        const list =
            (getFieldPropertyMetadata(COMPUTED_FIELDS_KEY, ctor) as
                | ComputedFieldMeta[]
                | undefined) ?? [];
        const name = String(propertyKey);
        list.push({
            name,
            alias: options.alias,
            title: options.title,
            description: options.description,
        });
        defineFieldPropertyMetadata(COMPUTED_FIELDS_KEY, list, ctor);
    };
}

export function getFieldSerializers(ctor: Function): RegisteredFieldSerializer[] {
    return (
        (getFieldPropertyMetadata(FIELD_SERIALIZERS_KEY, ctor) as
            | RegisteredFieldSerializer[]
            | undefined) ?? []
    );
}

export function getModelSerializer(ctor: Function): RegisteredModelSerializer | undefined {
    return getFieldPropertyMetadata(MODEL_SERIALIZER_KEY, ctor) as
        | RegisteredModelSerializer
        | undefined;
}

export function getComputedFields(ctor: Function): ComputedFieldMeta[] {
    return (
        (getFieldPropertyMetadata(COMPUTED_FIELDS_KEY, ctor) as ComputedFieldMeta[] | undefined) ??
        []
    );
}
