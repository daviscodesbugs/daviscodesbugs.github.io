# Quartz v5 Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Config migration **complete and verified locally** on branch `quartz-v5-migration`. Not shipped. `main` remains pinned to Quartz **v4.5.2**.

**Remaining work:** CI wiring only (see "Remaining work" below).

---

## Background: why this exists

Both `Dockerfile` and `.github/workflows/deploy.yml` originally cloned Quartz unpinned:

```
git clone --depth 1 https://github.com/jackyzha0/quartz.git
```

When upstream released **v5.0.0**, that clone started pulling v5 while the repo still carried v4-style config. The failure mode is silent:

- v4 config lives in `quartz.config.ts` + `quartz.layout.ts` (TypeScript, imported directly).
- v5 config lives in `quartz.config.yaml`, loaded by `quartz/plugins/loader/config-loader.ts`.
- `resolveConfigPath()` checks, in order: `quartz.config.yaml` → `quartz.plugins.json` → `quartz.config.default.yaml` → `quartz.plugins.default.json`.
- It only falls back to importing the old TypeScript config when **none** of those exist.
- The v5 repo ships `quartz.config.default.yaml`, so that file always exists. The custom `quartz.config.ts` is never read.

Result: the build succeeds with **zero errors** and deploys stock Quartz.

**Mitigation applied 2026-07-25:** both clones pinned to `--branch v4.5.2`, with an explanatory comment at each site. Do not remove those pins until this migration ships.

---

## Findings from the migration attempt

### ⚠️ note-properties is the frontmatter parser — never disable it

The single most important finding. In v4, `Plugin.FrontMatter()` was an explicit transformer. **In v5 there is no standalone frontmatter transformer.** Frontmatter parsing lives in the `note-properties` plugin (see the comment at `quartz/plugins/index.ts`: *"from frontmatter transformer (e.g. note-properties)"*).

It is tempting to disable `note-properties` because it renders a visible Properties panel that v4 never had. Doing so breaks the site silently — the build succeeds with no warning, but:

- every page title becomes `Untitled`
- descriptions and tags disappear
- `RemoveDrafts` never sees `draft: true`, so **every draft page gets published**

The correct configuration keeps the plugin enabled and suppresses only its rendering:

```yaml
- source: github:quartz-community/note-properties
  enabled: true
  options:
    hidePropertiesView: true
  order: 5
```

This is the same class of silent-success failure as the original v5 config break. Treat any "build succeeded" on v5 with suspicion until output is diffed.

### The official Docker image is not usable

Quartz publishes to `ghcr.io/jackyzha0/quartz` via `.github/workflows/docker-build-push.yaml`, but:

- **No semver tags exist.** Of 481 tags, only `hugo` and `latest` are non-sha. `:5.0.0` does not resolve. v5.0.0 corresponds to `sha-ab346fa`.
- **Plugins are not baked in.** Their Dockerfile runs `npm ci; npx quartz plugin install` in a builder stage, then the final stage runs `COPY . .`, which overwrites `.quartz/plugins` with the repo's 1-byte `index.ts` stub. The published image would re-download all 42 plugins at container start.
- Note their `;` rather than `&&` — a failed plugin install in that build is silently ignored.

Worth stealing from upstream: copy `quartz.lock.json` **before** the install step so the expensive layer caches on the lockfile.

### Plugin installation is slow and must precede the build

- `npx quartz plugin restore` installs the exact commits pinned in `quartz.lock.json`. This is the deterministic command; `plugin install` is not.
- It clones **42 repos and runs 42 npm installs**: roughly **10 minutes** and **~320 MB**.
- It must run before `quartz build`, or esbuild fails with `Could not resolve "../../.quartz/plugins"` from `quartz/components/Head.tsx`.
- **It appears to hang as a Docker build layer.** Output is buffered and nothing is visible for the full 10 minutes. It is progressing. Run it in a live container with streamed output if you need to watch it, then `docker commit` the result.

### Supply chain is pinned

`quartz.lock.json` ships with the v5.0.0 tag and pins every plugin to a commit SHA. This substantially resolves the original concern about depending on ~25 third-party repos — versions do not float, provided the lockfile is respected and `plugin restore` is used rather than `plugin update`.

### Paths unchanged from v4

- `custom.scss` → `quartz/quartz/styles/custom.scss`
- `lightbox.js` → `quartz/quartz/static/lightbox.js`

Existing mounts and CI copy steps work as-is.

### v5 fixes one v4 leak

v4 emits `.github/workflows/deploy.yml` into `public/` despite `.github` being in `ignorePatterns`. v5 correctly excludes it.

---

## Verification results

Built both versions side by side (v4.5.2 on :8081, v5.0.0 on :8082) against the same content.

| Check | Result |
|---|---|
| Emitted files identical | **38** |
| Draft filtering | `Filtered out 5 files` on both; all 5 draft URLs 404 on both |
| Page titles | match (About, Voron V0.2, Morse Code Paddle Converter) |
| Theme colours | all four accents match in light and dark |
| RSS + sitemap | 200 on both |
| lightbox.js | served, byte-identical (1206 bytes) |
| Gallery callout | renders on both |
| Explorer / Graph | absent on both |
| Properties panel | absent |

All remaining file differences were explained: two uncommitted blog posts and their six tag pages exist only on `main`; two scratch Docker files exist only on the branch.

---

## Remaining work: CI

The only piece not done. The deploy workflow needs a plugin restore step before the build:

```yaml
- name: Restore Quartz plugins
  working-directory: quartz
  run: npx quartz plugin restore
```

- [ ] Add the restore step to `.github/workflows/deploy.yml`
- [ ] Add `actions/cache` for `quartz/.quartz/plugins`, keyed on `hashFiles('quartz/quartz.lock.json')`
- [ ] Change both clone pins from `v4.5.2` to `v5.0.0`
- [ ] Copy `.quartz/quartz.config.yaml` instead of the two `.ts` files in the Prepare content step
- [ ] Verify a real deploy, then delete `.quartz/quartz.config.ts` and `.quartz/quartz.layout.ts`
- [ ] Update `Dockerfile` for local dev (clone v5.0.0, copy lockfile, then `plugin restore`)

### Cost of shipping

| | v4.5.2 (current) | v5.0.0 |
|---|---|---|
| Build steps | `npm ci` → build | `npm ci` → `plugin restore` → build |
| Cold build | ~1 min | **~10 min** |
| Warm build (cached) | ~1 min | ~1–2 min |
| Plugin disk | none | ~320 MB |

Warm builds are fine. Any change to `quartz.lock.json` busts the cache and pays full freight.

---

## Deferred, unrelated to v5

The site publishes files it should not. These are live on v4 today and are **not** caused by the migration:

- [ ] `/Dockerfile`, `/docker-compose.yml` — returned 200 on the live site
- [ ] `/docs/` — the entire `docs/superpowers/` tree of plans and specs is publicly readable

Fix by adding `docs` to `ignorePatterns` and excluding the Docker files from the CI rsync. Worth doing regardless of which Quartz version is running. Deliberately left out of the migration so the v4/v5 output diff stayed meaningful.

---

## Reference

- Branch: `quartz-v5-migration`, worktree at `../dcb-quartz-v5`
- Ported config: `.quartz/quartz.config.yaml`
- Local v5 environment: `Dockerfile.v5` + `docker-compose.v5.yml` (port 8082)
- v5 default config: `https://raw.githubusercontent.com/jackyzha0/quartz/v5.0.0/quartz.config.default.yaml`
- Config loader logic: `quartz/plugins/loader/config-loader.ts`
- Community plugins: `https://github.com/quartz-community`
- v5.0.0 commit: `ab346fa`, image `ghcr.io/jackyzha0/quartz:sha-ab346fa`
- Last known-good v4 tag: `v4.5.2`
