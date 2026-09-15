# Core — SchemaValidator

**Path:** `packages/typedantic-core/src/validator/schema-validator.ts`  
Main reference: [../../reference/schema-validator.ts.md](../../reference/schema-validator.ts.md)

## Critical V1 behavior

After running the compiled function, **if `errors.length > 0`, throw `ValidationError`**.  
If you forget this, bool/str soft-failures return bad values and models look "valid" when they are not.

```ts
import { compileValidator } from '../compiler/compile.js';
import { ValidationError } from '../errors/validation-error.js';
import type { CoreSchema, ValidateOptions, ValidationErrorDetail } from '../schema/types.js';

export class SchemaValidator {
  private readonly validateFn: ReturnType<typeof compileValidator>;
  private lastErrors: ValidationErrorDetail[] = [];

  constructor(
    private readonly schema: CoreSchema,
    private readonly config: ValidateOptions = {},
  ) {
    this.validateFn = compileValidator(schema);
  }

  validatePython(input: unknown, options?: ValidateOptions): unknown {
    const errors: ValidationErrorDetail[] = [];
    const mergedConfig = { strict: options?.strict ?? this.config.strict };

    const result = this.validateFn(input, {
      path: [],
      config: mergedConfig,
      errors,
    });

    this.lastErrors = errors;

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    return result;
  }

  validateJson(json: string, options?: ValidateOptions): unknown {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new ValidationError([
        { type: 'json_invalid', loc: [], msg: 'Invalid JSON', input: json },
      ]);
    }
    return this.validatePython(parsed, options);
  }

  getErrors(): ValidationErrorDetail[] {
    return this.lastErrors;
  }

  getSchema(): CoreSchema {
    return this.schema;
  }
}

export function validate(
  schema: CoreSchema,
  input: unknown,
  options?: ValidateOptions,
): unknown {
  return new SchemaValidator(schema, options).validatePython(input, options);
}
```

### Vitest assertion reminder

```ts
// correct
expect(() => v.validatePython('x')).toThrow(ValidationError);
// wrong — calls validate before expect
expect(v.validatePython('x')).toThrow(ValidationError);
```

### Index — `packages/typedantic-core/src/index.ts`

```ts
export * from './schema/types.js';
export { ValidationError, createError } from './errors/validation-error.js';
export { compileValidator } from './compiler/compile.js';
export { SchemaValidator, validate } from './validator/schema-validator.js';
```

```bash
bun run --filter @typedantic/core build
```

Next: [05-tests-v1.md](./05-tests-v1.md)
