import { BaseSchema } from "../../types.js";


export interface ObjectSchema {
    type: 'object';
    valuesSchema: BaseSchema;
    keysSchema?: BaseSchema;
}
