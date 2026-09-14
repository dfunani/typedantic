import { compileValidator } from '../compiler/compile.js';
import { ValidationError } from '../errors/validation-error.js';
import type { BaseSchema, ValidationOptions, ValidationErrorDetail } from '../schema/types.js';

export class SchemaValidator {
    private readonly validateFn: ReturnType<typeof compileValidator>;
    private lastErrors: ValidationErrorDetail[] = [];

    constructor(
        private readonly schema: BaseSchema,
        private readonly config: ValidationOptions = {},
    ) {
        this.validateFn = compileValidator(schema);
    }

    validateModel(input: unknown, options?: ValidationOptions): unknown {
        const errors: ValidationErrorDetail[] = [];
        const mergedConfig = { strict: options?.strict ?? this.config.strict };

        const result = this.validateFn(input, {
            path: [],
            config: mergedConfig,
            errors,
        });

        this.lastErrors = errors;

        if (errors.length > 0) {
            throw new ValidationError(errors);
        }

        return result;
    }

    validateJson(json: string, options?: ValidationOptions): unknown {
        let parsed: unknown;
        try {
            parsed = JSON.parse(json);
        } catch {
            throw new ValidationError([
                { type: 'json_invalid', loc: [], msg: 'Invalid JSON', input: json },
            ]);
        }
        return this.validateModel(parsed, options);
    }

    getErrors(): ValidationErrorDetail[] {
        return this.lastErrors;
    }

    getSchema(): BaseSchema {
        return this.schema;
    }
}

