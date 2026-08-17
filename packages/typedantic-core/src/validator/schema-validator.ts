import type { ValidationContext } from "../schema/context";
import type { Schema } from "../schema/types";

class SchemaValidator {
    constructor(public schema: Schema, public context: ValidationContext) {
        this.schema = schema;
        this.context = context;
    }

    validate(value: unknown): boolean {
        return console.log(this.schema, this.context, value) ?? false;
    }

}