import { BaseSchema } from '../types.js';

export interface ModelFieldSchema {
    schema: BaseSchema;
    required: boolean;
    alias?: string;
    validationAlias?: string;
    serializationAlias?: string;
    exclude?: boolean;
    title?: string;
    description?: string;
    default?: unknown;
    defaultFactory?: () => unknown;
}

export interface ModelFieldsSchema {
    type: 'model-fields';
    fields: Record<string, ModelFieldSchema>;
    modelName?: string;
    extra?: 'ignore' | 'allow' | 'forbid';
    strict?: boolean;
    populateByName?: boolean;
}
