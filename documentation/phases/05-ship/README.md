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

## CI — `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run build
      - run: bun run typecheck
      - run: bun run test
```

Commit the lockfile (`bun.lock`).

## Publishing order

1. `@typedantic/core`
2. `typedantic`
3. `typedantic-settings`

```bash
bun run build && bun run test
bun publish --access public --cwd packages/typedantic-core
bun publish --access public --cwd packages/typedantic
bun publish --access public --cwd packages/typedantic-settings
```

Dry-run: `npm pack --dry-run -C packages/typedantic`

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
| Settings can't resolve typedantic | Build typedantic first |
| Shared array defaults | Use `defaultFactory: () => []` |

More: [../../topics/why-test-ts-fails.md](../../topics/why-test-ts-fails.md)

## Acceptance checklist

### Milestone V1
- [ ] Scaffold installs/builds
- [ ] Core int/bool/str + model-fields tests pass
- [ ] ValidationError.json FastAPI shape
- [ ] BaseModel.modelValidate for String/Number/Boolean fields
- [ ] Public package import works
- [ ] Smoke `test.ts` succeeds

### Milestone V2
- [ ] Full compiler nodes from main
- [ ] Serializer + JSON Schema + TypeAdapter
- [ ] Validators, computed fields, serializers
- [ ] DiscriminatedUnion rejects unknown tags
- [ ] Settings prefix + nested env
- [ ] CI green on clean clone
