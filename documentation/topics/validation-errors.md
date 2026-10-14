# Deep dive: ValidationError and FastAPI-style 422

**Class:** `packages/typedantic-core/src/errors/validation-error.ts`  
**Factory:** `packages/typedantic-core/src/factories/validation-error.ts` (`createValidationErrorDetail`)

Re-exported from `@typedantic/model` for convenience.

## Detail shape

Each compiler push uses **`location`** and **`message`** (not FastAPI’s `loc` / `msg` field names):

```ts
{
  type: 'missing',
  location: ['user', 'age'],
  message: 'Field required',
  input: {},
  context?: { strict?: boolean; ge?: number; /* … */ },
}
```

Human-readable `ValidationError.message` joins entries as `location.join('.') + ': ' + message`.

## Class API

```ts
class ValidationError extends Error {
  readonly name = 'ValidationError';
  readonly errors: ValidationErrorDetailSchema[];

  toJson(): string;   // JSON string: '{"detail":[...]}'
  toObject(): { detail: ValidationErrorDetailSchema[] };
}
```

HTTP 422:

```ts
res.status(422).send(err.toJson());
// or
res.status(422).json(err.toObject());
```

## Accumulation

Compiler validators **push** into `ctx.errors`. `SchemaValidator.validateModel` throws `ValidationError` when `errors.length > 0`. Each call uses a fresh errors array so a cached validator can succeed after a prior failure.

## Further reading

- [../phases/02-core/02-validation-error.md](../phases/02-core/02-validation-error.md)
- [../reference/validation-error.ts.md](../reference/validation-error.ts.md)
