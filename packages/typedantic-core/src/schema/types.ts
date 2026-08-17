export interface Schema {
    type: string;
}

export interface IntegerSchema extends Schema {
    type: "int";
    strict: boolean;
    multipleOf: number;

    gt: number;
    gte: number;
    lt: number;
    lte: number;
}

export interface BooleanSchema extends Schema {
    type: "boolean";
    strict: boolean;
}

export interface StringSchema extends Schema {
    type: "string";
    strict: boolean;

    minLength: number;
    maxLength: number;
    pattern: string;
}

export interface FloatSchema extends Schema {
    type: "float";
    strict: boolean;
    multipleOf: number;

    gt: number;
    gte: number;
    lt: number;
    lte: number;
}