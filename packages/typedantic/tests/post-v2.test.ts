import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import {
    BaseModel,
    Field,
    RootModel,
    createModel,
    extendModel,
    EmailStr,
    HttpUrl,
    UUID,
    PositiveInt,
    NegativeInt,
    NonNegativeInt,
    SecretStr,
    TypeAdapter,
    ValidationError,
} from '../src/index.js';
import type { FieldInfo } from '../src/index.js';

describe('RootModel', () => {
    class IntList extends RootModel<number[]> {
        static rootType: FieldInfo = { type: Array, items: Number };
        root!: number[];
    }

    it('validates a root array', () => {
        const m = IntList.modelValidate([1, 2, 3]);
        expect(m.root).toEqual([1, 2, 3]);
        expect(m.modelDump()).toEqual([1, 2, 3]);
    });

    it('rejects invalid root', () => {
        expect(() => IntList.modelValidate(['a'])).toThrow(ValidationError);
    });

    it('modelValidateJson and constructor work', () => {
        const m = IntList.modelValidateJson('[4,5]');
        expect(m.root).toEqual([4, 5]);
        const n = new IntList([9]);
        expect(n.root).toEqual([9]);
    });

    it('supports annotated rootType', () => {
        class Positive extends RootModel<number> {
            static rootType = PositiveInt;
            root!: number;
        }
        expect(Positive.modelValidate(3).root).toBe(3);
        expect(() => Positive.modelValidate(0)).toThrow(ValidationError);
    });
});

describe('Annotated types', () => {
    class Contact extends BaseModel {
        @Field({ type: EmailStr })
        email!: string;

        @Field({ type: HttpUrl })
        website!: string;

        @Field({ type: UUID })
        id!: string;

        @Field({ type: PositiveInt })
        score!: number;

        @Field({ type: SecretStr })
        password!: SecretStr;
    }

    it('accepts valid annotated values', () => {
        const c = Contact.modelValidate({
            email: 'ada@example.com',
            website: 'https://example.com/x',
            id: '550e8400-e29b-41d4-a716-446655440000',
            score: 10,
            password: 's3cret',
        });
        expect(c.email).toBe('ada@example.com');
        expect(c.score).toBe(10);
        expect(c.password).toBeInstanceOf(SecretStr);
        expect(c.password.getSecretValue()).toBe('s3cret');
        expect(String(c.password)).toBe('**********');
        expect(c.modelDumpJson()).toContain('**********');
        expect(c.modelDumpJson()).not.toContain('s3cret');
    });

    it('rejects invalid email / url / uuid / positive', () => {
        expect(() =>
            Contact.modelValidate({
                email: 'not-an-email',
                website: 'https://example.com',
                id: '550e8400-e29b-41d4-a716-446655440000',
                score: 1,
                password: 'x',
            }),
        ).toThrow(ValidationError);

        expect(() =>
            Contact.modelValidate({
                email: 'ada@example.com',
                website: 'ftp://example.com',
                id: '550e8400-e29b-41d4-a716-446655440000',
                score: 1,
                password: 'x',
            }),
        ).toThrow(ValidationError);

        expect(() =>
            Contact.modelValidate({
                email: 'ada@example.com',
                website: 'https://example.com',
                id: 'not-a-uuid',
                score: 1,
                password: 'x',
            }),
        ).toThrow(ValidationError);

        expect(() =>
            Contact.modelValidate({
                email: 'ada@example.com',
                website: 'https://example.com',
                id: '550e8400-e29b-41d4-a716-446655440000',
                score: 0,
                password: 'x',
            }),
        ).toThrow(ValidationError);
    });

    it('works with TypeAdapter', () => {
        const adapter = new TypeAdapter(EmailStr);
        expect(adapter.validate('a@b.co')).toBe('a@b.co');
        expect(() => adapter.validate('nope')).toThrow(ValidationError);
    });

    it('NegativeInt / NonNegativeInt', () => {
        expect(new TypeAdapter(NegativeInt).validate(-1)).toBe(-1);
        expect(() => new TypeAdapter(NegativeInt).validate(1)).toThrow(ValidationError);
        expect(new TypeAdapter(NonNegativeInt).validate(0)).toBe(0);
        expect(() => new TypeAdapter(NonNegativeInt).validate(-1)).toThrow(ValidationError);
    });
});

describe('createModel / extendModel', () => {
    it('creates a dynamic model', () => {
        const User = createModel(
            'User',
            {
                name: { type: String, minLength: 1 },
                age: { type: Number, ge: 0 },
            },
            { extra: 'forbid' },
        );
        const u = User.modelValidate({ name: 'Ada', age: 36 });
        expect(u.name).toBe('Ada');
        expect(u.age).toBe(36);
        expect(() => User.modelValidate({ name: 'Ada', age: 36, x: 1 })).toThrow(
            ValidationError,
        );
    });

    it('extends a base model with extra fields', () => {
        const Base = createModel('Base', { id: { type: String } });
        const Ext = extendModel(Base, 'Ext', { tag: { type: String } });
        const e = Ext.modelValidate({ id: '1', tag: 'a' });
        expect(e.id).toBe('1');
        expect(e.tag).toBe('a');
    });
});
