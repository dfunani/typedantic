# Typedantic

**Pydantic for TypeScript** — class-based validation, serialization, JSON Schema, and settings.

## Install

```bash
bun add typedantic reflect-metadata
bun add typedantic-settings   # optional: env-based config
```

Alternatively, use pnpm or npm:

```bash
pnpm add typedantic reflect-metadata
pnpm add typedantic-settings

# npm
npm install typedantic reflect-metadata
npm install typedantic-settings
```

## Quick start

```typescript
import 'reflect-metadata';
import { BaseModel, Field, fieldValidator, computedField, DiscriminatedUnion } from 'typedantic';

@modelConfig({ extra: 'forbid' })
class User extends BaseModel {
  @Field({ minLength: 3 })
  username!: string;

  @Field({ ge: 0, le: 150 })
  age!: number;

  @computedField()
  get label() { return this.username.toUpperCase(); }
}

const user = User.modelValidate({ username: 'ada', age: 30 });
user.modelDump(); // includes computed label
User.modelJsonSchema();
```

## Packages

| Package | Description |
|---------|-------------|
| `typedantic` | BaseModel, Field, validators, TypeAdapter, JSON Schema |
| `@typedantic/core` | CoreSchema validation engine |
| `typedantic-settings` | BaseSettings — load config from env + `.env` |

## Features

- `@Field()` property decorators with constraints (minLength, ge, pattern, …)
- `@fieldValidator` / `@modelValidator` (before/after/wrap modes)
- `@computedField()` included in `modelDump()`
- `DiscriminatedUnion()` for tagged unions
- `TypeAdapter` for ad-hoc schemas
- `EmailStr`, `HttpUrl`, `UUID`, `SecretStr` special types
- `RootModelOf()`, `createModel()` for dynamic models
- `@fieldSerializer` / `@modelSerializer`
- `BaseSettings.settingsValidate()` for 12-factor config

## Development

```bash
bun install
bun run --filter '*' build
bun run test      # 18 tests
bun run --filter '*' typecheck
```

Alternatively:

```bash
# pnpm
pnpm install
pnpm -r run build
pnpm run test
pnpm -r run typecheck

# npm
npm install
npm run build --workspaces
npm test
npm run typecheck --workspaces
```

## Documentation

| Doc | Purpose |
|-----|---------|
| [tutorial.md](./tutorial.md) | **Step-by-step rebuild guide** |
| [DESIGN.md](./DESIGN.md) | Architecture & API spec |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Phased implementation plan |
| [PUBLISHING.md](./PUBLISHING.md) | npm publish guide |

## Architecture

```
typedantic (public API)  →  @typedantic/core (CoreSchema → ValidatorTree)
typedantic-settings      →  typedantic (BaseSettings)
```
