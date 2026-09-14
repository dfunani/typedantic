import type { BaseSchema } from '@typedantic/core';

export const MODEL_CONFIG_KEY = Symbol('typedantic:modelConfig');

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
