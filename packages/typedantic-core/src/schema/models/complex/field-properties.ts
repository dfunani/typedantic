import { BaseSchema } from "../../types.js";


export interface UnionSchema {
    type: 'union';
    choices: BaseSchema[];
    discriminator?: string;
}

export interface NullableSchema {
    type: 'nullable';
    schema: BaseSchema;
}

export interface OptionalSchema {
    type: 'optional';
    schema: BaseSchema;
}

export interface DefaultSchema {
    type: 'default';
    schema: BaseSchema;
    defaultValue: unknown;
}