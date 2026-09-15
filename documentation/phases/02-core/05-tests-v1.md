# Core V1 — Tests

**Path:** `packages/typedantic-core/src/validator/schema-validator.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { SchemaValidator, ValidationError } from '../index.js';
import type { CoreSchema } from '../schema/types.js';

describe('SchemaValidator V1', () => {
  it('validates int with constraints', () => {
    const schema: CoreSchema = { type: 'int', ge: 0, le: 150 };
    const v = new SchemaValidator(schema);
    expect(v.validatePython(25)).toBe(25);
    expect(() => v.validatePython(-1)).toThrow(ValidationError);
    expect(() => v.validatePython(1.5)).toThrow(ValidationError);
  });

  it('coerces string to int when not strict', () => {
    const v = new SchemaValidator({ type: 'int' });
    expect(v.validatePython('42')).toBe(42);
  });

  it('rejects string to int when strict', () => {
    const v = new SchemaValidator({ type: 'int', strict: true });
    expect(() => v.validatePython('42')).toThrow(ValidationError);
  });

  it('validates str minLength', () => {
    const v = new SchemaValidator({ type: 'str', minLength: 3 });
    expect(v.validatePython('abc')).toBe('abc');
    expect(() => v.validatePython('ab')).toThrow(ValidationError);
  });

  it('validates bool coercion', () => {
    const v = new SchemaValidator({ type: 'bool' });
    expect(v.validatePython('true')).toBe(true);
    expect(v.validatePython(0)).toBe(false);
    expect(() => new SchemaValidator({ type: 'bool', strict: true }).validatePython('true')).toThrow(
      ValidationError,
    );
  });

  it('validates model-fields', () => {
    const schema: CoreSchema = {
      type: 'model-fields',
      fields: {
        name: { schema: { type: 'str', minLength: 1 }, required: true },
        age: { schema: { type: 'int', ge: 0 }, required: true },
        active: { schema: { type: 'bool' }, required: true },
      },
      extra: 'forbid',
    };
    const v = new SchemaValidator(schema);
    expect(v.validatePython({ name: 'Ada', age: 36, active: true })).toEqual({
      name: 'Ada',
      age: 36,
      active: true,
    });
    expect(() => v.validatePython({ name: 'Ada' })).toThrow(ValidationError);
    expect(() =>
      v.validatePython({ name: 'Ada', age: 1, active: true, extra: 1 }),
    ).toThrow(ValidationError);
  });
});
```

```bash
bunx vitest run packages/typedantic-core
```

**V1 core checkpoint complete** when all of the above pass.

Next: either [06-full-engine-v2.md](./06-full-engine-v2.md) or jump to [../03-typedantic/README.md](../03-typedantic/README.md) to wire BaseModel.
