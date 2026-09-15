import { NumbersSchema, StringSchema, BooleanSchema } from "./models/primitives.js";
import { ModelFieldsSchema } from "./models/fields.js";

/** V1 union — expand in V2 */
export type BaseSchema = NumbersSchema | StringSchema | BooleanSchema | ModelFieldsSchema;


