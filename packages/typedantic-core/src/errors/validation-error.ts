import type { ValidationErrorDetailSchema } from '../schema/models/configurations.js';
import { errorMessage } from './utils.js';

export type FastApiErrorDetail = {
    type: string;
    loc: (string | number)[];
    msg: string;
    input: unknown;
    ctx?: Record<string, unknown>;
    location: (string | number)[];
    message: string;
    context?: Record<string, unknown>;
};

export class ValidationError extends Error {
    readonly name = 'ValidationError';
    readonly errors: ValidationErrorDetailSchema[];

    constructor(errors: ValidationErrorDetailSchema[]) {
        super(errorMessage(errors));
        this.errors = errors;
    }

    /** Dual shape: Typedantic keys + FastAPI loc/msg/ctx aliases. */
    toDetail(): FastApiErrorDetail[] {
        return this.errors.map((e) => ({
            type: e.type,
            location: e.location,
            message: e.message,
            input: e.input,
            context: e.context,
            loc: e.location,
            msg: e.message,
            ctx: e.context,
        }));
    }

    toJson(): string {
        return JSON.stringify({ detail: this.toDetail() });
    }

    toObject(): { detail: FastApiErrorDetail[] } {
        return { detail: this.toDetail() };
    }
}
