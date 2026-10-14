import 'reflect-metadata';
import {
    BaseModel,
    Field,
    modelConfig,
    fieldValidator,
    fieldSerializer,
    computedField,
    TypeAdapter,
} from '@typedantic/model';

@modelConfig({ extra: 'forbid' })
class Product extends BaseModel {
    @Field({ type: String, minLength: 1 })
    sku!: string;

    @Field({ type: 'number', ge: 0 })
    price!: number;

    @computedField()
    get expensive(): boolean {
        return this.price >= 100;
    }

    @fieldValidator('sku', { mode: 'after' })
    static upperSku(v: unknown): unknown {
        return typeof v === 'string' ? v.toUpperCase() : v;
    }

    @fieldSerializer('sku')
    static serializeSku(v: unknown): unknown {
        return typeof v === 'string' ? `SKU:${v}` : v;
    }
}

const p = Product.modelValidate({ sku: 'abc', price: 120 });
console.log('validated', p.sku, p.expensive);
console.log('dump', p.modelDump());
console.log('json schema keys', Object.keys(Product.modelJsonSchema()));

const adapter = new TypeAdapter(Product);
const again = adapter.validateJson(JSON.stringify({ sku: 'xyz', price: 10 }));
console.log('adapter', adapter.dump(again));

const fromCtor = new Product({ sku: 'ctor', price: 1 });
console.log('ctor', fromCtor.modelDumpJson());
