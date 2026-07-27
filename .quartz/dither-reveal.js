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
