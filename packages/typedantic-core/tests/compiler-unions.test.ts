import { describe, it, expect } from 'vitest';
import { SchemaValidator, ValidationError } from '../src/index.js';
import type { BaseSchema } from '../src/schema/types.js';

const cat: BaseSchema = {
    type: 'model-fields',
    extra: 'forbid',
    fields: {
        kind: { schema: { type: 'literal', expected: ['cat'] }, required: true },
        indoor: { schema: { type: 'boolean' }, required: true },
    },
};

const dog: BaseSchema = {
    type: 'model-fields',
    extra: 'forbid',
    fields: {
        kind: { schema: { type: 'literal', expected: ['dog'] }, required: true },
        barks: { schema: { type: 'boolean' }, required: true },
    },
};

describe('unions', () => {
    it('routes a discriminator to the matching model', () => {
        const v = new SchemaValidator({ type: 'union', discriminator: 'kind', choices: [cat, dog] });
        expect(v.validateModel({ kind: 'dog', barks: true })).toEqual({ kind: 'dog', barks: true });
        expect(v.validateModel({ kind: 'cat', indoor: false })).toEqual({ kind: 'cat', indoor: false });
    });

    it('rejects an unknown discriminator tag without falling through', () => {
        const v = new SchemaValidator({ type: 'union', discriminator: 'kind', choices: [cat, dog] });
        expect(() => v.validateModel({ kind: 'bird', barks: true })).toThrow(ValidationError);
    });

    it('tries members in order when untagged', () => {
        const v = new SchemaValidator({
            type: 'union',
            choices: [{ type: 'number' }, { type: 'string' }],
        });
        expect(v.validateModel(1)).toBe(1);
        expect(v.validateModel('hello')).toBe('hello');
        expect(() => v.validateModel({})).toThrow(ValidationError);
    });
});
