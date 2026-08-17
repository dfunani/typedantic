import type { ValidationContext } from "../../schema/context";
import type { IntegerSchema } from "../../schema/types";
import type { DecoratorWrapper } from "../../schema/context";
import { contextValidation } from "../../utils/validations/context";

export function compileInteger(schema: IntegerSchema): DecoratorWrapper {

    function validate(value: unknown, context: ValidationContext): unknown {
        if (typeof value !== "number" || !Number.isInteger(value)) {
            context.errors.push({
                type: "Number",
                location: [...context.path],
                message: "Value is not a number",
                input: value,
                context: { ...contextValidation(schema.strict) },
            });
        }
        return value;
    }
    return validate;
}