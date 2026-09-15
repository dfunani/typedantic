import { BaseSchema } from "../../schema/types.js";
import { ValidatorFunction } from "../compile.js";

export function compileUnions(schema: Extract<BaseSchema, { type: 'union' }>, validators: ValidatorFunction[]): ValidatorFunction {
    return (input, ctx) => {
        if (schema.discriminator && typeof input === 'object' && input !== null) {
            const tag = (input as Record<string, unknown>)[schema.discriminator];
            for (let i = 0; i < schema.choices.length; i++) {
                const choice = schema.choices[i];
                if (choice.type === 'model-fields') {
                    const modelChoice = choice as Extract<BaseSchema, { type: 'model-fields' }>;
                    const discField = modelChoice.fields[schema.discriminator];
                    if (discField) {
                        const discSchema = discField.schema;
                        if (discSchema.type === 'literal') {
                            const literal = discSchema as Extract<BaseSchema, { type: 'literal' }>;
                            if (!literal.expected.includes(tag)) continue;
                        } else if (discSchema.type === 'default') {
                            const defSchema = discSchema as Extract<BaseSchema, { type: 'default' }>;
                            if (defSchema.defaultValue !== tag) continue;
                        }
                    }
                }
                const errorsBefore = ctx.errors.length;
                const result = validators[i](input, ctx);
                if (ctx.errors.length === errorsBefore) return result;
                ctx.errors.splice(errorsBefore);
            }

            ctx.errors.push({
                type: 'union_tag_invalid',
                location: [...ctx.path],
                message: 'Input did not match any union member',
                input,
            });
            return undefined;
        }

        for (const validator of validators) {
            const errorsBefore = ctx.errors.length;
            const result = validator(input, ctx);
            if (ctx.errors.length === errorsBefore) return result;
            ctx.errors.splice(errorsBefore);
        }

        ctx.errors.push({
            type: 'union_tag_invalid',
            location: [...ctx.path],
            message: 'Input did not match any union member',
            input,
        });
        return undefined;
    };
}

export function compileNullables(validator: ValidatorFunction): ValidatorFunction {
    return (input, ctx) => {
        if (input === null) return null;
        return validator(input, ctx);
    };
}

export function compileOptionals(validator: ValidatorFunction): ValidatorFunction {
    return (input, ctx) => {
        if (input === undefined) return undefined;
        return validator(input, ctx);
    };
}

export function compileDefaults(schema: Extract<BaseSchema, { type: 'default' }>, validator: ValidatorFunction): ValidatorFunction {
    return (input, ctx) => {
        if (input === undefined) return cloneDefault(schema.defaultValue);
        return validator(input, ctx);
    };
}

export function cloneDefault(value: unknown): unknown {
    if (Array.isArray(value)) return [...value];
    if (value !== null && typeof value === 'object' && value.constructor === Object) {
        return { ...(value as Record<string, unknown>) };
    }
    return value;
}
