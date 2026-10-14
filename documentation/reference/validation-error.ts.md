# `packages/typedantic-core/src/errors/validation-error.ts`

**Package:** `@typedantic/core`  
**Note:** Live source (0.1) — authoritative for rebuild. Prefer phase pages for teaching order.

## `errors/validation-error.ts`

```ts
import type { ValidationErrorDetailSchema } from '../schema/models/configurations.js';
import { errorMessage } from './utils.js';

export class ValidationError extends Error {
    readonly name = "ValidationError";
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

## `errors/utils.ts`

```ts
import { ValidationErrorDetailSchema } from "../schema/models/configurations.js";

export function errorMessage(errors: ValidationErrorDetailSchema[]): string {
    return errors.map((e) => `${e.location.join('.')}: ${e.message}`).join('; ');
}
```
