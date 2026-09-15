export interface ValidationConfigSchema {
    strict?: boolean;
}

export interface ValidationErrorDetailSchema {
    type: string;
    location: (string | number)[];
    message: string;
    input: unknown;
    context?: Record<string, unknown>;
}

export interface ValidationOptionsSchema {
    strict?: boolean;
}

export interface SerializationOptionsSchema {
    mode?: 'model' | 'json';
    include?: Set<string>;
    exclude?: Set<string>;
    excludeUnset?: boolean;
    excludeDefaults?: boolean;
    excludeNone?: boolean;
    byAlias?: boolean;
}