import type { BaseSchema, SchemaValidator, SchemaSerializer } from '@typedantic/core';

export const MODEL_CONFIG_KEY = Symbol('typedantic:modelConfig');
export const FIELD_VALIDATORS_KEY = Symbol('typedantic:fieldValidators');
export const MODEL_VALIDATORS_KEY = Symbol('typedantic:modelValidators');
export const FIELD_SERIALIZERS_KEY = Symbol('typedantic:fieldSerializers');
export const MODEL_SERIALIZER_KEY = Symbol('typedantic:modelSerializer');
export const COMPUTED_FIELDS_KEY = Symbol('typedantic:computedFields');
export const CORE_SCHEMA_KEY = Symbol('typedantic:coreSchema');
export const VALIDATOR_KEY = Symbol('typedantic:validator');
export const SERIALIZER_KEY = Symbol('typedantic:serializer');
export const MODEL_FIELDS_REGISTRY = Symbol('typedantic:fieldsRegistry');
export const FIELDS_SET_KEY = Symbol('typedantic:fieldsSet');

export type ValidatorMode = 'before' | 'after' | 'wrap' | 'plain';

export interface FieldInfo<T = unknown> {
    type?: unknown;
    items?: unknown;
    values?: unknown;
    keys?: unknown;
    enum?: readonly string[];
    literal?: unknown | unknown[];
    union?: unknown[];
    discriminator?: string;
    nullable?: boolean;
    default?: T;
    defaultFactory?: () => T;
    alias?: string;
    validationAlias?: string;
    serializationAlias?: string;
    exclude?: boolean;
    repr?: boolean;
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
    populateByName?: boolean;
    title?: string;
}

export interface ModelFieldMeta {
    name: string;
    fieldInfo?: FieldInfo;
    schema: BaseSchema;
    required: boolean;
    alias?: string;
    default?: unknown;
    defaultFactory?: () => unknown;
    computed?: boolean;
    serializer?: (value: unknown, info: { mode: 'json' | 'model' }) => unknown;
}

export type ModelClass<
    T extends new (...args: unknown[]) => object = new (...args: unknown[]) => object,
> = T & {
    modelFields: Record<string, ModelFieldMeta>;
    modelConfig: ConfigDict;
    [CORE_SCHEMA_KEY]?: BaseSchema;
    [VALIDATOR_KEY]?: SchemaValidator;
    [SERIALIZER_KEY]?: SchemaSerializer;
};

export interface RegisteredFieldValidator {
    field: string;
    mode: ValidatorMode;
    fn: (value: unknown, info?: { field: string }) => unknown;
}

export interface RegisteredModelValidator {
    mode: Exclude<ValidatorMode, 'plain'> | 'plain';
    fn: (value: unknown) => unknown;
}

export interface RegisteredFieldSerializer {
    field: string;
    whenUsed: 'always' | 'json' | 'unless-none';
    fn: (value: unknown, info: { mode: 'json' | 'model' }) => unknown;
}

export interface RegisteredModelSerializer {
    mode: 'wrap' | 'plain';
    fn: (value: unknown, handler?: (v: unknown) => unknown) => unknown;
}

export interface ComputedFieldMeta {
    name: string;
    title?: string;
    description?: string;
    alias?: string;
}
