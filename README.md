# Typedantic

Pydantic-style validation for TypeScript (work in progress).

## Documentation (rebuild from scratch)

The full curriculum lives in **[documentation/](./documentation/)**:

- Start: [documentation/README.md](./documentation/README.md)
- Linear path: [documentation/tutorial.md](./documentation/tutorial.md)
- Why `test.ts` fails today: [documentation/topics/why-test-ts-fails.md](./documentation/topics/why-test-ts-fails.md)

Milestone **V1** target: `int` / `bool` / `str` + `BaseModel` / `@Field` end-to-end.

## Install (monorepo)

```bash
bun install
bun run build
bun run test
bun run typecheck
```

pnpm / npm alternatives are documented in the tutorial.
