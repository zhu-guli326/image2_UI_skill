import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";

const DEFAULT_TOLERANCE_PERCENT = 3;
const SYSTEM_ZONE_KEYS = Object.freeze({
  "status-bar": "statusBar",
  "display-cutout": "displayCutout",
  "home-indicator": "homeIndicator",
  "navigation-bar": "navigationBar",
  "gesture-area": "gestureArea",
});

export async function runRenderContractAudit({ target, noBrowser = false } = {}) {
  if (!target) return [];
  const targetPath = path.resolve(process.cwd(), target);
  if (!fs.existsSync(targetPath)) return [];

  const stat = fs.statSync(targetPath);
  const rootDir = stat.isDirectory() ? targetPath : path.dirname(targetPath);
  const entryFile = stat.isDirectory() ? findEntryHtml(rootDir) : targetPath;
  const planFile = findNamedPlan(rootDir, "visual-role-plan.json");
  if (!entryFile || !planFile) return [];

  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  } catch (error) {
    return [finding("fail", "render-contract-plan-invalid", `Could not parse visual-role-plan.json for rendered verification: ${error.message}`, planFile)];
  }

  const surfaces = normalizeSurfaces(plan);
  const placements = normalizePlacements(plan, surfaces);
  if (surfaces.length === 0 || placements.length === 0) return [];

  if (noBrowser) {
    return [finding("warn", "render-contract-browser-skipped", "Rendered geometry verification was skipped because --no-browser was used.", entryFile)];
  }

  const playwright = loadPlaywright(rootDir);
  if (!playwright?.chromium) {
    return [finding("warn", "render-contract-browser-unavailable", "Playwright is unavailable, so visual-role-plan geometry could not be checked against the rendered DOM.", entryFile)];
  }

  const server = await startServer(rootDir);
  const relativeEntry = path.relative(rootDir, entryFile).split(path.sep).map(encodeURIComponent).join("/");
  const url = `${server.url}/${relativeEntry}`;
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const hasDeviceMockup = surfaces.some((surface) => surface.safeArea?.surface === "device-mockup");
    const viewport = hasDeviceMockup ? { width: 1600, height: 1200 } : { width: 390, height: 844 };
    const page = await browser.newPage({ viewport });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(150);
    const measurements = await measureRenderedContract(page, surfaces, placements);
    return evaluateRenderContract({ surfaces, placements, measurements, file: entryFile });
  } catch (error) {
    return [finding("warn", "render-contract-browser-unavailable", `Rendered geometry verification could not run: ${String(error?.message || error).split("\n")[0]}`, entryFile)];
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.instance.close(resolve));
  }
}

export function evaluateRenderContract({ surfaces, placements, measurements, file = null }) {
  const findings = [];
  const measuredSurfaces = new Map((measurements?.surfaces || []).map((item) => [item.id, item]));
  const measuredElements = new Map((measurements?.elements || []).map((item) => [`${item.surfaceId}::${item.id}`, item]));

  for (const surface of surfaces) {
    const measured = measuredSurfaces.get(surface.id);
    if (!measured) {
      findings.push(finding("fail", "render-contract-root-missing", `Screen surface ${surface.id} has no rendered [data-ui-screen-root] binding.`, file));
      continue;
    }
    if (measured.ambiguous) {
      findings.push(finding("fail", "render-contract-root-ambiguous", `Screen surface ${surface.id} resolves to multiple rendered roots. Bind one unique data-ui-screen-root.`, file));
    }
  }

  for (const placement of placements) {
    const surface = surfaces.find((candidate) => candidate.id === placement.surfaceId);
    if (!surface) continue;
    const measured = measuredElements.get(`${placement.surfaceId}::${placement.id}`);
    if (!measured) {
      findings.push(finding("fail", "render-contract-node-missing", `Element ${placement.id} is declared in visual-role-plan.json but no rendered [data-ui-element-id=\"${placement.id}\"] exists inside screen ${placement.surfaceId}.`, file));
      continue;
    }
    if (!measured.visible) {
      findings.push(finding("fail", "render-contract-node-hidden", `Element ${placement.id} exists but is not visibly rendered inside screen ${placement.surfaceId}.`, file));
      continue;
    }

    const tolerance = finiteNumber(placement.tolerancePercent) ?? finiteNumber(surface.renderTolerancePercent) ?? DEFAULT_TOLERANCE_PERCENT;
    if (validRect(placement.bounds) && validRect(measured.bounds)) {
      const drift = maxRectDrift(placement.bounds, measured.bounds);
      if (drift > tolerance) {
        findings.push(finding("fail", "render-contract-bounds-drift", `Element ${placement.id} rendered ${formatRect(measured.bounds)} but the contract declares ${formatRect(placement.bounds)}; max drift ${drift.toFixed(1)}pp exceeds ${tolerance}pp.`, file));
      }
    }

    const safeRect = surface.safeArea?.contentSafeRect;
    if (["critical-content", "persistent-control"].includes(placement.behavior) && validRect(safeRect) && validRect(measured.bounds)) {
      if (!containsRect(safeRect, measured.bounds, tolerance)) {
        const rule = placement.behavior === "persistent-control" ? "persistent-control-outside-safe-area" : "critical-content-outside-safe-area";
        findings.push(finding("fail", rule, `Rendered ${placement.id} leaves the safe content bounds of screen ${placement.surfaceId}.`, file));
      }
    }

    if (placement.behavior === "persistent-control" && validRect(measured.bounds)) {
      const bottomZones = ["homeIndicator", "navigationBar", "gestureArea"];
      for (const key of bottomZones) {
        const zone = surface.safeArea?.systemZones?.[key];
        if (validRect(zone) && rectsOverlap(measured.bounds, zone, tolerance)) {
          findings.push(finding("fail", "bottom-nav-home-indicator-collision", `Rendered persistent control ${placement.id} intersects ${key} on screen ${placement.surfaceId}.`, file));
          break;
        }
      }
    }

    if (placement.behavior === "system-chrome" && placement.systemChromeKind && validRect(measured.bounds)) {
      const zoneKey = SYSTEM_ZONE_KEYS[placement.systemChromeKind];
      const zone = zoneKey ? surface.safeArea?.systemZones?.[zoneKey] : null;
      if (validRect(zone) && !containsRect(zone, measured.bounds, tolerance)) {
        const rule = placement.systemChromeKind === "status-bar"
          ? "status-bar-safe-area-violation"
          : placement.systemChromeKind === "home-indicator"
            ? "home-indicator-safe-area-violation"
            : "system-chrome-content-collision";
        findings.push(finding("fail", rule, `Rendered ${placement.systemChromeKind} ${placement.id} sits outside its declared system zone on screen ${placement.surfaceId}.`, file));
      }
    }

    if (placement.behavior === "background-bleed" && surface.safeArea?.edgeToEdge === true && surface.safeArea?.backgroundPolicy === "screen-bounds" && validRect(measured.bounds)) {
      if (!coversRect(measured.bounds, [0, 0, 100, 100], tolerance)) {
        findings.push(finding("fail", "edge-to-edge-background-underfill", `Rendered background ${placement.id} does not cover the physical screen bounds of ${placement.surfaceId}.`, file));
      }
    }
  }

  return findings;
}

function normalizeSurfaces(plan) {
  if (Array.isArray(plan.screenSurfaces) && plan.screenSurfaces.length > 0) {
    return plan.screenSurfaces
      .filter((surface) => surface && typeof surface === "object" && nonEmpty(surface.id) && surface.safeArea)
      .map((surface) => ({
        id: surface.id,
        safeArea: surface.safeArea,
        renderRootSelector: surface.renderRootSelector || null,
        renderTolerancePercent: surface.renderTolerancePercent,
      }));
  }
  if (plan.screenSafeArea && typeof plan.screenSafeArea === "object") {
    return [{
      id: "default",
      safeArea: plan.screenSafeArea,
      renderRootSelector: plan.screenSafeArea.renderRootSelector || null,
      renderTolerancePercent: plan.screenSafeArea.renderTolerancePercent,
    }];
  }
  return [];
}

function normalizePlacements(plan, surfaces) {
  const defaultSurfaceId = surfaces.length === 1 ? surfaces[0].id : null;
  return Array.isArray(plan.elements)
    ? plan.elements
      .filter((element) => element?.screenPlacement?.behavior)
      .map((element) => ({
        id: element.id,
        surfaceId: element.screenPlacement.surfaceId || defaultSurfaceId,
        behavior: element.screenPlacement.behavior,
        systemChromeKind: element.screenPlacement.systemChromeKind || null,
        bounds: element.screenPlacement.bounds || null,
        tolerancePercent: element.screenPlacement.tolerancePercent,
      }))
      .filter((placement) => nonEmpty(placement.id) && nonEmpty(placement.surfaceId))
    : [];
}

async function measureRenderedContract(page, surfaces, placements) {
  return page.evaluate(({ surfaceSpecs, placementSpecs }) => {
    const allRoots = [...document.querySelectorAll("[data-ui-screen-root]")];
    const measuredSurfaces = [];
    const measuredElements = [];

    for (const spec of surfaceSpecs) {
      let roots = [];
      if (spec.renderRootSelector) {
        try { roots = [...document.querySelectorAll(spec.renderRootSelector)]; } catch { roots = []; }
      } else {
        roots = allRoots.filter((node) => node.getAttribute("data-ui-screen-root") === spec.id);
        if (roots.length === 0 && surfaceSpecs.length === 1 && allRoots.length === 1) roots = allRoots;
      }
      if (roots.length === 0) continue;
      const root = roots[0];
      const rootRect = root.getBoundingClientRect();
      if (rootRect.width <= 0 || rootRect.height <= 0) continue;
      measuredSurfaces.push({ id: spec.id, ambiguous: roots.length > 1, bounds: [rootRect.x, rootRect.y, rootRect.width, rootRect.height] });

      for (const placement of placementSpecs.filter((item) => item.surfaceId === spec.id)) {
        const nodes = [...root.querySelectorAll("[data-ui-element-id]")].filter((node) => node.getAttribute("data-ui-element-id") === placement.id);
        if (nodes.length === 0) continue;
        const node = nodes[0];
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const visible = rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > 0.01;
        measuredElements.push({
          id: placement.id,
          surfaceId: spec.id,
          visible,
          ambiguous: nodes.length > 1,
          bounds: [
            ((rect.left - rootRect.left) / rootRect.width) * 100,
            ((rect.top - rootRect.top) / rootRect.height) * 100,
            (rect.width / rootRect.width) * 100,
            (rect.height / rootRect.height) * 100,
          ],
        });
      }
    }
    return { surfaces: measuredSurfaces, elements: measuredElements };
  }, { surfaceSpecs: surfaces, placementSpecs: placements });
}

function loadPlaywright(rootDir) {
  const require = createRequire(import.meta.url);
  for (const candidate of [rootDir, process.cwd(), path.dirname(import.meta.filename || "")]) {
    try {
      const resolved = require.resolve("playwright", { paths: [candidate] });
      return require(resolved);
    } catch {
      // Try the next resolution root.
    }
  }
  return null;
}

function findEntryHtml(dir) {
  const direct = path.join(dir, "index.html");
  if (fs.existsSync(direct)) return direct;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if ([".git", "node_modules", "dist", "build", ".image2-ui"].includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name.endsWith(".html")) return full;
    }
  }
  return null;
}

function findNamedPlan(rootDir, name) {
  const direct = [path.join(rootDir, name), path.join(rootDir, "artifacts", name)].filter((file) => fs.existsSync(file));
  const runRoot = path.join(rootDir, ".image2-ui", "runs");
  const runtime = fs.existsSync(runRoot) ? findNamedFiles(runRoot, name) : [];
  const candidates = [...direct, ...runtime];
  candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return candidates[0] || null;
}

function findNamedFiles(root, name) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name === name) out.push(full);
    }
  }
  return out;
}

async function startServer(rootDir) {
  const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const relative = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
    const file = path.resolve(rootDir, relative);
    if (!file.startsWith(path.resolve(rootDir)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    res.setHeader("Content-Type", mimeType(file));
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return { instance: server, url: `http://127.0.0.1:${address.port}` };
}

function mimeType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".gif": "image/gif",
  })[ext] || "application/octet-stream";
}

function maxRectDrift(expected, actual) {
  return Math.max(...expected.map((value, index) => Math.abs(value - actual[index])));
}

function containsRect(outer, inner, tolerance = 0) {
  const [ox, oy, ow, oh] = outer;
  const [ix, iy, iw, ih] = inner;
  return ix >= ox - tolerance && iy >= oy - tolerance && ix + iw <= ox + ow + tolerance && iy + ih <= oy + oh + tolerance;
}

function coversRect(outer, inner, tolerance = 0) {
  const [ox, oy, ow, oh] = outer;
  const [ix, iy, iw, ih] = inner;
  return ox <= ix + tolerance && oy <= iy + tolerance && ox + ow >= ix + iw - tolerance && oy + oh >= iy + ih - tolerance;
}

function rectsOverlap(a, b, tolerance = 0) {
  const [ax, ay, aw, ah] = a;
  const [bx, by, bw, bh] = b;
  return ax < bx + bw - tolerance && ax + aw > bx + tolerance && ay < by + bh - tolerance && ay + ah > by + tolerance;
}

function validRect(value) {
  return Array.isArray(value) && value.length === 4 && value.every((item) => finiteNumber(item) !== null) && value[2] > 0 && value[3] > 0;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function formatRect(rect) {
  return `[${rect.map((value) => Number(value).toFixed(1)).join(", ")}]`;
}

function finding(level, rule, message, file) {
  return { level, rule, message, file };
}
