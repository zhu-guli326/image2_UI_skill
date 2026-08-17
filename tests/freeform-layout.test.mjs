import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runFreeformLayoutGuard } from "../scripts/ui_freeform_layout_guard.mjs";

function fixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-freeform-layout-"));
}

function writePlan(dir, assetRole, overlayRole = { mode: "cutout-layered" }) {
  fs.writeFileSync(path.join(dir, "visual-role-plan.json"), JSON.stringify({
    version: 1,
    workflow: "recreate",
    elements: [{ id: "subject", assetRole, overlayRole }],
  }, null, 2));
}

function cutout(overrides = {}) {
  return {
    role: "cutout-subject",
    renderer: "image2",
    placement: "layered",
    generationScope: "asset-only",
    needsCutout: true,
    generationBackground: "transparent",
    keyingMode: "native-alpha",
    compositionBoundary: "freeform-silhouette",
    freeformLayoutIntent: "text-flow",
    requiresTransparency: true,
    participatesInOverlap: true,
    containsCodeOwnedText: false,
    ...overrides,
  };
}

test("text-flow intent requires a cutout subject", () => {
  const dir = fixture();
  writePlan(dir, {
    role: "inline-photo",
    renderer: "image2",
    placement: "container",
    generationScope: "asset-only",
    needsCutout: false,
    generationBackground: "full-scene",
    keyingMode: "none",
    compositionBoundary: "rectangular-frame",
    freeformLayoutIntent: "text-flow",
    containsCodeOwnedText: false,
  });
  const findings = runFreeformLayoutGuard({ rootDir: dir });
  assert.ok(findings.some((finding) => finding.rule === "freeform-layout-requires-cutout"));
});

test("a rectangular boundary cannot satisfy freeform text flow", () => {
  const dir = fixture();
  writePlan(dir, cutout({ compositionBoundary: "rectangular-frame" }));
  const findings = runFreeformLayoutGuard({ rootDir: dir });
  assert.ok(findings.some((finding) => finding.rule === "rectangular-boundary-blocks-freeform-layout"));
});

test("overlapping cutouts must state a freeform layout intent", () => {
  const dir = fixture();
  writePlan(dir, cutout({ freeformLayoutIntent: "none" }));
  const findings = runFreeformLayoutGuard({ rootDir: dir });
  assert.ok(findings.some((finding) => finding.rule === "freeform-layout-requires-cutout"));
});

test("transparent cutout with freeform silhouette unlocks editorial text layout", () => {
  const dir = fixture();
  writePlan(dir, cutout());
  const findings = runFreeformLayoutGuard({ rootDir: dir });
  assert.equal(findings.filter((finding) => finding.level === "fail").length, 0);
});

test("layer interlock also qualifies as a freeform cutout intent", () => {
  const dir = fixture();
  writePlan(dir, cutout({ freeformLayoutIntent: "layer-interlock" }));
  const findings = runFreeformLayoutGuard({ rootDir: dir });
  assert.equal(findings.filter((finding) => finding.level === "fail").length, 0);
});
