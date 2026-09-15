import { DecoratorValidatorFunction, ValidatorFunction } from "../../../compiler/compile.js";
import { BaseSchema } from "../../types.js";


export interface DefaultFactorySchema {
    type: 'default-factory';
    schema: BaseSchema;
    factory: () => unknown;
}


export interface FunctionBeforeSchema {
    type: 'function-before';
    schema: BaseSchema;
    fn: ValidatorFunction;
}

export interface FunctionAfterSchema {
    type: 'function-after';
    schema: BaseSchema;
    fn: ValidatorFunction;
}

export interface FunctionWrapSchema {
    type: 'function-wrap';
    schema: BaseSchema;
    fn: DecoratorValidatorFunction;
}

export interface FunctionPlainSchema {
    type: 'function-plain';
    fn: ValidatorFunction;
}