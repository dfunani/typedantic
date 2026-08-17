# Publishing

See the full guide: [../PUBLISHING.md](../PUBLISHING.md)

Quick publish order:

```bash
bun run --filter '*' build && bun run test
bun publish --access public --cwd packages/typedantic-core
bun publish --access public --cwd packages/typedantic
bun publish --access public --cwd packages/typedantic-settings
```

Alternatively, use pnpm or npm:

```bash
# pnpm
pnpm -r run build && pnpm run test
pnpm --dir packages/typedantic-core publish --access public
pnpm --dir packages/typedantic publish --access public
pnpm --dir packages/typedantic-settings publish --access public

# npm
npm run build --workspaces && npm test
npm publish --access public -C packages/typedantic-core
npm publish --access public -C packages/typedantic
npm publish --access public -C packages/typedantic-settings
```
