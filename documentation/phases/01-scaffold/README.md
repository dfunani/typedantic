# Phase 1 — Monorepo scaffold

Goal: a Bun + Turbo workspace that builds three publishable packages and runs CI the same way as this repo.

See [architecture](../00-overview/architecture.md) for how the packages relate. If imports fail after edits, read [common pitfalls](../../topics/common-pitfalls.md).

## Package map (folder → npm name)

| Directory | npm package | Role |
|-----------|-------------|------|
| `packages/typedantic-core` | `@typedantic/core` | Schema IR, compiler, validator (no decorators) |
| `packages/typedantic` | `@typedantic/model` | `BaseModel`, `@Field`, `modelConfig` |
| `packages/typedantic-settings` | `@typedantic/settings` | `BaseSettings`, env / `.env` loading |

**0.1 public surface:** only what each package exports from `src/index.ts`. Do not treat `serializer/`, extra validators, or JSON Schema helpers as part of the rebuild target unless you are following Phase 2 V2 chapters.

## Root layout

Create (or mirror) this tree:

```
typedantic/
├── package.json              # workspaces, root scripts
├── bun.lock
├── turbo.json
├── tsconfig.json             # references packages (optional)
├── tsconfig.base.json        # shared compilerOptions
├── vitest.config.ts          # packages/**/tests/**/*.test.ts
├── .github/workflows/ci.yml
├── tests/
│   └── basic.ts              # functional smoke (no root test.ts)
└── packages/
    ├── typedantic-core/
    ├── typedantic/
    └── typedantic-settings/
```

There is **no** `internal/`, top-level `validators/`, or `serializers/` package. Validation lives in `@typedantic/core`; model DX lives in `@typedantic/model`.

## Root `package.json`

Use Bun workspaces and these scripts (match live repo):

```json
{
  "name": "typedantic-monorepo",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*"],
  "packageManager": "bun@1.3.14",
  "scripts": {
    "build": "turbo run build",
    "test": "vitest run",
    "functional-test": "bun run --parallel tests/*.ts",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean",
    "pack:dry": "bun pm pack --dry-run --cwd packages/typedantic-core && bun pm pack --dry-run --cwd packages/typedantic && bun pm pack --dry-run --cwd packages/typedantic-settings",
    "publish:packages": "bun run build && bun run typecheck && bun run test && bun run functional-test && bun publish --access public --cwd packages/typedantic-core && bun publish --access public --cwd packages/typedantic && bun publish --access public --cwd packages/typedantic-settings"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "reflect-metadata": "^0.2.2",
    "tsup": "^8.3.5",
    "turbo": "^2.3.3",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  },
  "engines": { "node": ">=20" }
}
```

Root may depend on workspace packages for functional tests:

```json
"dependencies": {
  "@typedantic/model": "workspace:*",
  "@typedantic/settings": "workspace:*"
}
```

## Shared TypeScript (`tsconfig.base.json`)

Decorators and metadata are required for `@typedantic/model`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false
  }
}
```

Each package extends this with `"rootDir": "src"`, `"outDir": "dist"`, `"include": ["src"]`.

**Settings package:** use a normal `tsconfig.json` that extends `../../tsconfig.base.json`. Do **not** add `compilerOptions.paths` hacks to reach model source — depend on `@typedantic/model` and build `dist` like the other packages.

## Turbo (`turbo.json`)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "clean": { "cache": false }
  }
}
```

## Per-package skeleton

### `@typedantic/core` — live `src/` tree (build in Phase 2)

```
packages/typedantic-core/src/
├── schema/
│   ├── types.ts                    # BaseSchema union
│   └── models/
│       ├── primitives.ts
│       ├── fields.ts
│       ├── configurations.ts
│       └── complex/                # arrays, objects, unions, … (V2 expands here)
├── errors/
│   ├── validation-error.ts
│   └── utils.ts
├── factories/
│   ├── validation-error.ts
│   └── errors/                     # message templates for compilers
├── compiler/
│   ├── compile.ts                  # compileValidator switch
│   ├── primitives/                 # int, string, boolean, …
│   ├── complex/
│   └── fields/
│       └── model-fields.ts
├── validator/
│   └── schema.ts                   # SchemaValidator
├── serializer/
│   └── schema-serializer.ts        # exists in tree; NOT exported in 0.1
└── index.ts
```

Package scripts:

```json
{
  "name": "@typedantic/core",
  "type": "module",
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "typecheck": "tsc --noEmit"
  }
}
```

### `@typedantic/model` — live `src/` tree (Phase 3)

```
packages/typedantic/src/
├── fields/
│   ├── properties.ts
│   ├── types.ts
│   ├── registry.ts
│   ├── decorator.ts
│   └── builders/
│       ├── schema.ts               # getModelFields
│       └── fields.ts               # buildModelFieldSchema
├── config/
│   └── model-config.ts
├── models/
│   ├── factories.ts                # schema cache, hydration
│   └── base-model.ts
└── index.ts
```

Dependencies:

```json
{
  "name": "@typedantic/model",
  "dependencies": {
    "@typedantic/core": "workspace:*",
    "reflect-metadata": "^0.2.2"
  },
  "peerDependencies": {
    "reflect-metadata": ">=0.2.0"
  }
}
```

### `@typedantic/settings` — live `src/` tree (Phase 4)

```
packages/typedantic-settings/src/
├── config.ts
├── environment.ts
└── index.ts
```

Depends only on `@typedantic/model` (workspace). No path mapping to model `src/`.

## Vitest

Root `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts', 'packages/**/tests/**/*.test.ts'],
  },
});
```

Unit tests live under each package’s `tests/` directory. Functional smoke lives at repo root `tests/basic.ts` (see Phase 3 chapter 5).

## CI (`.github/workflows/ci.yml`)

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.14
      - run: bun install --frozen-lockfile
      - run: bun run build
      - run: bun run typecheck
      - run: bun run test
      - run: bun run functional-test
```

## First commands

```bash
bun install
bun run build
bun run typecheck
bun run test
bun run functional-test   # after Phase 3 smoke exists
```

## Next

- [Phase 2 — `@typedantic/core`](../02-core/README.md)
- Pitfalls: [common-pitfalls.md](../../topics/common-pitfalls.md)
