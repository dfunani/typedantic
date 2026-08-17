# typedantic

To install dependencies:

```bash
bun add typedantic reflect-metadata
bun add typedantic-settings   # optional: env-based config
```

Alternatively, use pnpm or npm:

```bash
pnpm add typedantic reflect-metadata
pnpm add typedantic-settings

# npm
npm install typedantic reflect-metadata
npm install typedantic-settings
```

To run:

```bash
bun install
bun run --filter '*' build
bun run test      # 18 tests
bun run --filter '*' typecheck
```

Alternatively:

```bash
# pnpm
pnpm install
pnpm -r run build
pnpm run test
pnpm -r run typecheck

# npm
npm install
npm run build --workspaces
npm test
npm run typecheck --workspaces
```

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
