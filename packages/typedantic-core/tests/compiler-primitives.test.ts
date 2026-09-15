import { describe, it, expect } from 'vitest';
import { SchemaValidator, ValidationError } from '../src/index.js';
import type { BaseSchema } from '../src/schema/types.js';

function errorOf(fn: () => unknown): ValidationError {
    try {
        fn();
        throw new Error('expected ValidationError');
    } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        return error as ValidationError;
    }
}

describe('primitive compilers', () => {
    it('reports the constraint, not the input, for int ge', () => {
        const v = new SchemaValidator({ type: 'int', ge: 1 });
        const err = errorOf(() => v.validateModel(0));
        expect(err.message).toContain('greater than or equal to 1');
        expect(err.errors[0].location).toEqual([]);
    });

    it('reports minLength from the schema', () => {
        const err = errorOf(() => new SchemaValidator({ type: 'string', minLength: 3 }).validateModel('ab'));
        expect(err.message).toContain('at least 3 characters');
    });

    it('validates literals and interpolates expected values', () => {
        const v = new SchemaValidator({ type: 'literal', expected: ['cat'] });
        expect(v.validateModel('cat')).toBe('cat');
        expect(errorOf(() => v.validateModel('dog')).message).toContain('"cat"');
    });

    it('validates enums', () => {
        const v = new SchemaValidator({ type: 'enum', members: ['pending', 'shipped'] });
        expect(v.validateModel('pending')).toBe('pending');
        expect(() => v.validateModel('lost')).toThrow(ValidationError);
    });

    it('accepts JS numbers and enforces multipleOf', () => {
        const v = new SchemaValidator({ type: 'number', ge: 0, multipleOf: 0.5 });
        expect(v.validateModel(1.5)).toBe(1.5);
        expect(v.validateModel('2.0')).toBe(2);
        expect(() => v.validateModel(-0.1)).toThrow(ValidationError);
        expect(() => v.validateModel(1.25)).toThrow(ValidationError);
    });

    it('passes any and rejects never', () => {
        expect(new SchemaValidator({ type: 'any' }).validateModel({ ok: true })).toEqual({ ok: true });
        expect(() => new SchemaValidator({ type: 'never' }).validateModel(1)).toThrow(ValidationError);
    });
});

describe('string pattern', () => {
    it('uses RegExp.source in the message', () => {
        const schema: BaseSchema = { type: 'string', pattern: /^[a-z]+$/ };
        const err = errorOf(() => new SchemaValidator(schema).validateModel('A1'));
        expect(err.message).toContain('^[a-z]+$');
    });
});
