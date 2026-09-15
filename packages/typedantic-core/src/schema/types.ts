import { IntSchema, NumbersSchema, StringSchema, BooleanSchema, LiteralSchema, AnySchema, NeverSchema } from "./models/primitives.js";
import { ModelFieldsSchema } from "./models/fields.js";
import { ArraySchema } from "./models/complex/arrays.js";
import { ObjectSchema } from "./models/complex/objects.js";
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
import { EnumsSchema } from "./models/complex/enums.js";

export type BaseSchema =
    | IntSchema
    | NumbersSchema
    | StringSchema
    | BooleanSchema
    | LiteralSchema
    | EnumsSchema
    | ModelFieldsSchema
    | ArraySchema
    | ObjectSchema
    | UnionSchema
    | NullableSchema
    | OptionalSchema
    | DefaultSchema
    | DefaultFactorySchema
    | FunctionBeforeSchema
    | FunctionAfterSchema
    | FunctionWrapSchema
    | FunctionPlainSchema
    | DateSchema
    | AnySchema
    | NeverSchema;


