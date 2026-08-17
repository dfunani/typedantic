import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { BaseModel, Field, computedField, EmailStr, createModel } from './index.js';

class User extends BaseModel {
  @Field({ minLength: 1 })
  firstName!: string;

  @Field({ minLength: 1 })
  lastName!: string;

  @computedField()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

class Contact extends BaseModel {
  @Field({ pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })
  email!: string;
}

describe('Extended features', () => {
  it('includes computed fields in modelDump', () => {
    const user = User.modelValidate({ firstName: 'Ada', lastName: 'Lovelace' });
    expect(user.modelDump()).toMatchObject({ fullName: 'Ada Lovelace' });
  });

  it('validates EmailStr', () => {
    const c = Contact.modelValidate({ email: 'ada@example.com' });
    expect(c.email).toBe('ada@example.com');
  });

  it('createModel builds dynamic models', () => {
    const Point = createModel('Point', { x: { ge: 0, default: 0 }, y: { ge: 0, default: 0 } });
    const p = Point.modelValidate({ x: 1, y: 2 });
    expect(p.modelDump()).toEqual({ x: 1, y: 2 });
  });
});
