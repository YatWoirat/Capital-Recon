/* -- capital-recon.com Main Loader ------------------------------- *
 * Loaded by bootstrap.js. Reads config from window.__CR.          *
 *                                                                  *
 * PROD:  jsDelivr CDN  -- cached, correct MIME types               *
 * DEV:   Git Blobs API -- fetches by SHA, zero cache issues        *
 * --------------------------------------------------------------- */
(function () {
  const cr        = window.__CR || {};
  const DEV_MODE  = cr.DEV_MODE !== false;
  const GH_USER   = cr.GH_USER   || "YatWoirat";
  const GH_REPO   = cr.GH_REPO   || "Capital-Recon";
  const GH_BRANCH = cr.GH_BRANCH || "master";

  const BASE_JSDELIVR = `https://cdn.jsdelivr.net/gh/${GH_USER}/${GH_REPO}@${GH_BRANCH}/src/`;
  const API_BASE      = `https://api.github.com/repos/${GH_USER}/${GH_REPO}`;

  const DEBUG = !!localStorage.getItem('__CR_DEBUG');

  let jsFiles  = [];
  let cssFiles = [];

  if (cr.extraJs)  jsFiles  = jsFiles.concat(cr.extraJs);
  if (cr.extraCss) cssFiles = cssFiles.concat(cr.extraCss);

  /* -- Fetch SHA map from GitHub Trees API ----------------------- *
   * Maps "src/filename" → SHA so we can call the Blobs API.       *
   * The blob fetch by SHA is the integrity guarantee itself.       *
   * ------------------------------------------------------------- */
  function fetchSHAMap() {
    return fetch(`${API_BASE}/git/trees/${GH_BRANCH}?recursive=1`)
      .then(res => res.json())
      .then(data => {
        const map = {};
        (data.tree || []).forEach(item => { map[item.path] = item.sha; });
        return map;
      })
      .catch(err => {
        console.warn(`[Loader] Could not fetch tree SHAs: ${err.message}`);
        return {};
      });
  }

  /* -- Fetch file content by SHA via Git Blobs API --------------- */
  function fetchBlobBySHA(sha) {
    return fetch(`${API_BASE}/git/blobs/${sha}`)
      .then(res => {
        if (!res.ok) throw new Error(`Blob fetch HTTP ${res.status}`);
        return res.json();
      })
      .then(data => atob(data.content.replace(/\n/g, "")));
  }

  /* -- Dev: log latest commit info ------------------------------- */
  function logLatestCommit() {
    return fetch(`${API_BASE}/commits?sha=${GH_BRANCH}&per_page=1`)
      .then(res => res.json())
      .then(commits => {
        if (!commits.length) return;
        const c    = commits[0];
        const sha  = c.sha.substring(0, 7);
        const date = new Date(c.commit.committer.date);
        const msg  = c.commit.message.split("\n")[0];
        const ago  = Math.round((Date.now() - date.getTime()) / 1000);
        const agoStr =
          ago < 60    ? `${ago}s ago` :
          ago < 3600  ? `${Math.round(ago / 60)}m ago` :
          ago < 86400 ? `${Math.round(ago / 3600)}h ago` :
                        `${Math.round(ago / 86400)}d ago`;
        console.log(
          `%c[Loader] Latest commit: ${sha} — "${msg}" (${agoStr})`,
          "color: #0af; font-weight: bold"
        );
        window.__CR_COMMIT = { sha, message: msg, date, ago: agoStr };
      })
      .catch(err => {
        console.warn(`[Loader] Could not fetch commit info: ${err.message}`);
      });
  }

  /* -- Dev: look up SHA from map, fetch blob --------------------- */
  function devFetchFile(filename, shaMap) {
    const repoPath = `src/${filename}`;
    const sha = shaMap[repoPath];
    if (!sha) {
      return Promise.reject(new Error(`${filename} not found in repo tree at "${repoPath}"`));
    }
    return fetchBlobBySHA(sha);
  }

  /* -- CSS loader ------------------------------------------------ */
  function loadCSS(filename, shaMap) {
    if (DEV_MODE) {
      return devFetchFile(filename, shaMap).then(css => {
        const style = document.createElement("style");
        style.textContent = css;
        document.head.appendChild(style);
      });
    } else {
      return new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.rel  = "stylesheet";
        link.href = `${BASE_JSDELIVR}${filename}`;
        link.onload  = resolve;
        link.onerror = () => reject(new Error(`Failed: ${filename}`));
        document.head.appendChild(link);
      });
    }
  }

  /* -- JS loader ------------------------------------------------- */
  function loadScript(filename, shaMap) {
    if (DEV_MODE) {
      return devFetchFile(filename, shaMap).then(code =>
        new Promise((resolve, reject) => {
          const blob = new Blob([code], { type: "application/javascript" });
          const s    = document.createElement("script");
          s.src     = URL.createObjectURL(blob);
          s.onload  = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        })
      );
    } else {
      return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src     = `${BASE_JSDELIVR}${filename}`;
        s.onload  = resolve;
        s.onerror = () => reject(new Error(`Failed: ${filename}`));
        document.head.appendChild(s);
      });
    }
  }

  /* -- Execution ------------------------------------------------- *
   * DEV:  commit info + SHA map -> load CSS -> load JS            *
   * PROD: CSS -> JS via jsDelivr (no extra API calls)             *
   * ------------------------------------------------------------- */
  const shaMapReady = DEV_MODE
    ? Promise.all([logLatestCommit(), fetchSHAMap()])
        .then(results => results[1])
    : Promise.resolve({});

  shaMapReady
    .then(shaMap =>
      cssFiles
        .reduce(
          (p, f) => p.then(() =>
            loadCSS(f, shaMap).catch(err => {
              console.error(`[Loader] CSS failed — ${f} — ${err.message}`);
            })
          ),
          Promise.resolve()
        )
        .then(() =>
          jsFiles.reduce(
            (p, f) => p.then(() =>
              loadScript(f, shaMap).catch(err => {
                console.error(`[Loader] JS failed — ${f} — ${err.message}`);
              })
            ),
            Promise.resolve()
          )
        )
    )
    .catch(err => {
      console.error(`[Loader] Aborted — ${err.message}`);
    });
})();