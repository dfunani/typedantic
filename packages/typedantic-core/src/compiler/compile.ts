import type { Schema } from "../schema/types";
import type { DecoratorWrapper } from "../schema/context";


function compile(schema: Schema): DecoratorWrapper {

    switch (schema.type) {
        case "int": return (value: unknown, context: unknown) => { };
        case "boolean": return (value: unknown, context: unknown) => { };
        case "string": return (value: unknown, context: unknown) => { };
        case "float": return (value: unknown, context: unknown) => { };
        default: throw new Error(`Unknown schema type: ${schema.type}`);
    }
}