export interface NumbersSchema {
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

export interface LiteralSchema {
    type: 'literal';
    expected: unknown[];
}

export interface FloatsSchema {
    type: 'float';
    strict?: boolean;
    ge?: number;
    gt?: number;
    le?: number;
    lt?: number;
    multipleOf?: number;
}

export interface AnySchema {
    type: 'any';
}

export interface NeverSchema {
    type: 'never';
}