# Deep dive: workspaces, package names, and imports

## Never import sibling source with relative `../../../`

Bad (causes `rootDir` errors):

```ts
import type { Schema } from '../../../typedantic-core/src/schema/types';
```

Good:

```ts
import type { CoreSchema } from '@typedantic/core';
```

Requirements: workspace dependency, core exports the type, core built (or project references).

## Build order

```
@typedantic/core → typedantic → typedantic-settings
```

## Package managers

| Manager | Workspace | Install |
|---------|-----------|---------|
| Bun | `workspaces` in package.json | `bun install` |
| npm | same | `npm install` |
| pnpm | also `pnpm-workspace.yaml` | `pnpm install` |

Turbo also needs root `"packageManager": "bun@…"`.
