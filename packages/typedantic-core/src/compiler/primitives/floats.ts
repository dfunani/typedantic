import { createErrorDetails } from '../../factories/errors/primitives.js';
import { interpolatePlaceholder } from '../../factories/errors/interpolate.js';
import { createValidationErrorDetail } from '../../factories/validation-error.js';
import { ValidationErrorDetailSchema } from '../../schema/models/configurations.js';
import type { BaseSchema } from '../../schema/types.js';
import type { ValidationContext, ValidatorFunction } from '../compile.js';
import { parseFloatNumber } from './utils.js';

type FloatErrorContext = "type" | "greater_than_equal" | "greater_than" | "less_than_equal" | "less_than" | "multiple_of";

export function compileFloats(schema: Extract<BaseSchema, { type: 'float' }>): ValidatorFunction {
    return (input, ctx) => {
        let value = input;
        const strict = schema.strict ?? ctx.config.strict;

        if (!strict) {
            value = parseFloatNumber(value);
        }

        if (typeof value !== 'number' || Number.isNaN(value)) {
            ctx.errors.push(createFloatError(value, ctx, "type", value, strict));
            return undefined;
        }

        if (schema.ge !== undefined && value < schema.ge) {
            ctx.errors.push(createFloatError(value, ctx, "greater_than_equal", schema.ge, strict, { ge: schema.ge }));
        }
        if (schema.gt !== undefined && value <= schema.gt) {
            ctx.errors.push(createFloatError(value, ctx, "greater_than", schema.gt, strict, { gt: schema.gt }));
        }
        if (schema.le !== undefined && value > schema.le) {
            ctx.errors.push(createFloatError(value, ctx, "less_than_equal", schema.le, strict, { le: schema.le }));
        }
        if (schema.lt !== undefined && value >= schema.lt) {
            ctx.errors.push(createFloatError(value, ctx, "less_than", schema.lt, strict, { lt: schema.lt }));
        }
        if (schema.multipleOf !== undefined && schema.multipleOf !== 0 && !isMultipleOf(value, schema.multipleOf)) {
            ctx.errors.push(createFloatError(value, ctx, "multiple_of", schema.multipleOf, strict, { multipleOf: schema.multipleOf }));
        }

        return value;
    };
}

export function isMultipleOf(value: number, multipleOf: number): boolean {
    const quotient = value / multipleOf;
    return Math.abs(quotient - Math.round(quotient)) < 1e-9;
}

function createFloatError(
    value: unknown,
    ctx: ValidationContext,
    errorContext: FloatErrorContext,
    placeholder: unknown,
    strict?: boolean,
    extra?: Record<string, unknown>,
): ValidationErrorDetailSchema {
    const errorDetail = createErrorDetails().float[errorContext];
    const errorMessage = interpolatePlaceholder(errorDetail.message, placeholder);
    return createValidationErrorDetail(errorDetail.name, [...ctx.path], errorMessage, value, { strict, ...extra });
}
