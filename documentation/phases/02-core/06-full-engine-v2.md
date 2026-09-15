# Core V2 — Expand to full main engine

After V1 works with models, expand `types.ts` + `compile.ts` to match main:

- Copy full IR from [../../reference/core-schema-types.ts.md](../../reference/core-schema-types.ts.md)
- Copy/adapt compiler from [../../reference/compile.ts.md](../../reference/compile.ts.md)
- Apply corrections from [../00-overview/corrections-vs-main.md](../00-overview/corrections-vs-main.md):
  - float `multipleOf`
  - dict `keysSchema`
  - strict discriminator (no fallback)
- Add serializer from [../../reference/schema-serializer.ts.md](../../reference/schema-serializer.ts.md)
- Re-export serializer from `index.ts`

Keep V1 tests green while adding new suites incrementally.
