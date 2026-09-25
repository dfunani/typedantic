# Phase 5 — Testing, CI, publishing, acceptance

## Local commands

```bash
bun run build
bun run test
bun run typecheck
bun run functional-test
```

Unit tests live in `packages/<name>/tests/`. Functional scripts live in repo-root `tests/` and import built workspace packages.

```bash
# pnpm
pnpm build && pnpm test && pnpm typecheck
# npm
npm run build && npm test && npm run typecheck
```

Always **build before test** when packages import each other via `dist`.

## Packages (npm)

| Directory | npm name |
|-----------|----------|
| `packages/typedantic-core` | `@typedantic/core` |
| `packages/typedantic` | `@typedantic/model` |
| `packages/typedantic-settings` | `@typedantic/settings` |

The unscoped name `typedantic` is taken on npm; publish only under `@typedantic/*`.

## CI — `.github/workflows/ci.yml`

Runs on `push` to `main` and all pull requests: install (frozen lockfile) → build → typecheck → unit tests → functional tests.

## Publishing order

1. `@typedantic/core`
2. `@typedantic/model`
3. `@typedantic/settings`

```bash
bun run publish:packages
# or manually:
bun run build && bun run test
bun publish --access public --cwd packages/typedantic-core
bun publish --access public --cwd packages/typedantic
bun publish --access public --cwd packages/typedantic-settings
```

`workspace:*` dependencies are rewritten to concrete versions by `bun publish`.

Dry-run: `bun run pack:dry`

Release automation: tag a GitHub Release or run workflow_dispatch on `.github/workflows/publish.yml` (requires `NPM_TOKEN` secret).

## Consumer tsconfig

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false
  }
}
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Cannot find module .../model` | Implement BaseModel + export it |
| `rootDir` error importing core src | Import `@typedantic/core`, add workspace dep, build core |
| Fields are `any` / wrong type | Explicit `@Field({ type: String })` |
| Validators never run | Store/read metadata on constructor (`ctorOf`) |
| Invalid values accepted | SchemaValidator must throw when errors.length > 0 |
| `design:type` missing under Vitest | Pass `type` in Field options |
| Settings can't resolve model | Build `@typedantic/model` first |
| Shared array defaults | Use `defaultFactory: () => []` |
| `npm publish` name conflict | Use `@typedantic/model`, not unscoped `typedantic` |

More: [../../topics/why-test-ts-fails.md](../../topics/why-test-ts-fails.md)

## Acceptance checklist

### Milestone V1
- [x] Scaffold installs/builds
- [x] Core int/bool/str + model-fields tests pass
- [x] ValidationError.json FastAPI shape
- [x] BaseModel.modelValidate for String/Number/Boolean fields
- [x] Public package import works
- [x] Smoke `test.ts` succeeds

### Milestone V2
- [x] Full compiler nodes from main
- [ ] Serializer + JSON Schema + TypeAdapter *(deferred past 0.1)*
- [ ] Validators, computed fields, serializers *(deferred past 0.1)*
- [x] DiscriminatedUnion rejects unknown tags
- [x] Settings prefix + nested env
- [x] CI green on clean clone
