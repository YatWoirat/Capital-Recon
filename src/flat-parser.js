/* ── FlatParser v2.0.0 ─────────────────────────────────────────── */
(function () {
  "use strict";

  const _foucStyle = document.createElement("style");
  _foucStyle.id = "flat-parser-fouc";
  _foucStyle.textContent = "[data-component] { opacity: 0 !important; }";
  (document.head || document.documentElement).appendChild(_foucStyle);

  // ── Config ─────────────────────────────────────────────────
  const PATH_ATTR = "data-p";
  const COMPONENT_ATTR = "data-component";
  const FOUC_DURATION = 250; // ms — fade-in duration after parse
  const FOUC_EASING = "ease"; // CSS easing for fade-in

  // ── Logger ──────────────────────────────────────────────────
  const Logger = {
    prefix: "[FlatParser]",
    info(...a) {
      console.log(`%c${this.prefix} [INFO]`, "color:#2196F3", ...a);
    },
    warn(...a) {
      console.warn(`%c${this.prefix} [WARN]`, "color:#FF9800", ...a);
    },
    error(...a) {
      console.error(`%c${this.prefix} [ERROR]`, "color:#F44336", ...a);
    },
    success(...a) {
      console.log(`%c${this.prefix} [SUCCESS]`, "color:#4CAF50", ...a);
    },
  };

  // ── Helpers ─────────────────────────────────────────────────
  function isValidIndex(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === "boolean") return false;
    if (value === "") return false;
    if (typeof value !== "string" && typeof value !== "number") return false;
    return !isNaN(value);
  }

  // ── Path Parsing ─────────────────────────────────────────────
  function parsePath(pathStr) {
    const raw = pathStr.trim();
    if (!raw) return { segments: [], valid: false, error: "Empty path" };

    const segments = raw.split(".");
    if (segments.some((s) => !s))
      return { segments, valid: false, error: "Empty segment in path" };

    let missingIndex = false;
    for (let i = 0; i < segments.length; i++) {
      const isNumeric = isValidIndex(segments[i]);
      const shouldBeNumeric = i % 2 === 1;
      if (i === segments.length - 1 && !isNumeric && i % 2 === 0) {
        missingIndex = true;
      } else if (isNumeric !== shouldBeNumeric) {
        return {
          segments,
          valid: false,
          error: `Invalid pattern at segment ${i} ("${segments[i]}"): expected ${shouldBeNumeric ? "index" : "name"}`,
        };
      }
    }
    return { segments, valid: true, missingIndex };
  }

  function extractNameIndex(segments) {
    if (segments.length === 0) return { name: null, index: null };
    const last = segments[segments.length - 1];
    if (isValidIndex(last)) {
      return {
        name: segments.length >= 2 ? segments[segments.length - 2] : null,
        index: last,
      };
    }
    return { name: last, index: null };
  }

  // ── Insertion Counter ─────────────────────────────────────────
  let globalInsertionCounter = 0;
  function resetInsertionCounter() {
    globalInsertionCounter = 0;
  }

  // ── Auto-Indexing ─────────────────────────────────────────────
  function getParentPathContext(el) {
    let current = el.parentElement;
    while (current) {
      if (current.hasAttribute(COMPONENT_ATTR)) break;
      if (current.hasAttribute(PATH_ATTR))
        return current.getAttribute(PATH_ATTR);
      current = current.parentElement;
    }
    return "";
  }

  function autoAssignIndexes(elements, componentName) {
    const elementPaths = new Map();
    const occupiedIndexes = new Map();

    // Pass 1: collect manually-assigned indexes
    elements.forEach((el) => {
      const parsed = parsePath(el.getAttribute(PATH_ATTR));
      if (!parsed.valid) {
        elementPaths.set(el, parsed);
        return;
      }
      if (!parsed.missingIndex) {
        const { name, index } = extractNameIndex(parsed.segments);
        const parentCtx = getParentPathContext(el);
        const occupiedKey = parentCtx ? `${parentCtx}:${name}` : name;
        if (!occupiedIndexes.has(occupiedKey))
          occupiedIndexes.set(occupiedKey, new Set());
        occupiedIndexes.get(occupiedKey).add(index);
        elementPaths.set(el, parsed);
      }
    });

    // Pass 2: auto-assign indexes, skipping occupied ones
    const indexCounters = new Map();
    elements.forEach((el) => {
      const parsed = parsePath(el.getAttribute(PATH_ATTR));
      if (!parsed.valid || !parsed.missingIndex) return;

      const { name } = extractNameIndex(parsed.segments);
      const parentCtx = getParentPathContext(el);
      const counterKey = parentCtx ? `${parentCtx}:${name}` : name;
      let candidate = indexCounters.get(counterKey) || 0;
      const occupied = occupiedIndexes.get(counterKey) || new Set();

      while (occupied.has(String(candidate))) candidate++;

      const assigned = String(candidate);
      occupied.add(assigned);
      indexCounters.set(counterKey, candidate + 1);

      const completePath = [...parsed.segments, assigned];
      Logger.warn(
        `[${componentName}] Auto-assigned ${assigned} to "${el.getAttribute(PATH_ATTR)}" → "${completePath.join(".")}"`,
      );

      elementPaths.set(el, {
        segments: completePath,
        valid: true,
        missingIndex: false,
        originalPath: el.getAttribute(PATH_ATTR),
      });
    });

    return elementPaths;
  }

  // ── Component Registry ────────────────────────────────────────
  function buildComponentRegistry() {
    const components = [];
    document.querySelectorAll(`[${COMPONENT_ATTR}]`).forEach((el) => {
      const pathAttr = el.getAttribute(PATH_ATTR);
      components.push({
        element: el,
        name: el.getAttribute(COMPONENT_ATTR),
        pathSegments: pathAttr ? parsePath(pathAttr).segments : [],
        get depth() {
          return this.pathSegments.length;
        },
        tree: { el: null, children: {}, insertionOrder: 0 },
        elementsWithoutPath: [],
      });
    });
    components.sort((a, b) => b.depth - a.depth);
    return components;
  }

  // ── Path Routing ──────────────────────────────────────────────
  function findOwningComponent(el, components) {
    let current = el.hasAttribute(COMPONENT_ATTR) ? el.parentElement : el;
    while (current) {
      if (current.hasAttribute(COMPONENT_ATTR))
        return components.find((c) => c.element === current) || null;
      current = current.parentElement;
    }
    return null;
  }

  function reconstructPathFromDOM(el, components) {
    const pathParts = [];
    let current = el;
    const isComponent = el.hasAttribute(COMPONENT_ATTR);
    const owningComponent = findOwningComponent(el, components);
    if (!owningComponent) return el.getAttribute(PATH_ATTR) || "";

    while (current && current.hasAttribute) {
      if (current === owningComponent.element) break;
      if (current.hasAttribute(PATH_ATTR)) {
        if (current === el) {
          pathParts.unshift(current.getAttribute(PATH_ATTR));
        } else if (!current.hasAttribute(COMPONENT_ATTR)) {
          pathParts.unshift(current.getAttribute(PATH_ATTR));
        }
      }
      current = current.parentElement;
    }
    return pathParts.join(".");
  }

  function routeToComponent(segments, components, currentComponent) {
    for (let depth = segments.length - 1; depth >= 0; depth -= 2) {
      const prefixStr = segments.slice(0, depth + 1).join(".");
      const nested = components.find(
        (c) =>
          c.element !== currentComponent.element &&
          c.pathSegments.join(".") === prefixStr &&
          currentComponent.element.contains(c.element),
      );
      if (nested)
        return { component: nested, remainingPath: segments.slice(depth + 1) };
    }
    return { component: currentComponent, remainingPath: segments };
  }

  // ── Tree Building ─────────────────────────────────────────────
  function insertAtPath(root, path, el) {
    let node = root;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!node.children[key])
        node.children[key] = {
          el: null,
          children: {},
          insertionOrder: globalInsertionCounter++,
        };
      node = node.children[key];
    }
    const last = path[path.length - 1];
    if (!node.children[last])
      node.children[last] = {
        el: null,
        children: {},
        insertionOrder: globalInsertionCounter++,
      };
    const existingOrder = node.children[last].insertionOrder;
    node.children[last].el = el;
    node.children[last].insertionOrder = existingOrder;
    return true;
  }

  function validateParentExists(root, path) {
    if (path.length <= 2) return true;
    const parentPath = path.slice(0, -2);
    let node = root;
    for (const key of parentPath) {
      if (!node.children[key]) return false;
      node = node.children[key];
    }
    return true;
  }

  // ── Class Generation ──────────────────────────────────────────
  function makeClasses(name, index) {
    if (!name) return "";
    const cls = [name];
    if (isValidIndex(index)) cls.push(`${name}-${index}`);
    return cls.join(" ");
  }

  // ── DOM Assembly ──────────────────────────────────────────────
  function sortedKeys(node) {
    return Object.keys(node.children).sort(
      (a, b) =>
        node.children[a].insertionOrder - node.children[b].insertionOrder,
    );
  }

  function assembleNode(node, pathSegments) {
    const currentKey = pathSegments[pathSegments.length - 1];
    const isNumericKey = isValidIndex(currentKey);

    // Organisational (named) node with no element — return children flat
    if (!node.el && !isNumericKey && pathSegments.length > 0) {
      const children = [];
      sortedKeys(node).forEach((key) => {
        const child = assembleNode(node.children[key], [...pathSegments, key]);
        Array.isArray(child) ? children.push(...child) : children.push(child);
      });
      return children;
    }

    const base = node.el ?? document.createElement("div");
    const isNestedComponent =
      base.hasAttribute && base.hasAttribute(COMPONENT_ATTR);

    if (pathSegments.length > 0) {
      const { name, index } = extractNameIndex(pathSegments);
      makeClasses(name, index)
        .split(" ")
        .filter(Boolean)
        .forEach((c) => base.classList.add(c));
      if (node.el && index !== null)
        base.setAttribute(PATH_ATTR, `${name}.${index}`);
    }

    if (isNestedComponent) return base;

    sortedKeys(node).forEach((key) => {
      const child = assembleNode(node.children[key], [...pathSegments, key]);
      Array.isArray(child)
        ? child.forEach((c) => base.appendChild(c))
        : base.appendChild(child);
    });

    return base;
  }

  // ── Non-path element tracking ─────────────────────────────────
  function trackElementsWithoutPath(container) {
    const tracked = [];
    const allChildren = Array.from(container.children);

    allChildren.forEach((child, idx) => {
      if (child.hasAttribute(PATH_ATTR) || child.hasAttribute(COMPONENT_ATTR))
        return;
      if (child.querySelector(`[${PATH_ATTR}],[${COMPONENT_ATTR}]`)) return;

      let beforeElement = null;
      for (let i = idx + 1; i < allChildren.length; i++) {
        if (allChildren[i].hasAttribute(PATH_ATTR)) {
          beforeElement = allChildren[i];
          break;
        }
      }
      tracked.push({
        element: child.cloneNode(true),
        beforeElement: beforeElement?.getAttribute(PATH_ATTR) || null,
      });
    });

    return tracked;
  }

  function reinsertElementsWithoutPath(container, trackedElements) {
    trackedElements.forEach(({ element, beforeElement }) => {
      if (beforeElement) {
        const anchor = container.querySelector(
          `[${PATH_ATTR}="${beforeElement}"]`,
        );
        anchor
          ? container.insertBefore(element, anchor)
          : container.appendChild(element);
      } else {
        container.appendChild(element);
      }
    });
  }

  // ── Main Parser ───────────────────────────────────────────────
  function parseComponents() {
    performance.mark("fp:parse:start");

    let fouc = document.getElementById("flat-parser-fouc");
    if (!fouc) {
      fouc = document.createElement("style");
      fouc.id = "flat-parser-fouc";
      document.head.appendChild(fouc);
    }
    fouc.textContent = "[data-component] { opacity: 0 !important; }";

    Logger.info("Starting component parsing...");
    resetInsertionCounter();

    const components = buildComponentRegistry();
    Logger.info(`Found ${components.length} component(s)`);
    if (components.length === 0) return;

    performance.mark("fp:phase1:start");
    // Phase 1: Build virtual trees
    components.forEach((c) => {
      c.elementsWithoutPath = trackElementsWithoutPath(c.element);
    });

    const allElements = Array.from(document.querySelectorAll(`[${PATH_ATTR}]`));
    Logger.info(`Found ${allElements.length} element(s) with ${PATH_ATTR}`);

    // Reconstruct full paths from DOM hierarchy (idempotent re-parse support)
    allElements.forEach((el) => {
      const currentPath = el.getAttribute(PATH_ATTR);
      let parent = el.parentElement;
      while (parent && parent.hasAttribute) {
        if (parent.hasAttribute(COMPONENT_ATTR)) break;
        if (parent.hasAttribute(PATH_ATTR)) {
          if (currentPath.startsWith(parent.getAttribute(PATH_ATTR) + "."))
            return;
          break;
        }
        parent = parent.parentElement;
      }
      const reconstructed = reconstructPathFromDOM(el, components);
      if (reconstructed && reconstructed !== currentPath) {
        Logger.info(`Reconstructed: ${currentPath} → ${reconstructed}`);
        el.setAttribute(PATH_ATTR, reconstructed);
      }
    });

    // Group by owning component
    const elementsByComponent = new Map();
    allElements.forEach((el) => {
      const owner = findOwningComponent(el, components);
      if (!owner) {
        Logger.warn(
          `No owning component for [${PATH_ATTR}="${el.getAttribute(PATH_ATTR)}"]`,
        );
        return;
      }
      if (!elementsByComponent.has(owner)) elementsByComponent.set(owner, []);
      elementsByComponent.get(owner).push(el);
    });

    // Auto-assign indexes
    const elementPathMap = new Map();
    elementsByComponent.forEach((els, comp) => {
      autoAssignIndexes(els, comp.name).forEach((parsed, el) =>
        elementPathMap.set(el, parsed),
      );
    });

    components.forEach((comp) => {
      const parsed = elementPathMap.get(comp.element);
      if (parsed?.valid) comp.pathSegments = parsed.segments;
    });

    // Insert into trees
    const phase1CompTimes = new Map();

    components.forEach((comp, i) => {
      performance.mark(`fp:p1:comp:${comp.name}:${i}:start`);

      const owned = (elementsByComponent.get(comp) || []).sort((a, b) => {
        const ap = elementPathMap.get(a),
          bp = elementPathMap.get(b);
        if (!ap || !bp) return 0;
        return ap.segments.length - bp.segments.length;
      });

      let collected = 0,
        skipped = 0;

      owned.forEach((el) => {
        const parsed = elementPathMap.get(el);
        if (!parsed) return;
        if (!parsed.valid) {
          Logger.error(`[${comp.name}] Invalid path: ${parsed.error}`);
          skipped++;
          return;
        }

        const isComponentEl = el.hasAttribute(COMPONENT_ATTR);
        let { component: targetComp, remainingPath } = isComponentEl
          ? { component: comp, remainingPath: parsed.segments }
          : routeToComponent(parsed.segments, components, comp);

        if (remainingPath.length === 0) {
          skipped++;
          return;
        }

        if (targetComp.pathSegments.length > 0) {
          const pLen = targetComp.pathSegments.length;
          const matchesPrefix = targetComp.pathSegments.every(
            (s, i) => remainingPath[i] === s,
          );
          if (matchesPrefix && remainingPath.length > pLen)
            remainingPath = remainingPath.slice(pLen);
        }

        if (remainingPath.length === 0) {
          skipped++;
          return;
        }
        if (!validateParentExists(targetComp.tree, remainingPath)) {
          skipped++;
          return;
        }

        insertAtPath(targetComp.tree, remainingPath, el);
        collected++;
      });

      Logger.info(`[${comp.name}] Collected ${collected}, skipped ${skipped}`);

      performance.mark(`fp:p1:comp:${comp.name}:${i}:end`);
      const m = performance.measure(
        `fp:p1:comp:instance:${i}`,
        `fp:p1:comp:${comp.name}:${i}:start`,
        `fp:p1:comp:${comp.name}:${i}:end`,
      );
      phase1CompTimes.set(
        comp.name,
        (phase1CompTimes.get(comp.name) || 0) + m.duration,
      );
    });
    performance.mark("fp:phase1:end");
    performance.measure(
      "FlatParser — Phase 1: Tree Building",
      "fp:phase1:start",
      "fp:phase1:end",
    );

    performance.mark("fp:phase2:start");
    // Phase 2: Assemble DOM (bottom-up)
    const compTimes = new Map();

    components.forEach((comp, i) => {
      performance.mark(`fp:comp:${comp.name}:${i}:start`);

      const fragment = document.createDocumentFragment();
      const rootElements = [];

      Object.keys(comp.tree.children).forEach((nameKey) => {
        const nameNode = comp.tree.children[nameKey];
        if (isValidIndex(nameKey)) {
          rootElements.push({
            key: nameKey,
            node: nameNode,
            insertionOrder: nameNode.insertionOrder,
          });
        } else {
          Object.keys(nameNode.children).forEach((indexKey) => {
            rootElements.push({
              key: nameKey,
              indexKey,
              node: nameNode.children[indexKey],
              insertionOrder: nameNode.children[indexKey].insertionOrder,
            });
          });
        }
      });

      rootElements.sort((a, b) => a.insertionOrder - b.insertionOrder);

      rootElements.forEach(({ key, indexKey, node }) => {
        const path = indexKey ? [key, indexKey] : [key];
        const element = assembleNode(node, path);
        Array.isArray(element)
          ? element.forEach((el) => fragment.appendChild(el))
          : fragment.appendChild(element);
      });

      comp.element.innerHTML = "";
      comp.element.appendChild(fragment);
      reinsertElementsWithoutPath(comp.element, comp.elementsWithoutPath);

      comp.element
        .querySelectorAll(":scope > *:not([data-p]):not([data-component])")
        .forEach((el) => {
          const hasOnlyProcessed =
            el.children.length > 0 &&
            Array.from(el.children).every(
              (c) =>
                c.hasAttribute(PATH_ATTR) || c.hasAttribute(COMPONENT_ATTR),
            );
          if (hasOnlyProcessed) el.remove();
        });

      Logger.success(`[${comp.name}] Assembled ✓`);
      performance.mark(`fp:comp:${comp.name}:${i}:end`);
      const m = performance.measure(
        `fp:comp:instance:${i}`,
        `fp:comp:${comp.name}:${i}:start`,
        `fp:comp:${comp.name}:${i}:end`,
      );
      compTimes.set(comp.name, (compTimes.get(comp.name) || 0) + m.duration);
    });

    Logger.success("Parsing complete!");

    performance.mark("fp:phase2:end");
    performance.measure(
      "FlatParser — Phase 2: DOM Assembly",
      "fp:phase2:start",
      "fp:phase2:end",
    );

    // ── FOUC Reveal ──────────────────────────────────────────────
    if (fouc) {
      fouc.textContent = `[data-component] { opacity: 0; transition: opacity ${FOUC_DURATION}ms ${FOUC_EASING}; }`;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          fouc.textContent = `[data-component] { opacity: 1; transition: opacity ${FOUC_DURATION}ms ${FOUC_EASING}; }`;
          setTimeout(() => fouc.remove(), FOUC_DURATION + 50);
        }),
      );
    }

    performance.mark("fp:parse:end");
    performance.measure(
      "FlatParser — Total Parse",
      "fp:parse:start",
      "fp:parse:end",
    );

    const fpEntries = performance
      .getEntriesByType("measure")
      .filter((e) => e.name.startsWith("FlatParser"));
    const summary = Object.fromEntries(
      fpEntries.map((e) => [e.name, `${e.duration.toFixed(2)}ms`]),
    );
    phase1CompTimes.forEach((ms, name) => {
      summary[`FlatParser — Phase 1 Component: ${name} (total)`] =
        `${ms.toFixed(2)}ms`;
    });
    compTimes.forEach((ms, name) => {
      summary[`FlatParser — Phase 2 Component: ${name} (total)`] =
        `${ms.toFixed(2)}ms`;
    });
    console.table(summary);
  }

  // ── Keyboard Shortcut ─────────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "P") {
      e.preventDefault();
      // Reset parsed flag so re-parse works in editor context
      if (window._crCleaner) window._crCleaner.reset();
      parseComponents();
    }
  });

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
      return;
    }
    Logger.info("Flat Component Parser v2.0.0 ready (Ctrl+Shift+P to parse)");
    window.FlatParser = { parse: parseComponents, version: "2.0.0" };
  }

  init();
})();
