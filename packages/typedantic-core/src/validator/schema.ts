import { compileValidator } from '../compiler/compile.js';
import { ValidationError } from '../errors/validation-error.js';
import { createValidationErrorDetail } from '../factories/validation-error.js';
import { ValidationConfigSchema, ValidationErrorDetailSchema } from '../schema/models/configurations.js';
import type { BaseSchema } from '../schema/types.js';

export class SchemaValidator {
    private readonly validatorFunction: ReturnType<typeof compileValidator>;
    private readonly errors: ValidationErrorDetailSchema[] = [];

    constructor(
        private readonly schema: BaseSchema,
        private readonly config: ValidationConfigSchema = {},
    ) {
        this.validatorFunction = compileValidator(schema);
    }

    validateModel(input: unknown, config?: ValidationConfigSchema): unknown {
        const strict = config?.strict ?? this.config.strict;
        const errors: ValidationErrorDetailSchema[] = [];

        const result = this.validatorFunction(input, {
            path: [],
            config: { strict },
            errors,
        });

        this.errors.length = 0;
        this.errors.push(...errors);

        if (errors.length > 0) {
            throw new ValidationError([...errors]);
        }

        return result;
    }

    validateJson(json: string, config?: ValidationConfigSchema): unknown {
        const strict = config?.strict ?? this.config.strict;
        try {
            const parsed = JSON.parse(json);
            return this.validateModel(parsed, config);
        } catch {
            const error = createValidationErrorDetail('json_invalid', [], 'Invalid JSON', json, { strict });
            throw new ValidationError([error]);
        }
    }

    getErrors(): ValidationErrorDetailSchema[] {
        return this.errors;
    }

    getSchema(): BaseSchema {
        return this.schema;
    }
}

