# Deep dive: workspaces, package names, and imports

## Never import sibling source with relative `../../../`

Bad (causes `rootDir` errors):

```ts
import type { BaseSchema } from '../../../typedantic-core/src/schema/types';
```

Good:

```ts
import type { BaseSchema } from '@typedantic/core';
import { BaseModel, Field } from '@typedantic/model';
import { BaseSettings } from '@typedantic/settings';
```

Requirements: workspace dependency in `package.json`, package exports the symbol, dependent package **built** so `dist/` types resolve (or use project references).

## Build order

```
@typedantic/core → @typedantic/model → @typedantic/settings
```

```bash
bun run build   # turbo builds in dependency order
```

## Package managers

| Manager | Workspace | Install |
|---------|-----------|---------|
| Bun | `workspaces` in root `package.json` | `bun install` |
| npm | same | `npm install` |
| pnpm | also `pnpm-workspace.yaml` | `pnpm install` |

Root `"packageManager": "bun@1.3.14"` pins the canonical Bun version for CI and local dev.

## npm names vs directories

| Directory | npm name |
|-----------|----------|
| `packages/typedantic-core` | `@typedantic/core` |
| `packages/typedantic` | `@typedantic/model` |
| `packages/typedantic-settings` | `@typedantic/settings` |

Import the scoped names in application code — not the folder names `typedantic` / `typedantic-settings`.
