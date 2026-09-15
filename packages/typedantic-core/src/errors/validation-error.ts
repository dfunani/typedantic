import type { ValidationErrorDetailSchema } from '../schema/models/configurations.js';
import { errorMessage } from './utils.js';

export class ValidationError extends Error {
    readonly name = "ValidationError";
    readonly errors: ValidationErrorDetailSchema[];

    constructor(errors: ValidationErrorDetailSchema[]) {
        super(errorMessage(errors));
        this.errors = errors;
    }

    toJson(): string {
        return JSON.stringify({ detail: this.errors });
    }

    toObject(): { detail: ValidationErrorDetailSchema[] } {
        return { detail: this.errors };
    }


}
