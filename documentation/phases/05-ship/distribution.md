# Distribution & release guide

This is the maintainer runbook for shipping Typedantic **0.1+** to npm and making docs available to consumers.

**Prerequisites before first publish**

- [ ] Local green: `bun run build && bun run typecheck && bun run test && bun run functional-test`
- [ ] `bun run pack:dry` shows LICENSE + CHANGELOG + `dist/` only
- [ ] CI green on `main` (`.github/workflows/ci.yml`)
- [ ] npm org `@typedantic` exists and you are an owner/admin
- [ ] Automation token stored as GitHub secret `NPM_TOKEN` (or trusted publishing configured)

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

## 3. npm profiles & authentication

You need two kinds of auth in practice:

| Use case | How |
|----------|-----|
| Local publish / dry-run | Logged-in CLI profile (`npm login` or `bunx npm login`) |
| CI / GitHub Actions | Granular access token in repo secret `NPM_TOKEN` |

### 3.1 Local CLI profile

```bash
# Interactive login (opens browser or prompts)
npm login
# or
bunx npm login

npm whoami
npm org ls typedantic   # confirm membership
```

Optional: named profiles via npm’s userconfig if you maintain multiple registries:

```bash
npm login --auth-type=web --scope=@typedantic --registry=https://registry.npmjs.org/
```

Ensure `~/.npmrc` (user) or project `.npmrc` does **not** commit tokens. Project may contain only:

```ini
# optional project .npmrc (no secrets)
@typedantic:registry=https://registry.npmjs.org/
```

### 3.2 Automation token (GitHub Actions)

1. npmjs.com → **Access Tokens** → **Generate New Token**.
2. Type: **Granular Access Token** (preferred) or classic Automation.
3. Permissions:
   - Packages: **Read and write** for `@typedantic/core`, `@typedantic/model`, `@typedantic/settings`  
     (or entire `@typedantic` org if the UI allows).
   - Bypass 2FA for automation: enabled for CI tokens.
4. Copy the token once.
5. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - Name: `NPM_TOKEN`
   - Value: the token

The publish workflow passes it as `NODE_AUTH_TOKEN` (see `.github/workflows/publish.yml`).

### 3.3 Optional: Trusted Publishing (OIDC)

Packages already set `"publishConfig": { "provenance": true }`. If you enable
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers) for the GitHub
repo, you can reduce reliance on long-lived tokens. Until that is configured,
keep `NPM_TOKEN`.

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

Actions → **Publish** → **Run workflow** (requires `NPM_TOKEN`).

### Option C — Local publish

```bash
npm whoami   # must belong to @typedantic
bun run publish:packages
```

Equivalent manual order:

```bash
bun publish --access public --cwd packages/typedantic-core
bun publish --access public --cwd packages/typedantic
bun publish --access public --cwd packages/typedantic-settings
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
[ ] NPM_TOKEN present in GitHub Actions secrets (or trusted publisher)
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
