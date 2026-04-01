/* ── capital-recon.com Main Loader ─────────────────────────────── *
 * Loaded by bootstrap.js. Reads config from window.__CR.          *
 *                                                                  *
 * PROD:  jsDelivr CDN  – cached, correct MIME types               *
 * DEV:   raw.github     – instant after commit, fetch+blob trick  *
 *        + SHA verification against repo (including self-check)   *
 * ─────────────────────────────────────────────────────────────── */
(function () {
  var cr = window.__CR || {};
  var DEV_MODE  = cr.DEV_MODE !== false;
  var GH_USER   = cr.GH_USER   || "YatWoirat";
  var GH_REPO   = cr.GH_REPO   || "Capital-Recon";
  var GH_BRANCH = cr.GH_BRANCH || "master";

  var BASE_JSDELIVR =
    "https://cdn.jsdelivr.net/gh/" + GH_USER + "/" + GH_REPO + "@" + GH_BRANCH + "/src/";
  var BASE_RAW =
    "https://raw.githubusercontent.com/" + GH_USER + "/" + GH_REPO + "/" + GH_BRANCH + "/src/";
  var BASE = DEV_MODE ? BASE_RAW : BASE_JSDELIVR;

  /* ── Default files (loaded on every page) ───────────────────── */
  var jsFiles = [];
  var cssFiles = [];

  /* ── Merge per-page extras from bootstrap ───────────────────── */
  if (cr.extraJs)  jsFiles  = jsFiles.concat(cr.extraJs);
  if (cr.extraCss) cssFiles = cssFiles.concat(cr.extraCss);

  /* ── Git blob SHA-1 (same algorithm Git uses) ────────────────── */
  function gitBlobSHA1(content) {
    var raw = new TextEncoder().encode(content);
    var header = new TextEncoder().encode("blob " + raw.byteLength + "\0");
    var combined = new Uint8Array(header.byteLength + raw.byteLength);
    combined.set(header, 0);
    combined.set(raw, header.byteLength);
    return crypto.subtle.digest("SHA-1", combined).then(function (buf) {
      return Array.from(new Uint8Array(buf))
        .map(function (b) { return b.toString(16).padStart(2, "0"); })
        .join("");
    });
  }

  /* ── Fetch expected SHAs from GitHub Trees API ───────────────── */
  function fetchExpectedSHAs() {
    var url =
      "https://api.github.com/repos/" + GH_USER + "/" + GH_REPO + "/git/trees/" + GH_BRANCH + "?recursive=1";
    return fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var map = {};
        (data.tree || []).forEach(function (item) {
          map[item.path] = item.sha;
        });
        return map;
      })
      .catch(function (err) {
        console.warn("[Loader] Could not fetch tree SHAs: " + err.message);
        return {};
      });
  }

  /* ── Verify loaded content matches repo ──────────────────────── */
  function verifySHA(filename, content, expectedSHAs) {
    var repoPath = "src/" + filename;
    return gitBlobSHA1(content).then(function (loadedSHA) {
      var expected = expectedSHAs[repoPath];
      if (!expected) {
        console.warn(
          "[Loader] \u26a0 " + filename + " \u2014 not found in repo tree at \"" + repoPath + "\""
        );
      } else if (loadedSHA === expected) {
        console.log(
          "%c[Loader] \u2714 " + filename + " \u2014 SHA match (" + loadedSHA.substring(0, 7) + ")",
          "color: #0c0; font-weight: bold"
        );
      } else {
        console.warn(
          "[Loader] \u2718 " + filename + " \u2014 MISMATCH!\n" +
          "  Loaded:   " + loadedSHA.substring(0, 7) + "\n" +
          "  Expected: " + expected.substring(0, 7)
        );
      }
    });
  }

  /* ── Dev: self-check (verify loader.js itself) ───────────────── */
  function selfCheck(expectedSHAs) {
    var url = BASE_RAW + "loader.js?t=" + Date.now();
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (code) {
        return verifySHA("loader.js", code, expectedSHAs);
      })
      .catch(function (err) {
        console.warn("[Loader] Self-check failed: " + err.message);
      });
  }

  /* ── Dev: log latest commit info ─────────────────────────────── */
  function logLatestCommit() {
    var apiURL =
      "https://api.github.com/repos/" + GH_USER + "/" + GH_REPO + "/commits?sha=" + GH_BRANCH + "&per_page=1";
    return fetch(apiURL)
      .then(function (res) { return res.json(); })
      .then(function (commits) {
        if (!commits.length) return;
        var c = commits[0];
        var sha = c.sha.substring(0, 7);
        var date = new Date(c.commit.committer.date);
        var msg = c.commit.message.split("\n")[0];
        var ago = Math.round((Date.now() - date.getTime()) / 1000);
        var agoStr =
          ago < 60    ? ago + "s ago" :
          ago < 3600  ? Math.round(ago / 60) + "m ago" :
          ago < 86400 ? Math.round(ago / 3600) + "h ago" :
                        Math.round(ago / 86400) + "d ago";
        console.log(
          "%c[Loader] Latest commit: " + sha + " \u2014 \"" + msg + "\" (" + agoStr + ")",
          "color: #0af; font-weight: bold"
        );
        window.__CR_COMMIT = { sha: sha, message: msg, date: date, ago: agoStr };
      })
      .catch(function (err) {
        console.warn("[Loader] Could not fetch commit info: " + err.message);
      });
  }

  /* ── CSS loader ──────────────────────────────────────────────── */
  function loadCSS(url, filename, expectedSHAs) {
    if (DEV_MODE) {
      return fetch(url + "?t=" + Date.now())
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status + " \u2014 " + url);
          return res.text();
        })
        .then(function (css) {
          var style = document.createElement("style");
          style.textContent = css;
          document.head.appendChild(style);
          return verifySHA(filename, css, expectedSHAs);
        });
    } else {
      return new Promise(function (resolve, reject) {
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = url;
        link.onload = resolve;
        link.onerror = function () { reject(new Error("Failed: " + url)); };
        document.head.appendChild(link);
      });
    }
  }

  /* ── JS loader ───────────────────────────────────────────────── */
  function loadScript(url, filename, expectedSHAs) {
    if (DEV_MODE) {
      return fetch(url + "?t=" + Date.now())
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status + " \u2014 " + url);
          return res.text();
        })
        .then(function (code) {
          return verifySHA(filename, code, expectedSHAs).then(function () {
            return new Promise(function (resolve, reject) {
              var blob = new Blob([code], { type: "application/javascript" });
              var s = document.createElement("script");
              s.src = URL.createObjectURL(blob);
              s.onload = resolve;
              s.onerror = reject;
              document.head.appendChild(s);
            });
          });
        });
    } else {
      return new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = url;
        s.onload = resolve;
        s.onerror = function () { reject(new Error("Failed: " + url)); };
        document.head.appendChild(s);
      });
    }
  }

  /* ── Execution ───────────────────────────────────────────────── *
   * DEV:  commit info + tree SHAs → self-check → CSS → JS        *
   *       each file is verified against the repo after fetching   *
   * PROD: CSS → JS (no extra API calls)                           *
   * ───────────────────────────────────────────────────────────── */
  var shaMapReady = DEV_MODE
    ? Promise.all([logLatestCommit(), fetchExpectedSHAs()])
        .then(function (results) { return results[1]; })
    : Promise.resolve({});

  shaMapReady
    .then(function (expectedSHAs) {
      /* Self-check: verify loader.js itself is up to date */
      var selfCheckReady = DEV_MODE
        ? selfCheck(expectedSHAs)
        : Promise.resolve();

      return selfCheckReady.then(function () {
        return cssFiles
          .reduce(function (p, f) {
            return p.then(function () {
              return loadCSS(BASE + f, f, expectedSHAs).catch(function (err) {
                console.error("[Loader] CSS failed \u2014 " + f + " \u2014 " + err.message);
              });
            });
          }, Promise.resolve())
          .then(function () {
            return jsFiles.reduce(function (p, f) {
              return p.then(function () {
                return loadScript(BASE + f, f, expectedSHAs).catch(function (err) {
                  console.error("[Loader] JS failed \u2014 " + f + " \u2014 " + err.message);
                });
              });
            }, Promise.resolve());
          });
      });
    })
    .catch(function (err) {
      console.error("[Loader] Aborted \u2014 " + err.message);
    });
})();
