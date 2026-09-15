import 'reflect-metadata';
import { BaseModel, Field, modelConfig } from 'typedantic';

@modelConfig({ extra: 'forbid' })
class Cart extends BaseModel {
    @Field({ type: Array, items: String, default: [] })
    items!: string[];

    @Field({ type: String, default: 'NONE' })
    coupon!: string;

    @Field({ type: String, nullable: true })
    note!: string | null;
}

const first = Cart.modelValidate({ note: null });
(first.items as string[]).push('shared?');
const second = Cart.modelValidate({ note: null });
console.log('defaults first', first.modelDump());
console.log('defaults second', second.modelDump());
