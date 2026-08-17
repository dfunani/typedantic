import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { BaseModel, Field, fieldValidator, modelConfig, ValidationError } from '../index.js';

@modelConfig({ extra: 'forbid' })
class UserCreate extends BaseModel {
  @Field({ minLength: 3, maxLength: 50 })
  username!: string;

  @Field({ pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })
  email!: string;

  @Field({ ge: 0, le: 150 })
  age!: number;

  @Field({ default: [] })
  tags!: string[];

  @fieldValidator('username', { mode: 'before' })
  static normalizeUsername(v: unknown): unknown {
    return typeof v === 'string' ? v.trim().toLowerCase() : v;
  }
}

describe('BaseModel', () => {
  it('validates and creates instance', () => {
    const user = UserCreate.modelValidate({
      username: ' Alice ',
      email: 'alice@example.com',
      age: 25,
    });
    expect(user.username).toBe('alice');
    expect(user.age).toBe(25);
    expect(user.tags).toEqual([]);
  });

  it('throws ValidationError on invalid data', () => {
    expect(() =>
      UserCreate.modelValidate({
        username: 'ab',
        email: 'invalid',
        age: -1,
      }),
    ).toThrow(ValidationError);
  });

  it('modelDump serializes instance', () => {
    const user = UserCreate.modelValidate({
      username: 'bob',
      email: 'bob@example.com',
      age: 30,
    });
    expect(user.modelDump()).toEqual({
      username: 'bob',
      email: 'bob@example.com',
      age: 30,
      tags: [],
    });
  });

  it('modelJsonSchema generates schema', () => {
    const schema = UserCreate.modelJsonSchema();
    expect(schema.$defs ?? schema).toBeDefined();
    const defs = schema.$defs as Record<string, unknown> | undefined;
    const model = defs?.UserCreate ?? schema;
    expect(model).toHaveProperty('type', 'object');
    expect(model).toHaveProperty('properties');
  });

  it('modelCopy creates updated copy', () => {
    const user = UserCreate.modelValidate({
      username: 'carol',
      email: 'carol@example.com',
      age: 28,
    });
    const copy = user.modelCopy({ age: 29 });
    expect(copy.age).toBe(29);
    expect(copy.username).toBe('carol');
  });
});
