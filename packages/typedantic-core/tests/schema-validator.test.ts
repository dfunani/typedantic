import { describe, it, expect } from 'vitest';
import { SchemaValidator, ValidationError } from '../src/index.js';
import type { BaseSchema } from '../src/schema/types.js';

describe('SchemaValidator V1', () => {
    it('validates int with constraints', () => {
        const schema: BaseSchema = { type: 'int', ge: 0, le: 150 };
        const v = new SchemaValidator(schema);
        expect(v.validateModel(25)).toBe(25);
        expect(() => v.validateModel(-1)).toThrow(ValidationError);
        expect(() => v.validateModel(1.5)).toThrow(ValidationError);
    });

    it('coerces string to number when not strict', () => {
        const v = new SchemaValidator({ type: 'int' });
        expect(v.validateModel('42')).toBe(42);
    });

    it('rejects string to number when strict', () => {
        const v = new SchemaValidator({ type: 'int', strict: true });
        expect(() => v.validateModel('42')).toThrow(ValidationError);
    });

    it('validates string minLength', () => {
        const v = new SchemaValidator({ type: 'string', minLength: 3 });
        expect(v.validateModel('abc')).toBe('abc');
        expect(() => v.validateModel('ab')).toThrow(ValidationError);
    });

    it('validates boolean coercion', () => {
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
                age: { schema: { type: 'int', ge: 0 }, required: true },
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

    it('does not treat failed validateModel as invalid JSON', () => {
        const v = new SchemaValidator({ type: 'int', ge: 0 });
        expect(() => v.validateJson('1')).not.toThrow();
        try {
            v.validateJson('-1');
            throw new Error('expected ValidationError');
        } catch (error) {
            expect(error).toBeInstanceOf(ValidationError);
            expect((error as ValidationError).errors[0].type).not.toBe('json_invalid');
        }
    });

    it('rejects malformed JSON as json_invalid', () => {
        const v = new SchemaValidator({ type: 'int' });
        try {
            v.validateJson('{');
            throw new Error('expected ValidationError');
        } catch (error) {
            expect(error).toBeInstanceOf(ValidationError);
            expect((error as ValidationError).errors[0].type).toBe('json_invalid');
        }
    });

    it('resets errors between successful calls after a failure', () => {
        const v = new SchemaValidator({ type: 'int', ge: 0 });
        expect(() => v.validateModel(-1)).toThrow(ValidationError);
        expect(v.validateModel(2)).toBe(2);
    });
});