import { DecoratorValidatorFunction, ValidatorFunction } from "../../../compiler/compile.js";
import { BaseSchema } from "../../types.js";
import { ModelFieldSchema } from "../fields.js";

export interface ArraysSchema {
    type: 'list';
    itemsSchema: BaseSchema;
    minLength?: number;
    maxLength?: number;
}

export interface DateSchema {
    type: 'date';
}
