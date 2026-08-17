import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runScreenSafeAreaGuard } from "../scripts/ui_screen_safe_area_guard.mjs";

function fixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-screen-safe-area-"));
}

function writePlan(dir, screenSafeArea, elements = []) {
  fs.writeFileSync(path.join(dir, "visual-role-plan.json"), JSON.stringify({
    version: 1,
    workflow: "recreate",
    screenSafeArea,
    elements,
  }, null, 2));
}

function element(id, behavior, bounds, systemChromeKind = undefined) {
  return {
    id,
    assetRole: { role: "code-ui", renderer: "code", placement: "code", generationScope: "none" },
    overlayRole: { mode: "none", zOrder: "disjoint", textOnImage: false, safeArea: "inside" },
    screenPlacement: {
      behavior,
      ...(bounds ? { bounds } : {}),
      ...(systemChromeKind ? { systemChromeKind } : {}),
    },
  };
}

function iphoneMockup(overrides = {}) {
  return {
    platform: "ios",
    surface: "device-mockup",
    edgeToEdge: true,
    insetSource: "reference-measured",
    contentPolicy: "inside-safe-content",
    backgroundPolicy: "screen-bounds",
    contentSafeRect: [4, 7, 92, 86],
    systemZones: {
      statusBar: { visibility: "visible", ownership: "code-simulated", rect: [4, 1, 92, 5] },
      displayCutout: { visibility: "visible", ownership: "code-simulated", rect: [40, 1, 20, 5] },
      homeIndicator: { visibility: "visible", ownership: "code-simulated", rect: [38, 95, 24, 2] },
    },
    ...overrides,
  };
}

test("legacy recreate plans warn when screen safe area contract is absent", () => {
  const dir = fixture();
  writePlan(dir, undefined, []);
  const findings = runScreenSafeAreaGuard({ rootDir: dir, workflowMode: "recreate" });
  assert.ok(findings.some((finding) => finding.rule === "screen-safe-area-contract-missing" && finding.level === "warn"));
});

test("iOS native runtime requires runtime safe-area APIs", () => {
  const dir = fixture();
  writePlan(dir, {
    platform: "ios",
    surface: "native-runtime",
    edgeToEdge: true,
    insetSource: "reference-measured",
    contentPolicy: "inside-safe-content",
    backgroundPolicy: "screen-bounds",
  });
  assert.ok(runScreenSafeAreaGuard({ rootDir: dir }).some((finding) => finding.rule === "safe-area-runtime-api-required"));
});

test("Android native runtime requires WindowInsets", () => {
  const dir = fixture();
  writePlan(dir, {
    platform: "android",
    surface: "native-runtime",
    edgeToEdge: true,
    insetSource: "reference-measured",
    contentPolicy: "inside-safe-content",
    backgroundPolicy: "screen-bounds",
  });
  assert.ok(runScreenSafeAreaGuard({ rootDir: dir }).some((finding) => finding.rule === "safe-area-runtime-api-required"));
});

test("edge-to-edge web requires css env safe-area insets and viewport-fit cover", () => {
  const dir = fixture();
  writePlan(dir, {
    platform: "web",
    surface: "web-runtime",
    edgeToEdge: true,
    insetSource: "not-applicable",
    viewportFitCover: false,
    contentPolicy: "inside-safe-content",
    backgroundPolicy: "screen-bounds",
  });
  const findings = runScreenSafeAreaGuard({ rootDir: dir });
  assert.ok(findings.some((finding) => finding.rule === "web-safe-area-env-required"));
  assert.ok(findings.some((finding) => finding.rule === "web-viewport-fit-cover-missing"));
});

test("device mockup requires measured content safe rect", () => {
  const dir = fixture();
  const contract = iphoneMockup();
  delete contract.contentSafeRect;
  writePlan(dir, contract);
  assert.ok(runScreenSafeAreaGuard({ rootDir: dir }).some((finding) => finding.rule === "screen-safe-area-geometry-required"));
});

test("critical content cannot leave measured safe content bounds", () => {
  const dir = fixture();
  writePlan(dir, iphoneMockup(), [element("page-title", "critical-content", [3, 3, 40, 8])]);
  assert.ok(runScreenSafeAreaGuard({ rootDir: dir }).some((finding) => finding.rule === "critical-content-outside-safe-area"));
});

test("bottom nav controls cannot collide with Home Indicator", () => {
  const dir = fixture();
  writePlan(dir, iphoneMockup(), [element("bottom-nav", "persistent-control", [5, 92, 90, 6])]);
  const findings = runScreenSafeAreaGuard({ rootDir: dir });
  assert.ok(findings.some((finding) => finding.rule === "bottom-nav-home-indicator-collision"));
});

test("simulated status bar must stay inside its system zone", () => {
  const dir = fixture();
  writePlan(dir, iphoneMockup(), [element("status", "system-chrome", [2, 0, 96, 7], "status-bar")]);
  assert.ok(runScreenSafeAreaGuard({ rootDir: dir }).some((finding) => finding.rule === "status-bar-safe-area-violation"));
});

test("simulated Home Indicator must stay inside its bottom system zone", () => {
  const dir = fixture();
  writePlan(dir, iphoneMockup(), [element("home-indicator", "system-chrome", [38, 98, 24, 1.5], "home-indicator")]);
  assert.ok(runScreenSafeAreaGuard({ rootDir: dir }).some((finding) => finding.rule === "home-indicator-safe-area-violation"));
});

test("full-bleed backdrop may occupy screen bounds while controls stay safe", () => {
  const dir = fixture();
  writePlan(dir, iphoneMockup(), [
    element("backdrop", "background-bleed", [0, 0, 100, 100]),
    element("title", "critical-content", [8, 12, 60, 10]),
    element("bottom-nav", "persistent-control", [6, 84, 88, 8]),
    element("status", "system-chrome", [6, 2, 88, 3], "status-bar"),
    element("home-indicator", "system-chrome", [40, 95.4, 20, 1], "home-indicator"),
  ]);
  const findings = runScreenSafeAreaGuard({ rootDir: dir });
  assert.equal(findings.filter((finding) => finding.level === "fail").length, 0, JSON.stringify(findings));
});
