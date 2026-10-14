import { describe, it, expect } from 'vitest';
import { SchemaSerializer } from '../src/serializer/schema-serializer.js';
import { toJsonSchema } from '../src/json-schema/generate.js';
import { SchemaValidator } from '../src/validator/schema.js';
import type { BaseSchema } from '../src/schema/types.js';

describe('SchemaSerializer', () => {
    const schema: BaseSchema = {
        type: 'model-fields',
        modelName: 'User',
        fields: {
            name: { schema: { type: 'string' }, required: true, alias: 'full_name' },
            age: { schema: { type: 'int' }, required: true },
            note: { schema: { type: 'string' }, required: false },
        },
        extra: 'ignore',
    };

    it('dumps by alias and excludes null when asked', () => {
        const s = new SchemaSerializer(schema);
        expect(
            s.dump(
                { name: 'Ada', age: 36, note: null },
                { byAlias: true, excludeNone: true },
            ),
        ).toEqual({ full_name: 'Ada', age: 36 });
    });

    it('json mode serializes dates', () => {
        const dateSchema: BaseSchema = {
            type: 'model-fields',
            fields: {
                at: { schema: { type: 'date' }, required: true },
            },
        };
        const s = new SchemaSerializer(dateSchema);
        const at = new Date('2024-01-01T00:00:00.000Z');
        expect(s.dump({ at }, { mode: 'json' })).toEqual({
            at: '2024-01-01T00:00:00.000Z',
        });
    });
});

describe('toJsonSchema', () => {
    it('emits object properties and $defs for models', () => {
        const schema: BaseSchema = {
            type: 'model-fields',
            modelName: 'User',
            extra: 'forbid',
            fields: {
                name: { schema: { type: 'string', minLength: 1 }, required: true },
                age: { schema: { type: 'int', ge: 0 }, required: true },
            },
        };
        const json = toJsonSchema(schema);
        expect(json.$ref).toBe('#/$defs/User');
        const defs = json.$defs as Record<string, { properties: Record<string, unknown>; required: string[] }>;
        expect(defs.User.required).toEqual(['name', 'age']);
        expect(defs.User.properties.name).toMatchObject({ type: 'string', minLength: 1 });
    });

    it('round-trips with SchemaValidator for primitives', () => {
        const schema: BaseSchema = { type: 'int', ge: 0 };
        expect(new SchemaValidator(schema).validateModel(3)).toBe(3);
        expect(toJsonSchema(schema)).toMatchObject({ type: 'integer', minimum: 0 });
    });
});
