import fs from "node:fs";
import path from "node:path";

const SYSTEM_ZONE_KEYS = Object.freeze({
  "status-bar": "statusBar",
  "display-cutout": "displayCutout",
  "home-indicator": "homeIndicator",
  "navigation-bar": "navigationBar",
  "gesture-area": "gestureArea",
});

export function runScreenSafeAreaGuard({ rootDir, workflowMode = null } = {}) {
  if (!rootDir) return [];
  const planFile = findVisualRolePlan(rootDir);
  if (!planFile) return [];

  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  } catch {
    return [];
  }

  const findings = [];
  const contract = plan?.screenSafeArea;
  const workflow = workflowMode || plan?.workflow;
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    if (workflow === "recreate") {
      findings.push(warn(
        "screen-safe-area-contract-missing",
        "Recreate should declare screenSafeArea for mobile/device-like screens so system chrome, interactive content, and full-bleed backgrounds use different screen boundaries instead of ad-hoc edge offsets.",
        planFile,
      ));
    }
    return findings;
  }

  validateContract(contract, planFile, findings);
  validateElements(plan.elements, contract, planFile, findings);
  return findings;
}

function validateContract(contract, planFile, findings) {
  const { platform, surface, edgeToEdge, insetSource } = contract;

  if (surface === "native-runtime" && platform === "ios" && insetSource !== "runtime-safe-area") {
    findings.push(fail(
      "safe-area-runtime-api-required",
      "iOS native runtime layouts must derive safe-area geometry from the runtime safe area (safeAreaInsets/safeAreaLayoutGuide), not a fixed device measurement.",
      planFile,
    ));
  }

  if (surface === "native-runtime" && platform === "android" && insetSource !== "window-insets") {
    findings.push(fail(
      "safe-area-runtime-api-required",
      "Android native runtime layouts must derive system-bar/gesture intrusions from WindowInsets instead of hard-coded status/navigation-bar measurements.",
      planFile,
    ));
  }

  if (surface === "web-runtime" && edgeToEdge === true) {
    if (insetSource !== "css-env") {
      findings.push(fail(
        "web-safe-area-env-required",
        "Edge-to-edge web layouts must use CSS safe-area environment insets for important content rather than fixed iPhone offsets.",
        planFile,
      ));
    }
    if (contract.viewportFitCover !== true) {
      findings.push(fail(
        "web-viewport-fit-cover-missing",
        "Edge-to-edge web layouts that intentionally fill the physical display must declare viewportFitCover=true and protect important content with safe-area insets.",
        planFile,
      ));
    }
  }

  if (surface === "device-mockup" && edgeToEdge === true) {
    if (insetSource !== "reference-measured") {
      findings.push(fail(
        "safe-area-reference-profile-required",
        "A recreated device mockup should measure its simulated safe-area geometry from the reference/device profile instead of borrowing runtime API values from an unrelated device.",
        planFile,
      ));
    }
    if (!validRect(contract.contentSafeRect)) {
      findings.push(fail(
        "screen-safe-area-geometry-required",
        "An edge-to-edge device mockup requires contentSafeRect so status/home-indicator zones and safe interactive content can be checked geometrically.",
        planFile,
      ));
    }
  }

  const zones = contract.systemZones || {};
  for (const [key, zone] of Object.entries(zones)) {
    if (!zone || zone.visibility !== "visible") continue;
    if (surface === "device-mockup" && !validRect(zone.rect)) {
      findings.push(fail(
        "system-chrome-zone-missing",
        `Visible simulated system zone ${key} requires a measured rect in device-mockup mode.`,
        planFile,
      ));
    }
    if (surface === "native-runtime" && zone.ownership === "code-simulated") {
      findings.push(fail(
        "system-chrome-ownership-violation",
        `Native runtime system zone ${key} is system-owned and must not be recreated as application chrome.`,
        planFile,
      ));
    }
  }
}

function validateElements(elements, contract, planFile, findings) {
  if (!Array.isArray(elements)) return;
  const safeRect = validRect(contract.contentSafeRect) ? contract.contentSafeRect : null;
  const zones = contract.systemZones || {};
  const bottomZones = [zones.homeIndicator, zones.navigationBar, zones.gestureArea]
    .map(visibleRect)
    .filter(Boolean);

  for (const element of elements) {
    const placement = element?.screenPlacement;
    if (!placement || typeof placement !== "object") continue;
    const id = nonEmpty(element.id) ? element.id : "<missing-id>";
    const bounds = validRect(placement.bounds) ? placement.bounds : null;

    if (["critical-content", "persistent-control"].includes(placement.behavior) && safeRect && bounds && !rectContains(safeRect, bounds)) {
      findings.push(fail(
        "critical-content-outside-safe-area",
        `Element ${id} is ${placement.behavior} but its bounds leave contentSafeRect. Backgrounds may bleed to screen bounds; important text and interactive content may not.`,
        planFile,
      ));
    }

    if (placement.behavior === "persistent-control" && bounds && bottomZones.some((zone) => rectsOverlap(bounds, zone))) {
      findings.push(fail(
        "bottom-nav-home-indicator-collision",
        `Persistent control ${id} intersects the Home Indicator/navigation/gesture exclusion zone. Keep tappable nav/CTA content above the system gesture region even if its visual background bleeds behind it.`,
        planFile,
      ));
    }

    if (placement.behavior === "system-chrome") {
      validateSystemChromePlacement(id, placement, zones, planFile, findings);
    }

    if (placement.behavior === "background-bleed" && contract.edgeToEdge === true && contract.backgroundPolicy === "screen-bounds" && bounds && !coversScreen(bounds)) {
      findings.push(fail(
        "edge-to-edge-background-underfill",
        `Background ${id} is declared edge-to-edge/screen-bounds but does not cover the full screen. Safe-area insets belong to critical content, not the full-bleed backdrop.`,
        planFile,
      ));
    }
  }
}

function validateSystemChromePlacement(id, placement, zones, planFile, findings) {
  const kind = placement.systemChromeKind;
  const zoneKey = SYSTEM_ZONE_KEYS[kind];
  if (!zoneKey) return;
  const target = visibleRect(zones[zoneKey]);
  if (!target) {
    findings.push(fail(
      "system-chrome-zone-missing",
      `System chrome ${id} declares kind=${kind}, but screenSafeArea.systemZones has no visible measured zone for it.`,
      planFile,
    ));
    return;
  }

  const bounds = validRect(placement.bounds) ? placement.bounds : null;
  if (!bounds) return;
  if (rectContains(target, bounds)) return;

  if (kind === "status-bar" || kind === "display-cutout") {
    findings.push(fail(
      "status-bar-safe-area-violation",
      `System chrome ${id} is not contained by its top system zone. The status area should read as anchored inside the screen, not as content floating against the device edge.`,
      planFile,
    ));
    return;
  }

  if (kind === "home-indicator") {
    findings.push(fail(
      "home-indicator-safe-area-violation",
      `Home Indicator ${id} is not contained by its measured bottom system zone. It must keep the reference/device inset from the physical edge.`,
      planFile,
    ));
    return;
  }

  findings.push(fail(
    "system-chrome-content-collision",
    `System chrome ${id} is outside its declared ${kind} zone.`,
    planFile,
  ));
}

function visibleRect(zone) {
  return zone && zone.visibility === "visible" && validRect(zone.rect) ? zone.rect : null;
}

function coversScreen(rect) {
  const [x, y, w, h] = rect;
  return x <= 0 && y <= 0 && x + w >= 100 && y + h >= 100;
}

function rectContains(outer, inner) {
  const [ox, oy, ow, oh] = outer;
  const [ix, iy, iw, ih] = inner;
  return ix >= ox && iy >= oy && ix + iw <= ox + ow && iy + ih <= oy + oh;
}

function rectsOverlap(a, b) {
  const [ax, ay, aw, ah] = a;
  const [bx, by, bw, bh] = b;
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function validRect(value) {
  return Array.isArray(value)
    && value.length === 4
    && value.every((item) => typeof item === "number" && Number.isFinite(item))
    && value[0] >= 0
    && value[1] >= 0
    && value[2] > 0
    && value[3] > 0
    && value[0] + value[2] <= 100
    && value[1] + value[3] <= 100;
}

function findVisualRolePlan(rootDir) {
  const candidates = [path.join(rootDir, "visual-role-plan.json"), path.join(rootDir, "artifacts", "visual-role-plan.json")]
    .filter((file) => fs.existsSync(file));
  const runRoot = path.join(rootDir, ".image2-ui", "runs");
  if (fs.existsSync(runRoot)) candidates.push(...findNamedFiles(runRoot, "visual-role-plan.json"));
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

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function fail(rule, message, file) {
  return { level: "fail", rule, message, file };
}

function warn(rule, message, file) {
  return { level: "warn", rule, message, file };
}
