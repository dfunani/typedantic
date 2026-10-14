# 2.2 — ValidationError

Files:

- `packages/typedantic-core/src/errors/utils.ts`
- `packages/typedantic-core/src/errors/validation-error.ts`
- `packages/typedantic-core/src/factories/validation-error.ts`

## Human-readable message

`errors/utils.ts`:

```ts
import type { ValidationErrorDetailSchema } from '../schema/models/configurations.js';

export function errorMessage(errors: ValidationErrorDetailSchema[]): string {
    return errors.map((e) => `${e.location.join('.')}: ${e.message}`).join('; ');
}
```

Empty `location` → message starts at field name (root errors).

## ValidationError class

Match `packages/typedantic-core/src/errors/validation-error.ts`:

```ts
import type { ValidationErrorDetailSchema } from '../schema/models/configurations.js';
import { errorMessage } from './utils.js';

export class ValidationError extends Error {
    readonly name = 'ValidationError';
    readonly errors: ValidationErrorDetailSchema[];

    constructor(errors: ValidationErrorDetailSchema[]) {
        super(errorMessage(errors));
        this.errors = errors;
    }

    toJson(): string {
        return JSON.stringify({ detail: this.errors });
    }

    toObject(): { detail: ValidationErrorDetailSchema[] } {
        return { detail: this.errors };
    }
}
```

**API shape:** `toJson()` parses to `{ detail: ValidationErrorDetailSchema[] }` with `location`, `message`, `type`, `input`, optional `context`. Do not use `loc` / `msg`.

## Factory helper

`factories/validation-error.ts`:

```ts
import type { ValidationErrorDetailSchema, ValidationOptionsSchema } from '../schema/models/configurations.js';
import type { BaseSchema } from '../schema/types.js';
import { SchemaValidator } from '../validator/schema.js';

export function createValidationErrorDetail(
    type: string,
    location: (string | number)[],
    message: string,
    input: unknown,
    context?: Record<string, unknown>,
): ValidationErrorDetailSchema {
    return { type, location, message, input, ...(context ? { context } : {}) };
}

export function createSchemaValidator(
    schema: BaseSchema,
    input: unknown,
    options?: ValidationOptionsSchema,
): unknown {
    return new SchemaValidator(schema, options).validateModel(input, options);
}
```

Compilers should push details via `createValidationErrorDetail` (or equivalent) so `type`, `location`, and `context.strict` stay consistent.

## Quick test

```ts
import { ValidationError } from '../errors/validation-error.js';
import { createValidationErrorDetail } from '../factories/validation-error.js';

const err = new ValidationError([
    createValidationErrorDetail('missing', ['user', 'age'], 'Field required', {}),
]);
console.log(err.message); // user.age: Field required
console.log(JSON.parse(err.toJson()).detail[0].location); // ['user', 'age']
```

Full tests: [05-tests-v1.md](./05-tests-v1.md) → `validation-error.test.ts`.

Next: [03-compiler-v1.md](./03-compiler-v1.md)
