# Distribution & release guide

This is the maintainer runbook for shipping Typedantic **0.1+** to npm and making docs available to consumers.

**Prerequisites before first publish**

- [ ] Local green: `bun run build && bun run typecheck && bun run test && bun run functional-test`
- [ ] `bun run pack:dry` shows LICENSE + CHANGELOG + `dist/` only
- [ ] CI green on `main` (`.github/workflows/ci.yml`)
- [ ] npm org `@typedantic` exists and you are an owner/admin
- [ ] CI uses **trusted publishing (OIDC)** — no `NPM_TOKEN` in GitHub (see §3)

---

## 1. Package map (what gets published)

| Directory | npm name | Depends on |
|-----------|----------|------------|
| `packages/typedantic-core` | `@typedantic/core` | — |
| `packages/typedantic` | `@typedantic/model` | `@typedantic/core` |
| `packages/typedantic-settings` | `@typedantic/settings` | `@typedantic/model` |

**Always publish in that order.** Bun rewrites `workspace:*` to concrete versions on `bun publish`.

The unscoped name `typedantic` is **taken** on the registry — never publish under it.

Each package tarball includes: `package.json`, `dist/`, `LICENSE`, `CHANGELOG.md`, and (if present) package `README.md`.

---

## 2. Create the npm organization `@typedantic`

1. Sign in at [https://www.npmjs.com](https://www.npmjs.com) (or create an account).
2. Enable **2FA** on your user (required for publishing modern packages).
3. Open [https://www.npmjs.com/org/create](https://www.npmjs.com/org/create).
4. Create organization name: **`typedantic`** → scope becomes `@typedantic`.
5. Choose plan:
   - **Unlimited** (paid) or free tier with public packages — public `@typedantic/*` packages are fine on the free org plan.
6. Invite collaborators under **Members** (role: developer or admin).

Verify the scope is free of conflicting packages:

```bash
npm view @typedantic/core
npm view @typedantic/model
npm view @typedantic/settings
# Expected before first publish: 404 Not Found
```

---

## 3. npm authentication (trusted publishing — no CI token)

| Use case | How |
|----------|-----|
| Local first publish / emergency | Interactive `npm login` (2FA) — **not** stored in GitHub |
| CI / GitHub Actions | [Trusted publishing](https://docs.npmjs.com/trusted-publishers/) via OIDC (`id-token: write`) |

Do **not** add `NPM_TOKEN` (or any write token) to GitHub Actions secrets.

### 3.1 Local CLI profile

```bash
npm login
npm whoami
npm org ls typedantic   # confirm membership
```

Project `.npmrc` must not contain tokens (only registry mapping is fine):

```ini
@typedantic:registry=https://registry.npmjs.org/
```

### 3.2 First publish (one-time, local)

npm cannot attach a trusted publisher until the package **exists**. Publish `1.0.0` once from your machine (interactive 2FA), then switch CI to OIDC:

```bash
bun run build
bun run pack:dry

# Pack rewrites workspace:* → concrete versions (same as CI)
rm -f packages/*/*.tgz
bun pm pack --cwd packages/typedantic-core --destination packages/typedantic-core
bun pm pack --cwd packages/typedantic --destination packages/typedantic
bun pm pack --cwd packages/typedantic-settings --destination packages/typedantic-settings

npm publish packages/typedantic-core/*.tgz --access public
npm publish packages/typedantic/*.tgz --access public
npm publish packages/typedantic-settings/*.tgz --access public
rm -f packages/*/*.tgz
```

### 3.3 Attach trusted publishers (each package)

On npmjs.com → package → **Settings → Trusted publishing** → **GitHub Actions**, or via CLI (npm ≥ 11.5.1, with 2FA):

```bash
# Repo must match package.json repository.url (dfunani/typedantic)
# Workflow filename only — not the full path. Allow direct npm publish.
npm trust github @typedantic/core --repo dfunani/typedantic --file publish.yml --allow-publish
npm trust github @typedantic/model --repo dfunani/typedantic --file publish.yml --allow-publish
npm trust github @typedantic/settings --repo dfunani/typedantic --file publish.yml --allow-publish
```

UI fields if not using the CLI:

| Field | Value |
|-------|--------|
| Organization or user | `dfunani` |
| Repository | `typedantic` |
| Workflow filename | `publish.yml` |
| Environment | *(leave empty — workflow does not use one)* |
| Allowed actions | allow **`npm publish`** |

Complete a validating CI publish within **2 days** of creating each trusted-publisher config (or recreate it).

Optional hardening after OIDC works: package Settings → Publishing access → **Require 2FA and disallow tokens**.

### 3.4 Why the workflow uses `npm publish` (not `bun publish`)

`bun publish` does not support npm OIDC yet. CI therefore:

1. `bun pm pack` — rewrites `workspace:*` and builds the tarball  
2. `npm publish <tarball>` — authenticates with GitHub OIDC  

Provenance is automatic under trusted publishing (packages also set `"publishConfig.provenance": true`).

---

## 4. Versioning

All three packages ship the **same version** for 1.x (keep them in lockstep).

Use **[bumpp](https://github.com/antfu-collective/bumpp)** (JS analogue of Python `bumpver`), configured in `bump.config.ts`:

```bash
bun run bump              # interactive: patch / minor / major / custom
bun run bump -- patch     # bump patch, commit + tag vX.Y.Z (no push)
bun run bump -- 1.1.0     # set exact version
bun run bump:push -- minor  # also git push commit + tag
```

It updates `"version"` in all three `packages/*/package.json`, then commits `chore: release vX.Y.Z` and tags `vX.Y.Z` (push only with `bump:push`). Update `CHANGELOG.md` (and docs that mention the version) in the same release commit or beforehand. Do **not** hand-edit package versions out of lockstep.

Semver for this project:

| Bump | When |
|------|------|
| patch | Bug fixes, docs-only consumer fixes |
| minor | New backward-compatible API |
| major | Breaking API (document in CHANGELOG) |

---

## 5. Pre-flight checks (every release)

```bash
bun install --frozen-lockfile
bun run build
bun run typecheck
bun run test
bun run functional-test
bun run pack:dry
```

Inspect dry-run output:

- Files: `dist/index.js`, `dist/index.d.ts`, `LICENSE`, `CHANGELOG.md`, `package.json`, package `README.md`
- No `src/`, no tests, no `.env`
- Dependency versions are not left as `workspace:*` after publish (Bun rewrites at publish time)

Optional local install test from a tarball:

```bash
bun pm pack --cwd packages/typedantic-core
# in a temp folder:
# npm install /path/to/typedantic-core-0.1.0.tgz
```

---

## 6. Release to npm

### Option A — GitHub Release (recommended)

1. Push `main` with version bumps + changelog.
2. GitHub → **Releases → Draft a new release**.
3. Tag `v1.0.0` (must match package versions).
4. Publish the release → triggers `.github/workflows/publish.yml`.
5. Confirm Actions job succeeded.
6. Verify:

```bash
npm view @typedantic/core version
npm view @typedantic/model version
npm view @typedantic/settings version
npm view @typedantic/model dependencies
```

### Option B — Manual workflow dispatch

Actions → **Publish** → **Run workflow** (OIDC; packages must already have trusted publishers configured).

### Option C — Local publish (emergency / first release)

```bash
npm whoami   # must belong to @typedantic
# Prefer the pack + npm publish flow in §3.2 so tarballs match CI.
# Or: bun run publish:packages  (uses bun publish; requires local npm login)
```

If a middle package fails, fix and republish **only remaining** packages; do not republish a version that already succeeded (bump instead).

---

## 7. Distributing documentation

Docs live in-repo under [`documentation/`](../../README.md). Distribute them through these channels:

### 7.1 Source of truth (GitHub)

| Audience | Entry |
|----------|--------|
| Rebuild curriculum | [`documentation/tutorial.md`](../../tutorial.md) |
| Hub | [`documentation/README.md`](../../README.md) |
| This runbook | this file |

Consumers browsing GitHub get the full curriculum. Keep `main` docs aligned with the released API.

### 7.2 npm package READMEs

Each publishable package should have a short `README.md` (install + link to full docs).
npm displays that README on the package page.

Root [`README.md`](../../../../README.md) is for the monorepo; package READMEs are what most npm users see.

### 7.3 Homepage / repository fields

Already set on packages:

- `homepage`: `https://github.com/dfunani/typedantic#readme`
- `repository.directory`: package path
- `bugs.url`: GitHub issues

After first publish, optionally set npm package “Website” to the docs hub URL.

### 7.4 Optional: GitHub Pages (static docs site)

If you want a dedicated docs URL (e.g. `https://dfunani.github.io/typedantic/`):

1. Repo **Settings → Pages → Deploy from branch** `main` / `/docs`, **or** add a Pages workflow that builds Markdown (MkDocs, Docusaurus, VitePress).
2. Point package `homepage` at that URL.
3. Do **not** put secrets in the Pages site.

Until Pages is set up, GitHub `documentation/` + package READMEs are enough for 0.1.

### 7.5 What not to publish as docs packages

Do not publish `documentation/` as an npm package. Keep docs in git; link from npm READMEs.

---

## 8. Post-release verification

```bash
# clean consumer project
mkdir /tmp/typedantic-smoke && cd /tmp/typedantic-smoke
npm init -y
npm install @typedantic/model @typedantic/settings reflect-metadata typescript
```

`tsconfig.json` (decorators required):

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false,
    "strict": true
  }
}
```

Smoke:

```ts
import 'reflect-metadata';
import { BaseModel, Field } from '@typedantic/model';

class User extends BaseModel {
  @Field({ type: String })
  name!: string;
}

console.log(User.modelValidate({ name: 'Ada' }).modelDump());
```

```bash
npx tsc --noEmit   # or bun run
```

Announce: GitHub Release notes + CHANGELOG. Optionally update Discussions / README badges.

---

## 9. Unpublish / yank policy

npm generally **disallows** unpublishing after 72 hours or if dependents exist.
Prefer publishing a **patch** that fixes the issue and documenting the bad version in CHANGELOG.
Only use `npm unpublish @typedantic/model@x.y.z` for mistaken releases within the window, as org owner.

---

## 10. Release checklist (copy per version)

```
Version: ____

[ ] CHANGELOG updated (root + packages)
[ ] All three package.json versions equal
[ ] bun install --frozen-lockfile
[ ] bun run build && typecheck && test && functional-test
[ ] bun run pack:dry reviewed
[ ] CI green on main
[ ] npm org membership confirmed (npm org ls typedantic)
[ ] Trusted publishers on all three packages → `publish.yml` / `dfunani/typedantic` (no NPM_TOKEN)
[ ] git tag vX.Y.Z pushed / GitHub Release published
[ ] npm view @typedantic/{core,model,settings} version == X.Y.Z
[ ] Fresh install smoke in empty project
[ ] Package READMEs + documentation/ match released API
```

---

## See also

- [README.md](./README.md) — local commands, acceptance, troubleshooting
- [../../topics/common-pitfalls.md](../../topics/common-pitfalls.md)
- [../../tutorial.md](../../tutorial.md) — rebuild curriculum
- Workflows: `.github/workflows/ci.yml`, `.github/workflows/publish.yml`
