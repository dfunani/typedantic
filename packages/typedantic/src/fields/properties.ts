import 'reflect-metadata';
import type { ModelFieldMeta } from './types.js';
import { MODEL_FIELDS_REGISTRY } from './types.js';

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

export function getFieldPropertyMetadata(
    key: string | symbol,
    target: object,
    propertyKey?: string | symbol,
): unknown {
    return reflect.getMetadata?.(key, target, propertyKey);
}

export function getRegisteredFields(ctor: Function): Record<string, ModelFieldMeta> {
    return (getFieldPropertyMetadata(MODEL_FIELDS_REGISTRY, ctor) as Record<string, ModelFieldMeta>) ?? {};
}

export function defineFieldPropertyMetadata(
    key: string | symbol,
    value: unknown,
    target: object,
    propertyKey?: string | symbol,
): void {
    reflect.defineMetadata?.(key, value, target, propertyKey);
}

export function defineFieldProperty(ctor: object, name: string, value: unknown): void {
    Object.defineProperty(ctor, name, { value, writable: true, configurable: true });
}
