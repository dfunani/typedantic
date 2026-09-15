import { BaseSchema } from "../../types.js";


export interface DictSchema {
    type: 'dict';
    valuesSchema: BaseSchema;
    keysSchema?: BaseSchema;
}
