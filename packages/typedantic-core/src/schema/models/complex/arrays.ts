import { BaseSchema } from "../../types.js";

export interface ArraysSchema {
    type: 'list';
    itemsSchema: BaseSchema;
    minLength?: number;
    maxLength?: number;
}

export interface DateSchema {
    type: 'date';
}
