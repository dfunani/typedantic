import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { BaseModel, Field, modelConfig } from '../src/index.js';
import { ValidationError } from '@typedantic/core';

@modelConfig({ extra: 'forbid' })
class Cat extends BaseModel {
    @Field({ literal: 'cat' })
    kind!: 'cat';

    @Field({ type: Boolean })
    indoor!: boolean;
}

@modelConfig({ extra: 'forbid' })
class Dog extends BaseModel {
    @Field({ literal: 'dog' })
    kind!: 'dog';

    @Field({ type: Boolean })
    barks!: boolean;
}

@modelConfig({ extra: 'forbid' })
class Order extends BaseModel {
    @Field({ type: String, minLength: 1 })
    id!: string;

    @Field({ enum: ['pending', 'shipped'] })
    status!: 'pending' | 'shipped';

    @Field({ type: Array, items: String, defaultFactory: () => [] })
    labels!: string[];

    @Field({ union: [Cat, Dog], discriminator: 'kind' })
    pet!: Cat | Dog;
}

describe('BaseModel V2', () => {
    it('validates nested unions, enums, and defaultFactory', () => {
        const order = Order.modelValidate({
            id: 'ord-1',
            status: 'pending',
            pet: { kind: 'dog', barks: true },
        });
        expect(order.modelDump()).toEqual({
            id: 'ord-1',
            status: 'pending',
            labels: [],
            pet: { kind: 'dog', barks: true },
        });
    });

    it('rejects unknown union tags and extra keys', () => {
        expect(() =>
            Order.modelValidate({
                id: 'ord-1',
                status: 'pending',
                pet: { kind: 'bird', barks: true },
            }),
        ).toThrow(ValidationError);

        expect(() =>
            Order.modelValidate({
                id: 'ord-1',
                status: 'pending',
                pet: { kind: 'dog', barks: true },
                extra: true,
            }),
        ).toThrow(ValidationError);
    });
});
