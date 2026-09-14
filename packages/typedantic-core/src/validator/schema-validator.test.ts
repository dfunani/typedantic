import { describe, it, expect } from 'vitest';
import { SchemaValidator, ValidationError } from '../index.js';
import type { BaseSchema } from '../schema/types.js';

describe('SchemaValidator V1', () => {
    it('validates number with constraints', () => {
        const schema: BaseSchema = { type: 'number', ge: 0, le: 150 };
        const v = new SchemaValidator(schema);
        expect(v.validateModel(25)).toBe(25);
        expect(() => v.validateModel(-1)).toThrow(ValidationError);
        expect(() => v.validateModel(1.5)).toThrow(ValidationError);
    });

    it('coerces string to int when not strict', () => {
        const v = new SchemaValidator({ type: 'number' });
        expect(v.validateModel('42')).toBe(42);
    });

    it('rejects string to int when strict', () => {
        const v = new SchemaValidator({ type: 'number', strict: true });
        expect(() => v.validateModel('42')).toThrow(ValidationError);
    });

    it('validates str minLength', () => {
        const v = new SchemaValidator({ type: 'string', minLength: 3 });
        expect(v.validateModel('abc')).toBe('abc');
        expect(() => v.validateModel('ab')).toThrow(ValidationError);
    });

    it('validates bool coercion', () => {
        const v = new SchemaValidator({ type: 'boolean' });
        expect(v.validateModel('true')).toBe(true);
        expect(v.validateModel(0)).toBe(false);
        expect(() => new SchemaValidator({ type: 'boolean', strict: true }).validateModel('true')).toThrow(
            ValidationError,
        );
    });

    it('validates model-fields', () => {
        const schema: BaseSchema = {
            type: 'model-fields',
            fields: {
                name: { schema: { type: 'string', minLength: 1 }, required: true },
                age: { schema: { type: 'number', ge: 0 }, required: true },
                active: { schema: { type: 'boolean' }, required: true },
            },
            extra: 'forbid',
        };
        const v = new SchemaValidator(schema);
        expect(v.validateModel({ name: 'Ada', age: 36, active: true })).toEqual({
            name: 'Ada',
            age: 36,
            active: true,
        });
        expect(() => v.validateModel({ name: 'Ada' })).toThrow(ValidationError);
        expect(() =>
            v.validateModel({ name: 'Ada', age: 1, active: true, extra: 1 }),
        ).toThrow(ValidationError);
    });
});