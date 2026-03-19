# Blog & Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up a blog and portfolio site built from an Obsidian vault using Quartz v4, deployed to GitHub Pages at daviscodesbugs.github.io.

**Architecture:** Obsidian vault as a Git repo pushed to GitHub. GitHub Actions workflow clones Quartz v4, copies vault content into it, builds, and deploys static output to GitHub Pages. Custom Quartz config and layout files live in `.quartz/` within the vault.

**Tech Stack:** Obsidian (authoring), Quartz v4 (static site generator), GitHub Actions (CI/CD), GitHub Pages (hosting), Node.js 22

---

## File Structure

```
/
├── index.md                          # Landing page
├── about.md                          # Bio, contact, professional info
├── blog/
│   ├── index.md                      # Blog listing page
│   └── hello-world.md                # Sample blog post
├── projects/
│   ├── index.md                      # Portfolio listing page
│   └── sample-project.md             # Sample project entry
├── attachments/                      # Images and files (empty initially)
├── .quartz/
│   ├── quartz.config.ts              # Quartz configuration (theme, plugins, baseUrl)
│   └── quartz.layout.ts             # Layout component configuration
├── .github/
│   └── workflows/
│       └── deploy.yml                # GitHub Actions build + deploy workflow
├── .gitignore                        # Ignore .obsidian, node_modules, etc.
└── .superpowers/                     # Brainstorm artifacts (gitignored)
```

---

### Task 1: Initialize Repository

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
cd /home/dpears/workspace/daviscodesbugs.github.io
git init
```

- [ ] **Step 2: Create .gitignore**

```gitignore
.obsidian/
.trash/
node_modules/
.superpowers/
.DS_Store
```

- [ ] **Step 3: Add GitHub remote**

```bash
git remote add origin https://github.com/daviscodesbugs/daviscodesbugs.github.io.git
```

Note: Verify the correct GitHub username/org. The repo name must be `<username>.github.io` for a user site.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "init: repository with .gitignore"
```

---

### Task 2: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
name: Deploy Quartz to GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Check out vault content
        uses: actions/checkout@v4

      - name: Clone Quartz
        run: git clone --depth 1 https://github.com/jackyzha0/quartz.git quartz

      - name: Prepare content
        run: |
          rm -rf quartz/content/*
          rsync -av --exclude='.git' --exclude='quartz' --exclude='.github' --exclude='.superpowers' ./ quartz/content/
          cp .quartz/quartz.config.ts quartz/
          cp .quartz/quartz.layout.ts quartz/

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        working-directory: quartz
        run: npm ci

      - name: Build Quartz
        working-directory: quartz
        run: npx quartz build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: quartz/public

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions workflow for Quartz build and deploy"
```

---

### Task 3: Quartz Configuration

**Files:**
- Create: `.quartz/quartz.config.ts`

- [ ] **Step 1: Create quartz.config.ts with Warm Terminal theme**

```typescript
import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const config: QuartzConfig = {
  configuration: {
    pageTitle: "davis codes bugs",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "en-US",
    baseUrl: "daviscodesbugs.github.io",
    ignorePatterns: ["private", "templates", ".obsidian", ".trash", ".quartz", ".github", ".superpowers"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Schibsted Grotesk",
        body: "Source Sans Pro",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#faf9f7",
          lightgray: "#e5e0db",
          gray: "#8a8580",
          darkgray: "#4a4540",
          dark: "#2a2a2a",
          secondary: "#c07828",
          tertiary: "#4a8a4a",
          highlight: "rgba(192, 120, 40, 0.12)",
          textHighlight: "#c0782866",
        },
        darkMode: {
          light: "#1c1c1c",
          lightgray: "#333333",
          gray: "#888888",
          darkgray: "#d4d4d4",
          dark: "#e8e8e8",
          secondary: "#f0a050",
          tertiary: "#70b070",
          highlight: "rgba(240, 160, 80, 0.12)",
          textHighlight: "#f0a05066",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
```

- [ ] **Step 2: Commit**

```bash
git add .quartz/quartz.config.ts
git commit -m "config: add Quartz config with Warm Terminal theme"
```

---

### Task 4: Quartz Layout Configuration

**Files:**
- Create: `.quartz/quartz.layout.ts`

- [ ] **Step 1: Create quartz.layout.ts**

```typescript
import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/daviscodesbugs",
    },
  }),
}

// Layout for individual content pages (blog posts, project entries, about)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Search(),
    Component.Darkmode(),
  ],
  right: [
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
  afterBody: [],
}

// Layout for listing pages (tags, folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(),
    Component.ArticleTitle(),
    Component.ContentMeta(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Search(),
    Component.Darkmode(),
  ],
  right: [],
  afterBody: [],
}
```

- [ ] **Step 2: Commit**

```bash
git add .quartz/quartz.layout.ts
git commit -m "config: add Quartz layout with backlinks, ToC, search, darkmode"
```

---

### Task 5: Landing Page

**Files:**
- Create: `index.md`

- [ ] **Step 1: Create index.md**

```markdown
---
title: davis codes bugs
---

builder of things that (mostly) work

[Projects](./projects) · [Blog](./blog) · [About](./about)
```

Note: Uses relative markdown links rather than wikilinks for navigation — more reliable for folder-level links in Quartz. Keep this minimal. The tagline can be refined later — this is a starting point.

- [ ] **Step 2: Commit**

```bash
git add index.md
git commit -m "content: add landing page"
```

---

### Task 6: About Page

**Files:**
- Create: `about.md`

- [ ] **Step 1: Create about.md**

```markdown
---
title: About
---

## Who I am

*TODO: Fill in bio — developer, maker, tinkerer. What you do and what you're into.*

## What I do

*TODO: Brief overview of professional work and personal interests.*

## Get in touch

*TODO: Contact info, professional inquiries, links to GitHub/LinkedIn/etc.*
```

Note: Placeholder content — this is the page structure. Real content gets filled in by the user.

- [ ] **Step 2: Commit**

```bash
git add about.md
git commit -m "content: add about page with placeholder structure"
```

---

### Task 7: Projects Section

**Files:**
- Create: `projects/index.md`
- Create: `projects/sample-project.md`

- [ ] **Step 1: Create projects/index.md**

```markdown
---
title: Projects
---

Things I've built, broken, and occasionally fixed.
```

Note: Quartz's FolderPage emitter will automatically list pages in this folder below the content.

- [ ] **Step 2: Create projects/sample-project.md**

```markdown
---
title: "Sample Project"
date: 2026-03-19
description: "A sample project entry to demonstrate the structure"
tags:
  - example
draft: true
---

## Overview

*Brief description of what this project is and why it exists.*

## Tech Stack

- *Language/framework*
- *Tools used*

## Details

*What makes this interesting. Screenshots, diagrams, key decisions.*

## Related Posts

*Links to blog posts about this project go here, e.g.:*
*[[blog/hello-world|Read the build log]]*
```

Note: `draft: true` so this doesn't show up on the live site. It serves as a template for real entries.

- [ ] **Step 3: Commit**

```bash
git add projects/
git commit -m "content: add projects section with sample entry template"
```

---

### Task 8: Blog Section

**Files:**
- Create: `blog/index.md`
- Create: `blog/hello-world.md`

- [ ] **Step 1: Create blog/index.md**

```markdown
---
title: Blog
---

Dev work, build logs, tutorials, and the occasional deep dive.
```

Note: Same as projects — Quartz auto-lists folder contents.

- [ ] **Step 2: Create blog/hello-world.md**

```markdown
---
title: "Hello World"
date: 2026-03-19
description: "First post — what this site is and what to expect"
tags:
  - meta
draft: true
---

## What is this?

*TODO: Introduce the site. What kind of content will be here. Your approach to writing about projects and builds.*

## What to expect

*TODO: Dev work, 3D printing, tinkering, tutorials. The portfolio is the showroom, the blog is the workshop.*
```

Note: `draft: true` — placeholder for the first real post. Demonstrates frontmatter conventions.

- [ ] **Step 3: Commit**

```bash
git add blog/
git commit -m "content: add blog section with hello world draft"
```

---

### Task 9: Create Attachments Directory

**Files:**
- Create: `attachments/.gitkeep`

- [ ] **Step 1: Create attachments directory**

```bash
mkdir -p attachments
touch attachments/.gitkeep
```

- [ ] **Step 2: Commit**

```bash
git add attachments/.gitkeep
git commit -m "content: add attachments directory for images and files"
```

---

### Task 10: Local Build Verification

This task verifies the site builds correctly before pushing to GitHub.

- [ ] **Step 1: Verify Node.js is available**

```bash
node --version
```

Expected: v22.x or higher. The system uses nvm — if needed, run `nvm use 22` or `nvm install 22` first.

- [ ] **Step 2: Clone Quartz and prepare content locally**

```bash
cd /tmp
git clone --depth 1 https://github.com/jackyzha0/quartz.git quartz-test
rm -rf quartz-test/content/*
rsync -av \
  --exclude='.git' \
  --exclude='quartz' \
  --exclude='.github' \
  --exclude='.superpowers' \
  /home/dpears/workspace/daviscodesbugs.github.io/ quartz-test/content/
cp /home/dpears/workspace/daviscodesbugs.github.io/.quartz/quartz.config.ts quartz-test/
cp /home/dpears/workspace/daviscodesbugs.github.io/.quartz/quartz.layout.ts quartz-test/
```

- [ ] **Step 3: Install dependencies and build**

```bash
cd /tmp/quartz-test
npm ci
npx quartz build
```

Expected: Build completes without errors. Output goes to `public/` directory.

- [ ] **Step 4: Verify output structure**

```bash
ls /tmp/quartz-test/public/
ls /tmp/quartz-test/public/projects/
ls /tmp/quartz-test/public/blog/
```

Expected: `index.html` at root, and `projects/` and `blog/` directories with their own `index.html` files.

- [ ] **Step 5: Local preview (optional)**

```bash
cd /tmp/quartz-test
npx quartz build --serve
```

Opens at `http://localhost:8080`. Verify:
- Landing page renders with title and nav links
- Projects and Blog sections are accessible
- Dark mode toggle works
- Search works
- Warm Terminal colors are applied

- [ ] **Step 6: Clean up**

```bash
rm -rf /tmp/quartz-test
```

---

### Task 11: Push and Deploy

- [ ] **Step 1: Push to GitHub**

```bash
cd /home/dpears/workspace/daviscodesbugs.github.io
git branch -M main
git push -u origin main
```

- [ ] **Step 2: Enable GitHub Pages**

This is a manual step in the GitHub web UI:
1. Go to `https://github.com/daviscodesbugs/daviscodesbugs.github.io/settings/pages`
2. Under **"Build and deployment"**, find the **"Source"** dropdown
3. Change it from "Deploy from a branch" to **"GitHub Actions"**
4. No other settings need to change — HTTPS is enforced by default for `*.github.io` sites

- [ ] **Step 3: Verify deployment**

After pushing, check the Actions tab in the GitHub repo. The workflow should:
1. Trigger on the push to `main`
2. Build successfully
3. Deploy to GitHub Pages

Once complete, verify the site is live at `https://daviscodesbugs.github.io`.

- [ ] **Step 4: Verify site content**

Check in a browser:
- Landing page loads with title and nav links
- `/projects/` shows the projects listing
- `/blog/` shows the blog listing
- `/about/` shows the about page
- Dark mode toggle works
- Search works
- Draft posts (sample-project, hello-world) are NOT visible
