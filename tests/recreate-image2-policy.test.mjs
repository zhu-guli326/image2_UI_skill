import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runRecreateImage2PolicyGuard } from "../scripts/ui_recreate_image2_policy_guard.mjs";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/luzcswAAAABJRU5ErkJggg==",
  "base64",
);

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-image2-policy-"));
  fs.mkdirSync(path.join(dir, "assets"));
  fs.writeFileSync(path.join(dir, "reference.png"), tinyPng);
  fs.writeFileSync(path.join(dir, "assets", "hero.png"), tinyPng);
  return dir;
}

function writePlan(dir, asset) {
  fs.writeFileSync(path.join(dir, "asset-plan.json"), JSON.stringify({
    version: 1,
    workflow: "recreate",
    reference: "reference.png",
    assets: [asset],
  }, null, 2));
}

function image2Asset(overrides = {}) {
  return {
    id: "hero-animal",
    kind: "cutout",
    source: "image2",
    output: "assets/hero.png",
    referenceRegion: [120, 40, 180, 280],
    referenceRole: "visual-guide-only",
    image2Action: "edit",
    image2Prompt: "Recreate the animal subject as a clean standalone transparent cutout with no text or UI.",
    operations: ["image2-edit", "remove-background"],
    embeddedText: [],
    ...overrides,
  };
}

function writeProvenance(dir, asset, overrides = {}) {
  const output = path.join(dir, asset.output);
  fs.writeFileSync(`${output}.provenance.json`, JSON.stringify({
    generated_at: new Date().toISOString(),
    channel: "native-image2",
    source: "project-image2",
    action: asset.image2Action,
    output,
    prompt: asset.image2Prompt,
    model: "gpt-image-2",
    size: "1024x1024",
    quality: "medium",
    output_format: "png",
    images: [path.join(dir, "reference.png")],
    ...overrides,
  }, null, 2));
}

test("Recreate rejects final bitmap assets sourced directly from screenshot pixels", () => {
  const dir = fixture();
  writePlan(dir, {
    id: "hero-animal",
    kind: "cutout",
    source: "reference",
    output: "assets/hero.png",
    referenceRegion: [120, 40, 180, 280],
    operations: ["crop", "remove-background"],
  });
  const findings = runRecreateImage2PolicyGuard({ rootDir: dir, workflowMode: "recreate" });
  assert.ok(findings.some((finding) => finding.rule === "recreate-reference-raster-forbidden"));
});

test("Recreate image2 asset requires explicit visual-guide metadata and provenance", () => {
  const dir = fixture();
  const asset = image2Asset({ referenceRole: undefined, image2Prompt: undefined });
  writePlan(dir, asset);
  const findings = runRecreateImage2PolicyGuard({ rootDir: dir, workflowMode: "recreate" });
  assert.ok(findings.some((finding) => finding.rule === "image2-reference-role-invalid"));
  assert.ok(findings.some((finding) => finding.rule === "image2-prompt-missing"));
  assert.ok(findings.some((finding) => finding.rule === "image2-provenance-required"));
});

test("image2 edit may use the screenshot as visual guidance but final output must be generated and provenance-tracked", () => {
  const dir = fixture();
  const asset = image2Asset();
  writePlan(dir, asset);
  writeProvenance(dir, asset);
  const findings = runRecreateImage2PolicyGuard({ rootDir: dir, workflowMode: "recreate" });
  assert.equal(findings.filter((finding) => finding.level === "fail").length, 0, JSON.stringify(findings));
});

test("image2 provenance prompt drift is rejected", () => {
  const dir = fixture();
  const asset = image2Asset();
  writePlan(dir, asset);
  writeProvenance(dir, asset, { prompt: "A different prompt" });
  const findings = runRecreateImage2PolicyGuard({ rootDir: dir, workflowMode: "recreate" });
  assert.ok(findings.some((finding) => finding.rule === "image2-prompt-drift"));
});

test("legitimate existing project assets remain allowed", () => {
  const dir = fixture();
  writePlan(dir, {
    id: "existing-product-photo",
    kind: "project-existing",
    source: "project",
    output: "assets/hero.png",
    operations: [],
  });
  const findings = runRecreateImage2PolicyGuard({ rootDir: dir, workflowMode: "recreate" });
  assert.equal(findings.filter((finding) => finding.level === "fail").length, 0);
});

test("non-Recreate workflows do not apply the mandatory image2 recreation policy", () => {
  const dir = fixture();
  writePlan(dir, {
    id: "legacy-crop",
    kind: "inline-photo",
    source: "reference",
    output: "assets/hero.png",
    operations: ["crop"],
  });
  const findings = runRecreateImage2PolicyGuard({ rootDir: dir, workflowMode: "create" });
  assert.equal(findings.length, 0);
});
