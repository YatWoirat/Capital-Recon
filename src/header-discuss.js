/* ── Header Discuss Button (IntersectionObserver) ──────────────── */
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    const headerBtn = document.querySelector(".header-block-1 .button.discuss");

    const pageBtns = Array.from(document.querySelectorAll(".button.discuss"))
      .filter((btn) => !btn.closest(".header-block-1"));

    if (!headerBtn || pageBtns.length === 0) return;

    const visibleBtns = new Set();

    function hideBtn() {
      headerBtn.classList.remove("is-showing");
      headerBtn.classList.add("is-hiding");
    }

    function showBtn() {
      headerBtn.classList.remove("is-hiding");
      headerBtn.classList.add("is-showing");
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          visibleBtns.add(entry.target);
        } else {
          visibleBtns.delete(entry.target);
        }
      });
      if (visibleBtns.size > 0) {
        hideBtn();
      } else {
        showBtn();
      }
    }, { threshold: 0.5 });

    pageBtns.forEach(function (btn) {
      observer.observe(btn);
    });
  });
})();
