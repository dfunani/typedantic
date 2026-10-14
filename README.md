# Typedantic

Pydantic-style validation for TypeScript.

**Status:** 0.1.0 — production-ready for the documented surface. ESM-only, Node.js ≥ 20.

> The unscoped npm name `typedantic` is already taken. Install the scoped packages below.

## Packages

| Package | Role |
|---------|------|
| [`@typedantic/core`](./packages/typedantic-core) | Schema IR, compiler, `SchemaValidator`, `ValidationError` |
| [`@typedantic/model`](./packages/typedantic) | `BaseModel`, `@Field`, `modelConfig` |
| [`@typedantic/settings`](./packages/typedantic-settings) | `BaseSettings`, env / `.env` loading |

## Install

```bash
npm install @typedantic/model reflect-metadata
# optional
npm install @typedantic/settings
```

```bash
bun add @typedantic/model reflect-metadata
bun add @typedantic/settings
```

### TypeScript (required for decorators)

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false,
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022"
  }
}
```

Import `reflect-metadata` once at app startup (before any model class is evaluated):

```ts
import 'reflect-metadata';
```

## Quick start

```ts
import 'reflect-metadata';
import { BaseModel, Field, modelConfig, ValidationError } from '@typedantic/model';

@modelConfig({ extra: 'forbid' })
class User extends BaseModel {
  @Field({ type: String, minLength: 1 })
  name!: string;

  @Field({ type: Number, ge: 0 })
  age!: number;
}

const user = User.modelValidate({ name: 'Ada', age: 36 });
console.log(user.modelDumpJson());
```

### Settings

```ts
import 'reflect-metadata';
import { Field } from '@typedantic/model';
import { BaseSettings, settingsConfig } from '@typedantic/settings';

@settingsConfig({ envPrefix: 'APP_', envFile: '.env' })
class AppSettings extends BaseSettings {
  @Field({ type: String, alias: 'HOST' })
  host!: string;

  @Field({ type: Number, default: 8080, alias: 'PORT' })
  port!: number;
}

const settings = AppSettings.settingsValidate(process.env);
```

## 0.1 scope

**Included:** primitives, literals, enums, arrays, objects, dates, nullable/optional/defaults, discriminated unions, nested models, FastAPI-shaped `ValidationError`, settings env loading (prefix, nested delimiter, `.env`).

**Not in 0.1:** JSON Schema export, `TypeAdapter`, `@validator` / computed fields / custom serializers. See [CHANGELOG.md](./CHANGELOG.md).

## Monorepo development

```bash
bun install
bun run build
bun run typecheck
bun run test
bun run functional-test
```

Publishing (maintainers): `bun run publish:packages` after a GitHub Release, or the [Publish](./.github/workflows/publish.yml) workflow. Order is always core → model → settings. Bun rewrites `workspace:*` to concrete versions on publish.

## Documentation

Curriculum and design notes: [documentation/](./documentation/).

## License

[MIT](./LICENSE)
