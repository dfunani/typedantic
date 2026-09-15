# Core V2 — Tests

**Directory:** `packages/typedantic-core/tests/`  
Vitest already includes `packages/**/tests/**/*.test.ts`. Do **not** put these next to `src/` as `*.test.ts` inside the compiler folders.

Keep V1 files:

- `schema-validator.test.ts`
- `validation-error.test.ts`

Add one file per compiler family (names match the compiler folders):

| File | Covers |
|------|--------|
| `compiler-primitives.test.ts` | number/string/literal/enum/float/any/never + constraint messages |
| `compiler-complex.test.ts` | list, dict + `keysSchema`, date, nullable/optional/default, cloned defaults |
| `compiler-unions.test.ts` | tagged (no fallthrough) and untagged |
| `compiler-functions.test.ts` | before/after/wrap/plain + default-factory |
| `compiler-model-fields.test.ts` | missing-field **location**, aliases, cloned `default: []` |

Extend `schema-validator.test.ts` with:

- `validateJson` does **not** rewrite a `ValidationError` as `json_invalid`
- malformed JSON **is** `json_invalid`
- a validator that failed once can succeed on the next call

Copy the current test files from the repo if you are following this tutorial against the rebuilt tree. The important assertions:

```ts
// constraint in the message, not the input
const v = new SchemaValidator({ type: 'number', ge: 1 });
expect(() => v.validateModel(0)).toThrow(ValidationError);
// message contains "greater than or equal to 1"

// missing field loc includes the name
schema: model-fields { name: required string }
validateModel({}) → errors[].location includes ['name']

// discriminator
{ type: 'union', discriminator: 'kind', choices: [cat, dog] }
{ kind: 'bird', barks: true } → throws (no fallthrough)

// keysSchema
{ type: 'dict', keysSchema: { type: 'string', minLength: 2 }, valuesSchema: { type: 'number' } }
{ a: 1 } → throws
```

```bash
bunx vitest run packages/typedantic-core
```

**V2 core checkpoint complete** when every file in `packages/typedantic-core/tests/` is green.

Next: [../03-typedantic/06-full-api-v2.md](../03-typedantic/06-full-api-v2.md)
