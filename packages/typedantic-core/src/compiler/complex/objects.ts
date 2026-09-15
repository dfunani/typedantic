import { ValidatorFunction, ValidationContext } from "../compile.js";

export function compileObjects(
    valueValidator: ValidatorFunction,
    keyValidator?: ValidatorFunction,
): ValidatorFunction {
    return (input, ctx) => {
        if (typeof input !== 'object' || input === null || Array.isArray(input)) {
            ctx.errors.push({
                type: 'dict_type',
                location: [...ctx.path],
                message: 'Input should be a valid object',
                input,
            });
            return undefined;
        }

        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
            const itemCtx: ValidationContext = {
                path: [...ctx.path, key],
                config: ctx.config,
                errors: ctx.errors,
            };
            if (keyValidator) {
                keyValidator(key, itemCtx);
            }
            result[key] = valueValidator(val, itemCtx);
        }
        return result;
    };
}
