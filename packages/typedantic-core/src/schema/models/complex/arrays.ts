import { BaseSchema } from "../../types.js";

export interface ArraySchema {
    type: 'array';
    itemsSchema: BaseSchema;
    minLength?: number;
    maxLength?: number;
}
