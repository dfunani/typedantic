# Typedantic — Complete Rebuild Tutorial

This is the **linear path** to rebuild Typedantic from an empty folder.

It is detailed for Milestone **V1** (int / boolean / string + `BaseModel`), then a full **V2** how-to for collections, unions, dates, and Field options.

**Doc hub:** [README.md](./README.md)

---

## Before you start

1. [Architecture Overview](./phases/00-overview/architecture.md).

### What you will have after V1

```ts
import 'reflect-metadata';
import { BaseModel, Field, modelConfig } from '@typedantic/model';

@modelConfig({ extra: 'forbid' })
class User extends BaseModel {
  @Field({ type: String, minLength: 1 })
  name!: string;

  @Field({ type: Number, ge: 0 })
  age!: number;

  @Field({ type: Boolean })
  active!: boolean;
}

const user = User.modelValidate({ name: 'Ada', age: 36, active: true });
console.log(user.modelDump());
```

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Scaffold](#2-scaffold)
3. [Core V1](#3-core-v1)
4. [Typedantic V1](#4-typedantic-v1)
5. [V1 smoke test](#5-v1-smoke-test)
6. [Core + API V2](#6-core--api-v2)
7. [Settings](#7-settings)
8. [Ship](#8-ship)
9. [Topic index](#9-topic-index)

---

## 1. Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| Bun | **1.3.14** (canonical; see root `packageManager`) |
| TypeScript | 5.7+ |
| pnpm 9+ / npm 10+ | optional alternatives |

```bash
curl -fsSL https://bun.sh/install | bash
bun --version && node --version
mkdir typedantic && cd typedantic && git init
```

Alternatives: `corepack enable && corepack prepare pnpm@9.15.0 --activate`

---

## 2. Scaffold

Follow the full file set here (do not skip manifests):

**→ [phases/01-scaffold/README.md](./phases/01-scaffold/README.md)**

Checkpoint:

```bash
bun install && bun run build && bun run typecheck
```

Deep dives while scaffolding:

- [topics/workspaces-and-imports.md](./topics/workspaces-and-imports.md)
- [topics/nodenext-js-extensions.md](./topics/nodenext-js-extensions.md)

---

## 3. Core V1

Build `@typedantic/core` until it can validate:

```ts
{
  type: 'model-fields',
  fields: {
    name: { schema: { type: 'string', minLength: 1 }, required: true },
    age: { schema: { type: 'int', ge: 0 }, required: true },
    active: { schema: { type: 'boolean' }, required: true },
  },
}
```

IR node names are lowercase JS shapes (`string`, `int`, `boolean`) — not Pydantic `str` / `Integer`.

### Steps (each page has full copy-paste code)

| # | Chapter | Output |
|---|---------|--------|
| 1 | [phases/02-core/01-schema-types-v1.md](./phases/02-core/01-schema-types-v1.md) | Minimal `BaseSchema` |
| 2 | [phases/02-core/02-validation-error.md](./phases/02-core/02-validation-error.md) | FastAPI-style 422 errors |
| 3 | [phases/02-core/03-compiler-v1.md](./phases/02-core/03-compiler-v1.md) | int/boolean/string + model-fields |
| 4 | [phases/02-core/04-schema-validator.md](./phases/02-core/04-schema-validator.md) | `validateModel` throws on errors |
| 5 | [phases/02-core/05-tests-v1.md](./phases/02-core/05-tests-v1.md) | Vitest suite |

```bash
bun run --filter @typedantic/core build
bunx vitest run packages/typedantic-core
```

**Do not continue until model-fields tests pass.**

Deep dives:

- [topics/core-schema-ir.md](./topics/core-schema-ir.md)
- [topics/validation-errors.md](./topics/validation-errors.md)

Full modular compiler (V2): [phases/02-core/06-full-engine-v2.md](./phases/02-core/06-full-engine-v2.md)

---

## 4. Typedantic V1

Wire decorators → schema → BaseModel.

| # | Chapter | Output |
|---|---------|--------|
| 1 | [phases/03-typedantic/01-reflect-and-metadata.md](./phases/03-typedantic/01-reflect-and-metadata.md) | reflect + contracts |
| 2 | [phases/03-typedantic/02-field-and-registry.md](./phases/03-typedantic/02-field-and-registry.md) | `@Field` registry |
| 3 | [phases/03-typedantic/03-schema-builder-v1.md](./phases/03-typedantic/03-schema-builder-v1.md) | String/Number/Boolean → schema |
| 4 | [phases/03-typedantic/04-base-model-v1.md](./phases/03-typedantic/04-base-model-v1.md) | `modelValidate` |
| 5 | [phases/03-typedantic/05-public-exports-and-smoke.md](./phases/03-typedantic/05-public-exports-and-smoke.md) | `index.ts` + smoke |

```bash
bun run build
```

Deep dives (read before Field):

- [topics/reflect-metadata.md](./topics/reflect-metadata.md) — **what/why of `fields/properties.ts`**
- [topics/decorators.md](./topics/decorators.md)

Reference copies (bulk sources):

- [reference/field.ts.md](./reference/field.ts.md)
- [reference/schema-builder.ts.md](./reference/schema-builder.ts.md)
- [reference/base-model.ts.md](./reference/base-model.ts.md)

---

## 5. V1 smoke test

Use the repo functional script (build first so workspace imports resolve to `dist/`):

**File:** `tests/basic.ts`

```bash
bun run build
bun tests/basic.ts
```

That script exercises V1 primitives, `extra: 'ignore'`, and a coercion error path. If it runs clean, **Milestone V1 is done.**

---

## 6. Core + API V2

This is a full how-to, same shape as V1: phase pages have the copy-paste, this file is the linear index.

Corrections vs older broken patterns: see the table in [README.md](./README.md#corrections-vs-broken-main-behavior).

### 6.1 Core engine

| # | Chapter | Output |
|---|---------|--------|
| 1 | [phases/02-core/06-full-engine-v2.md](./phases/02-core/06-full-engine-v2.md) | Modular compiler: array, object + keys, union (strict tag), int/number, date, functions |
| 2 | [phases/02-core/07-tests-v2.md](./phases/02-core/07-tests-v2.md) | `packages/typedantic-core/tests/` |

```bash
bunx vitest run packages/typedantic-core
```

### 6.2 Public API

| # | Chapter | Output |
|---|---------|--------|
| 1 | [phases/03-typedantic/06-full-api-v2.md](./phases/03-typedantic/06-full-api-v2.md) | Field `items` / `object` / `union` / `number` / `nullable` + **instance hydration** |
| 2 | [phases/03-typedantic/07-tests-v2.md](./phases/03-typedantic/07-tests-v2.md) | package unit tests + root `tests/*.ts` |

```bash
bun run build
bunx vitest run packages/typedantic
bun tests/advanced.ts
bun run functional-test
```

Deep dive: [topics/complex-schemas.md](./topics/complex-schemas.md)

**Included in 0.2 V2 final:** JSON Schema (`modelJsonSchema` / `toJsonSchema`), `TypeAdapter`, `@fieldValidator` / `@modelValidator`, `@fieldSerializer` / `@modelSerializer` / `@computedField`, `SchemaSerializer` dump options. See [reference/schema-serializer.ts.md](./reference/schema-serializer.ts.md) and `tests/v2-features.ts`.

---

## 7. Settings

**→ [phases/04-settings/README.md](./phases/04-settings/README.md)**

Live entry points: `packages/typedantic-settings/src/index.ts`, `config.ts`, `environment.ts`.  
Tests: `packages/typedantic-settings/tests/settings.test.ts`.

---

## 8. Ship

**→ [phases/05-ship/README.md](./phases/05-ship/README.md)** — CI, acceptance, troubleshooting  

**→ [phases/05-ship/distribution.md](./phases/05-ship/distribution.md)** — npm org, trusted publishing (OIDC), release, **docs distribution**

---

## 9. Topic index

| Topic | File |
|-------|------|
| Common pitfalls | [topics/common-pitfalls.md](./topics/common-pitfalls.md) |
| reflect-metadata / properties.ts | [topics/reflect-metadata.md](./topics/reflect-metadata.md) |
| Decorators | [topics/decorators.md](./topics/decorators.md) |
| CoreSchema IR | [topics/core-schema-ir.md](./topics/core-schema-ir.md) |
| Complex Field options | [topics/complex-schemas.md](./topics/complex-schemas.md) |
| ValidationError / 422 | [topics/validation-errors.md](./topics/validation-errors.md) |
| Workspaces & imports | [topics/workspaces-and-imports.md](./topics/workspaces-and-imports.md) |
| NodeNext `.js` extensions | [topics/nodenext-js-extensions.md](./topics/nodenext-js-extensions.md) |
| Architecture | [phases/00-overview/architecture.md](./phases/00-overview/architecture.md) |

---

## Final tree (documentation)

```
documentation/
├── README.md                 ← hub
├── tutorial.md               ← this file (linear path)
├── topics/                   ← conceptual deep dives
├── phases/
│   ├── 00-overview/
│   ├── 01-scaffold/
│   ├── 02-core/              ← V1 engine + V2 compiler how-to
│   ├── 03-typedantic/        ← V1 BaseModel + V2 Field how-to
│   ├── 04-settings/
│   └── 05-ship/
└── reference/                ← live 0.1 source snapshots (see reference/README.md)
```

When a phase page and a reference page disagree, prefer the **phase page** and re-check `packages/*/src`.
