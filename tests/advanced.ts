import 'reflect-metadata';
import { BaseModel, Field, modelConfig } from 'typedantic';

@modelConfig({ extra: 'forbid' })
class Address extends BaseModel {
    @Field({ type: String, minLength: 1 })
    city!: string;

    @Field({ type: String, minLength: 1, alias: 'postal_code' })
    zip!: string;
}

@modelConfig({ extra: 'forbid' })
class LineItem extends BaseModel {
    @Field({ type: String, minLength: 1 })
    sku!: string;

    @Field({ type: Number, ge: 1, strict: false })
    qty!: number;

    @Field({ type: Number, ge: 0, default: 0 })
    discount!: number;
}

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

    @Field({ enum: ['pending', 'shipped', 'delivered'] })
    status!: 'pending' | 'shipped' | 'delivered';

    @Field({ type: Date })
    createdAt!: Date;

    @Field({ type: Array, items: String, minLength: 1 })
    tags!: string[];

    @Field({ type: Object, values: Number })
    scores!: Record<string, number>;

    @Field({ type: Address })
    shipping!: Address;

    @Field({ type: Array, items: LineItem, minLength: 1 })
    items!: LineItem[];

    @Field({ union: [Cat, Dog], discriminator: 'kind' })
    pet!: Cat | Dog;

    @Field({ type: String, nullable: true })
    note!: string | null;

    @Field({ type: String, default: 'NONE' })
    coupon!: string;

    @Field({ type: Array, items: String, defaultFactory: () => [] })
    labels!: string[];
}

const valid = {
    id: 'ord-1',
    status: 'pending',
    createdAt: '2024-06-01T12:00:00.000Z',
    tags: ['priority', 'retail'],
    scores: { packing: 9, shipping: 8 },
    shipping: { city: 'Cape Town', postal_code: '8001' },
    items: [{ sku: 'SKU-1', qty: '2' }],
    pet: { kind: 'dog', barks: true },
    note: null,
};

const order = Order.modelValidate(valid);
console.log('valid order', order.modelDump());
console.log('valid json', order.modelDumpJson());

try {
    Order.modelValidate({
        ...valid,
        status: 'lost',
        tags: [],
        items: [{ sku: 'SKU-1', qty: 0 }],
        pet: { kind: 'bird', barks: true },
        extra: true,
    });
    console.log('expected error: validation passed');
} catch (e) {
    console.log('expected error', e instanceof Error ? e.message : e);
}
