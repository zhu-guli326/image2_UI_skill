import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runVisualRoleGuard } from "../scripts/ui_visual_role_guard.mjs";

function fixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-visual-role-"));
}

function writePlan(dir, elements, compositionPolicy = undefined) {
  fs.writeFileSync(path.join(dir, "visual-role-plan.json"), JSON.stringify({
    version: 1,
    workflow: "recreate",
    ...(compositionPolicy ? { compositionPolicy } : {}),
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
      needsCutout: false,
      generationBackground: "full-scene",
      keyingMode: "none",
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

function cutoutAsset(overrides = {}) {
  return {
    role: "cutout-subject",
    renderer: "image2",
    placement: "layered",
    generationScope: "asset-only",
    needsCutout: true,
    generationBackground: "transparent",
    keyingMode: "native-alpha",
    requiresTransparency: true,
    participatesInOverlap: true,
    containsCodeOwnedText: false,
    ...overrides,
  };
}

function tightComposition(overrides = {}) {
  return {
    densityIntent: "tight",
    preserveReferenceDensity: true,
    allowLargeEmptyRegions: false,
    maxUnassignedWhitespaceRatio: 0.2,
    maxDensityDriftPercent: 10,
    ...overrides,
  };
}

function validPrimaryHero(overrides = {}) {
  return baseElement({
    id: "winter-seal",
    semanticPriority: "primary",
    overlayRole: {
      mode: "safe-overlap",
      zOrder: "text-over-image",
      textOnImage: true,
      textSafeZones: [[0, 0, 100, 20]],
      subjectCriticalZones: [[18, 24, 64, 45]],
      persistentControlZones: [[8, 82, 84, 12]],
      allowTextOverSubject: false,
      allowControlOverSubject: false,
      safeArea: "inside",
    },
    cropPolicy: {
      fit: "cover",
      focalPoint: [50, 48],
      safeCropBox: [8, 10, 84, 72],
      minBleedTop: 10,
      minBleedSides: 8,
      minBleedBottom: 12,
      criticalCropMaxPercent: 3,
      targetAspectRatio: 0.85,
    },
    ...overrides,
  });
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

test("image2 assets require a background/cutout strategy before generation", () => {
  const dir = fixture();
  writePlan(dir, [baseElement({
    assetRole: {
      role: "background-plate",
      renderer: "image2",
      placement: "background",
      generationScope: "asset-only",
      containsCodeOwnedText: false,
    },
  })]);
  assert.ok(guard(dir).some((finding) => finding.rule === "asset-background-strategy-required"));
});

test("green-screen cutouts require chroma-key post-processing", () => {
  const dir = fixture();
  writePlan(dir, [baseElement({
    id: "ostrich",
    assetRole: cutoutAsset({
      generationBackground: "green-screen",
      keyingMode: "background-removal",
    }),
    overlayRole: {
      mode: "cutout-layered",
      zOrder: "image-over-text",
      textOnImage: false,
      subjectCriticalZones: [[50, 10, 40, 70]],
      safeArea: "inside",
    },
  })]);
  assert.ok(guard(dir).some((finding) => finding.rule === "green-screen-keying-required"));
});

test("background plates must stay complete scenes rather than becoming cutouts", () => {
  const dir = fixture();
  writePlan(dir, [baseElement({
    assetRole: {
      ...baseElement().assetRole,
      needsCutout: true,
      generationBackground: "green-screen",
      keyingMode: "chroma-key",
    },
  })]);
  assert.ok(guard(dir).some((finding) => finding.rule === "background-plate-cutout-violation"));
});

test("overlapping cutouts require transparency and cutout-layered overlay", () => {
  const dir = fixture();
  writePlan(dir, [baseElement({
    id: "hero-ostrich",
    assetRole: cutoutAsset({ requiresTransparency: false }),
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
    assetRole: cutoutAsset(),
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
      ...baseElement().assetRole,
      generationScope: "none",
    },
  })]);
  assert.ok(guard(dir).some((finding) => finding.rule === "full-ui-image2-generation"));
});

test("primary hero cover requires focal-point or safe-crop guidance", () => {
  const dir = fixture();
  const hero = validPrimaryHero();
  hero.cropPolicy = { ...hero.cropPolicy, focalPoint: undefined, safeCropBox: undefined };
  writePlan(dir, [hero]);
  assert.ok(guard(dir).some((finding) => finding.rule === "hero-cover-without-focal-point"));
});

test("primary hero requires minimum bleed budget", () => {
  const dir = fixture();
  const hero = validPrimaryHero();
  hero.cropPolicy = { ...hero.cropPolicy, minBleedTop: 4, minBleedSides: 3, minBleedBottom: 6 };
  writePlan(dir, [hero]);
  assert.ok(guard(dir).some((finding) => finding.rule === "insufficient-hero-bleed"));
});

test("primary hero protects critical subject crop budget", () => {
  const dir = fixture();
  const hero = validPrimaryHero();
  hero.cropPolicy = { ...hero.cropPolicy, criticalCropMaxPercent: 8 };
  writePlan(dir, [hero]);
  assert.ok(guard(dir).some((finding) => finding.rule === "critical-subject-crop"));
});

test("persistent CTA zones cannot cross subject-critical zones", () => {
  const dir = fixture();
  const hero = validPrimaryHero();
  hero.overlayRole = {
    ...hero.overlayRole,
    persistentControlZones: [[18, 55, 64, 24]],
  };
  writePlan(dir, [hero]);
  assert.ok(guard(dir).some((finding) => finding.rule === "cta-subject-overlap"));
});

test("text-safe zones cannot be declared through protected focal content", () => {
  const dir = fixture();
  const hero = validPrimaryHero();
  hero.overlayRole = {
    ...hero.overlayRole,
    textSafeZones: [[20, 30, 50, 20]],
  };
  writePlan(dir, [hero]);
  assert.ok(guard(dir).some((finding) => finding.rule === "subject-critical-overlap"));
});

test("tight editorial compositions reject large unassigned whitespace budgets", () => {
  const dir = fixture();
  writePlan(dir, [validPrimaryHero()], tightComposition({ maxUnassignedWhitespaceRatio: 0.4 }));
  assert.ok(guard(dir).some((finding) => finding.rule === "excessive-unreferenced-whitespace"));
});

test("large empty regions require a reference-backed reason", () => {
  const dir = fixture();
  writePlan(dir, [validPrimaryHero()], {
    densityIntent: "reference-matched",
    preserveReferenceDensity: true,
    allowLargeEmptyRegions: true,
    maxDensityDriftPercent: 10,
  });
  assert.ok(guard(dir).some((finding) => finding.rule === "excessive-unreferenced-whitespace"));
});

test("recreate cannot opt out of preserving reference density", () => {
  const dir = fixture();
  writePlan(dir, [validPrimaryHero()], tightComposition({ preserveReferenceDensity: false }));
  assert.ok(guard(dir).some((finding) => finding.rule === "composition-density-drift"));
});

test("a valid tight composition preserves breathing room without dead space", () => {
  const dir = fixture();
  writePlan(dir, [validPrimaryHero()], tightComposition());
  assert.equal(guard(dir).filter((finding) => finding.level === "fail").length, 0);
});

test("a valid primary hero crop and overlay contract passes", () => {
  const dir = fixture();
  writePlan(dir, [validPrimaryHero()]);
  assert.equal(guard(dir).filter((finding) => finding.level === "fail").length, 0);
});

test("a valid cutout layering contract passes the visual-role guard", () => {
  const dir = fixture();
  writePlan(dir, [baseElement({
    id: "hero-ostrich",
    assetRole: cutoutAsset(),
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

test("recreate plans without composition policy warn instead of breaking old artifacts", () => {
  const dir = fixture();
  writePlan(dir, [validPrimaryHero()]);
  const findings = guard(dir);
  assert.ok(findings.some((finding) => finding.rule === "composition-policy-missing" && finding.level === "warn"));
  assert.equal(findings.filter((finding) => finding.level === "fail").length, 0);
});

test("existing projects get a warning instead of a breaking failure when visual-role-plan is absent", () => {
  const dir = fixture();
  fs.writeFileSync(path.join(dir, "asset-plan.json"), JSON.stringify({ version: 1, workflow: "recreate", assets: [] }));
  const findings = guard(dir);
  assert.ok(findings.some((finding) => finding.rule === "visual-role-plan-missing" && finding.level === "warn"));
  assert.equal(findings.filter((finding) => finding.level === "fail").length, 0);
});
