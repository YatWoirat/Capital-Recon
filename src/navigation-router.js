/* ── Navigation Router ─────────────────────────────────────────── */
(function () {
  "use strict";

  const routes = {
    home:         "/home",
    services:     "/services",
    cases:        "/cases",
    researches:   "/researches",
    publications: "/publications",
    media:        "/media",
    about:        "/about",
    discuss:      "/home#discuss",
  };

  // Use a class instead of inline style — inline styles get stripped by TildaCleaner
  // Both .button and .clickable .card elements can carry route classes
  document.querySelectorAll(".button, .card.clickable").forEach((btn) => {
    const hasRoute = [...btn.classList].some((cls) => routes[cls]);
    if (hasRoute) btn.classList.add("has-route");
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".button, .card.clickable");
    if (!btn) return;
    const page = [...btn.classList].find((cls) => routes[cls]);
    if (page) {
      e.stopImmediatePropagation();
      window.location.href = routes[page];
    }
  });
})();
