import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import {
    BaseModel,
    Field,
    modelConfig,
    fieldValidator,
    modelValidator,
    fieldSerializer,
    computedField,
    TypeAdapter,
    ValidationError,
} from '../src/index.js';

@modelConfig({ extra: 'forbid' })
class User extends BaseModel {
    @Field({ type: String, minLength: 1, alias: 'full_name' })
    name!: string;

    @Field({ type: Number, ge: 0 })
    age!: number;

    @computedField()
    get isAdult(): boolean {
        return this.age >= 18;
    }

    @fieldValidator('name', { mode: 'after' })
    static trimName(value: unknown): unknown {
        return typeof value === 'string' ? value.trim() : value;
    }

    @fieldSerializer('name')
    static upperName(value: unknown): unknown {
        return typeof value === 'string' ? value.toUpperCase() : value;
    }

    @modelValidator({ mode: 'after' })
    static checkAge(data: unknown): unknown {
        const d = data as { age?: number };
        if (d.age !== undefined && d.age > 150) {
            throw new Error('age too high');
        }
        return data;
    }
}

describe('V2 validators / serializers / computed / TypeAdapter', () => {
    it('fieldValidator trims and fieldSerializer uppercases on dump', () => {
        const u = User.modelValidate({ name: '  ada  ', age: 36 });
        expect(u.name).toBe('ada');
        expect(u.modelDump()).toMatchObject({ name: 'ADA', age: 36, isAdult: true });
    });

    it('modelValidator rejects', () => {
        expect(() => User.modelValidate({ name: 'Ada', age: 200 })).toThrow(ValidationError);
    });

    it('modelValidateJson and modelCopy work', () => {
        const u = User.modelValidateJson(JSON.stringify({ name: 'Bob', age: 20 }));
        expect(u.name).toBe('Bob');
        const copy = u.modelCopy({ update: { age: 21 } });
        expect(copy.age).toBe(21);
        expect(copy.name).toBe('Bob');
    });

    it('constructor validates', () => {
        const u = new User({ name: 'Cy', age: 40 });
        expect(u).toBeInstanceOf(User);
        expect(u.age).toBe(40);
    });

    it('modelJsonSchema includes properties', () => {
        const schema = User.modelJsonSchema();
        expect(schema.$ref || schema.type).toBeTruthy();
        const defs = schema.$defs as Record<string, { properties: Record<string, unknown> }>;
        if (defs?.User) {
            expect(defs.User.properties).toHaveProperty('name');
            expect(defs.User.properties).toHaveProperty('age');
        }
    });

    it('TypeAdapter validates and dumps', () => {
        const adapter = new TypeAdapter<User>(User);
        const u = adapter.validate({ name: 'Dee', age: 22 });
        expect(u).toBeInstanceOf(User);
        expect(adapter.dumpJson(u)).toContain('DEE');
    });

    it('dump byAlias uses Field alias', () => {
        const u = User.modelValidate({ name: 'Eve', age: 19 });
        expect(u.modelDump({ byAlias: true })).toMatchObject({ full_name: 'EVE', age: 19 });
    });
});

describe('inheritance field registry (B1)', () => {
    class A extends BaseModel {
        @Field({ type: String })
        a!: string;
    }
    class B extends A {
        @Field({ type: String })
        b!: string;
    }

    it('does not require subclass fields on parent', () => {
        expect(A.modelValidate({ a: 'x' }).a).toBe('x');
        expect(B.modelValidate({ a: 'x', b: 'y' }).b).toBe('y');
    });
});
