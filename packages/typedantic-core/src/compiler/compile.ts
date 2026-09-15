import type {
    BaseSchema,
} from '../schema/types.js';
import type { ValidationConfigSchema, ValidationErrorDetailSchema } from '../schema/models/configurations.js';
import { compileNumbers } from './primitives/numbers.js';
import { compileStrings } from './primitives/strings.js';
import { compileBooleans } from './primitives/booleans.js';
import { compileModelFields } from './fields/model-fields.js';
import { compileLiterals } from './primitives/literals.js';
import { compileArrays } from './complex/arrays.js';
import { compileObjects } from './complex/objects.js';
import { compileEnums } from './complex/enums.js';
import { compileNullables, compileOptionals, compileDefaults } from './complex/field-properties.js';
import { compileDefaultFactory, compileFunctionBefore, compileFunctionAfter, compileFunctionWrap, compileFunctionPlain } from './complex/field-functions.js';
import { compileDates } from './complex/dates.js';
import { compileUnions } from './complex/field-properties.js';

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
        case "literal":
            return compileLiterals(schema);
        case 'enum':
            return compileEnums(schema);
        case 'list':
            return compileArrays(schema, compileValidator(schema.itemSchema));
        case 'dict':
            return compileObjects(schema, compileValidator(schema.valuesSchema));
        case 'union':
            return compileUnions(schema, createFieldValidators(schema));
        case 'nullable':
            return compileNullables(schema, compileValidator(schema.schema));
        case 'optional':
            return compileOptionals(schema, compileValidator(schema.schema));
        case 'default':
            return compileDefaults(schema, compileValidator(schema.schema));
        case 'default-factory':
            return compileDefaultFactory(schema, compileValidator(schema.schema));
        case 'function-before':
            return compileFunctionBefore(schema, compileValidator(schema.schema));
        case 'function-after':
            return compileFunctionAfter(schema, compileValidator(schema.schema));
        case 'function-wrap':
            return compileFunctionWrap(schema, compileValidator(schema.schema));
        case 'function-plain':
            return compileFunctionPlain(schema, compileValidator(schema.schema));
        case 'date':
            return compileDates(schema);
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







