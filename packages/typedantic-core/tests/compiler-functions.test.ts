import { describe, it, expect } from 'vitest';
import { SchemaValidator, ValidationError } from '../src/index.js';
import type { BaseSchema } from '../src/schema/types.js';

describe('function wrappers', () => {
    it('runs function-before then the inner schema', () => {
        const schema: BaseSchema = {
            type: 'function-before',
            schema: { type: 'string', minLength: 1 },
            fn: (input) => (typeof input === 'string' ? input.trim() : input),
        };
        const v = new SchemaValidator(schema);
        expect(v.validateModel('  ada  ')).toBe('ada');
        expect(() => v.validateModel('   ')).toThrow(ValidationError);
    });

    it('runs function-after only when inner validation succeeds', () => {
        const schema: BaseSchema = {
            type: 'function-after',
            schema: { type: 'int', ge: 0 },
            fn: (input) => (input as number) + 1,
        };
        const v = new SchemaValidator(schema);
        expect(v.validateModel(1)).toBe(2);
        expect(() => v.validateModel(-1)).toThrow(ValidationError);
    });

    it('lets function-wrap call the inner handler', () => {
        const schema: BaseSchema = {
            type: 'function-wrap',
            schema: { type: 'int' },
            fn: (input, handler) => handler(typeof input === 'string' ? Number(input) : input),
        };
        expect(new SchemaValidator(schema).validateModel('3')).toBe(3);
    });

    it('uses function-plain as the whole validator', () => {
        const schema: BaseSchema = {
            type: 'function-plain',
            fn: (input) => String(input).toUpperCase(),
        };
        expect(new SchemaValidator(schema).validateModel('ok')).toBe('OK');
    });

    it('uses default-factory for missing values', () => {
        const schema: BaseSchema = {
            type: 'default-factory',
            schema: { type: 'array', itemsSchema: { type: 'string' } },
            factory: () => ['x'],
        };
        expect(new SchemaValidator(schema).validateModel(undefined)).toEqual(['x']);
        expect(new SchemaValidator(schema).validateModel(['a'])).toEqual(['a']);
    });
});
