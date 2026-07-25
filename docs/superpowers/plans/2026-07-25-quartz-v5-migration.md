# Quartz v5 Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Not started. Site is currently pinned to Quartz **v4.5.2** as a stopgap.

**Goal:** Migrate the site from Quartz v4.5.2 to v5.x, restoring the intended design under the new YAML plugin configuration system, then unpin the clone.

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

Result: the build succeeds with **zero errors** and deploys stock Quartz — default theme, `pageTitle: Quartz 5`, Explorer and Graph View re-enabled, and the private `docs/` tree exposed in the Explorer nav.

**Mitigation applied 2026-07-25:** both clones pinned to `--branch v4.5.2`, with an explanatory comment at each site. Do not remove those pins until this migration is complete and verified.

---

## What changes in v5

### Configuration format

`quartz.config.ts` + `quartz.layout.ts` collapse into a single `quartz.config.yaml`. The `configuration:` block maps over almost one-to-one (same keys: `pageTitle`, `baseUrl`, `ignorePatterns`, `defaultDateType`, `theme.typography`, `theme.colors.lightMode` / `darkMode`), so the warm-amber palette should port cleanly.

### Plugins are now external repositories

The biggest shift. In v4, plugins were `Plugin.FrontMatter()` calls against bundled code. In v5, each is a separate repo fetched at build time:

```yaml
plugins:
  - source: github:quartz-community/explorer
    enabled: true
    layout:
      position: left
      priority: 50
```

Roughly 40 community plugins cover what v4 bundled: `created-modified-date`, `syntax-highlighting`, `obsidian-flavored-markdown`, `github-flavored-markdown`, `table-of-contents`, `crawl-links`, `description`, `latex`, `remove-draft`, `alias-redirects`, `content-index`, `content-page`, `folder-page`, `tag-page`, `explorer`, `graph`, `search`, `backlinks`, `article-title`, `content-meta`, `tag-list`, `page-title`, `darkmode`, `breadcrumbs`, `footer`, `spacer`.

**Consider before migrating:** this introduces a build-time network dependency on third-party repos that the current v4 setup does not have. Evaluate whether that is acceptable, or whether plugins should be vendored/pinned by ref.

### Layout is declarative, not an array

v4 declared ordered arrays in `quartz.layout.ts` (`left: [PageTitle(), Search(), Darkmode()]`). v5 has each plugin declare its own `layout.position` (`left` / `right` / `beforeBody` / `afterBody`) and a numeric `layout.priority`. Components sort by priority within a position.

Also new: `layout.display` (`mobile-only` / `desktop-only`, replacing the `MobileOnly()` / `DesktopOnly()` wrappers), `layout.condition`, flex `groups`, and `byPageType` overrides replacing the separate `defaultContentPageLayout` / `defaultListPageLayout` exports.

`Head` is built-in. `Footer` is a plugin taking `options.links`.

---

## Migration tasks

### 1. Establish a scratch environment

- [ ] Create a git worktree so the pinned v4 setup stays working on `main`
- [ ] Add a `docker-compose.v5.yml` (or a build arg) that clones v5 without disturbing the v4 dev server
- [ ] Confirm the v5 container builds and serves stock Quartz before changing anything

### 2. Port the configuration block

- [ ] Translate `.quartz/quartz.config.ts` `configuration:` into `.quartz/quartz.config.yaml`
- [ ] Carry over `pageTitle: davis codes bugs`, `pageTitleSuffix: ""`, `baseUrl: daviscodesbugs.github.io`, `defaultDateType: modified`
- [ ] Port both colour palettes exactly (light `#faf9f7`/`#c07828`, dark `#1c1c1c`/`#f0a050`)
- [ ] Port typography (Schibsted Grotesk / Source Sans Pro / IBM Plex Mono)
- [ ] Port `ignorePatterns`, and **add `docs`** — currently absent, which is why the internal plans/specs are publicly emitted
- [ ] Keep `analytics: null` (the v5 default enables Plausible)

### 3. Map the plugin list

- [ ] Enable equivalents for every v4 transformer, filter, and emitter currently in use
- [ ] Explicitly set `enabled: false` for `explorer` and `graph` — the design spec disables both, and they default on in v5
- [ ] Configure `footer` with `options.links.GitHub: https://github.com/daviscodesbugs`
- [ ] Verify `remove-draft` is active so `draft: true` posts stay hidden (currently 5 files are filtered)
- [ ] Decide on pinning plugin sources by ref rather than floating on default branches

### 4. Rebuild the layout

- [ ] Map the v4 content-page layout to positions/priorities: Breadcrumbs → ArticleTitle → ContentMeta → TagList in `beforeBody`; PageTitle → Search → Darkmode in `left`; TableOfContents → Backlinks in `right`
- [ ] Reproduce `MobileOnly(Spacer())` via `layout.display: mobile-only`
- [ ] Reproduce `DesktopOnly(TableOfContents())` via `layout.display: desktop-only`
- [ ] Recreate the list-page layout (no right sidebar) as a `byPageType` override

### 5. Re-wire the custom assets

- [ ] Confirm the mount target for `custom.scss` — v4 used `quartz/quartz/styles/custom.scss`; verify the v5 path
- [ ] Confirm the mount target for `lightbox.js` — v4 used `quartz/quartz/static/lightbox.js`
- [ ] Verify the `> [!gallery]` callout on the landing page still renders and the lightbox still binds
- [ ] Check that `custom.scss` still imports the Quartz base styles correctly (see commit `c0a8dae`)

### 6. Verify against v4 output

- [ ] Build both versions and diff the rendered HTML for `/`, `/about`, `/projects`, `/blog`
- [ ] Confirm sidebar reads "davis codes bugs", not "Quartz 5"
- [ ] Confirm Explorer and Graph View are absent
- [ ] Confirm the warm amber theme applies in both light and dark mode
- [ ] Confirm `docs/` is no longer emitted
- [ ] Confirm the `flowwriter/` static copy still lands in `public/`
- [ ] Confirm RSS and sitemap still generate

### 7. Cut over

- [ ] Update `Dockerfile` to the target v5 tag and remove the stopgap comment
- [ ] Update `.github/workflows/deploy.yml` to match
- [ ] Pin to a specific v5 tag rather than tracking `main` — this whole incident was caused by an unpinned clone
- [ ] Delete `.quartz/quartz.config.ts` and `.quartz/quartz.layout.ts` once the YAML is verified
- [ ] Deploy and verify the live site

---

## Open questions

1. Is the build-time dependency on ~25 third-party plugin repos acceptable, or should they be vendored?
2. Does v5 have equivalents for every v4 plugin in use, or are any features lost?
3. Is the v5 `note-properties` plugin (which renders a visible frontmatter Properties table) on by default? It appeared in the accidental v5 build and is not wanted.
4. Should the migration be taken as an opportunity to enable anything new (`reader-mode`, `og-image`, `stacked-pages`)?

---

## Reference

- v5 default config: `https://raw.githubusercontent.com/jackyzha0/quartz/v5.0.0/quartz.config.default.yaml`
- Config loader logic: `quartz/plugins/loader/config-loader.ts`
- Community plugins: `https://github.com/quartz-community`
- Last known-good v4 tag: `v4.5.2`
