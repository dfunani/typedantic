import type { BaseSchema } from '../schema/types.js';
import { SchemaValidator } from '../validator/schema.js';
import type { ValidationErrorDetailSchema, ValidationOptionsSchema } from '../schema/models/configurations.js';

export function createValidationErrorDetail(
    type: string,
    location: (string | number)[],
    message: string,
    input: unknown,
    context?: Record<string, unknown>,
): ValidationErrorDetailSchema {
    return { type, location, message, input, ...(context ? { context } : {}) };
}

export function createSchemaValidator(
    schema: BaseSchema,
    input: unknown,
    options?: ValidationOptionsSchema,
): unknown {
    return new SchemaValidator(schema, options).validateModel(input, options);
}