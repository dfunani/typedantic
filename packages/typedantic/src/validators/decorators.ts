import {
    FIELD_VALIDATORS_KEY,
    MODEL_VALIDATORS_KEY,
    type RegisteredFieldValidator,
    type RegisteredModelValidator,
    type ValidatorMode,
} from '../fields/types.js';
import { defineFieldPropertyMetadata, getFieldPropertyMetadata } from '../fields/properties.js';

/** Instance methods: target is prototype; static methods: target is the constructor. */
function ctorOf(target: object | Function): Function {
    return typeof target === 'function' ? target : (target as { constructor: Function }).constructor;
}

export function fieldValidator(
    field: string,
    options: { mode?: ValidatorMode } = {},
): MethodDecorator {
    const mode = options.mode ?? 'after';
    return (target, propertyKey, descriptor) => {
        const ctor = ctorOf(target as object);
        const list =
            (getFieldPropertyMetadata(FIELD_VALIDATORS_KEY, ctor) as
                | RegisteredFieldValidator[]
                | undefined) ?? [];
        const fn = (descriptor?.value ??
            (target as Record<string | symbol, unknown>)[propertyKey]) as RegisteredFieldValidator['fn'];
        list.push({ field, mode, fn });
        defineFieldPropertyMetadata(FIELD_VALIDATORS_KEY, list, ctor);
    };
}

export function modelValidator(
    options: { mode?: RegisteredModelValidator['mode'] } = {},
): MethodDecorator {
    const mode = options.mode ?? 'after';
    return (target, propertyKey, descriptor) => {
        const ctor = ctorOf(target as object);
        const list =
            (getFieldPropertyMetadata(MODEL_VALIDATORS_KEY, ctor) as
                | RegisteredModelValidator[]
                | undefined) ?? [];
        const fn = (descriptor?.value ??
            (target as Record<string | symbol, unknown>)[propertyKey]) as RegisteredModelValidator['fn'];
        list.push({ mode, fn });
        defineFieldPropertyMetadata(MODEL_VALIDATORS_KEY, list, ctor);
    };
}

export function getFieldValidators(ctor: Function): RegisteredFieldValidator[] {
    return (
        (getFieldPropertyMetadata(FIELD_VALIDATORS_KEY, ctor) as
            | RegisteredFieldValidator[]
            | undefined) ?? []
    );
}

export function getModelValidators(ctor: Function): RegisteredModelValidator[] {
    return (
        (getFieldPropertyMetadata(MODEL_VALIDATORS_KEY, ctor) as
            | RegisteredModelValidator[]
            | undefined) ?? []
    );
}
