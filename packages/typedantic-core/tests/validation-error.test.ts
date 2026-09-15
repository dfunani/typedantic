import { describe, it, expect } from 'vitest';
import { ValidationError } from '../src/errors/validation-error.js';
import { createValidationErrorDetail } from '../src/factories/validation-error.js';

describe('ValidationError', () => {
    it('formats and counts', () => {
        const err = new ValidationError([
            createValidationErrorDetail('missing', ['user', 'age'], 'Field required', {}),
        ]);
        expect(err.message).toContain('user.age: Field required');
        expect(err.errors.length).toBe(1);
    });

    it('toJson() is API response shaped', () => {
        const err = new ValidationError([
            createValidationErrorDetail('missing', ['name'], 'Field required', {}),
        ]);
        expect(JSON.parse(err.toJson())).toEqual({
            detail: [
                { type: 'missing', location: ['name'], message: 'Field required', input: {} },
            ],
        });
    });
});