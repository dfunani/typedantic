# Core — ValidationError

**Path:** `packages/typedantic-core/src/errors/validation-error.ts`  
Deep dive: [../../topics/validation-errors.md](../../topics/validation-errors.md)

```ts
import type { ValidationErrorDetail } from '../schema/types.js';

export class ValidationError extends Error {
  readonly errors: ValidationErrorDetail[];

  constructor(errors: ValidationErrorDetail[]) {
    const msg = errors.map((e) => `${e.loc.join('.')}: ${e.msg}`).join('; ');
    super(msg);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  errorCount(): number {
    return this.errors.length;
  }

  /** FastAPI-compatible 422 body as JSON string: `{ "detail": [...] }` */
  json(): string {
    return JSON.stringify({ detail: this.errors });
  }

  toJSON(): { detail: ValidationErrorDetail[] } {
    return { detail: this.errors };
  }
}

export function createError(
  type: string,
  loc: (string | number)[],
  msg: string,
  input: unknown,
  ctx?: Record<string, unknown>,
): ValidationErrorDetail {
  return { type, loc, msg, input, ...(ctx ? { ctx } : {}) };
}
```

### Test — `packages/typedantic-core/src/errors/validation-error.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { ValidationError, createError } from './validation-error.js';

describe('ValidationError', () => {
  it('formats and counts', () => {
    const err = new ValidationError([
      createError('missing', ['user', 'age'], 'Field required', {}),
    ]);
    expect(err.message).toContain('user.age: Field required');
    expect(err.errorCount()).toBe(1);
  });

  it('json() is FastAPI shaped', () => {
    const err = new ValidationError([
      createError('missing', ['name'], 'Field required', {}),
    ]);
    expect(JSON.parse(err.json())).toEqual({
      detail: [
        { type: 'missing', loc: ['name'], msg: 'Field required', input: {} },
      ],
    });
  });
});
```

```bash
bunx vitest run packages/typedantic-core/src/errors
```

Next: [03-compiler-v1.md](./03-compiler-v1.md)
