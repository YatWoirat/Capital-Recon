/* ── TildaCleaner ──────────────────────────────────────────────── */
(function () {
  "use strict";

  const LOG_PREFIX = "[TildaCleaner]";
  const log = (...a) => console.log(LOG_PREFIX, ...a);

  // ── Config ──────────────────────────────────────────────────
  const TARGETS = [".tn-group", ".tn-elem", ".tn-atom"];
  const CLEAN_DELAY = 0;

  const STRIP_CLASSES = [
    "t396__group",
    "t396__elem",
    "t396__elem-flex",
    "tn-group",
  ];

  const STRIP_DATA = [
    "data-field-top-value",
    "data-field-left-value",
    "data-field-height-value",
    "data-field-width-value",
    "data-field-axisy-value",
    "data-field-axisx-value",
    "data-field-container-value",
    "data-field-topunits-value",
    "data-field-leftunits-value",
    "data-field-heightunits-value",
    "data-field-widthunits-value",
    "data-field-textfit-value",
    "data-field-widthmode-value",
    "data-field-heightmode-value",
    "data-field-fontsize-value",
    "data-field-top-res-640-value",
    "data-field-left-res-640-value",
    "data-field-filewidth-value",
    "data-field-fileheight-value",
    "data-field-height-res-960-value",
    "data-fields",
    "data-group-type-value",
    "data-group-top-value",
    "data-group-left-value",
    "data-group-height-value",
    "data-group-width-value",
    "data-group-topunits-value",
    "data-group-leftunits-value",
    "data-group-padding",
    "data-group-flex",
    "data-group-flexdirection",
    "data-group-flexalignitems",
    "data-group-widthmode",
    "data-group-heightmode",
    "data-group-top-res-640-value",
    "data-group-height-res-640-value",
    "data-group-left-res-640-value",
    "data-group-width-res-640-value",
    "data-group-height-res-960-value",
  ];

  // Style tags with these IDs are never touched
  const MY_STYLE_IDS = ["my-styles"];
  const TILDA_SHEET_HINTS = ["tilda", "tildacdn", "tilda.ws"];

  // ── Sheet Detection ──────────────────────────────────────────
  function isTildaSheet(sheet) {
    if (MY_STYLE_IDS.includes(sheet.ownerNode?.id)) return false;
    const href = sheet.href || "";
    if (href === "") return true;
    return TILDA_SHEET_HINTS.some((h) => href.includes(h));
  }

  // ── Stylesheet Cleaning ───────────────────────────────────────
  function removeUnwantedStylesheets() {
    const styleNodes = document.querySelectorAll(
      'style, link[rel="stylesheet"]',
    );
    let removedCount = 0;

    styleNodes.forEach((node) => {
      if (node.id && MY_STYLE_IDS.includes(node.id)) return;
      if (node.id === "flat-parser-fouc") return;
      node.remove();
      removedCount++;
    });

    log(`Removed ${removedCount} unwanted stylesheets.`);
  }

  // ── Element Cleaning ─────────────────────────────────────────
  function cleanElement(el) {
    if (el.hasAttribute("style")) el.removeAttribute("style");
    STRIP_DATA.forEach((attr) => el.removeAttribute(attr));
    STRIP_CLASSES.forEach((cls) => el.classList.remove(cls));
  }

  // ── Main ─────────────────────────────────────────────────────
  let _parsed = false;

  const observer = new MutationObserver(() => {
    cleanAll();
  });

  function cleanAll() {
    observer.disconnect();

    removeUnwantedStylesheets();

    TARGETS.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        cleanElement(el);
      });
    });

    if (window.FlatParser && !_parsed) {
      _parsed = true;
      window.FlatParser.parse();
      // Signal post-parse initializers
      document.dispatchEvent(new CustomEvent("cr:parsed"));
    }

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });
  }

  // Expose for Ctrl+Shift+P reset (reset() clears the _parsed flag)
  window._crCleaner = {
    run: cleanAll,
    reset: function () { _parsed = false; },
  };

  log("Loaded, running with", CLEAN_DELAY, "ms delay");

  function startCleaner() {
    if (CLEAN_DELAY > 0) setTimeout(cleanAll, CLEAN_DELAY);
    else cleanAll();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cleanAll);
  } else {
    startCleaner();
  }
})();
