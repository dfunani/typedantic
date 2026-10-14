# Reference sources (0.1)

Live TypeScript snapshots for rebuild. Prefer **phase pages** for teaching order; use these when you need the full file.

| Doc | Live path |
|-----|-----------|
| [core-schema-types.ts.md](./core-schema-types.ts.md) | `@typedantic/core` schema IR |
| [validation-error.ts.md](./validation-error.ts.md) | `errors/validation-error.ts` (+ utils) |
| [compile.ts.md](./compile.ts.md) | `compiler/compile.ts` |
| [schema-validator.ts.md](./schema-validator.ts.md) | `validator/schema.ts` |
| [typedantic-index.ts.md](./typedantic-index.ts.md) | `@typedantic/model` public exports |
| [base-model.ts.md](./base-model.ts.md) | `base-model.ts` + `factories.ts` |
| [field.ts.md](./field.ts.md) | `fields/decorator.ts` |
| [field-registry.ts.md](./field-registry.ts.md) | `fields/registry.ts` |
| [metadata.ts.md](./metadata.ts.md) | `fields/types.ts` |
| [reflect.ts.md](./reflect.ts.md) | `fields/properties.ts` |
| [schema-builder.ts.md](./schema-builder.ts.md) | `fields/builders/*` |
| [settings-index.ts.md](./settings-index.ts.md) | `@typedantic/settings` entry |
| [settings-config.ts.md](./settings-config.ts.md) | `config.ts` |
| [settings-environment.ts.md](./settings-environment.ts.md) | `environment.ts` |
| [schema-serializer.ts.md](./schema-serializer.ts.md) | **Deferred** — not public in 0.1 |

When a phase page and a reference disagree, prefer the **phase page** and re-check `packages/*/src`.
