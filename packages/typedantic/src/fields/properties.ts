import 'reflect-metadata';

type FieldPropertyMetadata = {
    getFieldPropertyMetadata?(key: string | symbol, target: object, propertyKey?: string | symbol): unknown;
    defineFieldPropertyMetadata?(
        key: string | symbol,
        value: unknown,
        target: object,
        propertyKey?: string | symbol,
    ): void;
};

const reflect = Reflect as FieldPropertyMetadata;

export function getFieldPropertyMetadata(
    key: string | symbol,
    target: object,
    propertyKey?: string | symbol,
): unknown {
    return reflect.getFieldPropertyMetadata?.(key as string, target, propertyKey);
}

export function defineFieldPropertyMetadata(
    key: string | symbol,
    value: unknown,
    target: object,
    propertyKey?: string | symbol,
): void {
    reflect.defineFieldPropertyMetadata?.(key as string, value, target, propertyKey);
}