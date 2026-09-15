import { ValidationErrorDetailSchema } from "../schema/models/configurations.js";

export function errorMessage(errors: ValidationErrorDetailSchema[]): string {
    return errors.map((e) => `${e.location.join('.')}: ${e.message}`).join('; ');
}