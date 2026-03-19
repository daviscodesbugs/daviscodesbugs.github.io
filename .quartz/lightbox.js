// Lightbox for gallery images
function initLightbox() {
  // Don't create duplicate overlays
  let overlay = document.querySelector(".lightbox-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    document.body.appendChild(overlay);

    overlay.addEventListener("click", closeLightbox);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLightbox();
    });
  }

  function closeLightbox() {
    overlay.classList.remove("active");
    setTimeout(() => { overlay.innerHTML = ""; }, 200);
  }

  document.querySelectorAll('.callout[data-callout="gallery"] img').forEach((img) => {
    img.style.cursor = "zoom-in";
    img.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const clone = document.createElement("img");
      clone.src = img.src;
      clone.alt = img.alt || "";
      overlay.innerHTML = "";
      overlay.appendChild(clone);
      overlay.classList.add("active");
    });
  });
}

// Run on initial load and on Quartz SPA navigation
document.addEventListener("DOMContentLoaded", initLightbox);
document.addEventListener("nav", initLightbox);
