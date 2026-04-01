/* -- Capital Recon Bootstrap ------------------------------------ *
 * Paste this into a Tilda HTML block. It loads the main loader.   *
 *                                                                  *
 * DEV:  Fetches loader.js via Git Blobs API (by SHA, no cache)    *
 * PROD: Loads from jsDelivr CDN with correct MIME types           *
 * --------------------------------------------------------------- */
(function () {
  window.__CR = {
    DEV_MODE: true,
    GH_USER: "YatWoirat",
    GH_REPO: "Capital-Recon",
    GH_BRANCH: "master",
    extraJs: [],
    extraCss: [],
  };

  const c = window.__CR;
  const API_BASE = `https://api.github.com/repos/${c.GH_USER}/${c.GH_REPO}`;

  if (c.DEV_MODE) {
    /* -- Dev: fetch tree -> find loader.js SHA -> fetch blob ----- *
     * Content is addressed by hash, so CDN caching can't cause    *
     * stale reads or SHA mismatches.                               *
     * ------------------------------------------------------------ */
    fetch(`${API_BASE}/git/trees/${c.GH_BRANCH}?recursive=1`)
      .then(res => {
        if (!res.ok) throw new Error(`Tree API HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const entry = (data.tree || []).find(item => item.path === "src/loader.js");
        if (!entry) throw new Error("src/loader.js not found in repo tree");
        return fetch(`${API_BASE}/git/blobs/${entry.sha}`);
      })
      .then(res => {
        if (!res.ok) throw new Error(`Blob API HTTP ${res.status}`);
        return res.json();
      })
      .then(blob => {
        const code = atob(blob.content.replace(/\n/g, ""));
        c._loaderSource = code;
        const s = document.createElement("script");
        s.src = URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
        document.head.appendChild(s);
      })
      .catch(e => {
        console.error(`[Bootstrap] Failed to load loader: ${e.message}`);
      });
  } else {
    /* -- Prod: load from jsDelivr CDN --------------------------- */
    const base = `https://cdn.jsdelivr.net/gh/${c.GH_USER}/${c.GH_REPO}@${c.GH_BRANCH}/src/`;
    const s = document.createElement("script");
    s.src = `${base}loader.js`;
    s.onerror = () => console.error("[Bootstrap] Failed to load loader");
    document.head.appendChild(s);
  }
})();