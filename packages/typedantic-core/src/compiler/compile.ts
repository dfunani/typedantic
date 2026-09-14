import type {
    BaseSchema,
    ValidationConfig,
    ValidationErrorDetail,
} from '../schema/types.js';
import { compileNumber } from './number.js';
import { compileString } from './string.js';
import { compileBoolean } from './boolean.js';
import { compileModelFields } from './model-fields.js';

export interface ValidationContext {
    path: (string | number)[];
    config: ValidationConfig;
    errors: ValidationErrorDetail[];
}

export type ValidatorFunction = (input: unknown, ctx: ValidationContext) => unknown;

export type DecoratorValidatorFunction = (
    value: unknown,
    handler: (v: unknown) => unknown,
) => unknown;


export function compileValidator(schema: BaseSchema): ValidatorFunction {
    switch (schema.type) {
        case 'number':
            return compileNumber(schema);
        case 'string':
            return compileString(schema);
        case 'boolean':
            return compileBoolean(schema);
        case 'model-fields':
            return compileModelFields(schema);
        default: {
            return (input, ctx) => {
                ctx.errors.push({
                    type: 'unknown_schema',
                    loc: [...ctx.path],
                    msg: 'Unknown schema type',
                    input,
                });
                return undefined;
            };
        }
    }
}







