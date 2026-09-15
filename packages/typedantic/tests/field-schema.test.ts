import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { BaseModel, Field, modelConfig, getModelFields } from '../src/index.js';

describe('Field schema inference', () => {
    @modelConfig({ extra: 'forbid' })
    class Address extends BaseModel {
        @Field({ type: String, minLength: 1 })
        city!: string;
    }

    @modelConfig({ extra: 'forbid' })
    class Sample extends BaseModel {
        @Field({ type: Date })
        createdAt!: Date;

        @Field({ type: Array, items: String, minLength: 1 })
        tags!: string[];

        @Field({ type: 'dict', values: Number, keys: String })
        scores!: Record<string, number>;

        @Field({ type: Address })
        shipping!: Address;

        @Field({ enum: ['pending', 'shipped'] })
        status!: 'pending' | 'shipped';

        @Field({ literal: 'order' })
        kind!: 'order';

        @Field({ type: String, nullable: true })
        note!: string | null;

        @Field({ type: 'float', ge: 0 })
        rating!: number;
    }

    it('maps Field options onto CoreSchema nodes', () => {
        const fields = getModelFields(Sample);
        expect(fields.createdAt.schema).toEqual({ type: 'date' });
        expect(fields.tags.schema).toMatchObject({ type: 'list', minLength: 1 });
        expect(fields.scores.schema).toMatchObject({ type: 'dict' });
        expect(fields.shipping.schema).toMatchObject({ type: 'model-fields', modelName: 'Address' });
        expect(fields.status.schema).toEqual({ type: 'enum', members: ['pending', 'shipped'] });
        expect(fields.kind.schema).toEqual({ type: 'literal', expected: ['order'] });
        expect(fields.note.schema).toMatchObject({ type: 'nullable' });
        expect(fields.rating.schema).toMatchObject({ type: 'float', ge: 0 });
    });

    it('does not treat a bare Object design type as a string dict', () => {
        class Loose extends BaseModel {
            @Field({ type: Object })
            blob!: object;
        }
        const fields = getModelFields(Loose);
        expect(fields.blob.schema.type).not.toBe('dict');
    });
});
