# Contributing

## Setup

```bash
bun install
bun run build
bun run typecheck
bun run test
bun run functional-test
```

Node.js ≥ 20. Package manager: Bun (`packageManager` pinned in root `package.json`).

## Packages

| Directory | npm name |
|-----------|----------|
| `packages/typedantic-core` | `@typedantic/core` |
| `packages/typedantic` | `@typedantic/model` |
| `packages/typedantic-settings` | `@typedantic/settings` |

Always build in dependency order (Turbo handles this). Settings and functional tests import built `dist` outputs.

## Pull requests

- Keep changes focused; match existing TypeScript style.
- Add or update unit tests under `packages/*/tests/` for behavior changes.
- Do not commit secrets or local `.env` files.
- CI must pass (build, typecheck, unit, functional).

## Publishing

Maintainers only. Full runbook:

→ [documentation/phases/05-ship/distribution.md](./documentation/phases/05-ship/distribution.md)

Covers npm org `@typedantic`, local `npm login`, **trusted publishing (OIDC)** for CI (no `NPM_TOKEN`), GitHub Release publish, and how docs are distributed (GitHub curriculum + package READMEs).
