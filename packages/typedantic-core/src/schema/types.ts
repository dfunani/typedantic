export interface ModelFieldSchema {
    schema: BaseSchema;
    required: boolean;
    alias?: string;
    default?: unknown;
    defaultFactory?: () => unknown;
}

export interface NumberSchema {
    type: 'number';
    strict?: boolean;
    ge?: number;
    gt?: number;
    le?: number;
    lt?: number;
    multipleOf?: number;
}

export interface StringSchema {
    type: 'string';
    strict?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp | string;
}

export interface BooleanSchema {
    type: 'boolean';
    strict?: boolean;
}

export interface ModelFieldsSchema {
    type: 'model-fields';
    fields: Record<string, ModelFieldSchema>;
    modelName?: string;
    extra?: 'ignore' | 'allow' | 'forbid';
    strict?: boolean;
}

/** V1 union — expand in V2 */
export type BaseSchema = NumberSchema | StringSchema | BooleanSchema | ModelFieldsSchema;

export interface ValidationConfig {
    strict?: boolean;
}

export interface ValidationErrorDetail {
    type: string;
    loc: (string | number)[];
    msg: string;
    input: unknown;
    ctx?: Record<string, unknown>;
}

export interface ValidationOptions {
    strict?: boolean;
}

export interface SerializationOptions {
    mode?: 'model' | 'json';
    include?: Set<string>;
    exclude?: Set<string>;
    excludeUnset?: boolean;
    excludeDefaults?: boolean;
    excludeNone?: boolean;
    byAlias?: boolean;
}