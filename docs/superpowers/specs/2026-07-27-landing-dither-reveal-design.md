# Landing Page Dither Reveal Design

**Date:** 2026-07-27
**Project:** daviscodesbugs.github.io

## Overview

A one-time visual reveal on the landing page's Voron photo. On page load the image resolves out of a coarse retro dither, rendered in the site's amber palette, over roughly 1.5 seconds. Once the reveal completes the WebGL layer destroys itself and removes its canvas, leaving the original `<img>` untouched.

The effect is adapted from [canvas-ui](https://github.com/DavidHDev/canvas-ui)'s `RetroDither` component.

### Why this effect

The site design spec names the visual theme **"Warm Terminal"** and pairs IBM Plex Mono with the body typography. A photograph resolving out of dithering reads as an old machine loading an image, which fits the maker/tinkerer character of the site. The intent is personality that is specific to this site rather than a generic flourish, consistent with the original spec's "personality without gimmicks."

### Scope

- One effect, on one image, on the landing page only.
- No other page is touched.
- No JavaScript build pipeline is added to the repository.

## Background: the html-in-canvas problem

canvas-ui's headline capability is the experimental [html-in-canvas](https://chromestatus.com/feature/5162535032373248) API, which lets WebGL read the live DOM as a texture. It requires Chrome or Edge 140+ with `chrome://flags/#canvas-draw-element` enabled, or a production origin trial token.

The canvas-ui README states that components "degrade gracefully to pure WebGL overlays" where the API is unavailable. **This is not true of `RetroDither` or `ParticleReveal`.** Both are DOM-capture-only. In `RetroDither`:

```js
function uploadContent() {
  if (!htmlInCanvas || !contentDirty) return;
  // ...texImage2D(..., source)
}
```

Without the API the content texture is never uploaded and remains the 1×1 transparent pixel set during initialisation, so the effect renders nothing. `ParticleReveal` has the same gate and additionally forces its `uCrisp` uniform to 1, disabling itself. The README's claim holds for the procedural components (Grid, Clouds, Liquid), which generate their own imagery and need no DOM capture.

Used unmodified, the effect would therefore be visible only in flagged Chrome or Edge. That is unacceptable for a landing page.

### Resolution

`RetroDither` references `htmlInCanvas` in only five places, and only the `uploadContent()` gate is meaningful for a static image source. The dither shader itself does not care where its texture came from.

Because the component is vendored into this repository rather than installed as a dependency, it is patched directly:

1. Remove the `!htmlInCanvas` condition from `uploadContent()`.
2. Expose `markDirty()` on the returned instance.
3. Draw the photo into the `source` canvas with ordinary 2D `drawImage`, then call `markDirty()`.

This yields universal WebGL2 support while retaining canvas-ui's shader, reduced-motion handling, `IntersectionObserver` pausing, resize logic, and context-loss recovery.

The patch is documented in a header comment in the vendored file so its divergence from upstream is obvious to anyone reading it.

## Architecture

### Components

**`.quartz/retro-dither.js`** — the vendored canvas-ui `RetroDitherVanilla.ts`, type-stripped to plain JavaScript and carrying the patch above. Self-contained: no imports, no `three.js`, no npm dependency. Exports `createRetroDither(elements, options)` and `supportsHtmlInCanvas()`.

**`.quartz/dither-reveal.js`** — the wrapper that owns all site-specific behaviour: finding the gallery image, building the canvases, driving the reveal animation, and tearing everything down. Roughly 40 lines. This is the only file that knows anything about this site.

The split matters: `retro-dither.js` stays a recognisable copy of upstream with one documented patch, so it can be re-synced later. All bespoke logic lives in `dither-reveal.js`.

### Data flow

```
<img> in gallery callout
        │
        ├─ drawn via 2D drawImage ──► source canvas (offscreen)
        │                                    │
        │                              markDirty()
        │                                    ▼
        │                          WebGL2 dither shader
        │                                    │
        └─ covered by ◄───────────── output canvas (overlaid, pointer-events: none)

        on completion: destroy() → remove output canvas → original <img> remains
```

### Reveal animation

`RetroDither` is natively a pointer-following lens: `radius` and `followSpeed` describe a dither spotlight tracking the cursor. That behaviour is not used here, because it does nothing on touch devices.

Instead the reveal drives `baseStrength`, which controls dither coverage across the entire surface independently of the cursor:

- `strength: 0` and the pointer lens effectively disabled
- `baseStrength` animated from `1` to `0` over ~1500ms on an ease-out curve
- `levels: 4`, `pixelSize: 3`
- `darkColor` and `lightColor` set from the site palette (`#1c1c1c` and `#f0a050`)
- on completion, `destroy()` and remove the output canvas

### Integration with Quartz

The site has an established pattern for custom client-side JavaScript, used by `lightbox.js`:

1. File lives in `.quartz/`
2. Mounted into `quartz/static/` by `docker-compose.yml` (local) and copied by `deploy.yml` (CI)
3. Pulled in from markdown with `<script src="/static/....js"></script>`
4. Initialised on both `DOMContentLoaded` and Quartz's `nav` event, because `enableSPA` is on

The new files follow this pattern exactly. No new mechanism is introduced.

## Interaction with existing behaviour

### The lightbox

`lightbox.js` binds a click handler to `.callout[data-callout="gallery"] img` and calls `preventDefault()` and `stopPropagation()`. The output canvas is therefore `pointer-events: none`, so clicks pass through to the image and lightbox behaviour is unchanged.

The reveal is not click-driven, so there is no contention for the gesture.

### Pre-existing dead link (not in scope)

The landing page markdown wraps the photo in a link to the Voron project page, but the lightbox's `preventDefault()` means that link never fires — clicking opens the lightbox instead. This predates this work and is left alone. Noted here only so it is not mistaken for a regression introduced by the reveal.

### SPA navigation and WebGL contexts

Browsers permit a limited number of live WebGL contexts (commonly around 16). Quartz's SPA navigation does not reload the page, so a component that acquires a context on every navigation without releasing it will eventually exhaust the limit and cause canvases to be dropped.

Two mitigations:

1. The instance is destroyed as soon as the reveal finishes, so a context is held for ~1.5 seconds rather than for the lifetime of the page.
2. The wrapper tracks its instance and calls `destroy()` on the `nav` event before creating another, so navigating away mid-reveal cannot leak.

## Failure modes

Every failure path ends at the same place: the ordinary photo, fully visible.

| Condition | Behaviour |
|---|---|
| JavaScript disabled | Plain `<img>`; the script never runs |
| No WebGL2 | `getContext` returns null, `createRetroDither` returns null, wrapper exits |
| Shader compile or link failure | `createRetroDither` returns null, wrapper exits |
| `prefers-reduced-motion: reduce` | Reveal skipped entirely; no canvas is created |
| Image not yet decoded | Reveal waits for `decode()`, and skips if it rejects |
| Gallery image absent (any other page) | Wrapper finds no target and exits |
| WebGL context lost mid-reveal | Instance destroyed, canvas removed, photo revealed immediately |

The image is never replaced or hidden — only temporarily covered by an overlay. If anything at all goes wrong, the overlay is simply never shown or is removed.

## Accessibility and performance

- **Reduced motion** is honoured by skipping the effect outright, not merely shortening it.
- **No layout shift.** The overlay canvas is absolutely positioned over the image, which retains its natural dimensions throughout.
- **No permanent cost.** The GPU work lasts about 1.5 seconds per landing-page visit and then stops completely, with the context released.
- **Offscreen safety.** `IntersectionObserver` in the vendored component pauses rendering if the image is not visible.
- **The `<img>` is unmodified**, so `alt` text, right-click-save, and assistive technology behave exactly as before.

## Testing

Manual verification against the local Quartz dev server, which already runs on port 8081:

1. Reveal plays on the landing page and the photo ends fully sharp
2. Overlay canvas is removed from the DOM after completion
3. Lightbox still opens on click, during and after the reveal
4. `prefers-reduced-motion: reduce` skips the effect
5. Repeated SPA navigation to and from the landing page does not accumulate canvases or WebGL contexts
6. No console errors
7. Other pages are unaffected
8. Emitted file count increases by exactly the two new static assets

Automated tests are not proposed. The repository has no JavaScript test infrastructure, and introducing one for a decorative effect is disproportionate.

## Out of scope

- Effects on any page other than the landing page
- Effects on text, navigation, or backgrounds
- The pointer-following lens behaviour
- html-in-canvas origin trial registration
- Fixing the dead project link behind the photo
- Any npm dependency, `package.json`, or bundler
