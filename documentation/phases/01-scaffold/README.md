# Phase 1 — Monorepo scaffolding

**Goal:** empty packages install, build, and typecheck before any real logic.

## Create directories

```bash
mkdir typedantic && cd typedantic
git init
mkdir -p packages/typedantic-core/src/{schema,compiler,errors,validator,serializer}
mkdir -p packages/typedantic/src/{internal,fields,config,validators,serializers,types,models,json-schema}
mkdir -p packages/typedantic-settings/src
mkdir -p .github/workflows
```

For **V1 only**, you can skip `typedantic-settings` and some typedantic subfolders until later — but creating them now matches main.

## Root `package.json`

```json
{
  "name": "typedantic-monorepo",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "turbo run build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "tsup": "^8.3.5",
    "turbo": "^2.3.3",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  },
  "engines": { "node": ">=20" },
  "packageManager": "bun@1.3.14"
}
```

`packageManager` pins Bun for Corepack / CI. If you use pnpm or npm instead, you can omit it or set your own tool string.

## `pnpm-workspace.yaml` (pnpm users)

```yaml
packages:
  - 'packages/*'
```

## `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "clean": { "cache": false }
  }
}
```

## `tsconfig.base.json` (main style — use this)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

Deep dive: [../../topics/nodenext-js-extensions.md](../../topics/nodenext-js-extensions.md)

## `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts', 'packages/**/tests/**/*.test.ts'],
  },
});
```

## `.gitignore`

```
node_modules/
dist/
*.tsbuildinfo
.DS_Store
coverage/
.turbo/
.env
*.tgz
```

## Package manifests

### `packages/typedantic-core/package.json`

```json
{
  "name": "@typedantic/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "engines": { "node": ">=20" },
  "license": "MIT"
}
```

### `packages/typedantic/package.json`

```json
{
  "name": "typedantic",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@typedantic/core": "workspace:*",
    "reflect-metadata": "^0.2.2"
  },
  "peerDependencies": { "reflect-metadata": ">=0.2.0" },
  "peerDependenciesMeta": {
    "reflect-metadata": { "optional": true }
  },
  "engines": { "node": ">=20" },
  "license": "MIT"
}
```

### `packages/typedantic-settings/package.json`

```json
{
  "name": "typedantic-settings",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": { "typedantic": "workspace:*" },
  "peerDependencies": { "reflect-metadata": ">=0.2.0" },
  "engines": { "node": ">=20" },
  "license": "MIT"
}
```

## Each package `tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

Settings adds:

```json
"paths": { "typedantic": ["../typedantic/dist/index.d.ts"] }
```

## Placeholder entrypoints

Create `src/index.ts` in each package:

```ts
export {};
```

## Install & checkpoint

```bash
bun install
bun run build
bun run typecheck
```

```bash
# pnpm
pnpm install && pnpm build && pnpm typecheck
# npm
npm install && npm run build && npm run typecheck
```

**Expected:** empty `dist/` folders, no errors.

Deep dive: [../../topics/workspaces-and-imports.md](../../topics/workspaces-and-imports.md)
