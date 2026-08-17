import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { evaluateRenderContract, runRenderContractAudit } from "../runtime/render_contract_audit.mjs";

function fixture({ navTop = 87, navHeight = 7 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-render-contract-"));
  fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html,body { margin:0; min-height:100%; }
  .screen { position:relative; width:390px; height:844px; overflow:hidden; background:#fff; }
  .layer { position:absolute; display:block; }
  .bg { left:0; top:0; width:100%; height:100%; background:#eef; }
  .status { left:5%; top:1%; width:90%; height:4%; background:#222; }
  .content { left:5%; top:10%; width:90%; height:70%; background:#ddd; }
  .nav { left:5%; top:${navTop}%; width:90%; height:${navHeight}%; background:#333; }
  .home { left:35%; top:95%; width:30%; height:3%; background:#111; }
</style>
</head>
<body>
  <main class="screen" data-ui-screen-root="phone">
    <div class="layer bg" data-ui-element-id="background"></div>
    <div class="layer status" data-ui-element-id="status"></div>
    <div class="layer content" data-ui-element-id="content"></div>
    <div class="layer nav" data-ui-element-id="bottom-nav"></div>
    <div class="layer home" data-ui-element-id="home-indicator"></div>
  </main>
</body>
</html>`);

  fs.writeFileSync(path.join(dir, "visual-role-plan.json"), JSON.stringify({
    version: 1,
    workflow: "recreate",
    screenSafeArea: {
      platform: "ios",
      surface: "device-mockup",
      edgeToEdge: true,
      insetSource: "reference-measured",
      contentPolicy: "inside-safe-content",
      backgroundPolicy: "screen-bounds",
      contentSafeRect: [0, 6, 100, 88],
      systemZones: {
        statusBar: [0, 0, 100, 6],
        homeIndicator: [35, 95, 30, 3]
      }
    },
    elements: [
      element("background", "background-bleed", [0, 0, 100, 100]),
      element("status", "system-chrome", [5, 1, 90, 4], "status-bar"),
      element("content", "critical-content", [5, 10, 90, 70]),
      element("bottom-nav", "persistent-control", [5, 87, 90, 7]),
      element("home-indicator", "system-chrome", [35, 95, 30, 3], "home-indicator")
    ]
  }, null, 2));
  return dir;
}

function element(id, behavior, bounds, systemChromeKind = undefined) {
  return {
    id,
    assetRole: {
      role: "code-ui",
      renderer: "code",
      placement: "code",
      generationScope: "none"
    },
    overlayRole: { mode: "none", zOrder: "disjoint", textOnImage: false },
    screenPlacement: {
      behavior,
      bounds,
      ...(systemChromeKind ? { systemChromeKind } : {})
    }
  };
}

function legacySurface() {
  return [{
    id: "default",
    safeArea: {
      edgeToEdge: true,
      backgroundPolicy: "screen-bounds",
      contentSafeRect: [0, 6, 100, 88],
      systemZones: { homeIndicator: [35, 95, 30, 3] }
    }
  }];
}

function placement(id, behavior, bounds) {
  return { id, surfaceId: "default", behavior, bounds };
}

test("render contract verifies real DOM geometry against the declared screen contract", async (t) => {
  const dir = fixture();
  const findings = await runRenderContractAudit({ target: dir });
  if (findings.some((finding) => finding.rule === "render-contract-browser-unavailable")) {
    t.skip("Playwright/Chromium unavailable in this environment");
    return;
  }
  assert.equal(findings.filter((finding) => finding.level === "fail").length, 0, JSON.stringify(findings, null, 2));
});

test("render contract catches a bottom nav that actually drifts into the Home Indicator area", async (t) => {
  const dir = fixture({ navTop: 93, navHeight: 5 });
  const findings = await runRenderContractAudit({ target: dir });
  if (findings.some((finding) => finding.rule === "render-contract-browser-unavailable")) {
    t.skip("Playwright/Chromium unavailable in this environment");
    return;
  }
  assert.ok(findings.some((finding) => finding.rule === "render-contract-bounds-drift"));
  assert.ok(findings.some((finding) => finding.rule === "bottom-nav-home-indicator-collision"));
  assert.ok(findings.some((finding) => finding.rule === "persistent-control-outside-safe-area"));
});

test("render contract blocks a declared screen with no actual root binding", () => {
  const surfaces = legacySurface();
  const placements = [placement("content", "critical-content", [5, 10, 90, 70])];
  const findings = evaluateRenderContract({ surfaces, placements, measurements: { surfaces: [], elements: [] } });
  assert.ok(findings.some((finding) => finding.rule === "render-contract-root-missing"));
});

test("render contract blocks a declared element with no rendered DOM binding", () => {
  const surfaces = legacySurface();
  const placements = [placement("content", "critical-content", [5, 10, 90, 70])];
  const findings = evaluateRenderContract({
    surfaces,
    placements,
    measurements: { surfaces: [{ id: "default", ambiguous: false }], elements: [] }
  });
  assert.ok(findings.some((finding) => finding.rule === "render-contract-node-missing"));
});
