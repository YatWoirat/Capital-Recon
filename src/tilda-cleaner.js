/* ── TildaCleaner ──────────────────────────────────────────────── */
(function () {
  "use strict";

  const TARGETS = [".tn-group", ".tn-elem", ".tn-atom"];
  const STRIP_CLASSES = ["t396__group", "t396__elem", "t396__elem-flex", "tn-group"];
  const DATA_PATTERN = /^data-(field|group)/;

  function removeStylesheets() {
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
      if (!node.dataset.cr) node.remove();
    });
  }

  function cleanElement(el) {
    el.removeAttribute("style");
    for (const attr of [...el.attributes]) {
      if (DATA_PATTERN.test(attr.name)) el.removeAttribute(attr.name);
    }
    STRIP_CLASSES.forEach(cls => el.classList.remove(cls));
  }

  let _parsed = false;
  const observer = new MutationObserver(() => cleanAll());

  function cleanAll() {
    observer.disconnect();
    removeStylesheets();
    TARGETS.forEach(sel =>
      document.querySelectorAll(sel).forEach(cleanElement)
    );
    if (window.FlatParser && !_parsed) {
      _parsed = true;
      window.FlatParser.parse();
    }
    document.dispatchEvent(new CustomEvent("cr:parsed"));
    observer.observe(document.body, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ["style"],
    });
  }

  window._crCleaner = {
    run: cleanAll,
    reset() { _parsed = false; },
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", cleanAll);
  else cleanAll();
})();
