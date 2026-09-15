# Typedantic Documentation — Rebuild From Scratch

This folder is a **complete rebuild curriculum** for Typedantic.
It is based on the `main` branch architecture, with **intentional corrections** so a beginner can produce a working library.

If you only read one file, start here: **[tutorial.md](./tutorial.md)** (linear path).

---

## How to use this space

| Goal | Start here |
|------|------------|
| Rebuild end-to-end in order | [tutorial.md](./tutorial.md) |
| Understand the big picture | [phases/00-overview/architecture.md](./phases/00-overview/architecture.md) |
| Scaffold the monorepo | [phases/01-scaffold/README.md](./phases/01-scaffold/README.md) |
| Build `@typedantic/core` | [phases/02-core/README.md](./phases/02-core/README.md) |
| Build `typedantic` (BaseModel) | [phases/03-typedantic/README.md](./phases/03-typedantic/README.md) |
| Build settings | [phases/04-settings/README.md](./phases/04-settings/README.md) |
| Test, CI, publish | [phases/05-ship/README.md](./phases/05-ship/README.md) |
| Deep dive: reflect-metadata | [topics/reflect-metadata.md](./topics/reflect-metadata.md) |
| Deep dive: decorators | [topics/decorators.md](./topics/decorators.md) |
| Deep dive: CoreSchema IR | [topics/core-schema-ir.md](./topics/core-schema-ir.md) |
| Deep dive: complex Field options | [topics/complex-schemas.md](./topics/complex-schemas.md) |
| Deep dive: ValidationError / 422 | [topics/validation-errors.md](./topics/validation-errors.md) |
| Deep dive: workspaces & imports | [topics/workspaces-and-imports.md](./topics/workspaces-and-imports.md) |
| Deep dive: NodeNext `.js` imports | [topics/nodenext-js-extensions.md](./topics/nodenext-js-extensions.md) |
| Why test.ts fails | [topics/why-test-ts-fails.md](./topics/why-test-ts-fails.md) |
| Copy-paste reference sources | [reference/](./reference/) |

---

## Rebuild milestones

### Milestone V1 — primitives + Model (ship this first)

```ts
import 'reflect-metadata';
import { BaseModel, Field } from 'typedantic';

class User extends BaseModel {
  @Field({ type: String, minLength: 1 })
  name!: string;

  @Field({ type: Number, ge: 0 })
  age!: number;

  @Field({ type: Boolean })
  active!: boolean;
}

const u = User.modelValidate({ name: 'Ada', age: 36, active: true });
console.log(u.modelDump());
```

**V1 must include:**

1. Monorepo scaffold + package exports
2. Core: `int`, `bool`/`boolean`, `str`/`string`, `model-fields`
3. Core: `ValidationError`, `SchemaValidator` that **throws** on errors
4. Typedantic: `reflect`, metadata, `@Field`, registry, schema builder, `BaseModel`
5. Public `index.ts` + build so imports work

### Milestone V2 — collections, unions, dates (this tree)

```ts
@Field({ type: Array, items: Address })
addresses!: Address[];

@Field({ union: [Cat, Dog], discriminator: 'kind' })
pet!: Cat | Dog;
```

**V2 must include:**

1. Core: `array`, `object` (+ `keysSchema`), `union` (strict discriminator), `literal`, `enum`, `date`, `int` / `number`, `nullable`, defaults, function wrappers
2. Constraint messages interpolate **limits**, not inputs; missing-field `location` includes the name
3. Field options: `items`, `values`/`keys`, `enum`, `literal`, `union`, `nullable`, `type: 'number'`
4. Unit tests under `packages/*/tests/` and functional scripts under `tests/`

Still later: JSON Schema, TypeAdapter, computed fields, field serializers.

---

## Package map

```
typedantic-settings  →  typedantic  →  @typedantic/core
```

| Package | Responsibility |
|---------|----------------|
| `@typedantic/core` | Schema IR, compiler, validator, serializer, errors (no decorators) |
| `typedantic` | `@Field`, `BaseModel`, schema builder, JSON Schema (**DX layer**) |
| `typedantic-settings` | `BaseSettings` env + `.env` loading |

---

## Corrections vs broken `main` behavior

| Area | Problem on `main` | Tutorial fix |
|------|-------------------|--------------|
| Field validators | Metadata target mismatch | Always store/read on constructor |
| Schema cache | Subclasses inherit parent caches | Own-property cache checks |
| `modelDumpJson` | Skips computed/serializers | Dump via `modelDump` then stringify |
| Discriminated unions | Wrong tag can pass | Reject unknown tags |
| JSON Schema patterns | `String(/re/)` | Use `RegExp.source` |
| `number` `multipleOf` / object keys | Declared unused | Enforce |
| Settings | Typing/prefix/nesting gaps | Polymorphic + prefix + nestFlat |
| Mutable defaults | Shared `default: []` | Prefer `defaultFactory` |

Details: [phases/00-overview/corrections-vs-main.md](./phases/00-overview/corrections-vs-main.md)

---

## Suggested learning order

1. [why-test-ts-fails.md](./topics/why-test-ts-fails.md)
2. [architecture.md](./phases/00-overview/architecture.md)
3. [tutorial.md](./tutorial.md) §1–2 scaffold
4. Core V1 under `phases/02-core/`
5. [reflect-metadata.md](./topics/reflect-metadata.md) then Field/Model chapters
6. V1 smoke test
7. Continue for V2 — [phases/02-core/06-full-engine-v2.md](./phases/02-core/06-full-engine-v2.md) then [phases/03-typedantic/06-full-api-v2.md](./phases/03-typedantic/06-full-api-v2.md)
