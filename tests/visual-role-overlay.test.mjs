import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runVisualRoleGuard } from "../scripts/ui_visual_role_guard.mjs";

function fixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-visual-role-"));
}

function writePlan(dir, elements) {
  fs.writeFileSync(path.join(dir, "visual-role-plan.json"), JSON.stringify({
    version: 1,
    workflow: "recreate",
    elements,
  }, null, 2));
}

function guard(dir) {
  return runVisualRoleGuard({ rootDir: dir, workflowMode: "recreate" });
}

function baseElement(overrides = {}) {
  return {
    id: "hero",
    assetRole: {
      role: "background-plate",
      renderer: "image2",
      placement: "background",
      generationScope: "asset-only",
      containsCodeOwnedText: false,
    },
    overlayRole: {
      mode: "side-by-side",
      zOrder: "disjoint",
      textOnImage: false,
      safeArea: "inside",
    },
    ...overrides,
  };
}

test("graphic primitives must stay code-rendered instead of going through image2", () => {
  const dir = fixture();
  writePlan(dir, [baseElement({
    id: "accent-line",
    assetRole: {
      role: "graphic-primitive",
      renderer: "image2",
      placement: "background",
      generationScope: "asset-only",
    },
  })]);
  const findings = guard(dir);
  assert.ok(findings.some((finding) => finding.rule === "placeholder-renderer-violation"));
});

test("overlapping cutouts require transparency and cutout-layered overlay", () => {
  const dir = fixture();
  writePlan(dir, [baseElement({
    id: "hero-ostrich",
    assetRole: {
      role: "cutout-subject",
      renderer: "image2",
      placement: "layered",
      generationScope: "asset-only",
      requiresTransparency: false,
      participatesInOverlap: true,
      containsCodeOwnedText: false,
    },
    overlayRole: {
      mode: "side-by-side",
      zOrder: "disjoint",
      textOnImage: false,
      safeArea: "inside",
    },
  })]);
  const findings = guard(dir);
  assert.ok(findings.some((finding) => finding.rule === "cutout-transparency-required"));
  assert.ok(findings.some((finding) => finding.rule === "cutout-overlay-required"));
});

test("safe text overlap requires an explicit text-safe zone", () => {
  const dir = fixture();
  writePlan(dir, [baseElement({
    overlayRole: {
      mode: "safe-overlap",
      zOrder: "text-over-image",
      textOnImage: true,
      textSafeZones: [],
      safeArea: "inside",
    },
  })]);
  assert.ok(guard(dir).some((finding) => finding.rule === "overlay-safe-zone-required"));
});

test("masked overlays require a real readability mask", () => {
  const dir = fixture();
  writePlan(dir, [baseElement({
    overlayRole: {
      mode: "masked-overlay",
      zOrder: "text-over-image",
      textOnImage: true,
      mask: "none",
      safeArea: "inside",
    },
  })]);
  assert.ok(guard(dir).some((finding) => finding.rule === "overlay-mask-required"));
});

test("cutout-layered overlays require z-order and protected subject zones", () => {
  const dir = fixture();
  writePlan(dir, [baseElement({
    id: "gorilla",
    assetRole: {
      role: "cutout-subject",
      renderer: "image2",
      placement: "layered",
      generationScope: "asset-only",
      requiresTransparency: true,
      participatesInOverlap: true,
      containsCodeOwnedText: false,
    },
    overlayRole: {
      mode: "cutout-layered",
      subjectCriticalZones: [],
      safeArea: "inside",
    },
  })]);
  const findings = guard(dir);
  assert.ok(findings.some((finding) => finding.rule === "overlay-z-order-required"));
  assert.ok(findings.some((finding) => finding.rule === "subject-critical-zone-required"));
});

test("image2 jobs must generate one asset rather than a full UI composition", () => {
  const dir = fixture();
  writePlan(dir, [baseElement({
    assetRole: {
      role: "background-plate",
      renderer: "image2",
      placement: "background",
      generationScope: "none",
      containsCodeOwnedText: false,
    },
  })]);
  assert.ok(guard(dir).some((finding) => finding.rule === "full-ui-image2-generation"));
});

test("a valid cutout layering contract passes the visual-role guard", () => {
  const dir = fixture();
  writePlan(dir, [baseElement({
    id: "hero-ostrich",
    assetRole: {
      role: "cutout-subject",
      renderer: "image2",
      placement: "layered",
      generationScope: "asset-only",
      requiresTransparency: true,
      participatesInOverlap: true,
      containsCodeOwnedText: false,
    },
    overlayRole: {
      mode: "cutout-layered",
      zOrder: "image-over-text",
      textOnImage: false,
      subjectCriticalZones: [[62, 18, 35, 52]],
      allowTextOverSubject: false,
      safeArea: "inside",
    },
  })]);
  assert.equal(guard(dir).filter((finding) => finding.level === "fail").length, 0);
});

test("existing projects get a warning instead of a breaking failure when visual-role-plan is absent", () => {
  const dir = fixture();
  fs.writeFileSync(path.join(dir, "asset-plan.json"), JSON.stringify({ version: 1, workflow: "recreate", assets: [] }));
  const findings = guard(dir);
  assert.ok(findings.some((finding) => finding.rule === "visual-role-plan-missing" && finding.level === "warn"));
  assert.equal(findings.filter((finding) => finding.level === "fail").length, 0);
});
