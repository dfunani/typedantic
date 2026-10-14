# Phase 5 — Testing, CI, publishing, acceptance

## Local commands

```bash
bun run build
bun run test
bun run typecheck
bun run functional-test
```

Unit tests live in `packages/<name>/tests/`. Functional scripts live in repo-root `tests/` and import built workspace packages.

Always **build before test** when packages import each other via `dist`.

## Packages (npm)

| Directory | npm name | Version |
|-----------|----------|---------|
| `packages/typedantic-core` | `@typedantic/core` | 1.0.0 |
| `packages/typedantic` | `@typedantic/model` | 1.0.0 |
| `packages/typedantic-settings` | `@typedantic/settings` | 1.0.0 |

The unscoped name `typedantic` is taken on npm; publish only under `@typedantic/*`.

## Distribution readiness (maintainers)

**Full runbook:** [distribution.md](./distribution.md)

```bash
bun run pack:dry
bun run publish:packages
```

## CI — `.github/workflows/ci.yml`

Runs on `push` to `main` and all pull requests: install → build → typecheck → unit tests → functional tests.

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

See [../../topics/common-pitfalls.md](../../topics/common-pitfalls.md) and [distribution.md](./distribution.md).

## Acceptance checklist

### Milestone V1
- [x] Scaffold installs/builds
- [x] Core int/bool/str + model-fields tests pass
- [x] `ValidationError.toJson()` / `toObject()` FastAPI-style `{ detail: [...] }` (dual `loc`/`msg` keys in 0.2)
- [x] BaseModel.modelValidate for String/Number/Boolean fields
- [x] Public package import works
- [x] Smoke `tests/basic.ts` succeeds

### Milestone V2 (final in 0.2.0)
- [x] Full compiler nodes
- [x] Serializer + JSON Schema + TypeAdapter
- [x] Validators, computed fields, serializers
- [x] DiscriminatedUnion rejects unknown tags
- [x] Settings prefix + nested env
- [x] CI green on clean clone

### Milestone 1.0.0
- [x] `RootModel`
- [x] Annotated types (`EmailStr`, `HttpUrl`, `UUID`, ints, `SecretStr`)
- [x] `createModel` / `extendModel`
- [x] Custom settings sources + `settingsCustomiseSources`

### Distribution (first public release)
- [ ] npm org `@typedantic` created
- [ ] First local publish done; trusted publishers on all three packages (`publish.yml`)
- [ ] No `NPM_TOKEN` in GitHub secrets (OIDC only)
- [ ] Package READMEs ship in tarball
- [ ] GitHub Release publish workflow succeeded
- [ ] Fresh `npm install @typedantic/model` smoke passes
