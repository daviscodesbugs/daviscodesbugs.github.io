# Blog & Portfolio Site Design

**Date:** 2026-03-19
**Project:** daviscodesbugs.github.io

## Overview

A personal blog and portfolio site built from an Obsidian vault using Quartz v4, deployed to GitHub Pages. The site serves two purposes through a "two lenses" model:

- **Portfolio** — the showroom. Polished project entries that hook visitors.
- **Blog** — the workshop journal. Dev work, build logs, tutorials, and tinkering writeups for people who want the details.

Portfolio entries and blog posts cross-link naturally. A project entry is the flashy summary; the blog post(s) are the deep dive.

## Architecture

**Pipeline:** Obsidian vault → Quartz v4 → GitHub Pages

The vault is the `daviscodesbugs.github.io` GitHub repository. Content is authored in Obsidian, committed and pushed to `main`. A GitHub Actions workflow handles the build and deploy:

1. Check out the repo (vault content)
2. Clone Quartz v4 from `jackyzha0/quartz`
3. Copy vault content into Quartz's `content/` directory
4. Copy custom config files (`.quartz/quartz.config.ts`, `.quartz/quartz.layout.ts`) into the Quartz root
5. `npm ci` + `npx quartz build`
6. Deploy the `public/` output to GitHub Pages via `actions/upload-pages-artifact` + `actions/deploy-pages`

This is the same pattern used by the codex project (Obsidian → Quartz → deploy), adapted for GitHub Pages instead of SSH/rsync.

## Vault Structure

```
/
├── index.md                  # Landing page
├── about.md                  # Bio, contact, professional inquiries
├── blog/
│   ├── index.md              # Blog listing page
│   └── *.md                  # Individual blog posts
├── projects/
│   ├── index.md              # Portfolio grid/listing page
│   └── *.md                  # Individual project entries
├── attachments/              # Images, screenshots, files
├── .quartz/
│   ├── quartz.config.ts      # Quartz configuration
│   └── quartz.layout.ts      # Layout/component configuration
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions workflow
├── .gitignore
└── .obsidian/                # Obsidian config (gitignored)
```

## Pages

### Landing Page (`index.md`)

Minimal statement page:
- Name/handle
- Tagline (in the "builder of things that (mostly) work" zone — competent but personable)
- Clear navigation links to Projects, Blog, and About

No featured content, no hero images, no skills grid. Let the sections speak for themselves.

### Projects Index (`projects/index.md`)

Grid or list of project entries. Each entry shows:
- Title
- Short description
- Tags (tech used, category)
- Date or status

Sorted by date or manually curated order (via frontmatter).

### Project Entry (`projects/*.md`)

Individual project page containing:
- Title and description
- Images/screenshots
- Tech stack / tools used
- Tags
- Links to related blog posts (wikilinks)

### Blog Index (`blog/index.md`)

Chronological list of blog posts. Each entry shows:
- Title
- Date
- Short description
- Tags

### Blog Post (`blog/*.md`)

Standard long-form post with:
- Title, date, description (frontmatter)
- Tags
- Optional table of contents (auto-generated for longer posts)
- Links to related project entries (wikilinks)

### About Page (`about.md`)

- Bio — who you are, what you do
- Contact information
- Professional inquiries / business contact
- Links to GitHub, other profiles as relevant

## Cross-Linking Model

Blog posts and project entries reference each other via Obsidian wikilinks:

- Project entry: `Read the full build log: [[blog/3d-printed-enclosure]]`
- Blog post: `Part of the [[projects/home-automation]] project`

Quartz renders these as navigable links with hover popovers. Backlinks automatically surface the reverse connections at the bottom of each page.

## Visual Theme: Warm Terminal

### Palette

| Role | Color | Description |
|------|-------|-------------|
| Background | `#1c1c1c` | Near-black base |
| Text | `#e8e8e8` | Light gray body text |
| Light gray (borders, dividers) | `#333333` | Subtle structure |
| Mid gray (secondary text) | `#888888` | Dates, metadata |
| Primary accent | `#f0a050` | Warm amber/orange |
| Secondary accent | `#70b070` | Earthy green |
| Tertiary accent | `#7090d0` | Soft blue |
| Highlight | `rgba(240, 160, 80, 0.12)` | Amber-tinted highlight |
| Text highlight | `#f0a05066` | Inline text highlight |

### Light Mode Palette

A light mode variant for accessibility/preference:

| Role | Color |
|------|-------|
| Background | `#faf9f7` |
| Text | `#2a2a2a` |
| Light gray | `#e5e0db` |
| Mid gray | `#8a8580` |
| Primary accent | `#c07828` |
| Secondary accent | `#4a8a4a` |
| Tertiary accent | `#506aa0` |

### Typography

- **Body:** Source Sans Pro (or system sans-serif fallback)
- **Headers:** Schibsted Grotesk or similar clean sans-serif
- **Code:** IBM Plex Mono
- Monospace touches in UI elements (tagline, metadata) for subtle tech flavor

### UI Details

- Tags/badges: Subtle bordered pills with accent-tinted backgrounds
- Overall feel: Cozy workshop — "well-organized garage with good lighting"
- Personality without gimmicks — the "fun coworker you want to collab with"

## Quartz Feature Configuration

| Feature | Enabled | Notes |
|---------|---------|-------|
| Search | ✅ | Global search across all content |
| Tags | ✅ | Categorize blog posts and projects |
| Backlinks | ✅ | Surfaces cross-links between projects and blog |
| Table of Contents | ✅ | Auto-generated for longer pages |
| Popovers | ✅ | Hover-preview of wikilinks |
| RSS / Content Index | ✅ | RSS feed + sitemap generation |
| SPA Navigation | ✅ | Smooth client-side navigation |
| Graph View | ❌ | Not needed for this site |
| Explorer (file tree) | ❌ | Navigation handles discovery |

### Quartz Plugins

**Transformers:**
- FrontMatter
- CreatedModifiedDate (priority: frontmatter, then filesystem)
- SyntaxHighlighting (github-light / github-dark themes)
- ObsidianFlavoredMarkdown
- GitHubFlavoredMarkdown
- TableOfContents
- CrawlLinks (shortest path resolution)
- Description
- Latex (KaTeX)

**Filters:**
- RemoveDrafts (use `draft: true` frontmatter to hide WIP)

**Emitters:**
- AliasRedirects
- ComponentResources
- ContentPage
- FolderPage
- TagPage
- ContentIndex (sitemap + RSS)
- Assets
- Static
- NotFoundPage

## Layout Configuration

### Shared Components
- Head
- Footer (with relevant links — GitHub profile, etc.)

### Content Page Layout
- **Before body:** Breadcrumbs, ArticleTitle, ContentMeta, TagList
- **Left sidebar:** PageTitle, Search, Darkmode
- **Right sidebar:** TableOfContents, Backlinks
- **After body:** (mobile explorer if needed)

### List Page Layout
- **Before body:** Breadcrumbs, ArticleTitle, ContentMeta
- **Left sidebar:** PageTitle, Search, Darkmode

## GitHub Actions Workflow

Triggered on push to `main`. Steps:

1. `actions/checkout@v4` — check out vault content
2. Clone Quartz v4 (`git clone --depth 1 https://github.com/jackyzha0/quartz.git`)
3. Prepare content:
   - Remove default Quartz content
   - rsync vault content into `quartz/content/` (excluding `.git`, `quartz/`)
   - Copy `.quartz/quartz.config.ts` and `.quartz/quartz.layout.ts` into Quartz root
4. `actions/setup-node@v4` with Node 22
5. `npm ci` in Quartz directory
6. `npx quartz build` in Quartz directory
7. `actions/upload-pages-artifact@v3` from `quartz/public/`
8. `actions/deploy-pages@v4` to publish

Requires repo Settings → Pages → Source set to **GitHub Actions**.

## Content Frontmatter Convention

### Blog Posts
```yaml
---
title: "Post Title"
date: 2026-03-19
description: "Brief description for listings and SEO"
tags:
  - 3d-printing
  - tutorial
draft: false
---
```

### Project Entries
```yaml
---
title: "Project Name"
date: 2026-03-19
description: "One-line project summary"
tags:
  - python
  - home-automation
draft: false
---
```

## Deployment

- **URL:** `https://daviscodesbugs.github.io`
- **Quartz `baseUrl`:** `daviscodesbugs.github.io`
- **Branch:** `main`
- **Build:** GitHub Actions (automatic on push)

## Out of Scope

- Custom domain (can be added later via CNAME)
- Analytics (can be added later via Quartz's analytics plugin)
- Comments system
- Newsletter/email signup
- Integration with codex vault — these are fully independent
