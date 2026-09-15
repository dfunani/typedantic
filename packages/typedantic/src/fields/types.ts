import type { BaseSchema, SchemaValidator } from '@typedantic/core';

export const MODEL_CONFIG_KEY = Symbol('typedantic:modelConfig');
export const FIELD_VALIDATORS_KEY = Symbol('typedantic:fieldValidators');
export const MODEL_VALIDATORS_KEY = Symbol('typedantic:modelValidators');
export const CORE_SCHEMA_KEY = Symbol('typedantic:coreSchema');
export const VALIDATOR_KEY = Symbol('typedantic:validator');
export const SERIALIZER_KEY = Symbol('typedantic:serializer');
export const MODEL_FIELDS_REGISTRY = Symbol('typedantic:fieldsRegistry');

export interface FieldInfo<T = unknown> {
    /** Prefer explicit runtime type — Vitest often omits design:type */
    type?: unknown;
    default?: T;
    defaultFactory?: () => T;
    alias?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp | string;
    ge?: number;
    gt?: number;
    le?: number;
    lt?: number;
    multipleOf?: number;
    strict?: boolean;
    title?: string;
    description?: string;
}

export interface ConfigDict {
    strict?: boolean;
    frozen?: boolean;
    extra?: 'ignore' | 'allow' | 'forbid';
    validateAssignment?: boolean;
}

export interface ModelFieldMeta {
    name: string;
    fieldInfo?: FieldInfo;
    schema: BaseSchema;
    required: boolean;
    alias?: string;
    default?: unknown;
    defaultFactory?: () => unknown;
}

export type ModelClass<T extends new (...args: unknown[]) => object = new (...args: unknown[]) => object> =
    T & {
        modelFields: Record<string, ModelFieldMeta>;
        modelConfig: ConfigDict;
        [CORE_SCHEMA_KEY]?: BaseSchema;
        [VALIDATOR_KEY]?: SchemaValidator;
        // [SERIALIZER_KEY]?: SchemaSerializer;
    };