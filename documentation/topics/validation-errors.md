# Deep dive: ValidationError and FastAPI-style 422

**File:** `packages/typedantic-core/src/errors/validation-error.ts`

## Detail shape

```ts
{
  type: 'missing',
  loc: ['user', 'age'],
  msg: 'Field required',
  input: {},
  ctx?: { ge: 0 },
}
```

## Class API

```ts
class ValidationError extends Error {
  readonly errors: ValidationErrorDetail[];
  errorCount(): number;
  json(): string;   // '{"detail":[...]}'
  toJSON(): { detail: ValidationErrorDetail[] };
}
```

FastAPI 422:

```ts
res.status(422).json(err.toJSON());
```

## Accumulation

Compiler **pushes** into `ctx.errors`. `SchemaValidator` must throw when `errors.length > 0`.

## Further reading

- [../phases/02-core/02-validation-error.md](../phases/02-core/02-validation-error.md)
- [../reference/validation-error.ts.md](../reference/validation-error.ts.md)
