export type DecoratorWrapper = (value: unknown, context: ValidationContext) => unknown;

export interface ValidationContext {
    path: string[];
    config: ValidationConfig;
    errors: ValidationErrorDetail[];
}

export interface ValidationConfig {
    strict?: boolean;
}

export interface ValidationErrorDetail {
    type: string;
    location: (string | number)[];
    message: string;
    input: unknown;
    context?: Record<string, unknown>;
}