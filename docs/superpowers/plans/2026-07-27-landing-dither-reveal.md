# Landing Page Dither Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Voron photo on the landing page resolve out of a retro dither in the site's amber palette over ~1.5 seconds on load, then remove itself entirely.

**Architecture:** Vendor canvas-ui's `RetroDitherVanilla.ts` into `.quartz/retro-dither.js` as a classic (IIFE) script with a small documented patch that lets its texture come from an ordinary 2D `drawImage` instead of the experimental html-in-canvas API. A separate ~60-line wrapper, `.quartz/dither-reveal.js`, owns all site-specific behaviour: finding the gallery image, overlaying a canvas, animating `baseStrength` from 1 to 0, then destroying the instance and removing the canvas.

**Tech Stack:** Vanilla JavaScript, WebGL2, Quartz v4.5.2, SCSS. No npm dependency and no build pipeline is added to the repository; transpilation happens once in a throwaway Docker container.

**Spec:** `docs/superpowers/specs/2026-07-27-landing-dither-reveal-design.md`

## Global Constraints

- No `package.json`, no bundler, and no npm dependency may be added to this repository.
- Follow the existing custom-JS pattern used by `lightbox.js`: file in `.quartz/`, mounted to `quartz/static/`, loaded with a plain `<script src="/static/....js">`, initialised on both `DOMContentLoaded` and Quartz's `nav` event.
- Scripts are **classic scripts, not ES modules**. `lightbox.js` is a classic script; do not introduce `type="module"`.
- The overlay canvas must be `pointer-events: none` so `lightbox.js` click behaviour is unaffected.
- `prefers-reduced-motion: reduce` must skip the effect entirely, not shorten it.
- Every failure path must end with the plain `<img>` visible. The image is never replaced or hidden, only temporarily covered.
- The WebGL instance must be destroyed when the reveal completes and on the `nav` event, so SPA navigation cannot exhaust WebGL contexts.
- Palette values, exact: dark `#1c1c1c` = `[0.110, 0.110, 0.110]`, light `#f0a050` = `[0.941, 0.627, 0.314]`.
- Reveal duration, exact: `1500` ms, easing `easeOutCubic`.
- Quartz is pinned to `v4.5.2`. Do not change that pin.
- Local dev server runs on port 8081 via `docker compose up` from the repo root.

---

### Task 1: Vendor and patch the RetroDither component

Produces `.quartz/retro-dither.js`, a classic script exposing a global with a working texture path that does not require html-in-canvas.

**Files:**
- Create: `.quartz/retro-dither.js`
- Scratch (not committed): `/tmp/dither-build/retro-dither.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: global `window.CanvasUIRetroDither` with:
  - `createRetroDither(elements, options) -> instance | null`
    - `elements`: `{ source: HTMLCanvasElement, content: HTMLElement, output: HTMLCanvasElement }`
    - `options`: partial `RetroDitherOptions` (`radius`, `softness`, `pixelSize`, `levels`, `darkColor`, `lightColor`, `colorize`, `contrast`, `brightness`, `strength`, `baseStrength`, `invert`, `scanlines`, `followSpeed`)
    - `instance`: `{ setOptions(options), resize(), destroy(), markDirty() }`
  - `supportsHtmlInCanvas() -> boolean`

- [ ] **Step 1: Fetch the upstream source**

```bash
mkdir -p /tmp/dither-build && cd /tmp/dither-build
curl -sfL https://raw.githubusercontent.com/DavidHDev/canvas-ui/main/src/lib/RetroDither/RetroDitherVanilla.ts \
  -o retro-dither.ts
wc -l retro-dither.ts
```

Expected: about 463 lines.

- [ ] **Step 2: Verify the two patch sites exist before editing**

```bash
cd /tmp/dither-build
grep -n "if (!htmlInCanvas || !contentDirty) return;" retro-dither.ts
grep -n "    resize() {" retro-dither.ts
```

Expected: exactly one match each. If either returns nothing, upstream has changed — stop and re-read the file rather than guessing.

- [ ] **Step 3: Apply patch 1 — ungate the texture upload**

In `/tmp/dither-build/retro-dither.ts`, replace:

```ts
    if (!htmlInCanvas || !contentDirty) return;
```

with:

```ts
    if (!contentDirty) return;
```

Rationale: upstream only uploads the content texture when html-in-canvas painted into the source canvas. We paint into it ourselves with 2D `drawImage`, so the upload must not be gated on that API.

- [ ] **Step 4: Apply patch 2 — expose markDirty()**

In the returned instance object, replace:

```ts
    resize() {
      syncCanvasSize();
      start();
    },
```

with:

```ts
    resize() {
      syncCanvasSize();
      start();
    },
    markDirty() {
      contentDirty = true;
      start();
    },
```

Rationale: `contentDirty` is private and is only ever set by the html-in-canvas `onpaint` callback. Callers that fill the source canvas themselves need a way to signal that a texture upload is due.

- [ ] **Step 5: Transpile to a classic script**

esbuild runs inside a throwaway container, so nothing is installed into this repository.

```bash
cd /tmp/dither-build
docker run --rm -v "$PWD:/w" -w /w node:22-slim \
  npx --yes esbuild@0.25.0 retro-dither.ts \
    --loader:.ts=ts \
    --bundle \
    --format=iife \
    --global-name=CanvasUIRetroDither \
    --target=es2020 \
    --outfile=retro-dither.js
wc -c retro-dither.js
```

Expected: a `retro-dither.js` of roughly 15-20 KB, exit code 0.

- [ ] **Step 6: Verify the patches survived transpilation**

```bash
cd /tmp/dither-build
grep -c "markDirty" retro-dither.js
grep -c "htmlInCanvas || !contentDirty" retro-dither.js
```

Expected: `markDirty` count >= 1, and the old gate count exactly `0`.

- [ ] **Step 7: Install with a provenance header**

Copy the file into `.quartz/retro-dither.js` and prepend this header verbatim:

```js
// Vendored from canvas-ui: src/lib/RetroDither/RetroDitherVanilla.ts
// https://github.com/DavidHDev/canvas-ui  (MIT + Commons Clause)
//
// Transpiled from TypeScript to a classic IIFE script exposing the global
// `CanvasUIRetroDither`. Two deliberate patches were applied to the source:
//
//   1. uploadContent() no longer requires html-in-canvas.
//        - if (!htmlInCanvas || !contentDirty) return;
//        + if (!contentDirty) return;
//      Upstream only uploads the content texture when the experimental
//      html-in-canvas API has painted the DOM into the source canvas. That API
//      needs Chrome/Edge 140+ with a flag, so unpatched the effect renders
//      nothing for virtually every visitor. We fill the source canvas with an
//      ordinary 2D drawImage instead, so the upload must not be gated on it.
//
//   2. markDirty() added to the returned instance.
//      + markDirty() { contentDirty = true; start(); }
//      contentDirty is private and is only set by the html-in-canvas onpaint
//      callback. Callers filling the source canvas themselves need to signal
//      that a texture upload is due.
//
// Do not edit further. Site-specific behaviour belongs in dither-reveal.js.
```

- [ ] **Step 8: Verify it parses and exposes the global**

```bash
cd /home/dpears/workspace/daviscodesbugs.github.io
docker run --rm -v "$PWD/.quartz:/w" -w /w node:22-slim \
  node -e "eval(require('fs').readFileSync('retro-dither.js','utf8')); \
           if (typeof CanvasUIRetroDither.createRetroDither !== 'function') { \
             console.error('FAIL: createRetroDither missing'); process.exit(1); } \
           console.log('OK: global exposes', Object.keys(CanvasUIRetroDither).join(', '));"
```

Expected: `OK: global exposes createRetroDither, supportsHtmlInCanvas` (order may vary). Exit code 0.

- [ ] **Step 9: Commit**

```bash
cd /home/dpears/workspace/daviscodesbugs.github.io
git add .quartz/retro-dither.js
git commit -m "feat: vendor canvas-ui RetroDither with a texture-source patch

Adds canvas-ui's RetroDither as a classic script. Two patches are applied and
documented in the file header: the content texture upload no longer requires
the experimental html-in-canvas API, and markDirty() is exposed so a caller
that fills the source canvas itself can trigger an upload.

Without the first patch the effect renders nothing outside Chrome or Edge with
chrome://flags/#canvas-draw-element enabled, because the texture stays the 1x1
transparent pixel set during initialisation."
```

---

### Task 2: Build the reveal wrapper and its styles

Produces the site-specific behaviour. At the end of this task the effect works locally.

**Files:**
- Create: `.quartz/dither-reveal.js`
- Modify: `.quartz/custom.scss` (append to end)

**Interfaces:**
- Consumes: `window.CanvasUIRetroDither.createRetroDither(elements, options)` and `instance.markDirty()`, `instance.setOptions()`, `instance.destroy()` from Task 1.
- Produces: nothing consumed by later tasks. Self-initialising on `DOMContentLoaded` and `nav`.

- [ ] **Step 1: Write the wrapper**

Create `.quartz/dither-reveal.js` with exactly this content:

```js
// One-time retro dither reveal for the landing page gallery image.
// Depends on retro-dither.js having defined window.CanvasUIRetroDither.
//
// The photo is drawn into an offscreen source canvas, a WebGL canvas is laid
// over it, and baseStrength is animated 1 -> 0 so the image resolves out of a
// dither. On completion everything is destroyed and removed, leaving the
// original <img>. Every failure path exits leaving the plain photo visible.
(function () {
  var REVEAL_MS = 1500;
  var DARK = [0.110, 0.110, 0.110];  // #1c1c1c
  var LIGHT = [0.941, 0.627, 0.314]; // #f0a050

  var instance = null;
  var canvas = null;
  var raf = 0;

  function teardown() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (instance) {
      try { instance.destroy(); } catch (e) {}
      instance = null;
    }
    if (canvas && canvas.parentNode) { canvas.parentNode.removeChild(canvas); }
    canvas = null;
  }

  function begin(img) {
    var width = img.clientWidth;
    var height = img.clientHeight;
    if (!width || !height) return;

    var api = window.CanvasUIRetroDither;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    var source = document.createElement("canvas");
    source.width = Math.max(1, Math.round(width * dpr));
    source.height = Math.max(1, Math.round(height * dpr));
    var sourceCtx = source.getContext("2d");
    if (!sourceCtx) return;
    try {
      sourceCtx.drawImage(img, 0, 0, source.width, source.height);
    } catch (e) {
      return;
    }

    // The canvas must be in the DOM before createRetroDither runs, because the
    // component sizes its backing store from output.clientWidth on init.
    canvas = document.createElement("canvas");
    canvas.className = "dither-reveal-canvas";
    canvas.setAttribute("aria-hidden", "true");
    img.parentElement.classList.add("dither-reveal-host");
    img.parentElement.appendChild(canvas);

    instance = api.createRetroDither(
      { source: source, content: img, output: canvas },
      {
        radius: 0,
        softness: 1,
        strength: 0,
        baseStrength: 1,
        followSpeed: 1,
        pixelSize: 3,
        levels: 4,
        darkColor: DARK,
        lightColor: LIGHT,
        colorize: 0.85,
        contrast: 0.6,
        brightness: 0,
        invert: 0,
        scanlines: 0.06
      }
    );

    if (!instance) { teardown(); return; }
    instance.markDirty();

    var started = 0;
    raf = requestAnimationFrame(function step(now) {
      if (!instance) return;
      if (!started) started = now;
      var p = Math.min(1, (now - started) / REVEAL_MS);
      var eased = 1 - Math.pow(1 - p, 3);
      try {
        instance.setOptions({ baseStrength: 1 - eased });
      } catch (e) {
        teardown();
        return;
      }
      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        teardown();
      }
    });
  }

  function initDitherReveal() {
    teardown();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var api = window.CanvasUIRetroDither;
    if (!api || typeof api.createRetroDither !== "function") return;

    var img = document.querySelector('.callout[data-callout="gallery"] img');
    if (!img || !img.parentElement) return;

    if (img.complete && img.naturalWidth) {
      begin(img);
    } else {
      img.addEventListener("load", function () { begin(img); }, { once: true });
    }
  }

  document.addEventListener("DOMContentLoaded", initDitherReveal);
  document.addEventListener("nav", initDitherReveal);
})();
```

- [ ] **Step 2: Add the styles**

Append to the end of `.quartz/custom.scss`:

```scss
// Dither reveal overlay for the landing page gallery image.
// The host is the <a> wrapping the image; it needs a positioning context.
// The canvas must not intercept clicks or the lightbox stops working.
.dither-reveal-host {
  position: relative;
  display: inline-block;
}

.dither-reveal-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
```

- [ ] **Step 3: Mount both files into the local dev server**

In `docker-compose.yml`, immediately after the existing `lightbox.js` line, add:

```yaml
      - ./.quartz/retro-dither.js:/quartz/quartz/static/retro-dither.js:ro
      - ./.quartz/dither-reveal.js:/quartz/quartz/static/dither-reveal.js:ro
```

- [ ] **Step 4: Load the scripts from the landing page**

In `index.md`, replace this line:

```markdown
<script src="/static/lightbox.js"></script>
```

with:

```markdown
<script src="/static/lightbox.js"></script>
<script src="/static/retro-dither.js"></script>
<script src="/static/dither-reveal.js"></script>
```

Order matters: `retro-dither.js` must define the global before `dither-reveal.js` runs.

- [ ] **Step 5: Restart the dev server and verify the assets are served**

```bash
cd /home/dpears/workspace/daviscodesbugs.github.io
docker compose down && docker compose up -d
sleep 15
for f in retro-dither.js dither-reveal.js lightbox.js; do
  printf "%-22s %s\n" "$f" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8081/static/$f)"
done
```

Expected: `200` for all three.

- [ ] **Step 6: Verify the reveal runs and cleans itself up**

Open `http://localhost:8081/` in the browser, then evaluate:

```js
// immediately after load: canvas should exist
document.querySelectorAll('.dither-reveal-canvas').length
```

Expected: `1` during the first ~1.5s.

Wait 2 seconds, then evaluate again:

```js
({
  canvases: document.querySelectorAll('.dither-reveal-canvas').length,
  imgVisible: !!document.querySelector('.callout[data-callout="gallery"] img').clientWidth
})
```

Expected: `{ canvases: 0, imgVisible: true }` — the overlay removed itself and the photo remains.

- [ ] **Step 7: Verify the lightbox still works**

In the browser, click the Voron photo, then evaluate:

```js
!!document.querySelector('.lightbox-overlay.active')
```

Expected: `true`. Press Escape to close.

- [ ] **Step 8: Verify SPA navigation does not leak canvases**

In the browser, navigate to Projects, back to Home, to Blog, and back to Home. Then wait 2 seconds and evaluate:

```js
document.querySelectorAll('.dither-reveal-canvas').length
```

Expected: `0`. Any value above 1 means `teardown()` is not being called on `nav`.

- [ ] **Step 9: Verify reduced motion skips the effect**

In the browser DevTools, enable "Emulate CSS prefers-reduced-motion: reduce", reload the landing page, then evaluate:

```js
document.querySelectorAll('.dither-reveal-canvas').length
```

Expected: `0` at all times, including immediately after load. Turn the emulation back off afterwards.

- [ ] **Step 10: Verify no console errors**

With the browser console open, reload the landing page and confirm there are no errors. Shader compile failures surface here as `RetroDither shader error:`.

- [ ] **Step 11: Commit**

```bash
cd /home/dpears/workspace/daviscodesbugs.github.io
git add .quartz/dither-reveal.js .quartz/custom.scss docker-compose.yml index.md
git commit -m "feat: dither reveal on the landing page photo

The Voron photo now resolves out of a 4-level dither in the site's amber
palette over 1.5 seconds, then the effect destroys itself and removes its
canvas, leaving the original image untouched.

The overlay is pointer-events: none so the lightbox is unaffected, the
instance is destroyed on the nav event so SPA navigation cannot exhaust WebGL
contexts, and prefers-reduced-motion skips the effect entirely. Every failure
path leaves the plain photo visible."
```

---

### Task 3: Ship it through CI

Adds the two assets to the deploy workflow and confirms the live site.

**Files:**
- Modify: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `.quartz/retro-dither.js` and `.quartz/dither-reveal.js` from Tasks 1 and 2.
- Produces: nothing.

- [ ] **Step 1: Copy the assets in the workflow**

In `.github/workflows/deploy.yml`, immediately after the existing line:

```yaml
          cp .quartz/lightbox.js quartz/quartz/static/lightbox.js
```

add:

```yaml
          cp .quartz/retro-dither.js quartz/quartz/static/retro-dither.js
          cp .quartz/dither-reveal.js quartz/quartz/static/dither-reveal.js
```

- [ ] **Step 2: Validate the workflow still parses**

```bash
cd /home/dpears/workspace/daviscodesbugs.github.io
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml')); print('yaml OK')"
```

Expected: `yaml OK`.

- [ ] **Step 3: Confirm the local emitted file count grew by exactly two**

```bash
cd /home/dpears/workspace/daviscodesbugs.github.io
docker exec daviscodesbugsgithubio-quartz-1 sh -c 'ls /quartz/public/static/'
```

Expected: the listing includes `retro-dither.js` and `dither-reveal.js` alongside `lightbox.js`.

- [ ] **Step 4: Commit and push**

```bash
cd /home/dpears/workspace/daviscodesbugs.github.io
git add .github/workflows/deploy.yml
git commit -m "ci: publish the dither reveal assets

Copies retro-dither.js and dither-reveal.js into the Quartz static directory
during the build, alongside the existing lightbox.js."
git push origin main
```

- [ ] **Step 5: Verify the deploy succeeded**

```bash
sleep 120
curl -s "https://api.github.com/repos/daviscodesbugs/daviscodesbugs.github.io/actions/runs?per_page=1" \
  | python3 -c "import json,sys; r=json.load(sys.stdin)['workflow_runs'][0]; print(r['status'], r['conclusion'], r['head_sha'][:7])"
```

Expected: `completed success <sha>`.

- [ ] **Step 6: Verify the live assets and that nothing regressed**

```bash
for f in retro-dither.js dither-reveal.js lightbox.js; do
  printf "%-22s %s\n" "$f" "$(curl -s -o /dev/null -w '%{http_code}' https://daviscodesbugs.github.io/static/$f)"
done
for u in / /about /projects/ /blog/; do
  printf "%-22s %s\n" "$u" "$(curl -sL -o /dev/null -w '%{http_code}' https://daviscodesbugs.github.io$u)"
done
for u in /Dockerfile /docs/; do
  printf "%-22s %s (want 404)\n" "$u" "$(curl -sL -o /dev/null -w '%{http_code}' https://daviscodesbugs.github.io$u)"
done
```

Expected: `200` for all three assets and all four pages; `404` for the two leak checks.

- [ ] **Step 7: Confirm the reveal on the live site**

Load `https://daviscodesbugs.github.io/` in the browser and confirm the photo resolves out of the dither and that no overlay canvas remains after two seconds.

---

## Notes for the implementer

**Why the canvas is appended before `createRetroDither` is called.** The component runs `syncCanvasSize()` during initialisation, which reads `output.clientWidth` and `output.clientHeight` to size the WebGL backing store. A canvas that is not yet in the document reports zero for both, producing a 1×1 render target and a blank effect.

**Why one `markDirty()` is enough.** `uploadContent()` sets `contentDirty = false` immediately after uploading. The source canvas holds a static photo that never changes, so a single upload is all that is required; the texture persists for the life of the instance.

**Why the pointer lens is disabled.** `RetroDither` is natively a dither spotlight that follows the cursor (`radius`, `followSpeed`). That does nothing on touch devices, so the reveal drives `baseStrength` — which applies across the whole surface independently of the pointer — and neutralises the lens with `radius: 0, strength: 0`.

**If the effect renders but looks wrong rather than absent**, the likely cause is `colorize`. At `0` the component keeps the photo's own colours and only quantises brightness; at `1` it maps fully onto the dark/light palette. `0.85` favours the amber palette while retaining some of the photograph. Adjust that value first before touching anything else.

**Deliberate deviation from the spec.** The spec describes waiting on `img.decode()`. The wrapper uses `img.complete && img.naturalWidth` with a `load` fallback instead. Both guarantee the image is ready to draw, but the latter needs no promise-rejection path and works in browsers without `decode()`. The observable behaviour is identical.

**Do not attempt to make the lightbox link work.** The landing page markdown wraps the photo in a link to the Voron project page which `lightbox.js` suppresses with `preventDefault()`. That predates this work and is explicitly out of scope.
