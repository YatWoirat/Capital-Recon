/* ── Overflow Detection ────────────────────────────────────────── */
(function () {
  "use strict";

  function initOverflow() {
    const SCROLL_SPEED = 5;   // px per second
    const MIN_DURATION = 12;  // seconds

    function checkOverflow() {
      // NEW system: .desc.text
      // LEGACY system: .case-text-description (OLD card class names)
      document.querySelectorAll(
        ".desc.text, .case-text-description, [data-field-classname-value~=\"case-text-description\"]",
      ).forEach((el) => {
        const overflow = el.scrollHeight - el.clientHeight;
        if (overflow > 2) {
          el.classList.add("has-overflow");
          el.style.setProperty("--scroll-distance", `-${overflow}px`);
          const duration = Math.max(overflow / SCROLL_SPEED, MIN_DURATION).toFixed(2);
          el.style.setProperty("--scroll-duration", `${duration}s`);
        } else {
          el.classList.remove("has-overflow");
          el.style.removeProperty("--scroll-distance");
          el.style.removeProperty("--scroll-duration");
        }
      });
    }

    // NEW system: re-check when .back panel finishes sliding in
    document.querySelectorAll(".back, [data-field-classname-value~=\"back\"]").forEach((panel) => {
      panel.addEventListener("transitionend", (e) => {
        if (e.propertyName === "transform") checkOverflow();
      });
    });

    // LEGACY system: re-check when .case-card-description finishes sliding in
    const legacyPanels = document.querySelectorAll(
      ".case-card-description, [data-field-classname-value~=\"case-card-description\"]",
    );
    if (legacyPanels.length > 0) {
      legacyPanels.forEach((panel) => {
        panel.addEventListener("transitionend", (e) => {
          if (e.propertyName === "transform") checkOverflow();
        });
      });
    }

    // Run after fonts load (inside cr:parsed so DOM is ready)
    document.fonts.ready.then(checkOverflow);
    window.addEventListener("load", checkOverflow);
    window.addEventListener("resize", checkOverflow);
  }

  document.addEventListener("cr:parsed", function () {
    initOverflow();
  });
})();
