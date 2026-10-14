import { describe, it, expect } from 'vitest';
import { SchemaValidator } from '../src/validator/schema.js';
import { ValidationError } from '../src/errors/validation-error.js';
import type { BaseSchema } from '../src/schema/types.js';

describe('Phase 0 bugfixes', () => {
    it('rejects empty string for int coercion (B5)', () => {
        const v = new SchemaValidator({ type: 'int' });
        expect(() => v.validateModel('')).toThrow(ValidationError);
        expect(() => v.validateModel('   ')).toThrow(ValidationError);
    });

    it('propagates model strict to fields (B3)', () => {
        const schema: BaseSchema = {
            type: 'model-fields',
            strict: true,
            fields: {
                age: { schema: { type: 'int' }, required: true },
            },
            extra: 'ignore',
        };
        const v = new SchemaValidator(schema);
        expect(() => v.validateModel({ age: '1' })).toThrow(ValidationError);
        expect(v.validateModel({ age: 1 })).toEqual({ age: 1 });
    });

    it('discriminator skips non-matching arms (B2)', () => {
        const dog: BaseSchema = {
            type: 'model-fields',
            fields: {
                kind: { schema: { type: 'literal', expected: ['dog'] }, required: true },
                barks: { schema: { type: 'boolean' }, required: true },
            },
            extra: 'forbid',
        };
        const cat: BaseSchema = {
            type: 'model-fields',
            fields: {
                kind: { schema: { type: 'literal', expected: ['cat'] }, required: true },
                indoor: { schema: { type: 'boolean' }, required: true },
            },
            extra: 'forbid',
        };
        const schema: BaseSchema = {
            type: 'union',
            discriminator: 'kind',
            choices: [cat, dog],
        };
        const v = new SchemaValidator(schema);
        expect(v.validateModel({ kind: 'dog', barks: true })).toEqual({
            kind: 'dog',
            barks: true,
        });
        expect(() => v.validateModel({ kind: 'bird', barks: true })).toThrow(ValidationError);
    });

    it('function-after still runs when sibling errors exist elsewhere (B7)', () => {
        let afterRan = false;
        const schema: BaseSchema = {
            type: 'model-fields',
            fields: {
                a: {
                    schema: {
                        type: 'function-after',
                        schema: { type: 'int', ge: 0 },
                        fn: (v) => {
                            afterRan = true;
                            return v;
                        },
                    },
                    required: true,
                },
                b: { schema: { type: 'int', ge: 0 }, required: true },
            },
            extra: 'ignore',
        };
        const v = new SchemaValidator(schema);
        expect(() => v.validateModel({ a: 1, b: -1 })).toThrow(ValidationError);
        expect(afterRan).toBe(true);
    });
});
