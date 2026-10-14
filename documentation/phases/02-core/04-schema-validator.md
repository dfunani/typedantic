# 2.4 — SchemaValidator

File: `packages/typedantic-core/src/validator/schema.ts`

`SchemaValidator` compiles the schema once in the constructor, runs the resulting function, collects errors, and throws `ValidationError` when any detail was recorded.

**Method name:** `validateModel` (not `validatePython` or similar).

## Implementation

Match live code:

```ts
import { compileValidator } from '../compiler/compile.js';
import { ValidationError } from '../errors/validation-error.js';
import { createValidationErrorDetail } from '../factories/validation-error.js';
import type { ValidationConfigSchema, ValidationErrorDetailSchema } from '../schema/models/configurations.js';
import type { BaseSchema } from '../schema/types.js';

export class SchemaValidator {
    private readonly validatorFunction: ReturnType<typeof compileValidator>;
    private readonly errors: ValidationErrorDetailSchema[] = [];

    constructor(
        private readonly schema: BaseSchema,
        private readonly config: ValidationConfigSchema = {},
    ) {
        this.validatorFunction = compileValidator(schema);
    }

    validateModel(input: unknown, config?: ValidationConfigSchema): unknown {
        const strict = config?.strict ?? this.config.strict;
        const errors: ValidationErrorDetailSchema[] = [];

        const result = this.validatorFunction(input, {
            path: [],
            config: { strict },
            errors,
        });

        this.errors.length = 0;
        this.errors.push(...errors);

        if (errors.length > 0) {
            throw new ValidationError([...errors]);
        }

        return result;
    }

    validateJson(json: string, config?: ValidationConfigSchema): unknown {
        const strict = config?.strict ?? this.config.strict;
        let parsed: unknown;
        try {
            parsed = JSON.parse(json);
        } catch {
            const error = createValidationErrorDetail('json_invalid', [], 'Invalid JSON', json, { strict });
            throw new ValidationError([error]);
        }
        return this.validateModel(parsed, config);
    }

    getErrors(): ValidationErrorDetailSchema[] {
        return this.errors;
    }

    getSchema(): BaseSchema {
        return this.schema;
    }
}
```

## Usage

```ts
import { SchemaValidator, ValidationError } from '@typedantic/core';

const schema = {
    type: 'model-fields',
    fields: {
        name: { schema: { type: 'string', minLength: 1 }, required: true },
        age: { schema: { type: 'int', ge: 0 }, required: true },
    },
} as const;

const v = new SchemaValidator(schema);

const out = v.validateModel({ name: 'Ada', age: 36 });
// { name: 'Ada', age: 36 }

try {
    v.validateModel({ name: '' });
} catch (e) {
    if (e instanceof ValidationError) {
        console.log(e.errors[0].location); // e.g. ['name']
    }
}
```

## `createSchemaValidator` shortcut

From `factories/validation-error.ts`:

```ts
createSchemaValidator({ type: 'int', ge: 0 }, 10); // → 10
```

Same as `new SchemaValidator(schema, options).validateModel(input, options)`.

## Export from core

`packages/typedantic-core/src/index.ts`:

```ts
export { SchemaValidator } from './validator/schema.js';
export { createSchemaValidator, createValidationErrorDetail } from './factories/validation-error.js';
```

Next: [05-tests-v1.md](./05-tests-v1.md)
