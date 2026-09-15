export function createErrorDetails(): Record<string, Record<string, { name: string, message: string }>> {
    return {
        "boolean": {
            "type": {
                "name": "boolean_type",
                "message": "Input should be a valid boolean",
            }
        },
        "literal": {
            "type": {
                "name": "literal_type",
                "message": "Input should be {placeholder}",
            }
        },
        "int": {
            "type": {
                "name": "int_type",
                "message": "Input should be a valid integer",
            },
            "greater_than_equal": {
                "name": "int_greater_than_equal",
                "message": "Input should be greater than or equal to {placeholder}",
            },
            "greater_than": {
                "name": "int_greater_than",
                "message": "Input should be greater than {placeholder}",
            },
            "less_than_equal": {
                "name": "int_less_than_equal",
                "message": "Input should be less than or equal to {placeholder}",
            },
            "less_than": {
                "name": "int_less_than",
                "message": "Input should be less than {placeholder}",
            },
            "multiple_of": {
                "name": "int_multiple_of",
                "message": "Input should be a multiple of {placeholder}",
            },
        },
        "string": {
            "type": {
                "name": "string_type",
                "message": "Input should be a valid string",
            },
            "min_length": {
                "name": "string_too_short",
                "message": "String should have at least {placeholder} characters",
            },
            "max_length": {
                "name": "string_too_long",
                "message": "String should have at most {placeholder} characters",
            },
            "pattern": {
                "name": "string_pattern_mismatch",
                "message": "String should match pattern {placeholder}",
            },
        },
        "number": {
            "type": {
                "name": "number_type",
                "message": "Input should be a valid number",
            },
            "greater_than_equal": {
                "name": "number_greater_than_equal",
                "message": "Input should be greater than or equal to {placeholder}",
            },
            "greater_than": {
                "name": "number_greater_than",
                "message": "Input should be greater than {placeholder}",
            },
            "less_than_equal": {
                "name": "number_less_than_equal",
                "message": "Input should be less than or equal to {placeholder}",
            },
            "less_than": {
                "name": "number_less_than",
                "message": "Input should be less than {placeholder}",
            },
            "multiple_of": {
                "name": "number_multiple_of",
                "message": "Input should be a multiple of {placeholder}",
            },
        },
    };
}