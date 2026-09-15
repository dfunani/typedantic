# Typedantic V2 — Tests

## Unit tests (package route)

**Directory:** `packages/typedantic/tests/`

Vitest include: `packages/**/tests/**/*.test.ts`.

| File | Covers |
|------|--------|
| `field-schema.test.ts` | `getModelFields` emits date/list/dict/model/enum/literal/nullable/float; bare `Object` is **not** a dict |
| `base-model.test.ts` | `modelValidate` on nested tagged unions, enums, `defaultFactory`, extra-forbid |

Import `reflect-metadata` first. Import the package from `../src/index.js` so tests run against source.

```bash
bunx vitest run packages/typedantic
```

## Functional tests (repo root)

**Directory:** `tests/` — runnable with Bun, not Vitest.

| File | What it proves |
|------|----------------|
| `basic.ts` | V1 primitives + extra ignore |
| `advanced.ts` | Nested order: list, dict, date, enum, union, alias, nullable, defaults |
| `collections.ts` | list minLength + dict |
| `unions.ts` | Cat/Dog discriminator + unknown tag |
| `defaults.ts` | `default: []` is cloned across validates |
| `basic-settings.ts` | env + `.env` |

```bash
bun run build
bun tests/advanced.ts
bun tests/collections.ts
bun tests/unions.ts
bun tests/defaults.ts
bun run functional-test
```

`functional-test` is `bun run --parallel tests/*.ts`. Build packages first so workspace imports resolve to `dist/`.

**V2 API checkpoint complete** when unit + functional scripts all succeed.

Next: [../04-settings/README.md](../04-settings/README.md) or [../05-ship/README.md](../05-ship/README.md).
