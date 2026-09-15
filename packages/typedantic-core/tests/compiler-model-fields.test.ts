import { describe, it, expect } from 'vitest';
import { SchemaValidator, ValidationError } from '../src/index.js';
import type { BaseSchema } from '../src/schema/types.js';

describe('model-fields compiler', () => {
    const schema: BaseSchema = {
        type: 'model-fields',
        extra: 'forbid',
        fields: {
            name: { schema: { type: 'string', minLength: 1 }, required: true },
            zip: { schema: { type: 'string' }, required: true, alias: 'postal_code' },
            tags: { schema: { type: 'list', itemsSchema: { type: 'string' } }, required: false, default: [] },
        },
    };

    it('puts missing fields on the field path', () => {
        const err = (() => {
            try {
                new SchemaValidator(schema).validateModel({});
                throw new Error('expected');
            } catch (error) {
                return error as ValidationError;
            }
        })();
        expect(err.errors.some((item) => item.location.join('.') === 'name')).toBe(true);
        expect(err.errors.some((item) => item.location.join('.') === 'zip')).toBe(true);
    });

    it('reads aliases and clones mutable defaults', () => {
        const v = new SchemaValidator(schema);
        const first = v.validateModel({ name: 'Ada', postal_code: '8001' }) as { tags: string[] };
        expect(first).toEqual({ name: 'Ada', zip: '8001', tags: [] });
        first.tags.push('x');
        const second = v.validateModel({ name: 'Bob', postal_code: '8000' }) as { tags: string[] };
        expect(second.tags).toEqual([]);
    });
});
