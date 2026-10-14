# 2.5 — Core tests (V1)

Location: `packages/typedantic-core/tests/`

Vitest picks these up via root `vitest.config.ts`:

```ts
include: ['packages/**/tests/**/*.test.ts'],
```

Run:

```bash
bun run build
bun run test -- packages/typedantic-core
```

## V1 files to implement first

| File | Covers |
|------|--------|
| `validation-error.test.ts` | `errorMessage`, `toJson()` → `{ detail }`, `location` / `message` |
| `schema-validator.test.ts` | `validateModel` for int/string/boolean/model-fields, strict coercion, `validateJson` |
| `compiler-primitives.test.ts` | Constraint messages, literals/enums/number/any/never (extend as you add V2 types) |
| `compiler-model-fields.test.ts` | Missing paths, aliases, default array cloning |

V2 adds: `compiler-complex.test.ts`, `compiler-unions.test.ts`, `compiler-functions.test.ts` — see [07-tests-v2.md](./07-tests-v2.md).

## `validation-error.test.ts`

Mirror live expectations:

```ts
import { describe, it, expect } from 'vitest';
import { ValidationError } from '../src/errors/validation-error.js';
import { createValidationErrorDetail } from '../src/factories/validation-error.js';

describe('ValidationError', () => {
    it('formats and counts', () => {
        const err = new ValidationError([
            createValidationErrorDetail('missing', ['user', 'age'], 'Field required', {}),
        ]);
        expect(err.message).toContain('user.age: Field required');
        expect(err.errors.length).toBe(1);
    });

    it('toJson() is API response shaped', () => {
        const err = new ValidationError([
            createValidationErrorDetail('missing', ['name'], 'Field required', {}),
        ]);
        expect(JSON.parse(err.toJson())).toEqual({
            detail: [
                { type: 'missing', location: ['name'], message: 'Field required', input: {} },
            ],
        });
    });
});
```

## `schema-validator.test.ts` (V1 highlights)

- Int with `ge` / `le`; reject floats for `type: 'int'`
- Coerce `'42'` → `42` when not strict; reject when `strict: true`
- String `minLength`
- Boolean coercion from `'true'` / `0`
- `model-fields` with `extra: 'forbid'`
- `validateJson`: malformed JSON → `type: 'json_invalid'`; validation failure is still `ValidationError`, not confused with JSON parse errors

## `compiler-model-fields.test.ts`

- Missing required fields → errors with `location` `name`, `zip`, etc.
- Alias `postal_code` maps to field `zip`
- Mutable `default: []` is cloned per validation

## Helper pattern

Many tests use a small helper:

```ts
function errorOf(fn: () => unknown): ValidationError {
    try {
        fn();
        throw new Error('expected ValidationError');
    } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        return error as ValidationError;
    }
}
```

## Pitfalls

- Import from `../src/index.js` or concrete paths under `../src/` — not from unpublished package names before `build`.
- After changing core, rebuild before model tests: [common-pitfalls.md](../../topics/common-pitfalls.md).

Next: optional [06-full-engine-v2.md](./06-full-engine-v2.md), then Phase 3 — [@typedantic/model](../03-typedantic/README.md).
