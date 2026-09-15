export function createErrorDetails(): Record<string, Record<string, { name: string, message: string }>> {
    return {
        "model_fields": {
            "type": {
                "name": "model_type",
                "message": "Input should be a valid object",
            },
            "missing": {
                "name": "missing",
                "message": "Field is required",
            },
            "extra_forbidden": {
                "name": "extra_forbidden",
                "message": "Extra inputs are not permitted",
            },
        },
    };
}