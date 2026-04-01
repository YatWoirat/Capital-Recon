/* ── Background Sphere Animation ──────────────────────────────── */
(function () {
  "use strict";

  const sphereConfig = {
    breakpoint: 980,
    background: [
      { size: 1500, startX: 5,   startY: 10, duration: 9000,  delay: 0    },
      { size: 1500, startX: 120, startY: 70, duration: 12000, delay: 3000 },
    ],
    cursor: {
      size:  900,
      speed: 1500,
    },
  };

  const sphereStyles = {
    backgroundSpheres: [
      "radial-gradient(circle, #0B3954, transparent 70%)",
      "radial-gradient(circle, #0B3954, transparent 70%)",
    ],
    cursorSphere:
      "radial-gradient(circle, #0B3954 0%, #0B3954 10%, transparent 70%)",
    floatPaths: [
      {
        "0%":   [   0,   0 ],
        "25%":  [  40, -30 ],
        "50%":  [ -20,  45 ],
        "75%":  [ -40, -15 ],
        "100%": [   0,   0 ],
      },
      {
        "0%":   [   0,  0 ],
        "33%":  [ -50, 25 ],
        "66%":  [  30, 50 ],
        "100%": [   0,  0 ],
      },
    ],
  };

  function createSphere({ size, color, startX = 0, startY = 0 }) {
    const el = document.createElement("div");
    el.style.cssText = `
      width:          ${size}px;
      height:         ${size}px;
      border-radius:  50%;
      background:     ${color};
      position:       absolute;
      left:           ${startX}%;
      top:            ${startY}%;
      pointer-events: none;
      opacity:        1;
      transition:     opacity 0.3s;
      transform:      translate(-50%, -50%);
    `;
    return el;
  }

  function buildFloatKeyframes() {
    const rules = sphereStyles.floatPaths.map((path, i) => {
      const stops = Object.entries(path)
        .map(([pct, [x, y]]) => `${pct} { translate: ${x}px ${y}px; }`)
        .join("\n    ");
      return `@keyframes float-${i} {\n    ${stops}\n  }`;
    });
    const style = document.createElement("style");
    style.textContent = rules.join("\n");
    document.head.appendChild(style);
  }

  function initBackgroundSpheres(block) {
    buildFloatKeyframes();
    sphereConfig.background.forEach((cfg, i) => {
      const sphere = createSphere({ ...cfg, color: sphereStyles.backgroundSpheres[i] });
      sphere.style.animation =
        `float-${i} ${cfg.duration}ms ease-in-out ${cfg.delay}ms infinite`;
      block.appendChild(sphere);
    });
  }

  function initCursorSphere(block) {
    const { size, speed } = sphereConfig.cursor;
    const sphere = createSphere({ size, color: sphereStyles.cursorSphere, startX: 0, startY: 0 });
    sphere.style.opacity   = "0";
    sphere.style.transform = "translate(-9999px, -9999px)";
    block.appendChild(sphere);

    const half = size / 2;

    function onMove(e) {
      const br = block.getBoundingClientRect();
      const x  = e.clientX - br.left - half;
      const y  = e.clientY - br.top  - half;
      sphere.animate(
        { transform: `translate(${x}px, ${y}px)` },
        { duration: speed, fill: "forwards" },
      );
    }

    function show() { sphere.style.opacity = "1"; }
    function hide() { sphere.style.opacity = "0"; }

    function onResize() {
      if (window.innerWidth >= sphereConfig.breakpoint) {
        block.addEventListener("pointermove", onMove);
        block.addEventListener("pointermove", show);
        block.addEventListener("mouseleave",  hide);
      } else {
        block.removeEventListener("pointermove", onMove);
        block.removeEventListener("pointermove", show);
        block.removeEventListener("mouseleave",  hide);
        hide();
      }
    }

    window.addEventListener("resize", onResize);
    onResize();
  }

  function initSpheresIfHomePage() {
    if (!window.location.pathname.startsWith("/home")) return;
    const block = document.querySelector(
      ".homepage-block-1, [data-field-classname-value~=\"homepage-block-1\"]",
    );
    if (!block) return;
    if (getComputedStyle(block).position === "static") {
      block.style.position = "relative";
    }
    block.style.overflow = "hidden";
    initBackgroundSpheres(block);
    initCursorSphere(block);
  }

  document.addEventListener("cr:parsed", function () {
    initSpheresIfHomePage();
  });
})();
