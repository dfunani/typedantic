import type {
    BaseSchema,
} from '../schema/types.js';
import type { ValidationConfigSchema, ValidationErrorDetailSchema } from '../schema/models/configurations.js';
import { compileNumbers } from './primitives/numbers.js';
import { compileStrings } from './primitives/strings.js';
import { compileBooleans } from './primitives/booleans.js';
import { compileModelFields } from './fields/model-fields.js';

export interface ValidationContext {
    path: (string | number)[];
    config: ValidationConfigSchema;
    errors: ValidationErrorDetailSchema[];
}

export type ValidatorFunction = (input: unknown, ctx: ValidationContext) => unknown;

export type DecoratorValidatorFunction = (
    value: unknown,
    handler: (v: unknown) => unknown,
) => unknown;

function createFieldValidators(schema: Extract<BaseSchema, { type: 'model-fields' }>): Record<string, ValidatorFunction> {
    const fieldValidators: Record<string, ValidatorFunction> = {};
    for (const [name, field] of Object.entries(schema.fields)) {
        fieldValidators[name] = compileValidator(field.schema);
    }
    return fieldValidators;
}

function createValidationError(input: unknown, ctx: ValidationContext): ValidationErrorDetailSchema {
    return {
        type: 'unknown_schema',
        location: [...ctx.path],
        message: 'Unknown schema type',
        input,
    };
}

export function compileValidator(schema: BaseSchema): ValidatorFunction {
    switch (schema.type) {
        case 'number':
            return compileNumbers(schema);
        case 'string':
            return compileStrings(schema);
        case 'boolean':
            return compileBooleans(schema);
        case 'model-fields':
            const fieldValidators = createFieldValidators(schema);
            return compileModelFields(schema, fieldValidators);
        default: {
            return (input, ctx) => {
                ctx.errors.push(createValidationError(input, ctx));
                return undefined;
            };
        }
    }
}







