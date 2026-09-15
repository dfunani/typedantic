import { describe, it, expect } from 'vitest';
import { SchemaValidator, ValidationError } from '../src/index.js';
import type { BaseSchema } from '../src/schema/types.js';

describe('complex compilers', () => {
    it('validates lists with minLength and item schemas', () => {
        const schema: BaseSchema = { type: 'list', itemsSchema: { type: 'string', minLength: 1 }, minLength: 1 };
        const v = new SchemaValidator(schema);
        expect(v.validateModel(['a'])).toEqual(['a']);
        expect(() => v.validateModel([])).toThrow(ValidationError);
        expect(() => v.validateModel([''])).toThrow(ValidationError);
        expect(() => v.validateModel('nope')).toThrow(ValidationError);
    });

    it('validates dict values and keysSchema', () => {
        const schema: BaseSchema = {
            type: 'dict',
            keysSchema: { type: 'string', minLength: 2 },
            valuesSchema: { type: 'number', ge: 0 },
        };
        const v = new SchemaValidator(schema);
        expect(v.validateModel({ ab: 1 })).toEqual({ ab: 1 });
        expect(() => v.validateModel({ a: 1 })).toThrow(ValidationError);
        expect(() => v.validateModel({ ab: -1 })).toThrow(ValidationError);
        expect(() => v.validateModel([])).toThrow(ValidationError);
    });

    it('parses dates from ISO strings and Date instances', () => {
        const v = new SchemaValidator({ type: 'date' });
        const fromIso = v.validateModel('2024-06-01T12:00:00.000Z') as Date;
        expect(fromIso).toBeInstanceOf(Date);
        expect(fromIso.toISOString()).toBe('2024-06-01T12:00:00.000Z');
        const now = new Date();
        expect(v.validateModel(now)).toBe(now);
        expect(() => v.validateModel('not-a-date')).toThrow(ValidationError);
    });

    it('wraps nullable, optional, and default', () => {
        const nullable = new SchemaValidator({ type: 'nullable', schema: { type: 'string' } });
        expect(nullable.validateModel(null)).toBeNull();
        expect(nullable.validateModel('ok')).toBe('ok');

        const optional = new SchemaValidator({ type: 'optional', schema: { type: 'number' } });
        expect(optional.validateModel(undefined)).toBeUndefined();
        expect(optional.validateModel(1)).toBe(1);

        const withDefault = new SchemaValidator({ type: 'default', schema: { type: 'string' }, defaultValue: 'NONE' });
        expect(withDefault.validateModel(undefined)).toBe('NONE');
        expect(withDefault.validateModel('set')).toBe('set');
    });

    it('clones array defaults so instances do not share state', () => {
        const schema: BaseSchema = {
            type: 'default',
            schema: { type: 'list', itemsSchema: { type: 'string' } },
            defaultValue: [],
        };
        const v = new SchemaValidator(schema);
        const first = v.validateModel(undefined) as string[];
        first.push('mutated');
        expect(v.validateModel(undefined)).toEqual([]);
    });
});
