# Typedantic — Complete Rebuild Tutorial

This guide walks you through rebuilding **Typedantic** from scratch without assistance. Follow the steps in order; each phase builds on the previous one.

**Goal:** A Pydantic-like TypeScript library with class-based models, validators, JSON Schema, settings, and a compiled validation engine.

**Repos:** `/Users/delalifunani/Github/typedantic`

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Monorepo scaffolding](#2-monorepo-scaffolding)
3. [Phase A — `@typedantic/core` validation engine](#3-phase-a--typedanticcore-validation-engine)
4. [Phase B — `typedantic` public API](#4-phase-b--typedantic-public-api)
5. [Phase C — `typedantic-settings`](#5-phase-c--typedantic-settings)
6. [Phase D — Advanced features](#6-phase-d--advanced-features)
7. [Testing strategy](#7-testing-strategy)
8. [Publishing](#8-publishing)
9. [Architecture reference](#9-architecture-reference)

---

## 1. Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| Bun | 1.2+ |
| TypeScript | 5.7+ |

Install Bun:

```bash
curl -fsSL https://bun.sh/install | bash
```

You can alternatively use pnpm 9+ (`corepack enable`) or npm 10+, which
ships with Node.js 20.

Create workspace root:

```bash
mkdir typedantic && cd typedantic
```

---

## 2. Monorepo scaffolding

### 2.1 Root files

**`package.json`**

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
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "tsup": "^8.3.5",
    "turbo": "^2.3.3",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

The `workspaces` field is used by Bun and npm. If you use pnpm, also add
**`pnpm-workspace.yaml`**:

```yaml
packages:
  - 'packages/*'
```

**`turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

**`tsconfig.base.json`** — critical compiler flags for decorators:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false,
    "declaration": true,
    "skipLibCheck": true
  }
}
```

**`vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts'],
  },
});
```

Install the workspace dependencies:

```bash
bun install
```

Alternatively, run `pnpm install` or `npm install`.

### 2.2 Package layout

```
typedantic/
├── packages/
│   ├── typedantic-core/     # Validation IR + compiler
│   ├── typedantic/          # BaseModel, Field, public API
│   └── typedantic-settings/ # BaseSettings, env loading
├── DESIGN.md
├── IMPLEMENTATION.md
├── README.md
└── tutorial.md              # this file
```

Each package gets:

```json
{
  "type": "module",
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## 3. Phase A — `@typedantic/core` validation engine

### 3.1 CoreSchema IR

Create `packages/typedantic-core/src/schema/types.ts`.

Define a **discriminated union** of schema nodes (the internal representation):

| Node type | Purpose |
|-----------|---------|
| `int`, `float`, `str`, `bool` | Primitives |
| `literal`, `enum` | Fixed values |
| `list`, `dict` | Collections |
| `union`, `nullable`, `optional` | Composition |
| `default`, `default-factory` | Defaults |
| `model-fields` | Object with named fields |
| `function-before/after/wrap/plain` | Validator wrappers |
| `date`, `any`, `never` | Misc |

Each model field stores: `schema`, `required`, `alias`, `default`, `defaultFactory`.

**Why IR?** Decouple parsing from TypeScript classes. The public API compiles models → CoreSchema once; validation runs against the tree.

### 3.2 Compiler

Create `packages/typedantic-core/src/compiler/compile.ts`.

Implement `compileValidator(schema: CoreSchema): ValidatorFn` — a recursive switch that returns `(input, ctx) => validatedValue`.

Key behaviors:

- **Coercion** (non-strict): `"25"` → `25` for int; `"true"` → `true` for bool
- **Constraints**: `ge`, `gt`, `le`, `lt`, `minLength`, `pattern` on str
- **Model fields**: resolve aliases, apply `extra: ignore|allow|forbid`
- **Union**: try each choice; discriminated unions match discriminator first
- **Wrappers**: `function-before` runs transform before inner validation

### 3.3 SchemaValidator

Create `packages/typedantic-core/src/validator/schema-validator.ts`:

```typescript
export class SchemaValidator {
  constructor(schema: CoreSchema, config?: ValidationConfig) {}
  validatePython(data: unknown): unknown { /* run compiled fn, throw ValidationError */ }
  validateJson(json: string): unknown { /* JSON.parse + validatePython */ }
}
```

### 3.4 ValidationError

Create `packages/typedantic-core/src/errors/validation-error.ts`:

- `errors: ValidationErrorDetail[]` with `loc`, `msg`, `type`, `input`
- `errorCount()`, `json()` for FastAPI-compatible 422 responses

### 3.5 SchemaSerializer

Create `packages/typedantic-core/src/serializer/schema-serializer.ts`:

- `toPython(instance, options)` — dump with `excludeUnset`, `byAlias`, etc.
- `toJson(instance, options)`

### 3.6 Export from index

```typescript
export { compileValidator } from './compiler/compile.js';
export { SchemaValidator, validate } from './validator/schema-validator.js';
export { SchemaSerializer } from './serializer/schema-serializer.js';
export { ValidationError } from './errors/validation-error.js';
export type { CoreSchema, ValidationErrorDetail, DumpOptions } from './schema/types.js';
```

### 3.7 First tests

`packages/typedantic-core/src/validator/schema-validator.test.ts`:

- int coercion and bounds
- str minLength / pattern
- list of int
- union validation
- model with extra forbid

Run with Bun:

```bash
bunx vitest run packages/typedantic-core
```

Alternatively, run `pnpm exec vitest run packages/typedantic-core` or
`npx vitest run packages/typedantic-core`.

---

## 4. Phase B — `typedantic` public API

### 4.1 Metadata & reflect

Create `packages/typedantic/src/internal/reflect.ts` — thin wrapper over `reflect-metadata`.

Create `packages/typedantic/src/internal/metadata.ts`:

- `FieldInfo`, `ConfigDict`, `ModelFieldMeta`
- Symbols: `CORE_SCHEMA_KEY`, `VALIDATOR_KEY`, `SERIALIZER_KEY`

**Always** `import 'reflect-metadata'` at app entry.

### 4.2 Field decorator

Create `packages/typedantic/src/fields/field.ts`:

```typescript
export function Field<T>(options: FieldInfo<T> = {}): FieldInfoImpl<T> & FieldDecorator {
  const decorator = (target, propertyKey) => {
    const designType = getMetadata('design:type', target, propertyKey);
    registerModelField(target.constructor, String(propertyKey), {
      ...options,
      type: options.type ?? (designType !== Object ? designType : undefined),
    });
  };
  return Object.assign(decorator, new FieldInfoImpl(options));
}
```

**Important:** Vitest/esbuild often **does not emit** `design:type`. Use explicit types:

```typescript
@Field({ type: Boolean })
flag!: boolean;

@Field({ ge: 0 })  // infers number from constraints
age!: number;
```

### 4.3 Field registry & schema builder

`internal/field-registry.ts` — stores fields registered by `@Field()`.

`internal/schema-builder.ts`:

- `collectModelFields(ctor)` — finalize fields, infer schemas
- `buildModelSchema(ctor)` — attach field/model validators
- `inferSchemaFromType(type, fieldInfo?)` — map TS types → CoreSchema
- Helpers: `Literal()`, `Union()`, `DiscriminatedUnion()`, `Enum()`, `Nullable()`

### 4.4 Validators

`validators/field-validator.ts`:

```typescript
@fieldValidator('username', { mode: 'before' })
static normalize(v: unknown) { ... }

@modelValidator({ mode: 'after' })
validateModel() { ... }

@computedField()
get fullName() { return `${this.first} ${this.last}`; }
```

Wire validators in `buildModelSchema` by wrapping field schemas with `function-before/after/wrap`.

### 4.5 BaseModel

`models/base-model.ts`:

| Method | Behavior |
|--------|----------|
| `modelValidate(data)` | Validate + instantiate |
| `modelValidateJson(json)` | Parse JSON + validate |
| `modelConstruct(values)` | Skip validation |
| `modelDump(options?)` | Serialize + computed fields |
| `modelDumpJson(options?)` | JSON string |
| `modelCopy(update?)` | Immutable update |
| `modelJsonSchema()` | JSON Schema Draft |

Cache compiled schema/validator/serializer on the class via symbols.

### 4.6 JSON Schema generator

`json-schema/generator.ts`:

- Walk CoreSchema → OpenAPI/JSON Schema objects
- `$defs` + `$ref` for nested models
- Discriminator → `oneOf` + `discriminator.propertyName`

`TypeAdapter` — validate/dump/jsonSchema for arbitrary schemas without a class.

### 4.7 Public exports

`src/index.ts` exports BaseModel, Field, validators, TypeAdapter, DiscriminatedUnion, special types, RootModel, createModel, serializers.

### 4.8 Tests

- `models/base-model.test.ts` — CRUD validation, dump, copy
- `discriminated-union.test.ts` — cat/dog union
- `features.test.ts` — computed fields, createModel, email pattern

---

## 5. Phase C — `typedantic-settings`

Create `packages/typedantic-settings/src/index.ts`:

```typescript
export abstract class BaseSettings extends BaseModel {
  static settingsValidate(env = process.env): InstanceType<typeof BaseSettings> {
    // 1. Load .env file (optional)
    // 2. Filter by envPrefix
    // 3. flattenEnv with nested delimiter (__)
    // 4. coerceEnvValue ('true' → true, '8080' → number)
    // 5. BaseSettings.modelValidate(data)
  }
}
```

Config via `@settingsConfig({ envPrefix: 'APP_', caseSensitive: false })`.

Add `paths` in tsconfig pointing to built `typedantic` for DTS generation.

---

## 6. Phase D — Advanced features

### 6.1 Special types (`types/special.ts`)

| Helper | Validation |
|--------|------------|
| `EmailStr()` | Email regex |
| `HttpUrl()` | Valid http/https URL |
| `UUID()` | UUID v4 pattern |
| `SecretStr()` | Any string; mask on dump (future) |

Wire in `buildBaseSchema` when `isSpecialType(type)`.

### 6.2 RootModel (`models/root-model.ts`)

Wrap a single value:

```typescript
const IntRoot = RootModelOf(Number);
const v = IntRoot.rootValidate(42);
```

### 6.3 createModel (`models/create-model.ts`)

Runtime model factory:

```typescript
const Point = createModel('Point', {
  x: { ge: 0, default: 0 },
  y: { ge: 0, default: 0 },
});
```

### 6.4 Serializers (`serializers/field-serializer.ts`)

```typescript
@fieldSerializer('password')
static hash(v: string) { return '***'; }
```

Applied in `modelDump` via `applyFieldSerializers`.

### 6.5 Discriminated unions

```typescript
const Pet = DiscriminatedUnion('petType', Cat, Dog);
const adapter = new TypeAdapter(inferSchemaFromType(Pet));
adapter.validatePython({ petType: 'cat', meows: true });
```

Compiler tries discriminator value first, then validates matching model schema.

---

## 7. Testing strategy

```bash
bun run build    # must succeed before tests
bun run test     # vitest run — target 18+ tests
bun run typecheck
```

Alternatively:

```bash
# pnpm
pnpm build && pnpm test && pnpm typecheck

# npm
npm run build && npm test && npm run typecheck
```

| Suite | Covers |
|-------|--------|
| schema-validator.test.ts | Core engine |
| base-model.test.ts | BaseModel API |
| discriminated-union.test.ts | Unions |
| features.test.ts | computedField, createModel |
| index.test.ts (settings) | env loading |

CI (`.github/workflows/ci.yml`):

```yaml
- uses: oven-sh/setup-bun@v2
- run: bun install --frozen-lockfile
- run: bun run build
- run: bun run typecheck
- run: bun run test
```

For pnpm, use `pnpm install --frozen-lockfile` followed by `pnpm build`,
`pnpm typecheck`, and `pnpm test`. For npm, use `npm ci` followed by
`npm run build`, `npm run typecheck`, and `npm test`.

---

## 8. Publishing

Order:

1. `@typedantic/core`
2. `typedantic`
3. `typedantic-settings`

See [PUBLISHING.md](./PUBLISHING.md) and root `/Users/delalifunani/Github/PUBLISHING.md`.

Consumer tsconfig **must** include:

```json
{
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true,
  "useDefineForClassFields": false
}
```

Always: `import 'reflect-metadata'` first.

---

## 9. Architecture reference

```
User code
   │
   ▼
typedantic (BaseModel, Field, @fieldValidator)
   │  buildModelSchema() → CoreSchema
   ▼
@typedantic/core
   │  compileValidator() → ValidatorFn
   ▼
validate input → instance | ValidationError
```

**Design docs:** [DESIGN.md](./DESIGN.md) — full API spec  
**Implementation plan:** [IMPLEMENTATION.md](./IMPLEMENTATION.md) — phased checklist

---

## Rebuild checklist

Use this to verify you recreated everything:

- [ ] Monorepo with Bun workspaces (3 packages; pnpm and npm supported)
- [ ] CoreSchema types for all primitive and composite nodes
- [ ] compileValidator with coercion, constraints, unions, models
- [ ] SchemaValidator + ValidationError + SchemaSerializer
- [ ] @Field property decorator + field registry
- [ ] BaseModel with validate/dump/jsonSchema/copy
- [ ] @fieldValidator / @modelValidator / @computedField
- [ ] JSON Schema generation with $defs
- [ ] DiscriminatedUnion helper
- [ ] TypeAdapter
- [ ] BaseSettings with env + .env loading
- [ ] EmailStr, HttpUrl, UUID, SecretStr
- [ ] RootModelOf, createModel
- [ ] fieldSerializer / modelSerializer
- [ ] 18+ tests passing
- [ ] CI: build + typecheck + test

When all boxes are checked, you have reproduced Typedantic independently.
