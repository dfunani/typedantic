import { defineConfig } from 'bumpp';

/**
 * Lockstep release bump for @typedantic/{core,model,settings}.
 *
 *   bun run bump                 # interactive
 *   bun run bump -- patch
 *   bun run bump -- 1.1.0
 *   bun run bump:push -- minor
 */
export default defineConfig({
    files: [
        'packages/typedantic-core/package.json',
        'packages/typedantic/package.json',
        'packages/typedantic-settings/package.json',
    ],
    commit: 'chore: release v%s',
    tag: 'v%s',
    // Prefer GitHub Release / Actions publish; push via `bump:push`.
    push: false,
});
