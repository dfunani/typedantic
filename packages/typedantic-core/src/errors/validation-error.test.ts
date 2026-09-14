import { describe, it, expect } from 'vitest';
import { ValidationError } from './validation-error.js';
import { createValidationErrorDetail } from '../factories/validation-error.js';

describe('ValidationError', () => {
    it('formats and counts', () => {
        const err = new ValidationError([
            createValidationErrorDetail('missing', ['user', 'age'], 'Field required', {}),
        ]);
        expect(err.message).toContain('user.age: Field required');
        expect(err.errorCount()).toBe(1);
    });

    it('json() is FastAPI shaped', () => {
        const err = new ValidationError([
            createValidationErrorDetail('missing', ['name'], 'Field required', {}),
        ]);
        expect(JSON.parse(err.json())).toEqual({
            detail: [
                { type: 'missing', loc: ['name'], msg: 'Field required', input: {} },
            ],
        });
    });
});