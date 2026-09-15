import { ValidatorFunction } from "../compile.js";


export function compileObjects(valueValidator: ValidatorFunction): ValidatorFunction {
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
            const itemCtx = {
                path: [...ctx.path, key],
                config: ctx.config,
                errors: ctx.errors,
            };
            result[key] = valueValidator(val, itemCtx);
        }
        return result;
    };
}
