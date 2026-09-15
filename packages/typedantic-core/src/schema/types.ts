import { NumbersSchema, StringSchema, BooleanSchema, LiteralSchema, EnumsSchema } from "./models/primitives.js";
import { ModelFieldsSchema } from "./models/fields.js";
import { ArraysSchema } from "./models/complex/arrays.js";
import { DictSchema } from "./models/complex/objects.js";
import { UnionSchema } from "./models/complex/field-properties.js";
import { NullableSchema } from "./models/complex/field-properties.js";
import { OptionalSchema } from "./models/complex/field-properties.js";
import { DefaultSchema } from "./models/complex/field-properties.js";
import { DefaultFactorySchema } from "./models/complex/field-functions.js";
import { FunctionBeforeSchema } from "./models/complex/field-functions.js";
import { FunctionAfterSchema } from "./models/complex/field-functions.js";
import { FunctionWrapSchema } from "./models/complex/field-functions.js";
import { FunctionPlainSchema } from "./models/complex/field-functions.js";
import { DateSchema } from "./models/complex/dates.js";

/** V1 union — expand in V2 */
export type BaseSchema = NumbersSchema | StringSchema | BooleanSchema | LiteralSchema | EnumsSchema | ModelFieldsSchema | ArraysSchema | DictSchema | UnionSchema | NullableSchema | OptionalSchema | DefaultSchema | DefaultFactorySchema | FunctionBeforeSchema | FunctionAfterSchema | FunctionWrapSchema | FunctionPlainSchema | DateSchema;


