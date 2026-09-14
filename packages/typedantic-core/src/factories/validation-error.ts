import type { BaseSchema, ValidationErrorDetail, ValidationOptions } from '../schema/types.js';
import { SchemaValidator } from '../validator/schema-validator.js';

export function createValidationErrorDetail(
    type: string,
    loc: (string | number)[],
    msg: string,
    input: unknown,
    ctx?: Record<string, unknown>,
): ValidationErrorDetail {
    return { type, loc, msg, input, ...(ctx ? { ctx } : {}) };
}

export function createSchemaValidator(
    schema: BaseSchema,
    input: unknown,
    options?: ValidationOptions,
): unknown {
    return new SchemaValidator(schema, options).validateModel(input, options);
}