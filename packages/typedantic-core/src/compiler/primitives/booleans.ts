import type { ValidationContext } from "../../schema/context";
import type { BooleanSchema } from "../../schema/types";
import type { DecoratorWrapper } from "../../schema/context";
import { contextValidation } from "../../utils/validations/context";

export function compileBoolean(schema: BooleanSchema): DecoratorWrapper {

    function validate(value: unknown, context: ValidationContext): unknown {
        if (typeof value !== "boolean") {
            context.errors.push({
                type: "Boolean",
                location: [...context.path],
                message: "Value is not a boolean",
                input: value,
                context: { ...contextValidation(schema.strict) },
            });
        }
        return value;
    }
    return validate;
}