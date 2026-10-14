# 2.1 — Schema IR (V1)

File: `packages/typedantic-core/src/schema/models/configurations.ts`  
File: `packages/typedantic-core/src/schema/models/primitives.ts`  
File: `packages/typedantic-core/src/schema/models/fields.ts`  
File: `packages/typedantic-core/src/schema/types.ts`

The engine does not use classes for schemas. Every node is a plain object with a discriminant **`type`** string.

## Validation config and error shape

`packages/typedantic-core/src/schema/models/configurations.ts`:

```ts
export interface ValidationConfigSchema {
    strict?: boolean;
}

export interface ValidationErrorDetailSchema {
    type: string;
    location: (string | number)[];
    message: string;
    input: unknown;
    context?: Record<string, unknown>;
}

export interface ValidationOptionsSchema {
    strict?: boolean;
}
```

Use **`location`** and **`message`** everywhere (API JSON uses the same keys via `ValidationError.toJson()` → `{ detail: [...] }`).

## Primitives (V1)

`packages/typedantic-core/src/schema/models/primitives.ts`:

```ts
export interface IntSchema {
    type: 'int';
    strict?: boolean;
    ge?: number;
    gt?: number;
    le?: number;
    lt?: number;
    multipleOf?: number;
}

export interface NumbersSchema {
    type: 'number';
    strict?: boolean;
    ge?: number;
    gt?: number;
    le?: number;
    lt?: number;
    multipleOf?: number;
}

export interface StringSchema {
    type: 'string';
    strict?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp | string;
}

export interface BooleanSchema {
    type: 'boolean';
    strict?: boolean;
}
```

**Note:** `@typedantic/model` maps `Number` → `'int'` and explicit `type: 'number'` → `'number'`. Core treats them as separate compilers (`compileInts` vs `compileNumbers`).

## Model object IR

`packages/typedantic-core/src/schema/models/fields.ts`:

```ts
import type { BaseSchema } from '../types.js';

export interface ModelFieldSchema {
    schema: BaseSchema;
    required: boolean;
    alias?: string;
    default?: unknown;
    defaultFactory?: () => unknown;
}

export interface ModelFieldsSchema {
    type: 'model-fields';
    fields: Record<string, ModelFieldSchema>;
    modelName?: string;
    extra?: 'ignore' | 'allow' | 'forbid';
    strict?: boolean;
}
```

## Minimal `BaseSchema` union (V1)

In `schema/types.ts`, start with:

```ts
import type { IntSchema, NumbersSchema, StringSchema, BooleanSchema } from './models/primitives.js';
import type { ModelFieldsSchema } from './models/fields.js';

export type BaseSchema =
    | IntSchema
    | NumbersSchema
    | StringSchema
    | BooleanSchema
    | ModelFieldsSchema;
```

As you complete [06-full-engine-v2.md](./06-full-engine-v2.md), extend this union with imports from `schema/models/complex/*` (arrays, unions, wrappers, etc.) until it matches the live file.

## Example schemas

```ts
import type { BaseSchema } from '@typedantic/core';

const age: BaseSchema = { type: 'int', ge: 0, le: 150 };

const name: BaseSchema = { type: 'string', minLength: 1 };

const user: BaseSchema = {
    type: 'model-fields',
    extra: 'ignore',
    fields: {
        name: { schema: { type: 'string', minLength: 1 }, required: true },
        age: { schema: { type: 'int', ge: 0 }, required: true },
        active: { schema: { type: 'boolean' }, required: true },
    },
};
```

## Checklist

- [ ] `ValidationErrorDetailSchema` uses `location` / `message`
- [ ] `ModelFieldSchema.schema` is recursive `BaseSchema`
- [ ] V1 `BaseSchema` includes `model-fields`
- [ ] Re-export schema types from `index.ts` as needed for consumers

Next: [02-validation-error.md](./02-validation-error.md)
