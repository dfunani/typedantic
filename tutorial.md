# Typedantic — Complete Rebuild Tutorial

This guide rebuilds **Typedantic** from an empty folder into a working monorepo.
Every file includes **full copyable source**, why it exists, how it connects to the rest of the system, and a **checkpoint** you can run before moving on.

You should be able to follow this document without reading the existing repository.

**What you will build**

| Package | npm name | Role |
|---------|----------|------|
| Core engine | `@typedantic/core` | Schema IR, compiler, validator, serializer, errors |
| Public API | `typedantic` | `BaseModel`, `@Field`, validators, JSON Schema, helpers |
| Settings | `typedantic-settings` | `BaseSettings` — load config from env + `.env` |

**Runtime dependency chain**

```
typedantic-settings  →  typedantic  →  @typedantic/core
```

**Final shape (after Phase 0)**

```
typedantic/
├── package.json
├── pnpm-workspace.yaml          # for pnpm users
├── tsconfig.base.json
├── vitest.config.ts
├── turbo.json
├── .gitignore
├── .github/workflows/ci.yml
└── packages/
    ├── typedantic-core/
    ├── typedantic/
    └── typedantic-settings/
```

---

## How to use this tutorial

1. Create files **exactly** at the paths shown.
2. Copy the code blocks as-is (including `.js` suffixes in TypeScript imports — required for NodeNext ESM).
3. Run every **Checkpoint** before continuing.
4. Prefer **Bun** commands. Equivalent **pnpm** and **npm** commands are listed under each checkpoint.

### Intentional corrections vs `main`

This tutorial teaches a **working** Typedantic. A few places intentionally differ from the current `main` branch:

| Area | Problem on `main` | What this tutorial does |
|------|-------------------|-------------------------|
| Field validators | Metadata target can miss static methods | Always store/read on the **constructor** |
| Schema cache | Subclasses can inherit parent caches | Cache only with `Object.hasOwn` / own properties |
| `modelDumpJson` | Skips computed fields & field serializers | Dump via `modelDump`, then `JSON.stringify` |
| Discriminated unions | Falls back to ordinary union (wrong tag can pass) | If discriminator is set and no branch matches → error |
| JSON Schema patterns | `String(/re/)` becomes `"/re/"` | Use `RegExp.source` |
| Float `multipleOf` | Declared, not enforced | Enforce it |
| Dict `keysSchema` | Declared, ignored | Validate keys |
| Settings return type | Always typed as `BaseSettings` | Polymorphic `InstanceType<T>` |
| Settings prefixes | Alias lookup ignores prefix | Prefer prefixed keys; document alias rules |
| Nested env | Flattened but never nested | Rebuild nested objects from delimiter |
| CI | Incomplete workflow file | Full Bun (and alt) workflow |
| Mutable defaults | Shared `default: []` across instances | Prefer `defaultFactory: () => []` |

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Monorepo scaffolding](#2-monorepo-scaffolding)
3. [Phase A — `@typedantic/core`](#3-phase-a--typedanticcore)
4. [Phase B — `typedantic` public API](#4-phase-b--typedantic-public-api)
5. [Phase C — `typedantic-settings`](#5-phase-c--typedantic-settings)
6. [Phase D — Advanced features](#6-phase-d--advanced-features)
7. [Testing strategy & CI](#7-testing-strategy--ci)
8. [Publishing](#8-publishing)
9. [Troubleshooting](#9-troubleshooting)
10. [Architecture reference](#10-architecture-reference)
11. [Acceptance checklist](#11-acceptance-checklist)

---

## 1. Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| Node.js | 20+ | Native ESM, modern APIs |
| Bun | 1.2+ (recommended) | Install, scripts, publish |
| TypeScript | 5.7+ | Decorators + NodeNext |
| pnpm | 9+ (optional) | Alternative package manager |
| npm | 10+ (optional) | Ships with Node 20 |

### Install Bun (recommended)

```bash
curl -fsSL https://bun.sh/install | bash
# restart your shell, then:
bun --version
node --version
```

### Or enable pnpm

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm --version
```

### Create the project folder

```bash
mkdir typedantic
cd typedantic
git init
```

---

## 2. Monorepo scaffolding

### 2.1 Create directories

```bash
mkdir -p packages/typedantic-core/src/{schema,compiler,errors,validator,serializer}
mkdir -p packages/typedantic/src/{internal,fields,config,validators,serializers,types,models,json-schema}
mkdir -p packages/typedantic-settings/src
mkdir -p .github/workflows
```

### 2.2 Root `package.json`

Create **`package.json`** at the repo root.

Notes:
- `workspaces` works with **Bun** and **npm**.
- pnpm also needs `pnpm-workspace.yaml` (next file).
- Scripts use **Turbo** so one command works under Bun, pnpm, or npm (`turbo` is invoked via the local `node_modules`).

```json
{
  "name": "typedantic-monorepo",
  "private": true,
  "type": "module",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "tsup": "^8.3.5",
    "turbo": "^2.3.3",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  },
  "engines": {
    "node": ">=20"
  }
}
```

### 2.3 `pnpm-workspace.yaml` (pnpm only)

Create **`pnpm-workspace.yaml`**:

```yaml
packages:
  - 'packages/*'
```

### 2.4 `turbo.json`

Create **`turbo.json`**:

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
    "clean": {
      "cache": false
    }
  }
}
```

`dependsOn: ["^build"]` means “build my dependencies first.” That only works if package manifests declare workspace dependencies correctly (we do that below).

### 2.5 `tsconfig.base.json`

Create **`tsconfig.base.json`**:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Why these flags matter**

| Flag | Meaning |
|------|---------|
| `experimentalDecorators` + `emitDecoratorMetadata` | Legacy decorators; TypeScript emits `design:type` for `@Field()` |
| `useDefineForClassFields: false` | Class fields behave like assignments so decorators see them |
| `module` / `moduleResolution: NodeNext` | Real ESM; **import paths must use `.js` extensions** even in `.ts` files |

### 2.6 `vitest.config.ts`

Create **`vitest.config.ts`**:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts', 'packages/**/tests/**/*.test.ts'],
  },
});
```

### 2.7 `.gitignore`

Create **`.gitignore`**:

```
node_modules/
dist/
*.tsbuildinfo
.DS_Store
coverage/
.turbo/
.env
*.tgz
```

### 2.8 Package manifests

#### `packages/typedantic-core/package.json`

```json
{
  "name": "@typedantic/core",
  "version": "0.1.0",
  "description": "Core validation engine for Typedantic — Pydantic for TypeScript",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "keywords": ["validation", "schema", "pydantic", "typescript"],
  "license": "MIT",
  "engines": {
    "node": ">=20"
  }
}
```

#### `packages/typedantic/package.json`

```json
{
  "name": "typedantic",
  "version": "0.1.0",
  "description": "Pydantic for TypeScript — class-based data validation and serialization",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "keywords": ["validation", "pydantic", "typescript", "schema", "json-schema"],
  "license": "MIT",
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "@typedantic/core": "workspace:*",
    "reflect-metadata": "^0.2.2"
  },
  "peerDependencies": {
    "reflect-metadata": ">=0.2.0"
  },
  "peerDependenciesMeta": {
    "reflect-metadata": {
      "optional": true
    }
  }
}
```

> **npm note:** if `workspace:*` fails under plain npm, change the dependency to `"*"` or `"0.1.0"` after linking workspaces. Bun and pnpm understand `workspace:*`.

#### `packages/typedantic-settings/package.json`

```json
{
  "name": "typedantic-settings",
  "version": "0.1.0",
  "description": "Settings management for Typedantic — load config from environment variables",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "keywords": ["settings", "env", "pydantic", "typedantic", "configuration"],
  "license": "MIT",
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "typedantic": "workspace:*"
  },
  "peerDependencies": {
    "reflect-metadata": ">=0.2.0"
  }
}
```

### 2.9 Package `tsconfig.json` files

#### `packages/typedantic-core/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

#### `packages/typedantic/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

#### `packages/typedantic-settings/tsconfig.json`

Settings typechecks against the **built** `typedantic` declarations, so build `typedantic` before typechecking settings.

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "paths": {
      "typedantic": ["../typedantic/dist/index.d.ts"]
    }
  },
  "include": ["src"]
}
```

### 2.10 Placeholder entry points

Create these three empty barrels so install/build graph is valid:

**`packages/typedantic-core/src/index.ts`**

```typescript
export {};
```

**`packages/typedantic/src/index.ts`**

```typescript
export {};
```

**`packages/typedantic-settings/src/index.ts`**

```typescript
export {};
```

### 2.11 Install dependencies

```bash
bun install
```

Alternatives:

```bash
# pnpm
pnpm install

# npm
npm install
```

**Checkpoint — scaffolding**

```bash
bun run build
bun run typecheck
```

```bash
# pnpm
pnpm build && pnpm typecheck

# npm
npm run build && npm run typecheck
```

Expected: all three packages emit empty `dist/` folders without errors.

---

## 3. Phase A — `@typedantic/core`

Core is a **zero-runtime-dependency** validation engine. Higher layers only talk to it through `CoreSchema` objects.

```
CoreSchema (IR)
    │
    ▼
compileValidator()  →  ValidatorFn(input, ctx)
    │
    ▼
SchemaValidator.validatePython / validateJson
    │
    ▼
value  |  throws ValidationError
```

Build order inside this package:

1. `schema/types.ts` — IR + option types
2. `errors/validation-error.ts` — structured errors
3. `compiler/compile.ts` — recursive compiler
4. `validator/schema-validator.ts` — public façade
5. `serializer/schema-serializer.ts` — dump helpers
6. `index.ts` — exports
7. tests

### 3.1 Schema IR — `packages/typedantic-core/src/schema/types.ts`

Replace the placeholder. This file is the **contract** for everything else.

```typescript
export type ValidatorFn = (value: unknown) => unknown;
export type WrapValidatorFn = (value: unknown, handler: (v: unknown) => unknown) => unknown;

export interface ModelFieldSchema {
  schema: CoreSchema;
  required: boolean;
  alias?: string;
  default?: unknown;
  defaultFactory?: () => unknown;
}

export interface CoreSchemaBase {
  type: string;
}

export interface AnySchema extends CoreSchemaBase {
  type: 'any';
}

export interface NeverSchema extends CoreSchemaBase {
  type: 'never';
}

export interface IntSchema extends CoreSchemaBase {
  type: 'int';
  strict?: boolean;
  ge?: number;
  gt?: number;
  le?: number;
  lt?: number;
  multipleOf?: number;
}

export interface FloatSchema extends CoreSchemaBase {
  type: 'float';
  strict?: boolean;
  ge?: number;
  gt?: number;
  le?: number;
  lt?: number;
  multipleOf?: number;
}

export interface StrSchema extends CoreSchemaBase {
  type: 'str';
  strict?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
}

export interface BoolSchema extends CoreSchemaBase {
  type: 'bool';
  strict?: boolean;
}

export interface LiteralSchema extends CoreSchemaBase {
  type: 'literal';
  expected: readonly unknown[];
}

export interface EnumSchema extends CoreSchemaBase {
  type: 'enum';
  members: readonly string[];
}

export interface ListSchema extends CoreSchemaBase {
  type: 'list';
  itemsSchema: CoreSchema;
  minLength?: number;
  maxLength?: number;
}

export interface DictSchema extends CoreSchemaBase {
  type: 'dict';
  valuesSchema: CoreSchema;
  keysSchema?: CoreSchema;
}

export interface UnionSchema extends CoreSchemaBase {
  type: 'union';
  choices: CoreSchema[];
  discriminator?: string;
}

export interface NullableSchema extends CoreSchemaBase {
  type: 'nullable';
  schema: CoreSchema;
}

export interface OptionalSchema extends CoreSchemaBase {
  type: 'optional';
  schema: CoreSchema;
}

export interface DefaultSchema extends CoreSchemaBase {
  type: 'default';
  schema: CoreSchema;
  defaultValue: unknown;
}

export interface DefaultFactorySchema extends CoreSchemaBase {
  type: 'default-factory';
  schema: CoreSchema;
  factory: () => unknown;
}

export interface ModelFieldsSchema extends CoreSchemaBase {
  type: 'model-fields';
  fields: Record<string, ModelFieldSchema>;
  modelName?: string;
  extra?: 'ignore' | 'allow' | 'forbid';
  strict?: boolean;
}

export interface FunctionBeforeSchema extends CoreSchemaBase {
  type: 'function-before';
  schema: CoreSchema;
  fn: ValidatorFn;
}

export interface FunctionAfterSchema extends CoreSchemaBase {
  type: 'function-after';
  schema: CoreSchema;
  fn: ValidatorFn;
}

export interface FunctionWrapSchema extends CoreSchemaBase {
  type: 'function-wrap';
  schema: CoreSchema;
  fn: WrapValidatorFn;
}

export interface FunctionPlainSchema extends CoreSchemaBase {
  type: 'function-plain';
  fn: ValidatorFn;
}

export interface DateSchema extends CoreSchemaBase {
  type: 'date';
}

export type CoreSchema =
  | AnySchema
  | NeverSchema
  | IntSchema
  | FloatSchema
  | StrSchema
  | BoolSchema
  | LiteralSchema
  | EnumSchema
  | ListSchema
  | DictSchema
  | UnionSchema
  | NullableSchema
  | OptionalSchema
  | DefaultSchema
  | DefaultFactorySchema
  | ModelFieldsSchema
  | FunctionBeforeSchema
  | FunctionAfterSchema
  | FunctionWrapSchema
  | FunctionPlainSchema
  | DateSchema;

export interface ValidationConfig {
  strict?: boolean;
}

/** One structured validation failure (FastAPI / Pydantic style). */
export interface ValidationErrorDetail {
  /** Machine-readable code, e.g. `missing`, `int_type`, `string_too_short`. */
  type: string;
  /** Path into the input: field names and list indexes, e.g. `['users', 0, 'age']`. */
  loc: (string | number)[];
  /** Human-readable message. */
  msg: string;
  /** The original value that failed (or the whole object for `missing`). */
  input: unknown;
  /** Optional constraint metadata (e.g. `{ ge: 0 }`). */
  ctx?: Record<string, unknown>;
}

export interface ValidateOptions {
  strict?: boolean;
}

export interface DumpOptions {
  mode?: 'python' | 'json';
  include?: Set<string>;
  exclude?: Set<string>;
  excludeUnset?: boolean;
  excludeDefaults?: boolean;
  excludeNone?: boolean;
  byAlias?: boolean;
}
```

**Checkpoint**

```bash
bunx tsc -p packages/typedantic-core --noEmit
```

### 3.2 Validation errors — `packages/typedantic-core/src/errors/validation-error.ts`

This class is what callers catch. FastAPI-style 422 bodies use `{ detail: [...] }`.

```typescript
import type { ValidationErrorDetail } from '../schema/types.js';

/**
 * Thrown when validation accumulates one or more errors.
 *
 * Example JSON (from `.json()`):
 * {
 *   "detail": [
 *     {
 *       "type": "missing",
 *       "loc": ["age"],
 *       "msg": "Field required",
 *       "input": {}
 *     }
 *   ]
 * }
 */
export class ValidationError extends Error {
  readonly errors: ValidationErrorDetail[];

  constructor(errors: ValidationErrorDetail[]) {
    // "users.0.age: Input should be a valid integer; name: Field required"
    const msg = errors.map((e) => `${e.loc.join('.')}: ${e.msg}`).join('; ');
    super(msg);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  /** Number of detail entries. */
  errorCount(): number {
    return this.errors.length;
  }

  /**
   * FastAPI-compatible 422 body as a JSON **string**.
   * Shape: `{ "detail": ValidationErrorDetail[] }`
   */
  json(): string {
    return JSON.stringify({ detail: this.errors });
  }

  /**
   * Same payload as `.json()`, but as a plain object
   * (useful for Express / Hono: `res.status(422).json(err.toJSON())`).
   */
  toJSON(): { detail: ValidationErrorDetail[] } {
    return { detail: this.errors };
  }
}

/** Helper to build a detail object. Prefer this over ad-hoc literals in app code. */
export function createError(
  type: string,
  loc: (string | number)[],
  msg: string,
  input: unknown,
  ctx?: Record<string, unknown>,
): ValidationErrorDetail {
  return { type, loc, msg, input, ...(ctx ? { ctx } : {}) };
}
```

Add a focused test file **`packages/typedantic-core/src/errors/validation-error.test.ts`**:

```typescript
import { describe, it, expect } from 'vitest';
import { ValidationError, createError } from './validation-error.js';

describe('ValidationError', () => {
  it('formats message from loc + msg', () => {
    const err = new ValidationError([
      createError('missing', ['user', 'age'], 'Field required', {}),
      createError('int_type', ['user', 'age'], 'Input should be a valid integer', 'x'),
    ]);
    expect(err.message).toContain('user.age: Field required');
    expect(err.errorCount()).toBe(2);
  });

  it('json() returns FastAPI-style detail envelope', () => {
    const err = new ValidationError([
      createError('missing', ['name'], 'Field required', {}),
    ]);
    expect(JSON.parse(err.json())).toEqual({
      detail: [
        {
          type: 'missing',
          loc: ['name'],
          msg: 'Field required',
          input: {},
        },
      ],
    });
    expect(err.toJSON()).toEqual(JSON.parse(err.json()));
  });

  it('root errors have empty loc', () => {
    const err = new ValidationError([
      { type: 'json_invalid', loc: [], msg: 'Invalid JSON', input: '{' },
    ]);
    expect(err.message.startsWith(': ')).toBe(true);
  });
});
```

**Checkpoint**

```bash
bunx vitest run packages/typedantic-core/src/errors/validation-error.test.ts
```

---

### 3.3 Compiler — `packages/typedantic-core/src/compiler/compile.ts`

This is the heart of Typedantic. `compileValidator(schema)` returns a function:

```typescript
(input, ctx) => unknown
```

where `ctx` holds:
- `path` — current location (`['users', 0, 'age']`)
- `config` — `{ strict?: boolean }`
- `errors` — **shared mutable array**; validators **push** details instead of throwing immediately

That shared array is why one `validatePython` call can report **many** field errors at once.

#### Implementation strategy

Implement in this order (you can paste the full file below in one go):

1. Context types + top-level `switch`
2. Primitives: `any`, `never`, `int`, `float`, `str`, `bool`, `literal`, `enum`, `date`
3. Wrappers: `nullable`, `optional`, `default`, `default-factory`
4. Collections: `list`, `dict` (with optional `keysSchema`)
5. `model-fields` (required, defaults, aliases, extra)
6. `union` (+ strict discriminator)
7. Function wrappers: before / after / wrap / plain

#### Full file (corrected)

Create **`packages/typedantic-core/src/compiler/compile.ts`**:

```typescript
import type {
  CoreSchema,
  ValidationConfig,
  ValidationErrorDetail,
} from '../schema/types.js';

export interface ValidationContext {
  path: (string | number)[];
  config: ValidationConfig;
  errors: ValidationErrorDetail[];
}

export type ValidatorFn = (input: unknown, ctx: ValidationContext) => unknown;

export function compileValidator(schema: CoreSchema): ValidatorFn {
  switch (schema.type) {
    case 'any':
      return (input) => input;
    case 'never':
      return (input, ctx) => {
        ctx.errors.push({
          type: 'never',
          loc: [...ctx.path],
          msg: 'Input is never valid',
          input,
        });
        return undefined;
      };
    case 'int':
      return compileInt(schema);
    case 'float':
      return compileFloat(schema);
    case 'str':
      return compileStr(schema);
    case 'bool':
      return compileBool(schema);
    case 'literal':
      return compileLiteral(schema);
    case 'enum':
      return compileEnum(schema);
    case 'list':
      return compileList(schema);
    case 'dict':
      return compileDict(schema);
    case 'union':
      return compileUnion(schema);
    case 'nullable':
      return compileNullable(schema);
    case 'optional':
      return compileOptional(schema);
    case 'default':
      return compileDefault(schema);
    case 'default-factory':
      return compileDefaultFactory(schema);
    case 'model-fields':
      return compileModelFields(schema);
    case 'function-before':
      return compileFunctionBefore(schema);
    case 'function-after':
      return compileFunctionAfter(schema);
    case 'function-wrap':
      return compileFunctionWrap(schema);
    case 'function-plain':
      return compileFunctionPlain(schema);
    case 'date':
      return compileDate();
    default:
      return (input, ctx) => {
        ctx.errors.push({
          type: 'unknown_schema',
          loc: [...ctx.path],
          msg: `Unknown schema type`,
          input,
        });
        return undefined;
      };
  }
}

function compileInt(schema: Extract<CoreSchema, { type: 'int' }>): ValidatorFn {
  return (input, ctx) => {
    let value = input;
    const strict = schema.strict ?? ctx.config.strict;

    // Non-strict: coerce numeric strings like "42" → 42
    if (typeof value === 'string' && !strict) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed) && Number.isInteger(parsed)) value = parsed;
    }

    if (typeof value !== 'number' || !Number.isInteger(value)) {
      ctx.errors.push({
        type: 'int_type',
        loc: [...ctx.path],
        msg: 'Input should be a valid integer',
        input,
      });
      return undefined;
    }

    // Constraints accumulate — one value can produce multiple errors
    if (schema.ge !== undefined && value < schema.ge) {
      ctx.errors.push({
        type: 'greater_than_equal',
        loc: [...ctx.path],
        msg: `Input should be greater than or equal to ${schema.ge}`,
        input,
        ctx: { ge: schema.ge },
      });
    }
    if (schema.gt !== undefined && value <= schema.gt) {
      ctx.errors.push({
        type: 'greater_than',
        loc: [...ctx.path],
        msg: `Input should be greater than ${schema.gt}`,
        input,
        ctx: { gt: schema.gt },
      });
    }
    if (schema.le !== undefined && value > schema.le) {
      ctx.errors.push({
        type: 'less_than_equal',
        loc: [...ctx.path],
        msg: `Input should be less than or equal to ${schema.le}`,
        input,
        ctx: { le: schema.le },
      });
    }
    if (schema.lt !== undefined && value >= schema.lt) {
      ctx.errors.push({
        type: 'less_than',
        loc: [...ctx.path],
        msg: `Input should be less than ${schema.lt}`,
        input,
        ctx: { lt: schema.lt },
      });
    }
    if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
      ctx.errors.push({
        type: 'multiple_of',
        loc: [...ctx.path],
        msg: `Input should be a multiple of ${schema.multipleOf}`,
        input,
        ctx: { multiple_of: schema.multipleOf },
      });
    }

    return value;
  };
}

function compileFloat(schema: Extract<CoreSchema, { type: 'float' }>): ValidatorFn {
  return (input, ctx) => {
    let value = input;
    const strict = schema.strict ?? ctx.config.strict;

    if (typeof value === 'string' && !strict) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) value = parsed;
    }

    if (typeof value !== 'number' || Number.isNaN(value)) {
      ctx.errors.push({
        type: 'float_type',
        loc: [...ctx.path],
        msg: 'Input should be a valid number',
        input,
      });
      return undefined;
    }

    if (schema.ge !== undefined && value < schema.ge) {
      ctx.errors.push({
        type: 'greater_than_equal',
        loc: [...ctx.path],
        msg: `Input should be greater than or equal to ${schema.ge}`,
        input,
        ctx: { ge: schema.ge },
      });
    }
    if (schema.gt !== undefined && value <= schema.gt) {
      ctx.errors.push({
        type: 'greater_than',
        loc: [...ctx.path],
        msg: `Input should be greater than ${schema.gt}`,
        input,
        ctx: { gt: schema.gt },
      });
    }
    if (schema.le !== undefined && value > schema.le) {
      ctx.errors.push({
        type: 'less_than_equal',
        loc: [...ctx.path],
        msg: `Input should be less than or equal to ${schema.le}`,
        input,
        ctx: { le: schema.le },
      });
    }
    if (schema.lt !== undefined && value >= schema.lt) {
      ctx.errors.push({
        type: 'less_than',
        loc: [...ctx.path],
        msg: `Input should be less than ${schema.lt}`,
        input,
        ctx: { lt: schema.lt },
      });
    }
    // Correction vs main: enforce multipleOf for floats too
    if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
      ctx.errors.push({
        type: 'multiple_of',
        loc: [...ctx.path],
        msg: `Input should be a multiple of ${schema.multipleOf}`,
        input,
        ctx: { multiple_of: schema.multipleOf },
      });
    }

    return value;
  };
}

function compileStr(schema: Extract<CoreSchema, { type: 'str' }>): ValidatorFn {
  return (input, ctx) => {
    let value = input;
    const strict = schema.strict ?? ctx.config.strict;

    if (typeof value === 'number' && !strict) value = String(value);
    if (typeof value === 'boolean' && !strict) value = String(value);

    if (typeof value !== 'string') {
      ctx.errors.push({
        type: 'string_type',
        loc: [...ctx.path],
        msg: 'Input should be a valid string',
        input,
      });
      return undefined;
    }

    if (schema.minLength !== undefined && value.length < schema.minLength) {
      ctx.errors.push({
        type: 'string_too_short',
        loc: [...ctx.path],
        msg: `String should have at least ${schema.minLength} characters`,
        input,
        ctx: { min_length: schema.minLength },
      });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      ctx.errors.push({
        type: 'string_too_long',
        loc: [...ctx.path],
        msg: `String should have at most ${schema.maxLength} characters`,
        input,
        ctx: { max_length: schema.maxLength },
      });
    }
    if (schema.pattern !== undefined) {
      const re = typeof schema.pattern === 'string' ? new RegExp(schema.pattern) : schema.pattern;
      if (!re.test(value)) {
        ctx.errors.push({
          type: 'string_pattern_mismatch',
          loc: [...ctx.path],
          msg: `String should match pattern ${re}`,
          input,
        });
      }
    }

    return value;
  };
}

function compileBool(schema: Extract<CoreSchema, { type: 'bool' }>): ValidatorFn {
  return (input, ctx) => {
    let value = input;
    const strict = schema.strict ?? ctx.config.strict;

    // Non-strict accepted: "true"/"false", "1"/"0", 1/0
    if (!strict) {
      if (value === 'true' || value === '1' || value === 1) value = true;
      else if (value === 'false' || value === '0' || value === 0) value = false;
    }

    if (typeof value !== 'boolean') {
      ctx.errors.push({
        type: 'bool_type',
        loc: [...ctx.path],
        msg: 'Input should be a valid boolean',
        input,
      });
      return undefined;
    }

    return value;
  };
}

function compileLiteral(schema: Extract<CoreSchema, { type: 'literal' }>): ValidatorFn {
  return (input, ctx) => {
    if (!schema.expected.includes(input)) {
      ctx.errors.push({
        type: 'literal_error',
        loc: [...ctx.path],
        msg: `Input should be ${JSON.stringify(schema.expected[0])}`,
        input,
        ctx: { expected: schema.expected },
      });
      return undefined;
    }
    return input;
  };
}

function compileEnum(schema: Extract<CoreSchema, { type: 'enum' }>): ValidatorFn {
  return (input, ctx) => {
    if (typeof input !== 'string' || !schema.members.includes(input)) {
      ctx.errors.push({
        type: 'enum',
        loc: [...ctx.path],
        msg: `Input should be one of ${schema.members.join(', ')}`,
        input,
        ctx: { expected: schema.members },
      });
      return undefined;
    }
    return input;
  };
}

function compileList(schema: Extract<CoreSchema, { type: 'list' }>): ValidatorFn {
  const itemValidator = compileValidator(schema.itemsSchema);
  return (input, ctx) => {
    if (!Array.isArray(input)) {
      ctx.errors.push({
        type: 'list_type',
        loc: [...ctx.path],
        msg: 'Input should be a valid array',
        input,
      });
      return undefined;
    }

    if (schema.minLength !== undefined && input.length < schema.minLength) {
      ctx.errors.push({
        type: 'too_short',
        loc: [...ctx.path],
        msg: `List should have at least ${schema.minLength} items`,
        input,
      });
    }
    if (schema.maxLength !== undefined && input.length > schema.maxLength) {
      ctx.errors.push({
        type: 'too_long',
        loc: [...ctx.path],
        msg: `List should have at most ${schema.maxLength} items`,
        input,
      });
    }

    const result: unknown[] = [];
    for (let i = 0; i < input.length; i++) {
      const itemCtx: ValidationContext = {
        path: [...ctx.path, i],
        config: ctx.config,
        errors: ctx.errors,
      };
      result.push(itemValidator(input[i], itemCtx));
    }
    return result;
  };
}

function compileDict(schema: Extract<CoreSchema, { type: 'dict' }>): ValidatorFn {
  const valueValidator = compileValidator(schema.valuesSchema);
  const keyValidator = schema.keysSchema ? compileValidator(schema.keysSchema) : null;

  return (input, ctx) => {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      ctx.errors.push({
        type: 'dict_type',
        loc: [...ctx.path],
        msg: 'Input should be a valid object',
        input,
      });
      return undefined;
    }

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      let outKey = key;
      if (keyValidator) {
        const keyCtx: ValidationContext = {
          path: [...ctx.path, key],
          config: ctx.config,
          errors: ctx.errors,
        };
        const validatedKey = keyValidator(key, keyCtx);
        if (typeof validatedKey === 'string') outKey = validatedKey;
      }

      const itemCtx: ValidationContext = {
        path: [...ctx.path, key],
        config: ctx.config,
        errors: ctx.errors,
      };
      result[outKey] = valueValidator(val, itemCtx);
    }
    return result;
  };
}

/**
 * Union algorithm:
 * 1. If discriminator is set, try only matching model branches.
 * 2. If none match the tag → error (do NOT fall back to trying every branch).
 * 3. If no discriminator, try each choice; roll back speculative errors on failure.
 */
function compileUnion(schema: Extract<CoreSchema, { type: 'union' }>): ValidatorFn {
  const validators = schema.choices.map(compileValidator);
  return (input, ctx) => {
    if (schema.discriminator && typeof input === 'object' && input !== null) {
      const tag = (input as Record<string, unknown>)[schema.discriminator];
      let matchedAny = false;

      for (let i = 0; i < schema.choices.length; i++) {
        const choice = schema.choices[i];
        if (choice.type !== 'model-fields') continue;

        const discField = choice.fields[schema.discriminator];
        if (!discField) continue;

        const discSchema = discField.schema;
        let matches = false;
        if (discSchema.type === 'literal') {
          matches = discSchema.expected.includes(tag);
        } else if (discSchema.type === 'default') {
          matches = discSchema.defaultValue === tag;
        } else {
          continue;
        }

        if (!matches) continue;
        matchedAny = true;

        const errorsBefore = ctx.errors.length;
        const result = validators[i](input, ctx);
        if (ctx.errors.length === errorsBefore) return result;
        ctx.errors.splice(errorsBefore);
      }

      // Correction vs main: unknown / unmatched discriminator tags fail here
      ctx.errors.push({
        type: 'union_tag_invalid',
        loc: [...ctx.path],
        msg: matchedAny
          ? 'Input did not match the discriminated union member'
          : `Unknown discriminator value ${JSON.stringify(tag)}`,
        input,
        ctx: { discriminator: schema.discriminator, tag },
      });
      return undefined;
    }

    for (let i = 0; i < validators.length; i++) {
      const errorsBefore = ctx.errors.length;
      const result = validators[i](input, ctx);
      if (ctx.errors.length === errorsBefore) return result;
      ctx.errors.splice(errorsBefore);
    }

    ctx.errors.push({
      type: 'union_tag_invalid',
      loc: [...ctx.path],
      msg: 'Input did not match any union member',
      input,
    });
    return undefined;
  };
}

function compileNullable(schema: Extract<CoreSchema, { type: 'nullable' }>): ValidatorFn {
  const inner = compileValidator(schema.schema);
  return (input, ctx) => {
    if (input === null) return null;
    return inner(input, ctx);
  };
}

function compileOptional(schema: Extract<CoreSchema, { type: 'optional' }>): ValidatorFn {
  const inner = compileValidator(schema.schema);
  return (input, ctx) => {
    if (input === undefined) return undefined;
    return inner(input, ctx);
  };
}

function compileDefault(schema: Extract<CoreSchema, { type: 'default' }>): ValidatorFn {
  const inner = compileValidator(schema.schema);
  return (input, ctx) => {
    // Note: substituted default is NOT re-validated by inner schema
    if (input === undefined) return schema.defaultValue;
    return inner(input, ctx);
  };
}

function compileDefaultFactory(schema: Extract<CoreSchema, { type: 'default-factory' }>): ValidatorFn {
  const inner = compileValidator(schema.schema);
  return (input, ctx) => {
    if (input === undefined) return schema.factory();
    return inner(input, ctx);
  };
}

function compileModelFields(schema: Extract<CoreSchema, { type: 'model-fields' }>): ValidatorFn {
  const fieldValidators: Record<string, ValidatorFn> = {};
  for (const [name, field] of Object.entries(schema.fields)) {
    fieldValidators[name] = compileValidator(field.schema);
  }

  return (input, ctx) => {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      ctx.errors.push({
        type: 'model_type',
        loc: [...ctx.path],
        msg: 'Input should be a valid object',
        input,
      });
      return undefined;
    }

    const data = input as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const extra = schema.extra ?? 'ignore';

    for (const [name, field] of Object.entries(schema.fields)) {
      // Lookup order: canonical name first, then alias
      const keys = field.alias ? [name, field.alias] : [name];
      let value: unknown = undefined;
      let found = false;

      for (const key of keys) {
        if (key in data) {
          value = data[key];
          found = true;
          break;
        }
      }

      if (!found) {
        if (field.default !== undefined) {
          value = field.default;
        } else if (field.defaultFactory) {
          value = field.defaultFactory();
        } else if (field.required) {
          ctx.errors.push({
            type: 'missing',
            loc: [...ctx.path, name],
            msg: 'Field required',
            input,
          });
          continue;
        } else {
          continue;
        }
      }

      const fieldCtx: ValidationContext = {
        path: [...ctx.path, name],
        config: ctx.config,
        errors: ctx.errors,
      };
      // Output always uses canonical field names
      result[name] = fieldValidators[name](value, fieldCtx);
    }

    if (extra === 'forbid') {
      const allowed = new Set(Object.keys(schema.fields));
      for (const key of Object.keys(data)) {
        const isAlias = Object.values(schema.fields).some((f) => f.alias === key);
        if (!allowed.has(key) && !isAlias) {
          ctx.errors.push({
            type: 'extra_forbidden',
            loc: [...ctx.path, key],
            msg: 'Extra inputs are not permitted',
            input: data[key],
          });
        }
      }
    } else if (extra === 'allow') {
      for (const [key, val] of Object.entries(data)) {
        if (!(key in result) && !Object.values(schema.fields).some((f) => f.alias === key)) {
          result[key] = val;
        }
      }
    }

    return result;
  };
}

function compileFunctionBefore(schema: Extract<CoreSchema, { type: 'function-before' }>): ValidatorFn {
  const inner = compileValidator(schema.schema);
  return (input, ctx) => inner(schema.fn(input), ctx);
}

function compileFunctionAfter(schema: Extract<CoreSchema, { type: 'function-after' }>): ValidatorFn {
  const inner = compileValidator(schema.schema);
  return (input, ctx) => {
    const validated = inner(input, ctx);
    // Only run after-hook when THIS validation path has no errors yet
    if (ctx.errors.length > 0) return validated;
    return schema.fn(validated);
  };
}

function compileFunctionWrap(schema: Extract<CoreSchema, { type: 'function-wrap' }>): ValidatorFn {
  const inner = compileValidator(schema.schema);
  return (input, ctx) => schema.fn(input, (v) => inner(v, ctx));
}

function compileFunctionPlain(schema: Extract<CoreSchema, { type: 'function-plain' }>): ValidatorFn {
  return (input, _ctx) => schema.fn(input);
}

function compileDate(): ValidatorFn {
  return (input, ctx) => {
    if (input instanceof Date) return input;
    if (typeof input === 'string' || typeof input === 'number') {
      const d = new Date(input);
      if (!Number.isNaN(d.getTime())) return d;
    }
    ctx.errors.push({
      type: 'date_type',
      loc: [...ctx.path],
      msg: 'Input should be a valid date',
      input,
    });
    return undefined;
  };
}
```

#### Coercion cheat sheet

| Schema | Non-strict accepts | Strict |
|--------|--------------------|--------|
| `int` | integer-like strings | number && `Number.isInteger` |
| `float` | numeric strings | finite-or-inf number, not NaN |
| `str` | numbers, booleans → string | must be string |
| `bool` | `"true"/"false"/"1"/"0"`, `1/0` | must be boolean |
| `date` | `Date`, parseable string/number | same (no strict flag) |

#### Model field rules (memorize these)

1. Input must be a non-null, non-array object.
2. For each declared field, look up **canonical name**, then **alias**.
3. If missing: use `default`, else `defaultFactory`, else error if `required`, else skip.
4. Field defaults **are** passed through the field validator.
5. Schema-level `default` wrappers are **not** used for absent model keys (absence is handled above).
6. `extra: 'forbid'` errors on unknown keys; `'allow'` copies them; `'ignore'` drops them.
7. Result keys are always **canonical** names.


### 3.4 SchemaValidator — `packages/typedantic-core/src/validator/schema-validator.ts`

This is the public façade over the compiled function:

1. Compile once in the constructor.
2. Each `validatePython` call creates a **fresh** `errors` array.
3. If any errors → throw `ValidationError`.
4. Otherwise return the transformed value.

```typescript
import { compileValidator } from '../compiler/compile.js';
import { ValidationError } from '../errors/validation-error.js';
import type { CoreSchema, ValidateOptions, ValidationErrorDetail } from '../schema/types.js';

export class SchemaValidator {
  private readonly validateFn: ReturnType<typeof compileValidator>;
  private lastErrors: ValidationErrorDetail[] = [];

  constructor(
    private readonly schema: CoreSchema,
    private readonly config: ValidateOptions = {},
  ) {
    this.validateFn = compileValidator(schema);
  }

  validatePython(input: unknown, options?: ValidateOptions): unknown {
    const errors: ValidationErrorDetail[] = [];
    const mergedConfig = { strict: options?.strict ?? this.config.strict };

    const result = this.validateFn(input, {
      path: [],
      config: mergedConfig,
      errors,
    });

    this.lastErrors = errors;

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    return result;
  }

  validateJson(json: string, options?: ValidateOptions): unknown {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      // Note: json parse failures do not update lastErrors
      throw new ValidationError([
        {
          type: 'json_invalid',
          loc: [],
          msg: 'Invalid JSON',
          input: json,
        },
      ]);
    }
    return this.validatePython(parsed, options);
  }

  /** Errors from the most recent validatePython call (mutable array — do not share). */
  getErrors(): ValidationErrorDetail[] {
    return this.lastErrors;
  }

  getSchema(): CoreSchema {
    return this.schema;
  }
}

/** One-shot helper: compile + validate. */
export function validate(schema: CoreSchema, input: unknown, options?: ValidateOptions): unknown {
  return new SchemaValidator(schema, options).validatePython(input, options);
}
```

### 3.5 SchemaSerializer — `packages/typedantic-core/src/serializer/schema-serializer.ts`

Serializers turn validated values into plain objects / JSON. They walk the **schema**, not class metadata.

```typescript
import type { CoreSchema, DumpOptions } from '../schema/types.js';

export class SchemaSerializer {
  constructor(private readonly schema: CoreSchema) {}

  /** JavaScript / “Python-mode” dump (Dates stay Date objects). */
  toPython(instance: unknown, options: DumpOptions = {}): unknown {
    return serializeValue(instance, this.schema, options);
  }

  /** JSON string. Forces mode: 'json' so Dates become ISO strings. */
  toJson(instance: unknown, options: DumpOptions = {}): string {
    const data = this.toPython(instance, { ...options, mode: 'json' });
    return JSON.stringify(data);
  }
}

function serializeValue(value: unknown, schema: CoreSchema, options: DumpOptions): unknown {
  if (value === undefined) {
    if (options.excludeUnset) return undefined;
    return value;
  }

  if (value === null) {
    if (options.excludeNone) return undefined;
    return null;
  }

  switch (schema.type) {
    case 'nullable': {
      if (value === null) return options.excludeNone ? undefined : null;
      return serializeValue(value, schema.schema, options);
    }
    case 'optional':
      return value === undefined ? undefined : serializeValue(value, schema.schema, options);
    case 'default':
    case 'default-factory':
      return serializeValue(value, schema.schema, options);
    case 'list': {
      if (!Array.isArray(value)) return value;
      return value.map((item) => serializeValue(item, schema.itemsSchema, options));
    }
    case 'dict': {
      if (typeof value !== 'object' || value === null) return value;
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const serialized = serializeValue(v, schema.valuesSchema, options);
        if (serialized !== undefined) result[k] = serialized;
      }
      return result;
    }
    case 'model-fields': {
      if (typeof value !== 'object' || value === null) return value;
      const obj = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};

      for (const [name, field] of Object.entries(schema.fields)) {
        if (options.exclude?.has(name)) continue;
        if (options.include && !options.include.has(name)) continue;

        const key = options.byAlias && field.alias ? field.alias : name;
        if (!(name in obj)) continue;

        const fieldValue = obj[name];
        if (fieldValue === undefined && options.excludeUnset) continue;
        if (fieldValue === null && options.excludeNone) continue;
        if (fieldValue === field.default && options.excludeDefaults) continue;

        const serialized = serializeValue(fieldValue, field.schema, options);
        if (serialized !== undefined) result[key] = serialized;
      }

      if (schema.extra === 'allow') {
        for (const [k, v] of Object.entries(obj)) {
          if (!(k in result) && !(k in schema.fields)) {
            result[k] = v;
          }
        }
      }

      return result;
    }
    case 'date':
      if (value instanceof Date) {
        return options.mode === 'json' ? value.toISOString() : value;
      }
      return value;
    case 'union': {
      // Best-effort: try each choice's serializer shape is unknown at dump time,
      // so return the value as-is. Higher layers usually dump concrete models.
      return value;
    }
    default:
      return value;
  }
}
```

### 3.6 Package exports — `packages/typedantic-core/src/index.ts`

```typescript
export * from './schema/types.js';
export { ValidationError, createError } from './errors/validation-error.js';
export { compileValidator } from './compiler/compile.js';
export { SchemaValidator, validate } from './validator/schema-validator.js';
export { SchemaSerializer } from './serializer/schema-serializer.js';
```

### 3.7 Core tests — `packages/typedantic-core/src/validator/schema-validator.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { SchemaValidator, ValidationError } from '../index.js';
import type { CoreSchema } from '../schema/types.js';

describe('SchemaValidator', () => {
  it('validates integers with constraints', () => {
    const schema: CoreSchema = { type: 'int', ge: 0, le: 150 };
    const v = new SchemaValidator(schema);
    expect(v.validatePython(25)).toBe(25);
    expect(() => v.validatePython(-1)).toThrow(ValidationError);
    expect(() => v.validatePython(200)).toThrow(ValidationError);
  });

  it('coerces string to int when not strict', () => {
    const schema: CoreSchema = { type: 'int' };
    const v = new SchemaValidator(schema);
    expect(v.validatePython('42')).toBe(42);
  });

  it('validates model fields', () => {
    const schema: CoreSchema = {
      type: 'model-fields',
      fields: {
        name: { schema: { type: 'str', minLength: 1 }, required: true },
        age: { schema: { type: 'int', ge: 0 }, required: true },
      },
    };
    const v = new SchemaValidator(schema);
    const result = v.validatePython({ name: 'Alice', age: 30 });
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('reports missing required fields', () => {
    const schema: CoreSchema = {
      type: 'model-fields',
      fields: {
        name: { schema: { type: 'str' }, required: true },
      },
    };
    const v = new SchemaValidator(schema);
    try {
      v.validatePython({});
      expect.fail('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).errors[0].type).toBe('missing');
      expect(JSON.parse((e as ValidationError).json())).toHaveProperty('detail');
    }
  });

  it('validates lists', () => {
    const schema: CoreSchema = {
      type: 'list',
      itemsSchema: { type: 'str' },
      minLength: 1,
    };
    const v = new SchemaValidator(schema);
    expect(v.validatePython(['a', 'b'])).toEqual(['a', 'b']);
    expect(() => v.validatePython([])).toThrow(ValidationError);
  });

  it('validates unions', () => {
    const schema: CoreSchema = {
      type: 'union',
      choices: [{ type: 'int' }, { type: 'str' }],
    };
    const v = new SchemaValidator(schema);
    expect(v.validatePython(1)).toBe(1);
    expect(v.validatePython('hello')).toBe('hello');
    expect(() => v.validatePython({})).toThrow(ValidationError);
  });

  it('rejects unknown discriminator tags', () => {
    const schema: CoreSchema = {
      type: 'union',
      discriminator: 'kind',
      choices: [
        {
          type: 'model-fields',
          modelName: 'Cat',
          fields: {
            kind: { schema: { type: 'literal', expected: ['cat'] }, required: true },
            meows: { schema: { type: 'bool' }, required: true },
          },
        },
        {
          type: 'model-fields',
          modelName: 'Dog',
          fields: {
            kind: { schema: { type: 'literal', expected: ['dog'] }, required: true },
            barks: { schema: { type: 'bool' }, required: true },
          },
        },
      ],
    };
    const v = new SchemaValidator(schema);
    expect(v.validatePython({ kind: 'cat', meows: true })).toEqual({ kind: 'cat', meows: true });
    expect(() => v.validatePython({ kind: 'bird', meows: true })).toThrow(ValidationError);
  });

  it('validates dict keys when keysSchema is set', () => {
    const schema: CoreSchema = {
      type: 'dict',
      keysSchema: { type: 'str', minLength: 2 },
      valuesSchema: { type: 'int' },
    };
    const v = new SchemaValidator(schema);
    expect(v.validatePython({ ab: 1 })).toEqual({ ab: 1 });
    expect(() => v.validatePython({ a: 1 })).toThrow(ValidationError);
  });
});
```

**Checkpoint — core package**

```bash
bun run --filter @typedantic/core build
bunx vitest run packages/typedantic-core
bun run --filter @typedantic/core typecheck
```

```bash
# pnpm
pnpm --filter @typedantic/core build
pnpm exec vitest run packages/typedantic-core
pnpm --filter @typedantic/core typecheck

# npm
npm run build -w @typedantic/core
npx vitest run packages/typedantic-core
npm run typecheck -w @typedantic/core
```

Expected: all core tests pass (8+ including error tests).

---

## 4. Phase B — `typedantic` public API

Dependency order inside `typedantic`:

```
reflect.ts → metadata.ts → field-registry.ts → field.ts
     ↓
model-config.ts → field-validator.ts → field-serializer.ts → special.ts
     ↓
schema-builder.ts → generator.ts (JSON Schema + TypeAdapter)
     ↓
base-model.ts → root-model.ts → create-model.ts → index.ts
```

### 4.1 Reflection wrapper — `packages/typedantic/src/internal/reflect.ts`

Always import this module (or `reflect-metadata`) once before using decorators.

```typescript
import 'reflect-metadata';

type ReflectMetadata = {
  getMetadata?(key: string | symbol, target: object, propertyKey?: string | symbol): unknown;
  defineMetadata?(
    key: string | symbol,
    value: unknown,
    target: object,
    propertyKey?: string | symbol,
  ): void;
};

const reflect = Reflect as ReflectMetadata;

export function getMetadata(
  key: string | symbol,
  target: object,
  propertyKey?: string | symbol,
): unknown {
  return reflect.getMetadata?.(key, target, propertyKey);
}

export function defineMetadata(
  key: string | symbol,
  value: unknown,
  target: object,
  propertyKey?: string | symbol,
): void {
  reflect.defineMetadata?.(key, value, target, propertyKey);
}
```

### 4.2 Metadata contracts — `packages/typedantic/src/internal/metadata.ts`

```typescript
import type { CoreSchema, SchemaSerializer, SchemaValidator } from '@typedantic/core';

export const FIELD_INFO_KEY = Symbol('typedantic:fieldInfo');
export const MODEL_CONFIG_KEY = Symbol('typedantic:modelConfig');
export const FIELD_VALIDATORS_KEY = Symbol('typedantic:fieldValidators');
export const MODEL_VALIDATORS_KEY = Symbol('typedantic:modelValidators');
export const CORE_SCHEMA_KEY = Symbol('typedantic:coreSchema');
export const VALIDATOR_KEY = Symbol('typedantic:validator');
export const SERIALIZER_KEY = Symbol('typedantic:serializer');

export interface FieldInfo<T = unknown> {
  /** Explicit runtime type — preferred because Vitest/esbuild often omit design:type. */
  type?: unknown;
  default?: T;
  defaultFactory?: () => T;
  alias?: string;
  title?: string;
  description?: string;
  examples?: unknown[];
  deprecated?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
  ge?: number;
  gt?: number;
  le?: number;
  lt?: number;
  multipleOf?: number;
  strict?: boolean;
  jsonSchemaExtra?: Record<string, unknown>;
}

export interface ConfigDict {
  strict?: boolean;
  frozen?: boolean;
  extra?: 'ignore' | 'allow' | 'forbid';
  populateByName?: boolean;
  validateAssignment?: boolean;
  useEnumValues?: boolean;
  jsonSchemaExtra?: Record<string, unknown>;
  strStripWhitespace?: boolean;
  strToLower?: boolean;
  strToUpper?: boolean;
}

export type ValidatorMode = 'before' | 'after' | 'wrap' | 'plain';
export type ModelValidatorMode = 'before' | 'after' | 'wrap';

export interface FieldValidatorMeta {
  fields: string[];
  mode: ValidatorMode;
  fn: (...args: unknown[]) => unknown;
}

export interface ModelValidatorMeta {
  mode: ModelValidatorMode;
  fn: (...args: unknown[]) => unknown;
}

export interface ModelFieldMeta {
  name: string;
  fieldInfo?: FieldInfo;
  schema: CoreSchema;
  required: boolean;
  alias?: string;
  default?: unknown;
  defaultFactory?: () => unknown;
}

export type ModelClass<T extends new (...args: unknown[]) => object = new (...args: unknown[]) => object> =
  T & {
    modelFields: Record<string, ModelFieldMeta>;
    modelConfig: ConfigDict;
    [CORE_SCHEMA_KEY]?: CoreSchema;
    [VALIDATOR_KEY]?: SchemaValidator;
    [SERIALIZER_KEY]?: SchemaSerializer;
    modelValidate(data: unknown): InstanceType<T>;
    modelValidateJson(json: string): InstanceType<T>;
    modelJsonSchema(): Record<string, unknown>;
    modelConstruct(values: Record<string, unknown>): InstanceType<T>;
  };
```

### 4.3 Field registry — `packages/typedantic/src/internal/field-registry.ts`

Decorators register fields onto the **constructor**. Later, `finalizeRegisteredFields` fills in schemas from `design:type` / explicit `type`.

```typescript
import type { CoreSchema } from '@typedantic/core';
import type { FieldInfo, ModelFieldMeta } from './metadata.js';
import { getMetadata, defineMetadata } from './reflect.js';

const MODEL_FIELDS_REGISTRY = Symbol('typedantic:fieldsRegistry');

function resolveFieldType(fieldInfo: FieldInfo | undefined, designType?: unknown): unknown {
  if (fieldInfo?.type) return fieldInfo.type;
  if (designType && designType !== Object) return designType;
  return undefined;
}

export function registerModelField(ctor: Function, name: string, fieldInfo: FieldInfo): void {
  const registry = (getMetadata(MODEL_FIELDS_REGISTRY, ctor) as Record<string, ModelFieldMeta>) ?? {};
  const hasDefault = fieldInfo.default !== undefined || fieldInfo.defaultFactory !== undefined;

  registry[name] = {
    name,
    fieldInfo,
    schema: { type: 'any' },
    required: !hasDefault,
    alias: fieldInfo.alias,
    default: fieldInfo.default,
    defaultFactory: fieldInfo.defaultFactory,
  };

  defineMetadata(MODEL_FIELDS_REGISTRY, registry, ctor);
  Object.defineProperty(ctor, 'modelFields', { value: registry, writable: true, configurable: true });
}

export function getRegisteredFields(ctor: Function): Record<string, ModelFieldMeta> {
  return (getMetadata(MODEL_FIELDS_REGISTRY, ctor) as Record<string, ModelFieldMeta>) ?? {};
}

export function finalizeRegisteredFields(
  ctor: Function,
  buildSchema: (fieldInfo: FieldInfo | undefined, designType?: unknown) => CoreSchema,
): Record<string, ModelFieldMeta> {
  const registry = getRegisteredFields(ctor);
  const prototype = ctor.prototype as object;

  for (const [, meta] of Object.entries(registry)) {
    const designType = getMetadata('design:type', prototype, meta.name);
    const fieldType = resolveFieldType(meta.fieldInfo, designType);
    meta.schema = buildSchema(meta.fieldInfo, fieldType ?? String);
  }

  Object.defineProperty(ctor, 'modelFields', { value: registry, writable: true, configurable: true });
  return registry;
}
```

### 4.4 `@Field` decorator — `packages/typedantic/src/fields/field.ts`

`Field()` returns an object that is **both**:
- a property decorator (`@Field({ minLength: 3 })`)
- a `FieldInfo` object (usable inside `createModel`)

```typescript
import type { FieldInfo } from '../internal/metadata.js';
import { registerModelField } from '../internal/field-registry.js';
import { getMetadata } from '../internal/reflect.js';

const FIELD_MARKER = Symbol('typedantic:fieldMarker');

export class FieldInfoImpl<T = unknown> implements FieldInfo<T> {
  readonly [FIELD_MARKER] = true;
  type?: unknown;
  default?: T;
  defaultFactory?: () => T;
  alias?: string;
  title?: string;
  description?: string;
  examples?: unknown[];
  deprecated?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
  ge?: number;
  gt?: number;
  le?: number;
  lt?: number;
  multipleOf?: number;
  strict?: boolean;
  jsonSchemaExtra?: Record<string, unknown>;

  constructor(options: FieldInfo<T> = {}) {
    Object.assign(this, options);
  }
}

type FieldDecorator = (target: object, propertyKey: string | symbol) => void;

export function Field<T = unknown>(options: FieldInfo<T> = {}): FieldInfoImpl<T> & FieldDecorator {
  const info = new FieldInfoImpl(options);

  const decorator = (target: object, propertyKey: string | symbol): void => {
    const designType = getMetadata('design:type', target, propertyKey);
    const fieldOptions: FieldInfo<T> = { ...options };
    if (!fieldOptions.type && designType && designType !== Object) {
      fieldOptions.type = designType;
    }
    registerModelField(target.constructor, String(propertyKey), fieldOptions);
  };

  return Object.assign(decorator, info) as FieldInfoImpl<T> & FieldDecorator;
}

export function isFieldInfo(value: unknown): value is FieldInfoImpl {
  return typeof value === 'object' && value !== null && FIELD_MARKER in value;
}

export type Annotated<T, M> = T & { __annotatedMeta?: M };

export function getAnnotatedMeta(metadata: unknown[]): FieldInfo | undefined {
  for (const item of metadata) {
    if (isFieldInfo(item)) return item;
  }
  return undefined;
}
```

**Critical beginner notes**

1. Every runtime field needs `@Field(...)` — undecorated fields are invisible.
2. Prefer **`defaultFactory: () => []`** for arrays/objects. `default: []` shares one array across instances.
3. Prefer explicit `type` when Vitest does not emit `design:type`:

```typescript
@Field({ type: String, minLength: 3 })
username!: string;

@Field({ type: Number, ge: 0 })
age!: number;

@Field({ type: Boolean })
active!: boolean;

@Field({ type: [String], defaultFactory: () => [] })
tags!: string[];
```

### 4.5 Model config — `packages/typedantic/src/config/model-config.ts`

```typescript
import { defineMetadata } from '../internal/reflect.js';
import type { ConfigDict } from '../internal/metadata.js';
import { MODEL_CONFIG_KEY } from '../internal/metadata.js';

export function modelConfig(config: ConfigDict): ClassDecorator {
  return (target) => {
    Object.defineProperty(target, 'modelConfig', {
      value: { ...(target as { modelConfig?: ConfigDict }).modelConfig, ...config },
      writable: true,
      configurable: true,
    });
    defineMetadata(MODEL_CONFIG_KEY, config, target);
  };
}

export function getModelConfig(ctor: Function): ConfigDict {
  return ((ctor as { modelConfig?: ConfigDict }).modelConfig ?? {}) as ConfigDict;
}
```

### 4.6 Validators & computed fields — `packages/typedantic/src/validators/field-validator.ts`

**Correction vs main:** always store field/model validator metadata on the **constructor**, whether the decorated method is static or instance.

```typescript
import { getMetadata, defineMetadata } from '../internal/reflect.js';
import type { ValidatorMode, ModelValidatorMode } from '../internal/metadata.js';
import { FIELD_VALIDATORS_KEY, MODEL_VALIDATORS_KEY } from '../internal/metadata.js';

const COMPUTED_FIELDS_KEY = Symbol('typedantic:computedFields');

function ctorOf(target: object): Function {
  // Static method decorator: target is the constructor.
  // Instance method decorator: target is the prototype.
  return typeof target === 'function' ? target : target.constructor;
}

export function getComputedFields(ctor: Function): string[] {
  return (getMetadata(COMPUTED_FIELDS_KEY, ctor) as string[]) ?? [];
}

export function fieldValidator(
  ...fields: string[]
): (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => void;
export function fieldValidator(
  field: string,
  options: { mode?: ValidatorMode },
): (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => void;
export function fieldValidator(
  ...args: [string, { mode?: ValidatorMode }?] | string[]
): (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => void {
  let fields: string[];
  let mode: ValidatorMode = 'after';

  if (args.length >= 2 && typeof args[1] === 'object') {
    fields = [args[0] as string];
    mode = (args[1] as { mode?: ValidatorMode }).mode ?? 'after';
  } else {
    fields = args as string[];
  }

  return (target, _propertyKey, descriptor) => {
    const ctor = ctorOf(target);
    const existing =
      (getMetadata(FIELD_VALIDATORS_KEY, ctor) as Array<{
        fields: string[];
        mode: ValidatorMode;
        fn: (...args: unknown[]) => unknown;
      }>) ?? [];

    existing.push({ fields, mode, fn: descriptor.value as (...args: unknown[]) => unknown });
    defineMetadata(FIELD_VALIDATORS_KEY, existing, ctor);
  };
}

export function modelValidator(options: { mode: ModelValidatorMode } = { mode: 'after' }) {
  return (target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const ctor = ctorOf(target);
    const existing =
      (getMetadata(MODEL_VALIDATORS_KEY, ctor) as Array<{
        mode: ModelValidatorMode;
        fn: (...args: unknown[]) => unknown;
      }>) ?? [];

    existing.push({ mode: options.mode, fn: descriptor.value as (...args: unknown[]) => unknown });
    defineMetadata(MODEL_VALIDATORS_KEY, existing, ctor);
  };
}

export function computedField(): (
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
) => void {
  return (target, propertyKey, descriptor) => {
    const ctor = ctorOf(target);
    const existing = (getMetadata(COMPUTED_FIELDS_KEY, ctor) as string[]) ?? [];
    existing.push(String(propertyKey));
    defineMetadata(COMPUTED_FIELDS_KEY, existing, ctor);
    descriptor.enumerable = true;
    return descriptor;
  };
}
```

**Validator modes**

| Mode | When it runs | Signature idea |
|------|--------------|----------------|
| `before` | Before core validation | `(raw) => transformedRaw` |
| `after` | After successful core validation | `(validated) => transformed` |
| `wrap` | You call the inner handler | `(raw, handler) => result` |
| `plain` | Replaces core validation | `(raw) => result` |

Recommended style for field validators: **static methods**.


### 4.7 Serializers — `packages/typedantic/src/serializers/field-serializer.ts`

```typescript
import { getMetadata, defineMetadata } from '../internal/reflect.js';

const FIELD_SERIALIZER_KEY = Symbol('typedantic:fieldSerializers');
const MODEL_SERIALIZER_KEY = Symbol('typedantic:modelSerializers');

function ctorOf(target: object): Function {
  return typeof target === 'function' ? target : target.constructor;
}

export function fieldSerializer(...fields: string[]) {
  return (target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const ctor = ctorOf(target);
    const existing =
      (getMetadata(FIELD_SERIALIZER_KEY, ctor) as Array<{
        fields: string[];
        fn: (value: unknown) => unknown;
      }>) ?? [];
    existing.push({ fields, fn: descriptor.value as (value: unknown) => unknown });
    defineMetadata(FIELD_SERIALIZER_KEY, existing, ctor);
  };
}

export function modelSerializer(mode: 'plain' | 'wrap' = 'plain') {
  return (target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const ctor = ctorOf(target);
    const existing =
      (getMetadata(MODEL_SERIALIZER_KEY, ctor) as Array<{
        mode: 'plain' | 'wrap';
        fn: (...args: unknown[]) => unknown;
      }>) ?? [];
    existing.push({ mode, fn: descriptor.value as (...args: unknown[]) => unknown });
    defineMetadata(MODEL_SERIALIZER_KEY, existing, ctor);
  };
}

export function applyFieldSerializers(
  ctor: Function,
  data: Record<string, unknown>,
  instance?: object,
): Record<string, unknown> {
  const serializers =
    (getMetadata(FIELD_SERIALIZER_KEY, ctor) as Array<{
      fields: string[];
      fn: (value: unknown) => unknown;
    }>) ?? [];

  const result = { ...data };
  for (const ser of serializers) {
    for (const field of ser.fields) {
      if (field in result) {
        // Correction: bind instance when present so methods can use `this`
        result[field] = instance ? ser.fn.call(instance, result[field]) : ser.fn(result[field]);
      }
    }
  }
  return result;
}

export function applyModelSerializers(
  ctor: Function,
  data: Record<string, unknown>,
  instance?: object,
): Record<string, unknown> {
  const serializers =
    (getMetadata(MODEL_SERIALIZER_KEY, ctor) as Array<{
      mode: 'plain' | 'wrap';
      fn: (...args: unknown[]) => unknown;
    }>) ?? [];

  let result: Record<string, unknown> = data;
  for (const ser of serializers) {
    if (ser.mode === 'plain') {
      result = ser.fn.call(instance ?? ctor, result) as Record<string, unknown>;
    } else {
      const inner = result;
      result = ser.fn.call(instance ?? ctor, inner, () => inner) as Record<string, unknown>;
    }
  }
  return result;
}

export function getModelSerializers(ctor: Function) {
  return (
    (getMetadata(MODEL_SERIALIZER_KEY, ctor) as Array<{
      mode: 'plain' | 'wrap';
      fn: (...args: unknown[]) => unknown;
    }>) ?? []
  );
}
```

### 4.8 Special types — `packages/typedantic/src/types/special.ts`

```typescript
export interface SpecialTypeMarker {
  __specialType: string;
  pattern?: RegExp;
  validator?: (value: string) => boolean;
  jsonFormat?: string;
}

export function EmailStr(): SpecialTypeMarker {
  return {
    __specialType: 'email',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    jsonFormat: 'email',
  };
}

export function HttpUrl(): SpecialTypeMarker {
  return {
    __specialType: 'url',
    validator: (v) => {
      try {
        const u = new URL(v);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    },
    jsonFormat: 'uri',
  };
}

export function UUID(): SpecialTypeMarker {
  return {
    __specialType: 'uuid',
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    jsonFormat: 'uuid',
  };
}

/** Opaque string marker. Masking in dumps is optional future work. */
export function SecretStr(): SpecialTypeMarker {
  return { __specialType: 'secret' };
}

export function isSpecialType(type: unknown): type is SpecialTypeMarker {
  return typeof type === 'object' && type !== null && '__specialType' in type;
}
```

Usage with explicit type:

```typescript
@Field({ type: EmailStr() })
email!: string;

@Field({ type: HttpUrl() })
website!: string;
```

### 4.9 Schema builder — `packages/typedantic/src/internal/schema-builder.ts`

This converts constructors + field metadata into `CoreSchema`.

**Correction vs main:** when a special type has a `validator` callback (e.g. `HttpUrl`), wrap the string schema in `function-after` so the callback actually runs. Also apply constraints through default wrappers.

```typescript
import type { CoreSchema } from '@typedantic/core';
import type {
  ConfigDict,
  FieldInfo,
  FieldValidatorMeta,
  ModelFieldMeta,
  ModelValidatorMeta,
} from './metadata.js';
import { FIELD_VALIDATORS_KEY, MODEL_VALIDATORS_KEY } from './metadata.js';
import { getMetadata } from './reflect.js';
import { isFieldInfo } from '../fields/field.js';
import { getRegisteredFields, finalizeRegisteredFields } from './field-registry.js';
import { isSpecialType } from '../types/special.js';

export function inferSchemaFromType(type: unknown, fieldInfo?: FieldInfo): CoreSchema {
  const effectiveType = fieldInfo?.type ?? type;
  if (fieldInfo) {
    const base = inferTypeFromFieldInfo(fieldInfo) ?? buildBaseSchema(effectiveType, fieldInfo);
    return applyFieldConstraints(base, fieldInfo);
  }
  return buildBaseSchema(effectiveType);
}

function inferTypeFromFieldInfo(fieldInfo: FieldInfo): CoreSchema | null {
  if (
    fieldInfo.ge !== undefined ||
    fieldInfo.gt !== undefined ||
    fieldInfo.le !== undefined ||
    fieldInfo.lt !== undefined ||
    fieldInfo.multipleOf !== undefined
  ) {
    // Number constraints → float (JS has no int runtime type)
    return { type: 'float' };
  }
  if (
    fieldInfo.minLength !== undefined ||
    fieldInfo.maxLength !== undefined ||
    fieldInfo.pattern !== undefined
  ) {
    return { type: 'str' };
  }
  return null;
}

function inferItemSchema(type: unknown): CoreSchema {
  if (Array.isArray(type)) {
    const [item] = type as unknown[];
    return item ? inferSchemaFromType(item) : { type: 'any' };
  }
  if (type === Array) return { type: 'any' };
  return { type: 'str' };
}

function buildBaseSchema(type: unknown, fieldInfo?: FieldInfo): CoreSchema {
  if (fieldInfo?.default !== undefined) {
    const inner = Array.isArray(fieldInfo.default)
      ? { type: 'list' as const, itemsSchema: inferItemSchema(type) }
      : buildBaseSchema(type, undefined);
    return { type: 'default', schema: applyFieldConstraints(inner, fieldInfo), defaultValue: fieldInfo.default };
  }
  if (fieldInfo?.defaultFactory) {
    return {
      type: 'default-factory',
      schema: applyFieldConstraints(buildBaseSchema(type), fieldInfo),
      factory: fieldInfo.defaultFactory,
    };
  }

  if (type === String || type === 'string') return { type: 'str' };
  if (type === Number || type === 'number') return { type: 'float' };
  if (type === Boolean || type === 'boolean') return { type: 'bool' };
  if (type === Date) return { type: 'date' };
  if (type === Array) return { type: 'list', itemsSchema: { type: 'any' } };

  if (Array.isArray(type)) {
    const [itemType] = type as unknown[];
    return { type: 'list', itemsSchema: inferSchemaFromType(itemType) };
  }

  if (typeof type === 'object' && type !== null) {
    const typeObj = type as Record<string, unknown>;
    if (isSpecialType(type)) {
      let schema: CoreSchema = { type: 'str' };
      if (type.pattern) schema = { ...schema, pattern: type.pattern };
      if (type.validator) {
        const validate = type.validator;
        schema = {
          type: 'function-after',
          schema,
          fn: (value) => {
            if (typeof value === 'string' && !validate(value)) {
              throw new Error(`Invalid ${type.__specialType}`);
            }
            return value;
          },
        };
      }
      return schema;
    }
    if ('__enum' in typeObj) {
      return { type: 'enum', members: typeObj.__enum as string[] };
    }
    if ('__literal' in typeObj) {
      return { type: 'literal', expected: [typeObj.__literal] };
    }
    if ('__discriminatedUnion' in typeObj) {
      const du = typeObj.__discriminatedUnion as { discriminator: string; models: Function[] };
      return {
        type: 'union',
        discriminator: du.discriminator,
        choices: du.models.map((m) => buildModelSchema(m)),
      };
    }
    if ('__union' in typeObj) {
      return {
        type: 'union',
        choices: (typeObj.__union as unknown[]).map((t) => inferSchemaFromType(t)),
      };
    }
    if ('__nullable' in typeObj) {
      return { type: 'nullable', schema: inferSchemaFromType(typeObj.__nullable) };
    }
    if ('__optional' in typeObj) {
      return { type: 'optional', schema: inferSchemaFromType(typeObj.__optional) };
    }
    if ('__model' in typeObj) {
      return buildModelSchema(typeObj.__model as Function);
    }
  }

  if (typeof type === 'function' && isModelClass(type)) {
    return buildModelSchema(type);
  }

  return { type: 'any' };
}

function applyFieldConstraints(schema: CoreSchema, fieldInfo: FieldInfo): CoreSchema {
  if (schema.type === 'default' || schema.type === 'default-factory') {
    return { ...schema, schema: applyFieldConstraints(schema.schema, fieldInfo) };
  }
  if (schema.type === 'function-after' || schema.type === 'function-before' || schema.type === 'function-wrap') {
    return { ...schema, schema: applyFieldConstraints(schema.schema, fieldInfo) };
  }
  if (schema.type === 'str') {
    return {
      ...schema,
      minLength: fieldInfo.minLength ?? schema.minLength,
      maxLength: fieldInfo.maxLength ?? schema.maxLength,
      pattern: fieldInfo.pattern ?? schema.pattern,
      strict: fieldInfo.strict ?? schema.strict,
    };
  }
  if (schema.type === 'int' || schema.type === 'float') {
    return {
      ...schema,
      ge: fieldInfo.ge ?? schema.ge,
      gt: fieldInfo.gt ?? schema.gt,
      le: fieldInfo.le ?? schema.le,
      lt: fieldInfo.lt ?? schema.lt,
      multipleOf: fieldInfo.multipleOf ?? schema.multipleOf,
      strict: fieldInfo.strict ?? schema.strict,
    };
  }
  return schema;
}

function isModelClass(type: Function): boolean {
  return 'modelFields' in type || type.prototype?.constructor?.name !== 'Object';
}

export function buildModelSchema(ctor: Function, config?: ConfigDict): CoreSchema {
  const fields = collectModelFields(ctor);
  const modelConfig = config ?? ((ctor as { modelConfig?: ConfigDict }).modelConfig ?? {});

  const modelFields: Record<string, import('@typedantic/core').ModelFieldSchema> = {};

  const fieldValidators =
    (getMetadata(FIELD_VALIDATORS_KEY, ctor) as FieldValidatorMeta[]) ?? [];

  for (const [name, meta] of Object.entries(fields)) {
    let schema = meta.schema;

    for (const v of fieldValidators) {
      if (!v.fields.includes(name)) continue;
      schema = wrapValidator(schema, v);
    }

    modelFields[name] = {
      schema,
      required: meta.required,
      alias: meta.alias,
      default: meta.default,
      defaultFactory: meta.defaultFactory,
    };
  }

  let coreSchema: CoreSchema = {
    type: 'model-fields',
    fields: modelFields,
    modelName: ctor.name,
    extra: modelConfig.extra ?? 'ignore',
    strict: modelConfig.strict,
  };

  const modelValidators =
    (getMetadata(MODEL_VALIDATORS_KEY, ctor) as ModelValidatorMeta[]) ?? [];

  for (const v of modelValidators) {
    if (v.mode === 'before') {
      coreSchema = {
        type: 'function-before',
        schema: coreSchema,
        fn: (data) => v.fn.call(ctor, data),
      };
    } else if (v.mode === 'wrap') {
      coreSchema = {
        type: 'function-wrap',
        schema: coreSchema,
        fn: (data, handler) => v.fn.call(ctor, data, handler),
      };
    } else if (v.mode === 'after') {
      coreSchema = {
        type: 'function-after',
        schema: coreSchema,
        fn: (data) => {
          const instance = Object.assign(Object.create(ctor.prototype), data as object);
          return v.fn.call(instance);
        },
      };
    }
  }

  return coreSchema;
}

function wrapValidator(schema: CoreSchema, v: FieldValidatorMeta): CoreSchema {
  switch (v.mode) {
    case 'before':
      return { type: 'function-before', schema, fn: v.fn };
    case 'after':
      return { type: 'function-after', schema, fn: v.fn };
    case 'wrap':
      return {
        type: 'function-wrap',
        schema,
        fn: v.fn as (value: unknown, handler: (v: unknown) => unknown) => unknown,
      };
    case 'plain':
      return { type: 'function-plain', fn: v.fn };
    default:
      return schema;
  }
}

export function collectModelFields(ctor: Function): Record<string, ModelFieldMeta> {
  const registered = getRegisteredFields(ctor);
  if (Object.keys(registered).length > 0) {
    return finalizeRegisteredFields(ctor, (fieldInfo, designType) =>
      inferSchemaFromType(designType ?? String, fieldInfo),
    );
  }

  const existing = (ctor as { modelFields?: Record<string, ModelFieldMeta> }).modelFields;
  if (existing && Object.keys(existing).length > 0) return existing;

  const fields: Record<string, ModelFieldMeta> = {};
  const prototype = ctor.prototype as Record<string, unknown>;

  for (const key of Object.getOwnPropertyNames(prototype)) {
    if (key === 'constructor') continue;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
    if (!descriptor || typeof descriptor.value === 'function') continue;

    const value = descriptor.value;
    let fieldInfo: FieldInfo | undefined;
    if (isFieldInfo(value)) fieldInfo = value;

    const designType = getMetadata('design:type', prototype, key);
    const schema = inferSchemaFromType(designType ?? String, fieldInfo);
    const hasDefault = fieldInfo?.default !== undefined || fieldInfo?.defaultFactory !== undefined;

    fields[key] = {
      name: key,
      fieldInfo,
      schema,
      required: !hasDefault,
      alias: fieldInfo?.alias,
      default: fieldInfo?.default,
      defaultFactory: fieldInfo?.defaultFactory,
    };
  }

  Object.defineProperty(ctor, 'modelFields', { value: fields, writable: true });
  return fields;
}

export function Literal<T extends string | number | boolean>(value: T): { __literal: T } {
  return { __literal: value };
}

export function DiscriminatedUnion<T extends Function>(
  discriminator: string,
  ...models: T[]
): { __discriminatedUnion: { discriminator: string; models: T[] } } {
  return { __discriminatedUnion: { discriminator, models } };
}

export function Union<T extends unknown[]>(...types: T): { __union: T } {
  return { __union: types };
}

export function Nullable<T>(type: T): { __nullable: T } {
  return { __nullable: type };
}

export function Optional<T>(type: T): { __optional: T } {
  return { __optional: type };
}

export function Enum<T extends string>(members: T[]): { __enum: T[] } {
  return { __enum: members };
}

export function ModelRef<T extends Function>(model: T): { __model: T } {
  return { __model: model };
}
```

### 4.10 JSON Schema + TypeAdapter — `packages/typedantic/src/json-schema/generator.ts`

**Correction vs main:** use `RegExp.source` for patterns; include float exclusivity / `multipleOf`.

```typescript
import type { CoreSchema, DumpOptions } from '@typedantic/core';
import { SchemaSerializer, SchemaValidator } from '@typedantic/core';

export function generateJsonSchema(schema: CoreSchema, title?: string): Record<string, unknown> {
  const defs = new Map<string, Record<string, unknown>>();
  const properties = schemaToJsonSchema(schema, title, defs);
  const result: Record<string, unknown> = { ...properties };

  if (defs.size > 0) {
    result.$defs = Object.fromEntries(defs);
  }

  return result;
}

function patternSource(pattern: RegExp | string): string {
  return typeof pattern === 'string' ? pattern : pattern.source;
}

function schemaToJsonSchema(
  schema: CoreSchema,
  title: string | undefined,
  defs: Map<string, Record<string, unknown>>,
): Record<string, unknown> {
  switch (schema.type) {
    case 'str':
      return stripUndefined({
        type: 'string',
        minLength: schema.minLength,
        maxLength: schema.maxLength,
        pattern: schema.pattern ? patternSource(schema.pattern) : undefined,
        title,
      });
    case 'int':
      return stripUndefined({
        type: 'integer',
        minimum: schema.ge,
        exclusiveMinimum: schema.gt,
        maximum: schema.le,
        exclusiveMaximum: schema.lt,
        multipleOf: schema.multipleOf,
        title,
      });
    case 'float':
      return stripUndefined({
        type: 'number',
        minimum: schema.ge,
        exclusiveMinimum: schema.gt,
        maximum: schema.le,
        exclusiveMaximum: schema.lt,
        multipleOf: schema.multipleOf,
        title,
      });
    case 'bool':
      return stripUndefined({ type: 'boolean', title });
    case 'literal':
      return stripUndefined({ const: schema.expected[0], title });
    case 'enum':
      return { type: 'string', enum: [...schema.members], title };
    case 'list':
      return stripUndefined({
        type: 'array',
        items: schemaToJsonSchema(schema.itemsSchema, undefined, defs),
        minItems: schema.minLength,
        maxItems: schema.maxLength,
        title,
      });
    case 'dict':
      return {
        type: 'object',
        additionalProperties: schemaToJsonSchema(schema.valuesSchema, undefined, defs),
        title,
      };
    case 'nullable': {
      const inner = schemaToJsonSchema(schema.schema, undefined, defs);
      return { anyOf: [inner, { type: 'null' }], title };
    }
    case 'optional':
      return schemaToJsonSchema(schema.schema, title, defs);
    case 'default':
    case 'default-factory':
      return schemaToJsonSchema(schema.schema, title, defs);
    case 'date':
      return { type: 'string', format: 'date-time', title };
    case 'union':
      return stripUndefined({
        oneOf: schema.choices.map((c) => schemaToJsonSchema(c, undefined, defs)),
        ...(schema.discriminator
          ? {
              discriminator: {
                propertyName: schema.discriminator,
                mapping: buildDiscriminatorMapping(schema, defs),
              },
            }
          : {}),
        title,
      });
    case 'model-fields': {
      const modelTitle = title ?? schema.modelName ?? 'Model';
      const refName = modelTitle;

      if (!defs.has(refName)) {
        // Placeholder prevents infinite recursion on self-refs
        defs.set(refName, {});
        const properties: Record<string, unknown> = {};
        const required: string[] = [];

        for (const [name, field] of Object.entries(schema.fields)) {
          properties[name] = schemaToJsonSchema(field.schema, name, defs);
          if (field.required) required.push(name);
        }

        defs.set(
          refName,
          stripUndefined({
            type: 'object',
            properties,
            required: required.length > 0 ? required : undefined,
            additionalProperties:
              schema.extra === 'allow' ? true : schema.extra === 'forbid' ? false : undefined,
            title: modelTitle,
          }),
        );
      }

      return { $ref: `#/$defs/${refName}` };
    }
    case 'any':
      return {};
    default:
      return schema.type.startsWith('function') && 'schema' in schema
        ? schemaToJsonSchema((schema as { schema: CoreSchema }).schema, title, defs)
        : {};
  }
}

function buildDiscriminatorMapping(
  schema: Extract<CoreSchema, { type: 'union' }>,
  _defs: Map<string, Record<string, unknown>>,
): Record<string, string> {
  const mapping: Record<string, string> = {};
  if (!schema.discriminator) return mapping;
  for (const choice of schema.choices) {
    if (choice.type === 'model-fields') {
      const discField = choice.fields[schema.discriminator];
      const title = choice.modelName ?? 'Model';
      if (discField?.schema.type === 'literal') {
        mapping[String(discField.schema.expected[0])] = `#/$defs/${title}`;
      } else if (discField?.schema.type === 'default') {
        mapping[String(discField.schema.defaultValue)] = `#/$defs/${title}`;
      }
    }
  }
  return mapping;
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export class TypeAdapter<T = unknown> {
  private readonly validator: SchemaValidator;
  private readonly serializer: SchemaSerializer;

  constructor(private readonly schema: CoreSchema) {
    this.validator = new SchemaValidator(schema);
    this.serializer = new SchemaSerializer(schema);
  }

  validatePython(input: unknown): T {
    return this.validator.validatePython(input) as T;
  }

  validateJson(json: string): T {
    return this.validator.validateJson(json) as T;
  }

  dumpPython(instance: T, options?: DumpOptions): unknown {
    return this.serializer.toPython(instance, options);
  }

  dumpJson(instance: T, options?: DumpOptions): string {
    return this.serializer.toJson(instance, options);
  }

  jsonSchema(): Record<string, unknown> {
    return generateJsonSchema(this.schema);
  }
}
```


### 4.11 BaseModel — `packages/typedantic/src/models/base-model.ts`

Lifecycle of `User.modelValidate(data)`:

```
getOrBuildSchema(User)
    → collectModelFields + buildModelSchema
getOrBuildValidator(User, schema)
    → new SchemaValidator(schema)
validator.validatePython(data)
    → plain object { username, age, ... }
instantiateModel(User, plain)
    → Object.create(User.prototype) + defineProperty per field
    → optionally Object.freeze
```

**Important:** the class constructor is **not** called. Do not put validation logic in `constructor()`.

**Correction vs main:**
- Cache only on **own** properties so subclasses do not reuse parent schemas.
- `modelDumpJson` reuses `modelDump` (computed fields + serializers).

```typescript
import {
  SchemaSerializer,
  SchemaValidator,
  ValidationError,
  type CoreSchema,
  type DumpOptions,
} from '@typedantic/core';
import { getModelConfig } from '../config/model-config.js';
import {
  CORE_SCHEMA_KEY,
  SERIALIZER_KEY,
  VALIDATOR_KEY,
  type ConfigDict,
  type ModelClass,
  type ModelFieldMeta,
} from '../internal/metadata.js';
import { buildModelSchema, collectModelFields } from '../internal/schema-builder.js';
import { generateJsonSchema } from '../json-schema/generator.js';
import { getComputedFields } from '../validators/field-validator.js';
import {
  applyFieldSerializers,
  applyModelSerializers,
} from '../serializers/field-serializer.js';

export class BaseModel {
  static modelConfig: ConfigDict = {};
  static modelFields: Record<string, ModelFieldMeta> = {};

  static modelValidate<T extends typeof BaseModel>(this: T, data: unknown): InstanceType<T> {
    const schema = getOrBuildSchema(this);
    const validator = getOrBuildValidator(this, schema);
    const config = getModelConfig(this);
    const validated = validator.validatePython(data, { strict: config.strict });
    return instantiateModel(this as unknown as ModelClass<T>, validated as Record<string, unknown>);
  }

  static modelValidateJson<T extends typeof BaseModel>(this: T, json: string): InstanceType<T> {
    const schema = getOrBuildSchema(this);
    const validator = getOrBuildValidator(this, schema);
    const validated = validator.validateJson(json);
    return instantiateModel(this as unknown as ModelClass<T>, validated as Record<string, unknown>);
  }

  static modelConstruct<T extends typeof BaseModel>(
    this: T,
    values: Record<string, unknown>,
  ): InstanceType<T> {
    return instantiateModel(this as unknown as ModelClass<T>, values);
  }

  static modelJsonSchema(this: ModelClass): Record<string, unknown> {
    const schema = getOrBuildSchema(this);
    return generateJsonSchema(schema, this.name);
  }

  modelDump(options?: DumpOptions): Record<string, unknown> {
    const ctor = this.constructor as ModelClass;
    const schema = getOrBuildSchema(ctor);
    const serializer = getOrBuildSerializer(ctor, schema);
    let data = serializer.toPython(this, options) as Record<string, unknown>;

    for (const name of getComputedFields(ctor)) {
      const value = (this as Record<string, unknown>)[name];
      if (typeof value === 'function') {
        data[name] = value.call(this);
      } else {
        data[name] = value;
      }
    }

    data = applyFieldSerializers(ctor, data, this);
    data = applyModelSerializers(ctor, data, this);
    return data;
  }

  modelDumpJson(options?: DumpOptions): string {
    // Correction: include computed fields + serializers
    return JSON.stringify(this.modelDump({ ...options, mode: 'json' }));
  }

  modelCopy(update?: Record<string, unknown>): this {
    const ctor = this.constructor as ModelClass<typeof BaseModel>;
    const config = getModelConfig(ctor);
    const data = { ...this.modelDump(), ...update };

    if (config.validateAssignment !== false && update) {
      return ctor.modelValidate(data) as this;
    }

    return instantiateModel(ctor, data) as this;
  }
}

function hasOwn(ctor: object, key: string | symbol): boolean {
  return Object.prototype.hasOwnProperty.call(ctor, key);
}

function getOrBuildSchema(ctor: Function): CoreSchema {
  if (hasOwn(ctor, CORE_SCHEMA_KEY)) {
    return (ctor as ModelClass)[CORE_SCHEMA_KEY]!;
  }
  collectModelFields(ctor);
  const schema = buildModelSchema(ctor);
  Object.defineProperty(ctor, CORE_SCHEMA_KEY, { value: schema });
  return schema;
}

function getOrBuildValidator(ctor: Function, schema: CoreSchema): SchemaValidator {
  if (hasOwn(ctor, VALIDATOR_KEY)) {
    return (ctor as ModelClass)[VALIDATOR_KEY]!;
  }
  const config = getModelConfig(ctor);
  const validator = new SchemaValidator(schema, { strict: config.strict });
  Object.defineProperty(ctor, VALIDATOR_KEY, { value: validator });
  return validator;
}

function getOrBuildSerializer(ctor: Function, schema: CoreSchema): SchemaSerializer {
  if (hasOwn(ctor, SERIALIZER_KEY)) {
    return (ctor as ModelClass)[SERIALIZER_KEY]!;
  }
  const serializer = new SchemaSerializer(schema);
  Object.defineProperty(ctor, SERIALIZER_KEY, { value: serializer });
  return serializer;
}

function instantiateModel<T extends new (...args: unknown[]) => object>(
  ctor: ModelClass<T>,
  data: Record<string, unknown>,
): InstanceType<T> {
  const config = getModelConfig(ctor);
  const instance = Object.create(ctor.prototype) as InstanceType<T>;

  for (const [key, value] of Object.entries(data)) {
    Object.defineProperty(instance, key, {
      value,
      writable: !config.frozen,
      enumerable: true,
      configurable: !config.frozen,
    });
  }

  if (config.frozen) {
    Object.freeze(instance);
  }

  return instance;
}

export { ValidationError };
```

### 4.12 RootModel — `packages/typedantic/src/models/root-model.ts`

```typescript
import { BaseModel } from './base-model.js';
import { TypeAdapter } from '../json-schema/generator.js';
import { inferSchemaFromType } from '../internal/schema-builder.js';

export class RootModel<T = unknown> extends BaseModel {
  root!: T;

  getRoot(): T {
    return this.root;
  }

  override modelDump(): Record<string, unknown> {
    return this.root as Record<string, unknown>;
  }
}

export function RootModelOf<T>(type: unknown): typeof RootModel<T> {
  class TypedRootModel extends RootModel<T> {
    declare root: T;

    static rootValidate(data: unknown): InstanceType<typeof TypedRootModel> {
      const schema = inferSchemaFromType(type);
      const adapter = new TypeAdapter(schema);
      const validated = adapter.validatePython(data);
      return TypedRootModel.modelConstruct({ root: validated }) as InstanceType<
        typeof TypedRootModel
      >;
    }
  }
  return TypedRootModel;
}
```

Example:

```typescript
const IntList = RootModelOf([Number]);
const values = IntList.rootValidate([1, 2, 3]);
values.getRoot(); // [1, 2, 3]
```

### 4.13 `createModel` — `packages/typedantic/src/models/create-model.ts`

```typescript
import { BaseModel } from './base-model.js';
import { Field } from '../fields/field.js';
import type { FieldInfo } from '../internal/metadata.js';
import { registerModelField } from '../internal/field-registry.js';

export type FieldDefinitions = Record<string, FieldInfo | unknown>;

export function createModel(
  modelName: string,
  fields: FieldDefinitions,
  base: typeof BaseModel = BaseModel,
): typeof BaseModel {
  class DynamicModel extends base {}

  Object.defineProperty(DynamicModel, 'name', { value: modelName });

  for (const [name, def] of Object.entries(fields)) {
    if (
      def &&
      typeof def === 'object' &&
      ('default' in def ||
        'defaultFactory' in def ||
        'alias' in def ||
        'minLength' in def ||
        'ge' in def ||
        'type' in def)
    ) {
      registerModelField(DynamicModel, name, def as FieldInfo);
    } else {
      registerModelField(DynamicModel, name, { default: def });
    }
    Object.defineProperty(DynamicModel.prototype, name, {
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }

  return DynamicModel;
}

export { Field };
```

### 4.14 Public barrel — `packages/typedantic/src/index.ts`

```typescript
import { BaseModel } from './models/base-model.js';
import { Field, isFieldInfo, type Annotated } from './fields/field.js';
import { modelConfig, getModelConfig } from './config/model-config.js';
import { fieldValidator, modelValidator, computedField } from './validators/field-validator.js';
import { fieldSerializer, modelSerializer } from './serializers/field-serializer.js';
import { EmailStr, HttpUrl, UUID, SecretStr, isSpecialType } from './types/special.js';
import { RootModel, RootModelOf } from './models/root-model.js';
import { createModel } from './models/create-model.js';
import { TypeAdapter, generateJsonSchema } from './json-schema/generator.js';
import { ValidationError } from '@typedantic/core';
import {
  Literal,
  Union,
  Nullable,
  Optional,
  Enum,
  ModelRef,
  DiscriminatedUnion,
  buildModelSchema,
  collectModelFields,
  inferSchemaFromType,
} from './internal/schema-builder.js';

export {
  BaseModel,
  Field,
  isFieldInfo,
  modelConfig,
  getModelConfig,
  fieldValidator,
  modelValidator,
  computedField,
  fieldSerializer,
  modelSerializer,
  TypeAdapter,
  generateJsonSchema,
  ValidationError,
  EmailStr,
  HttpUrl,
  UUID,
  SecretStr,
  isSpecialType,
  RootModel,
  RootModelOf,
  createModel,
  Literal,
  Union,
  DiscriminatedUnion,
  Nullable,
  Optional,
  Enum,
  ModelRef,
  buildModelSchema,
  collectModelFields,
  inferSchemaFromType,
};

export type { Annotated };
export type { FieldInfo, ConfigDict } from './internal/metadata.js';
export type { CoreSchema, ValidationErrorDetail, DumpOptions, ValidateOptions } from '@typedantic/core';
export { SchemaValidator, SchemaSerializer, validate } from '@typedantic/core';
```

### 4.15 Phase B tests

#### `packages/typedantic/src/models/base-model.test.ts`

```typescript
import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { BaseModel, Field, fieldValidator, modelConfig, ValidationError } from '../index.js';

@modelConfig({ extra: 'forbid' })
class UserCreate extends BaseModel {
  @Field({ type: String, minLength: 3, maxLength: 50 })
  username!: string;

  @Field({ type: String, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })
  email!: string;

  @Field({ type: Number, ge: 0, le: 150 })
  age!: number;

  // Prefer defaultFactory so each instance gets its own array
  @Field({ type: [String], defaultFactory: () => [] })
  tags!: string[];

  @fieldValidator('username', { mode: 'before' })
  static normalizeUsername(v: unknown): unknown {
    return typeof v === 'string' ? v.trim().toLowerCase() : v;
  }
}

describe('BaseModel', () => {
  it('validates and creates instance', () => {
    const user = UserCreate.modelValidate({
      username: ' Alice ',
      email: 'alice@example.com',
      age: 25,
    });
    expect(user.username).toBe('alice');
    expect(user.age).toBe(25);
    expect(user.tags).toEqual([]);
  });

  it('throws ValidationError on invalid data', () => {
    expect(() =>
      UserCreate.modelValidate({
        username: 'ab',
        email: 'invalid',
        age: -1,
      }),
    ).toThrow(ValidationError);
  });

  it('modelDump serializes instance', () => {
    const user = UserCreate.modelValidate({
      username: 'bob',
      email: 'bob@example.com',
      age: 30,
    });
    expect(user.modelDump()).toEqual({
      username: 'bob',
      email: 'bob@example.com',
      age: 30,
      tags: [],
    });
  });

  it('modelJsonSchema generates schema', () => {
    const schema = UserCreate.modelJsonSchema();
    expect(schema.$defs ?? schema).toBeDefined();
    const defs = schema.$defs as Record<string, unknown> | undefined;
    const model = defs?.UserCreate ?? schema;
    expect(model).toHaveProperty('type', 'object');
    expect(model).toHaveProperty('properties');
  });

  it('modelCopy creates updated copy', () => {
    const user = UserCreate.modelValidate({
      username: 'carol',
      email: 'carol@example.com',
      age: 28,
    });
    const copy = user.modelCopy({ age: 29 });
    expect(copy.age).toBe(29);
    expect(copy.username).toBe('carol');
  });
});
```

#### `packages/typedantic/src/discriminated-union.test.ts`

Prefer **literal** discriminator fields so unknown tags are rejected:

```typescript
import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import {
  BaseModel,
  Field,
  Literal,
  DiscriminatedUnion,
  TypeAdapter,
  inferSchemaFromType,
  generateJsonSchema,
  ValidationError,
} from './index.js';

class Cat extends BaseModel {
  @Field({ type: Literal('cat') })
  petType!: 'cat';

  @Field({ type: Boolean })
  meows!: boolean;
}

class Dog extends BaseModel {
  @Field({ type: Literal('dog') })
  petType!: 'dog';

  @Field({ type: Boolean })
  barks!: boolean;
}

const PetSchema = DiscriminatedUnion('petType', Cat, Dog);

describe('DiscriminatedUnion', () => {
  it('validates cat by discriminator', () => {
    const adapter = new TypeAdapter(inferSchemaFromType(PetSchema));
    const result = adapter.validatePython({ petType: 'cat', meows: true });
    expect(result).toMatchObject({ petType: 'cat', meows: true });
  });

  it('validates dog by discriminator', () => {
    const adapter = new TypeAdapter(inferSchemaFromType(PetSchema));
    const result = adapter.validatePython({ petType: 'dog', barks: false });
    expect(result).toMatchObject({ petType: 'dog', barks: false });
  });

  it('rejects unknown discriminator tags', () => {
    const adapter = new TypeAdapter(inferSchemaFromType(PetSchema));
    expect(() => adapter.validatePython({ petType: 'bird', meows: true })).toThrow(
      ValidationError,
    );
  });

  it('generates JSON schema with discriminator', () => {
    const schema = generateJsonSchema(inferSchemaFromType(PetSchema));
    expect(schema.oneOf ?? schema.discriminator).toBeDefined();
  });
});
```

#### `packages/typedantic/src/features.test.ts`

```typescript
import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { BaseModel, Field, computedField, EmailStr, createModel } from './index.js';

class User extends BaseModel {
  @Field({ type: String, minLength: 1 })
  firstName!: string;

  @Field({ type: String, minLength: 1 })
  lastName!: string;

  @computedField()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

class Contact extends BaseModel {
  @Field({ type: EmailStr() })
  email!: string;
}

describe('Extended features', () => {
  it('includes computed fields in modelDump and modelDumpJson', () => {
    const user = User.modelValidate({ firstName: 'Ada', lastName: 'Lovelace' });
    expect(user.modelDump()).toMatchObject({ fullName: 'Ada Lovelace' });
    expect(JSON.parse(user.modelDumpJson())).toMatchObject({ fullName: 'Ada Lovelace' });
  });

  it('validates EmailStr', () => {
    const c = Contact.modelValidate({ email: 'ada@example.com' });
    expect(c.email).toBe('ada@example.com');
    expect(() => Contact.modelValidate({ email: 'nope' })).toThrow();
  });

  it('createModel builds dynamic models', () => {
    const Point = createModel('Point', {
      x: { type: Number, ge: 0, default: 0 },
      y: { type: Number, ge: 0, default: 0 },
    });
    const p = Point.modelValidate({ x: 1, y: 2 });
    expect(p.modelDump()).toEqual({ x: 1, y: 2 });
  });
});
```

**Checkpoint — typedantic**

```bash
bun run build
bunx vitest run packages/typedantic
bun run typecheck
```

```bash
# pnpm
pnpm build && pnpm exec vitest run packages/typedantic && pnpm typecheck

# npm
npm run build && npx vitest run packages/typedantic && npm run typecheck
```

---

## 5. Phase C — `typedantic-settings`

### Precedence (highest → lowest)

1. Explicit `env` argument to `settingsValidate(env)`
2. `process.env` (when using the default argument)
3. Values from `.env` file (if enabled)
4. Field defaults / default factories

### Alias + prefix rules (corrected)

For a field `appName` with `alias: 'NAME'` and `envPrefix: 'APP_'`:

| Lookup key tried | Example |
|------------------|---------|
| Prefixed alias | `APP_NAME` |
| Prefixed field name | `APP_APPNAME` / nested path |
| Flat nested path after stripping prefix | see `flattenEnv` |

Direct unprefixed alias lookup is **not** used when a prefix is configured (this differs from buggy `main` behavior that ignored the prefix for aliases).

### Nested delimiter

With `envNestedDelimiter: '__'` and prefix `APP_`, for a nested model field `db`:

```
APP_DB__HOST=localhost
APP_DB__PORT=5432
→ settingsValidate() receives { db: { host: 'localhost', port: 5432 } }
```

Declare the nested model with `@Field({ type: DbSettings }) db!: DbSettings`.

### 5.1 Implementation — `packages/typedantic-settings/src/index.ts`

```typescript
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { BaseModel, Field, modelConfig, collectModelFields } from 'typedantic';
import type { ConfigDict } from 'typedantic';

export interface SettingsConfigDict extends ConfigDict {
  envPrefix?: string;
  envFile?: string | false;
  envNestedDelimiter?: string;
  caseSensitive?: boolean;
}

export function settingsConfig(config: SettingsConfigDict): ClassDecorator {
  return modelConfig(config);
}

/** Minimal KEY=value parser. No export, interpolation, or multiline support. */
function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const content = readFileSync(path, 'utf8');
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function flattenEnv(
  env: Record<string, string | undefined>,
  prefix: string,
  delimiter: string,
  caseSensitive: boolean,
): Record<string, string> {
  const result: Record<string, string> = {};
  const comparePrefix = caseSensitive ? prefix : prefix.toUpperCase();

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) continue;
    const compareKey = caseSensitive ? key : key.toUpperCase();
    if (prefix && !compareKey.startsWith(comparePrefix)) continue;

    const stripped = prefix ? key.slice(prefix.length) : key;
    const parts = stripped.split(delimiter).map((p) => (caseSensitive ? p : p.toLowerCase()));
    result[parts.join(delimiter)] = value;
  }
  return result;
}

/** Rebuild `{ a__b: 'x' }` into `{ a: { b: 'x' } }` when delimiter is `__`. */
function nestFlat(
  flat: Record<string, string>,
  delimiter: string,
): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [path, raw] of Object.entries(flat)) {
    const parts = path.split(delimiter).filter(Boolean);
    if (parts.length === 0) continue;
    let cursor: Record<string, unknown> = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (typeof cursor[part] !== 'object' || cursor[part] === null) {
        cursor[part] = {};
      }
      cursor = cursor[part] as Record<string, unknown>;
    }
    cursor[parts[parts.length - 1]] = coerceEnvValue(raw);
  }
  return root;
}

function coerceEnvValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  if (
    (value.startsWith('[') && value.endsWith(']')) ||
    (value.startsWith('{') && value.endsWith('}'))
  ) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function readPrefixed(
  merged: Record<string, string | undefined>,
  prefix: string,
  key: string,
  caseSensitive: boolean,
): string | undefined {
  const full = `${prefix}${key}`;
  if (caseSensitive) return merged[full];
  const upper = full.toUpperCase();
  for (const [k, v] of Object.entries(merged)) {
    if (k.toUpperCase() === upper) return v;
  }
  return undefined;
}

export abstract class BaseSettings extends BaseModel {
  static modelConfig: SettingsConfigDict = {
    extra: 'ignore',
    populateByName: true,
  };

  /**
   * Polymorphic return type — AppSettings.settingsValidate() is AppSettings.
   * Correction vs main's `InstanceType<typeof BaseSettings>` which erased subclasses.
   */
  static settingsValidate<T extends typeof BaseSettings>(
    this: T,
    env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
  ): InstanceType<T> {
    const config = (this as { modelConfig?: SettingsConfigDict }).modelConfig ?? {};
    const envPrefix = config.envPrefix ?? '';
    const delimiter = config.envNestedDelimiter ?? '__';
    const caseSensitive = config.caseSensitive ?? false;
    const envFile = config.envFile !== false ? (config.envFile ?? '.env') : null;

    // File first, then env argument wins
    let merged: Record<string, string | undefined> = {};
    if (envFile) {
      merged = { ...loadEnvFile(resolve(process.cwd(), envFile)) };
    }
    merged = { ...merged, ...env };

    const flat = flattenEnv(merged, envPrefix, delimiter, caseSensitive);
    const nested = nestFlat(flat, delimiter);

    collectModelFields(this);
    const fields =
      (
        this as {
          modelFields?: Record<
            string,
            { name: string; alias?: string; fieldInfo?: { alias?: string } }
          >;
        }
      ).modelFields ?? {};

    const data: Record<string, unknown> = { ...nested };

    for (const [name, meta] of Object.entries(fields)) {
      if (name in data) continue;

      const alias = meta.fieldInfo?.alias ?? meta.alias;
      let raw: string | undefined;

      if (alias) {
        // With prefix: require prefixed alias (APP_ + NAME)
        raw = readPrefixed(merged, envPrefix, alias, caseSensitive);
        // If alias already includes the prefix, also try exact match
        if (raw === undefined) {
          raw = caseSensitive
            ? merged[alias]
            : Object.entries(merged).find(([k]) => k.toUpperCase() === alias.toUpperCase())?.[1];
        }
      }

      if (raw === undefined) {
        raw = readPrefixed(merged, envPrefix, name, caseSensitive);
      }

      if (raw !== undefined) {
        data[name] = coerceEnvValue(raw);
      }
    }

    return (this as unknown as typeof BaseModel).modelValidate(data) as InstanceType<T>;
  }
}

export { Field, modelConfig };
```

### 5.2 Settings tests — `packages/typedantic-settings/src/index.test.ts`

```typescript
import 'reflect-metadata';
import { describe, it, expect, afterEach } from 'vitest';
import { BaseModel } from 'typedantic';
import { BaseSettings, Field, settingsConfig } from './index.js';

@settingsConfig({ envPrefix: 'APP_' })
class AppSettings extends BaseSettings {
  @Field({ type: String, alias: 'NAME' })
  appName!: string;

  @Field({ type: Boolean, alias: 'DEBUG' })
  debug!: boolean;

  @Field({ type: Number, alias: 'PORT' })
  port!: number;
}

class DbSettings extends BaseModel {
  @Field({ type: String })
  host!: string;

  @Field({ type: Number, default: 5432 })
  port!: number;
}

@settingsConfig({ envPrefix: 'APP_', envNestedDelimiter: '__' })
class NestedSettings extends BaseSettings {
  @Field({ type: DbSettings })
  db!: DbSettings;
}

describe('BaseSettings', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('loads settings from prefixed environment variables', () => {
    process.env.APP_NAME = 'MyApp';
    process.env.APP_DEBUG = 'true';
    process.env.APP_PORT = '8080';

    const settings = AppSettings.settingsValidate();
    expect(settings.appName).toBe('MyApp');
    expect(settings.debug).toBe(true);
    expect(settings.port).toBe(8080);
  });

  it('does not accept unprefixed aliases when prefix is set', () => {
    delete process.env.APP_NAME;
    delete process.env.APP_DEBUG;
    delete process.env.APP_PORT;
    process.env.NAME = 'Nope';
    process.env.DEBUG = 'true';
    process.env.PORT = '9';

    expect(() => AppSettings.settingsValidate()).toThrow();
  });

  it('rebuilds nested objects from delimiter paths', () => {
    // APP_DB__HOST → strip APP_ → db__host → { db: { host: 'localhost' } }
    process.env.APP_DB__HOST = 'localhost';
    process.env.APP_DB__PORT = '5432';
    const settings = NestedSettings.settingsValidate();
    expect(settings.db.host).toBe('localhost');
    expect(settings.db.port).toBe(5432);
  });
});
```

**Checkpoint — settings**

```bash
bun run build
bunx vitest run packages/typedantic-settings
```

---

## 6. Phase D — Advanced features (quick recipes)

### Discriminated unions with literals

```typescript
class Cat extends BaseModel {
  @Field({ type: Literal('cat') })
  petType!: 'cat';
  @Field({ type: Boolean })
  meows!: boolean;
}

class Dog extends BaseModel {
  @Field({ type: Literal('dog') })
  petType!: 'dog';
  @Field({ type: Boolean })
  barks!: boolean;
}

const Pet = DiscriminatedUnion('petType', Cat, Dog);
const adapter = new TypeAdapter(inferSchemaFromType(Pet));
```

### Field serializers

```typescript
class User extends BaseModel {
  @Field({ type: String })
  email!: string;

  @fieldSerializer('email')
  static maskEmail(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    const [user, domain] = value.split('@');
    return `${user[0]}***@${domain}`;
  }
}
```

### Frozen models

```typescript
@modelConfig({ frozen: true })
class Token extends BaseModel {
  @Field({ type: String })
  value!: string;
}
```

---

## 7. Testing strategy & CI

### Local full suite

Always **build before test** when importing workspace packages by name (`typedantic` → `dist`).

```bash
bun run build
bun run test
bun run typecheck
```

```bash
# pnpm
pnpm build && pnpm test && pnpm typecheck

# npm
npm run build && npm test && npm run typecheck
```

| Suite | File | What it proves |
|-------|------|----------------|
| Errors | `validation-error.test.ts` | FastAPI 422 shape |
| Core engine | `schema-validator.test.ts` | IR + compiler |
| BaseModel | `base-model.test.ts` | Decorators + validators |
| Unions | `discriminated-union.test.ts` | Discriminator routing |
| Features | `features.test.ts` | computedField, EmailStr, createModel |
| Settings | `index.test.ts` | env prefix + coercion |

### Complete CI — `.github/workflows/ci.yml`

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
          bun-version: latest

      - name: Install
        run: bun install --frozen-lockfile

      - name: Build
        run: bun run build

      - name: Typecheck
        run: bun run typecheck

      - name: Test
        run: bun run test
```

After the first successful `bun install`, commit `bun.lock` so `--frozen-lockfile` works.

**pnpm alternative job fragment**

```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 9
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm
- run: pnpm install --frozen-lockfile
- run: pnpm build
- run: pnpm typecheck
- run: pnpm test
```

**npm alternative**

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm
- run: npm ci
- run: npm run build
- run: npm run typecheck
- run: npm test
```

### Clean-clone verification

```bash
git clone <your-repo-url> typedantic-verify
cd typedantic-verify
bun install --frozen-lockfile
bun run build
bun run typecheck
bun run test
```

### Consumer smoke test

```bash
mkdir /tmp/typedantic-smoke && cd /tmp/typedantic-smoke
bun init -y
bun add /absolute/path/to/typedantic/packages/typedantic
```

```typescript
import 'reflect-metadata';
import { BaseModel, Field } from 'typedantic';

class Ping extends BaseModel {
  @Field({ type: String, minLength: 1 })
  message!: string;
}

console.log(Ping.modelValidate({ message: 'pong' }).modelDump());
```

---

## 8. Publishing

Order matters because of workspace dependencies:

1. `@typedantic/core`
2. `typedantic`
3. `typedantic-settings`

```bash
bun run build && bun run test

bun publish --access public --cwd packages/typedantic-core
bun publish --access public --cwd packages/typedantic
bun publish --access public --cwd packages/typedantic-settings
```

```bash
# pnpm
pnpm -r run build && pnpm test
pnpm --dir packages/typedantic-core publish --access public
pnpm --dir packages/typedantic publish --access public
pnpm --dir packages/typedantic-settings publish --access public

# npm
npm run build --workspaces && npm test
npm publish --access public -C packages/typedantic-core
npm publish --access public -C packages/typedantic
npm publish --access public -C packages/typedantic-settings
```

Dry-run first:

```bash
npm pack --dry-run -C packages/typedantic-core
npm pack --dry-run -C packages/typedantic
```

Confirm each tarball contains `dist/index.js` and `dist/index.d.ts`.

### Consumer TypeScript requirements

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false
  }
}
```

Always import metadata once at the app entry:

```typescript
import 'reflect-metadata';
```

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Cannot find module '@typedantic/core'` | Package not built | `bun run build` |
| Fields missing / all `any` | No `@Field()` or missing `design:type` | Add `@Field({ type: String })` etc. |
| `@fieldValidator` never runs | Metadata on wrong target | Store/read on constructor (`ctorOf`) |
| Subclass validates as parent | Inherited schema cache | Use `hasOwn` before reading cache symbols |
| `tags` shared across instances | `default: []` | Use `defaultFactory: () => []` |
| Settings ignore `APP_` prefix | Alias lookup without prefix | Use corrected `readPrefixed` |
| Pattern in JSON Schema is `"/^a$/"` | Used `String(regexp)` | Use `regexp.source` |
| Unknown `petType` accepted | Discriminator used `default: 'cat'` + union fallback | Use `Literal('cat')` + strict discriminator |
| CI `--frozen-lockfile` fails | Lockfile not committed | Commit `bun.lock` / `pnpm-lock.yaml` |
| Settings typecheck cannot resolve `typedantic` | Paths point at missing `dist` | Build `typedantic` first |

---

## 10. Architecture reference

### Runtime flow

```
User code: User.modelValidate(input)
        │
        ▼
typedantic: buildModelSchema(User) → CoreSchema
        │
        ▼
@typedantic/core: compileValidator(schema) → ValidatorFn
        │
        ▼
validatePython → plain object | ValidationError
        │
        ▼
instantiateModel → User instance (constructor NOT called)
        │
        ▼
modelDump / modelDumpJson → serializers + computed fields
```

### Build dependency flow

```
@typedantic/core build
        │
        ▼
typedantic build  (imports @typedantic/core)
        │
        ▼
typedantic-settings build / typecheck  (imports typedantic + dist .d.ts)
```

---

## 11. Acceptance checklist

Use this only after each item has a **passing test** or command:

- [ ] Root workspace installs with Bun (and optionally pnpm/npm)
- [ ] `packages/typedantic-core/src/schema/types.ts` defines every `CoreSchema` node used by the compiler
- [ ] `ValidationError.json()` returns `{ detail: [...] }` (test in `validation-error.test.ts`)
- [ ] Compiler coerces ints/bools/strings; enforces float `multipleOf`; validates dict `keysSchema`
- [ ] Discriminated unions reject unknown tags
- [ ] `SchemaValidator` + `SchemaSerializer` exported from `@typedantic/core`
- [ ] `@Field` registers fields; explicit `type` works under Vitest
- [ ] `@fieldValidator` on static methods transforms values (username trim/lowercase test)
- [ ] `BaseModel.modelValidate` / `modelDump` / `modelDumpJson` / `modelCopy` / `modelJsonSchema` work
- [ ] Computed fields appear in **both** `modelDump` and `modelDumpJson`
- [ ] Field + model serializers apply on dump
- [ ] JSON Schema patterns use regex `.source`
- [ ] `DiscriminatedUnion` + `TypeAdapter` tests pass
- [ ] `EmailStr` / `createModel` / `RootModelOf` work
- [ ] `BaseSettings.settingsValidate()` returns subclass type and respects `envPrefix`
- [ ] Nested env delimiter rebuilds objects
- [ ] `.github/workflows/ci.yml` is a complete workflow
- [ ] Clean clone: install → build → typecheck → test all green
- [ ] Consumer smoke import from published/packed `typedantic` succeeds

---

## Appendix A — Command cheat sheet

| Task | Bun | pnpm | npm |
|------|-----|------|-----|
| Install | `bun install` | `pnpm install` | `npm install` |
| Build all | `bun run build` | `pnpm build` | `npm run build` |
| Test | `bun run test` | `pnpm test` | `npm test` |
| Typecheck | `bun run typecheck` | `pnpm typecheck` | `npm run typecheck` |
| Filter build | `bun run --filter @typedantic/core build` | `pnpm --filter @typedantic/core build` | `npm run build -w @typedantic/core` |

## Appendix B — Minimal first model (sanity check)

After Phase B builds:

```typescript
import 'reflect-metadata';
import { BaseModel, Field, modelConfig } from 'typedantic';

@modelConfig({ extra: 'forbid' })
class User extends BaseModel {
  @Field({ type: String, minLength: 3 })
  username!: string;

  @Field({ type: Number, ge: 0, le: 150 })
  age!: number;
}

const user = User.modelValidate({ username: 'ada', age: 36 });
console.log(user.modelDump());
console.log(User.modelJsonSchema());
```

If that prints a dump and a JSON Schema object, your rebuild is on track.
