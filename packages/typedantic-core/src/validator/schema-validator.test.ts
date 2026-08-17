import { describe, it, expect } from 'vitest';
import { SchemaValidator, ValidationError } from '../index.js';
import type { CoreSchema } from '../schema/types.js';

describe('SchemaValidator', () => {
  it('validates integers with constraints', () => {
    const schema: CoreSchema = { type: 'int', ge: 0, le: 150 };
    const v = new SchemaValidator(schema);
    expect(v.validatePython(25)).toBe(25);
    expect(() => v.validatePython(-1)).toThrow(ValidationError);
    expect(() => v.validatePython(200)).toThrow(ValidationError);
  });

  it('coerces string to int when not strict', () => {
    const schema: CoreSchema = { type: 'int' };
    const v = new SchemaValidator(schema);
    expect(v.validatePython('42')).toBe(42);
  });

  it('validates model fields', () => {
    const schema: CoreSchema = {
      type: 'model-fields',
      fields: {
        name: { schema: { type: 'str', minLength: 1 }, required: true },
        age: { schema: { type: 'int', ge: 0 }, required: true },
      },
    };
    const v = new SchemaValidator(schema);
    const result = v.validatePython({ name: 'Alice', age: 30 });
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('reports missing required fields', () => {
    const schema: CoreSchema = {
      type: 'model-fields',
      fields: {
        name: { schema: { type: 'str' }, required: true },
      },
    };
    const v = new SchemaValidator(schema);
    try {
      v.validatePython({});
      expect.fail('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).errors[0].type).toBe('missing');
    }
  });

  it('validates lists', () => {
    const schema: CoreSchema = {
      type: 'list',
      itemsSchema: { type: 'str' },
      minLength: 1,
    };
    const v = new SchemaValidator(schema);
    expect(v.validatePython(['a', 'b'])).toEqual(['a', 'b']);
    expect(() => v.validatePython([])).toThrow(ValidationError);
  });

  it('validates unions', () => {
    const schema: CoreSchema = {
      type: 'union',
      choices: [{ type: 'int' }, { type: 'str' }],
    };
    const v = new SchemaValidator(schema);
    expect(v.validatePython(1)).toBe(1);
    expect(v.validatePython('hello')).toBe('hello');
    expect(() => v.validatePython({})).toThrow(ValidationError);
  });
});
