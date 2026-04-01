/* ── Capital Recon Bootstrap ──────────────────────────────────── *
 * Paste this into a Tilda HTML block. It loads the main loader.   *
 * ─────────────────────────────────────────────────────────────── */
(function () {
  window.__CR = {
    DEV_MODE: true,
    GH_USER: "YatWoirat",
    GH_REPO: "Capital-Recon",
    GH_BRANCH: "master",
    // extraJs: ["sphere-animation.js"],
    // extraCss: ["css/page-specific.css"],
  };
  var c = window.__CR;
  var base = c.DEV_MODE
    ? "https://raw.githubusercontent.com/" + c.GH_USER + "/" + c.GH_REPO + "/" + c.GH_BRANCH + "/src/"
    : "https://cdn.jsdelivr.net/gh/" + c.GH_USER + "/" + c.GH_REPO + "@" + c.GH_BRANCH + "/src/";
  var url = base + "loader.js" + (c.DEV_MODE ? "?t=" + Date.now() : "");
  if (c.DEV_MODE) {
    fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    }).then(function (code) {
      c._loaderSource = code;
      var s = document.createElement("script");
      s.src = URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
      document.head.appendChild(s);
    }).catch(function (e) { console.error("[Bootstrap] Failed to load loader: " + e.message); });
  } else {
    var s = document.createElement("script");
    s.src = url;
    s.onerror = function () { console.error("[Bootstrap] Failed to load loader"); };
    document.head.appendChild(s);
  }
})();
