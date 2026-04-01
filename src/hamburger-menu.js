/* ── Hamburger Menu ────────────────────────────────────────────── */
(function () {
  "use strict";

  const BREAKPOINT_HAMBURGER = 640;

  function initBurgerMenu() {
    const header = document.querySelector(
      ".header-block-1, [data-field-classname-value~=\"header-block-1\"]",
    );
    if (!header) return;

    const burger = header.querySelector(".burger, [data-field-classname-value~=\"burger\"]");
    if (!burger) return;

    function openMenu()  { header.classList.add("is-open"); }
    function closeMenu() { header.classList.remove("is-open"); }
    function isOpen()    { return header.classList.contains("is-open"); }

    burger.addEventListener("click", (e) => {
      e.stopPropagation();
      isOpen() ? closeMenu() : openMenu();
    });

    // Close on click outside
    document.addEventListener("click", (e) => {
      if (isOpen() && !header.contains(e.target)) closeMenu();
    });

    // Close if viewport goes above mobile breakpoint
    window.addEventListener("resize", () => {
      if (window.innerWidth > BREAKPOINT_HAMBURGER) closeMenu();
    });
  }

  document.addEventListener("cr:parsed", function () {
    initBurgerMenu();
  });
})();
