# Phase 4 — `typedantic-settings`

**When:** After Milestone V1 (BaseModel works). Settings sits on top of `typedantic`.

```
typedantic-settings  →  typedantic  →  @typedantic/core
```

Main reference (copy-paste starting point): [../../reference/settings-index.ts.md](../../reference/settings-index.ts.md)  
Corrections to apply: [../00-overview/corrections-vs-main.md](../00-overview/corrections-vs-main.md)

## What you are building

`BaseSettings` extends `BaseModel` and loads configuration from environment variables (and optional `.env` files) before calling `modelValidate`.

```ts
import 'reflect-metadata';
import { Field } from 'typedantic';
import { BaseSettings, settingsConfig } from 'typedantic-settings';

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

## Build steps

1. Package already scaffolded in Phase 1 (`packages/typedantic-settings`)
2. Implement `BaseSettings.settingsValidate()` with:
   - Precedence: explicit env arg > `process.env` > `.env` file > field defaults
   - `envPrefix` respected for **aliases** (main bug: aliases ignored prefix)
   - Nested delimiter rebuild (`APP_DB__HOST` → `{ db: { host } }` — main only flattened)
   - Polymorphic return `InstanceType<T>` (main typed as `BaseSettings`)
3. Export from `src/index.ts`
4. Always `bun run build` on `typedantic` first (settings `tsconfig` `paths` point at `../typedantic/dist/index.d.ts`)

```bash
bun run --filter typedantic build
bun run --filter typedantic-settings build
# pnpm: pnpm --filter typedantic build && pnpm --filter typedantic-settings build
# npm:  npm run build -w typedantic && npm run build -w typedantic-settings
```

## Corrections vs main (must fix)

| Issue on `main` | Tutorial fix |
|-----------------|--------------|
| `settingsValidate` return type is `BaseSettings` | `InstanceType<T>` via generic `this` |
| Field aliases ignore `envPrefix` | Prefixed lookup: `PREFIX + alias` |
| Nested env only flattened | Rebuild nested objects from delimiter segments |
| Mutable shared defaults | Prefer `defaultFactory` on settings fields |

## Minimal `.env` parser scope

Supported: `KEY=value`, optional quotes, `#` comments, blank lines.  
Not supported: `export`, interpolation, multiline.

## Coercion

When reading string env values, coerce:

| Input | Output |
|-------|--------|
| `"true"` / `"false"` | boolean |
| integer / float strings | number |
| `"null"` | `null` |
| JSON-looking `{...}` / `[...]` | `JSON.parse` when valid |

## Test ideas

- Prefixed aliases load (`APP_HOST` with `envPrefix: 'APP_'`)
- Unprefixed aliases fail when prefix is set
- Nested model field from `APP_DB__HOST`
- Boolean/number coercion
- Return type is the subclass instance

## Checkpoint

```bash
bunx vitest run packages/typedantic-settings
```
