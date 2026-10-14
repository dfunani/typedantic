# Phase 4 — `@typedantic/settings`

**When:** After Milestone V1 (`BaseModel` works). Settings sits on `@typedantic/model`.

```
@typedantic/settings  →  @typedantic/model  →  @typedantic/core
```

**Live sources (read these first):**

| File | Role |
|------|------|
| `packages/typedantic-settings/src/index.ts` | `BaseSettings`, `settingsValidate`, `settingsConfig`, `settingsCustomiseSources` |
| `packages/typedantic-settings/src/config.ts` | `SettingsConfigDict` (extends model `ConfigDict`) |
| `packages/typedantic-settings/src/environment.ts` | `.env` load, flatten, coercion, nested rebuild helpers |
| `packages/typedantic-settings/src/sources.ts` | Pluggable sources + deep merge |

**Tests:** `packages/typedantic-settings/tests/settings.test.ts`, `sources.test.ts`.

Reference snapshots: [settings-index](../../reference/settings-index.ts.md) · [settings-config](../../reference/settings-config.ts.md) · [settings-environment](../../reference/settings-environment.ts.md)

## What you are building

`BaseSettings` extends `BaseModel` and loads configuration from environment variables (and optional `.env` files) before calling `modelValidate`.

```ts
import 'reflect-metadata';
import { Field } from '@typedantic/model';
import { BaseSettings, settingsConfig } from '@typedantic/settings';

@settingsConfig({ envPrefix: 'APP_', envNestedDelimiter: '__' })
class AppSettings extends BaseSettings {
  @Field({ type: String })
  host!: string;

  @Field({ type: Number, default: 8080 })
  port!: number;
}

const settings = AppSettings.settingsValidate(process.env);
// settings is InstanceType<typeof AppSettings>, not a bare BaseSettings
```

## `SettingsConfigDict`

Exported from `config.ts` and re-exported from the package entry:

| Option | Default | Role |
|--------|---------|------|
| `envPrefix` | `''` | Strip prefix before matching field aliases |
| `envFile` | `'.env'` | Path under `process.cwd()`; set `false` to skip |
| `envNestedDelimiter` | `'__'` | Segment delimiter in env keys (e.g. `APP_DB__HOST`) |
| `caseSensitive` | `false` | Prefix and alias matching |
| `populateByName` | `true` | Same as model config (field name + alias) |
| `secretsDir` | unset | Directory of secret files (lowest priority when set) |
| `extra` / `strict` / … | model defaults | Inherited from `ConfigDict` on `BaseModel` |

## Settings sources (0.3.0)

Default priority (highest first): `initSettingsSource` → `envSettingsSource` → `dotenvSettingsSource`. Optional `secretsDir` appends `secretsDirectorySettingsSource`.

```ts
@settingsCustomiseSources((init, env, dotenv) => [
  init, env, dotenv, jsonFileSettingsSource('settings.json'),
])
@settingsConfig({ envPrefix: 'APP_', envFile: false })
class AppSettings extends BaseSettings { /* ... */ }

AppSettings.settingsValidate(process.env, { initData: { host: 'x' } });
```

## `settingsValidate` flow

1. Resolve sources (`settingsCustomiseSources` or defaults; append `secretsDir` when set).
2. Each env-like source maps a string env map → field-keyed data via `envMapToSettingsData` (`flattenEnv`, nested rebuild, `coerceEnvForSchema`).
3. Deep-merge sources low→high priority so nested leaves combine and higher priority wins.
4. `modelValidate(data)` — polymorphic `this: T` return type → `InstanceType<T>`.

There is **no** `tsconfig` paths hack: the package depends on `@typedantic/model` via workspace + published `dist`. Build model before settings:

```bash
bun run --filter @typedantic/model build
bun run --filter @typedantic/settings build
```

## Minimal `.env` parser scope

Implemented in `loadEnvFile` / `parseEnvLine`:

- `KEY=value`, optional quotes, `#` comments, blank lines

Not supported: `export`, interpolation, multiline values.

## Coercion (`parseEnvValue`)

| Input | Output |
|-------|--------|
| `"true"` / `"false"` | boolean |
| integer / decimal strings | number |
| `"null"` | `null` |
| `{...}` / `[...]` when valid JSON | parsed value |
| anything else | string |

## What tests cover

See `settings.test.ts`:

- `parseEnvValue`, `flattenEnv`, `setNestedValue`, `lookupPrefixedEnv`, `loadEnvFile`
- Prefixed aliases, nested `APP_DB__HOST`-style keys, coercion, subclass instance type

## Checkpoint

```bash
bun run build
bunx vitest run packages/typedantic-settings
```
