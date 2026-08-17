# Typedantic

**Pydantic for TypeScript** — class-based validation, serialization, JSON Schema, and settings.

## Install

```bash
npm install typedantic reflect-metadata
npm install typedantic-settings   # optional: env-based config
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
pnpm install
pnpm build
pnpm test      # 18 tests
pnpm typecheck
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
