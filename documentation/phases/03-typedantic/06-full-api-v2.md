# Typedantic V2 — expand to full main API

Implement in order using reference copies:

1. Field validators / model validators / computedField — [../../reference/](../../reference/) + correct `ctorOf`
2. Full schema-builder (unions, literals, special types, defaults) — [../../reference/schema-builder.ts.md](../../reference/schema-builder.ts.md)
3. Serializers — wire into `modelDump` **and** `modelDumpJson`
4. JSON Schema + TypeAdapter — fix `RegExp.source`
5. RootModel, createModel, DiscriminatedUnion
6. Expand `index.ts` to match [../../reference/typedantic-index.ts.md](../../reference/typedantic-index.ts.md)
7. Port main tests: `base-model.test.ts`, `discriminated-union.test.ts`, `features.test.ts`

Apply [../00-overview/corrections-vs-main.md](../00-overview/corrections-vs-main.md) while copying.
