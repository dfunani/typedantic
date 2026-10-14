# Typedantic

Pydantic-style validation for TypeScript.

**Status:** 1.0.0 — RootModel, annotated types, createModel, custom settings sources (plus V2 serializers/validators/JSON Schema/TypeAdapter). ESM-only, Node.js ≥ 20.

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

## Scope (1.0.0)

**Included:** primitives, literals, enums, arrays, objects, dates, unions, nested models, FastAPI-shaped `ValidationError` (dual `loc`/`msg` keys), settings env loading + custom sources, `@fieldValidator` / `@modelValidator`, `@fieldSerializer` / `@modelSerializer` / `@computedField`, `SchemaSerializer` dump options, `modelJsonSchema` / `toJsonSchema`, `TypeAdapter`, `modelValidateJson`, `modelCopy`, validating constructor, `RootModel`, annotated types (`EmailStr`, `HttpUrl`, `UUID`, `PositiveInt`, `SecretStr`, …), `createModel` / `extendModel`. See [CHANGELOG.md](./CHANGELOG.md).

## Monorepo development

```bash
bun install
bun run build
bun run typecheck
bun run test
bun run functional-test
```

## Publishing (maintainers)

Full guide (npm org, profiles, tokens, release, **docs distribution**):

→ **[documentation/phases/05-ship/distribution.md](./documentation/phases/05-ship/distribution.md)**

Version bump (lockstep, like Python `bumpver`):

```bash
bun run bump -- patch    # commit + tag vX.Y.Z (no push)
bun run bump:push -- minor
```

Short path after `@typedantic` org + trusted publishers exist (no `NPM_TOKEN`):

```bash
bun run bump -- patch          # version + tag
# push tag / create GitHub Release → .github/workflows/publish.yml (OIDC)
```

First-ever publish is local once, then attach trusted publishers — see [distribution.md](./documentation/phases/05-ship/distribution.md) §3.

## Documentation

| Audience | Start |
|----------|--------|
| Public site (guides / API) | sibling repo [`typedantic-web`](https://github.com/dfunani/typedantic-web) → typedantic.dev |
| Rebuild from scratch | [documentation/tutorial.md](./documentation/tutorial.md) |
| Doc hub | [documentation/](./documentation/) |
| npm / release runbook | [distribution.md](./documentation/phases/05-ship/distribution.md) |

Package pages on npm use each package’s `README.md` and link back to the GitHub curriculum.

## License

[MIT](./LICENSE)
