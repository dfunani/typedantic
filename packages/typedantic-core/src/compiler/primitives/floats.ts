import type { ValidationContext } from "../../schema/context";
import type { FloatSchema } from "../../schema/types";
import type { DecoratorWrapper } from "../../schema/context";
import { contextValidation } from "../../utils/validations/context";

export function compileFloat(schema: FloatSchema): DecoratorWrapper {

    function validate(value: unknown, context: ValidationContext): unknown {
        if (typeof value !== "number" || Number.isNaN(value)) {
            context.errors.push({
                type: "Float",
                location: [...context.path],
                message: "Value is not a float",
                input: value,
                context: { ...contextValidation(schema.strict) },
            });
        }
        return value;
    }
    return validate;
}