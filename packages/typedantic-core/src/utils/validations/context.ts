export enum ValidationType {
    STRICT = "strict",
    STANDARD = "standard",
}

export function contextValidation(strict: boolean): Record<string, ValidationType> {
    return {
        validation: strict ? ValidationType.STRICT : ValidationType.STANDARD,
    };
}