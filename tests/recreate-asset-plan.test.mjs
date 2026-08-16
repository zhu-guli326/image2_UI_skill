import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runAssetPlanGuard } from "../scripts/ui_asset_plan_guard.mjs";
import { createLegacyToolRegistry } from "../runtime/tools/legacy-cli.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/luzcswAAAABJRU5ErkJggg==",
  "base64",
);

function makeRecreateDemo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-asset-plan-"));
  fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
  fs.writeFileSync(path.join(dir, "reference.png"), tinyPng);
  fs.writeFileSync(path.join(dir, "assets", "seal.png"), tinyPng);
  fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body>
    <h1>EVENT</h1><img src="assets/seal.png" alt="Seal hero"><button>Get Tickets</button>
  </body></html>`);
  return dir;
}

function filesIn(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else out.push(full);
    }
  }
  return out;
}

function guard(dir) {
  return runAssetPlanGuard({
    rootDir: dir,
    files: filesIn(dir),
    workflowMode: "recreate",
    originalReference: path.join(dir, "reference.png"),
  });
}

function writePlan(dir, assetOverrides = {}, referenceElements = []) {
  const asset = {
    id: "seal-hero",
    kind: "background-plate",
    source: "reference",
    output: "assets/seal.png",
    referenceRegion: [180, 180, 140, 170],
    operations: ["crop", "remove-text", "remove-ui"],
    sourceMayContainText: true,
    sourceMayContainUi: true,
    textRemoved: true,
    uiRemoved: true,
    backgroundRemoved: false,
    codeOwnedText: ["EVENT"],
    embeddedText: [],
    ...assetOverrides,
  };
  fs.writeFileSync(path.join(dir, "asset-plan.json"), JSON.stringify({
    version: 1,
    workflow: "recreate",
    reference: "reference.png",
    assets: [asset],
    referenceElements,
  }, null, 2));
}

test("Recreate with referenced raster assets requires asset-plan.json", () => {
  const dir = makeRecreateDemo();
  const findings = guard(dir);
  assert.ok(findings.some((finding) => finding.rule === "recreate-asset-plan-missing"));
});

test("Reference crops that may contain text/UI must be cleaned", () => {
  const dir = makeRecreateDemo();
  writePlan(dir, {
    operations: ["crop"],
    textRemoved: false,
    uiRemoved: false,
  });
  const findings = guard(dir);
  assert.ok(findings.some((finding) => finding.rule === "asset-text-contamination-risk"));
  assert.ok(findings.some((finding) => finding.rule === "asset-ui-contamination-risk"));
});

test("Cutout classification requires actual background removal", () => {
  const dir = makeRecreateDemo();
  writePlan(dir, {
    kind: "cutout",
    operations: ["crop", "remove-text", "remove-ui"],
    backgroundRemoved: false,
  });
  const findings = guard(dir);
  assert.ok(findings.some((finding) => finding.rule === "asset-kind-mismatch"));
});

test("A clean prepared reference asset satisfies the static preparation contract", () => {
  const dir = makeRecreateDemo();
  writePlan(dir);
  const findings = guard(dir);
  assert.equal(findings.filter((finding) => finding.level === "fail").length, 0);
});

test("Declared bitmap text duplicated in code fails semantic de-duplication", () => {
  const dir = makeRecreateDemo();
  writePlan(dir, {
    embeddedText: ["EVENT"],
    allowEmbeddedText: true,
    embeddedTextReason: "fixture intentionally keeps the word for duplicate detection",
  });
  const findings = guard(dir);
  assert.ok(findings.some((finding) => finding.rule === "duplicate-semantic-content"));
});

test("Required visible reference controls may not be silently omitted", () => {
  const dir = makeRecreateDemo();
  writePlan(dir, {}, [
    { id: "back-button", kind: "code-ui", required: true, status: "missing" },
  ]);
  const findings = guard(dir);
  assert.ok(findings.some((finding) => finding.rule === "reference-element-missing"));
});

test("Runtime ui.validate forwards workflow and original reference into Harness Guard", async () => {
  const dir = makeRecreateDemo();
  const registry = createLegacyToolRegistry({ repoRoot });
  const result = await registry.invoke("ui.validate", {
    target: dir,
    noBrowser: true,
    reference: path.join(dir, "reference.png"),
    workflowMode: "recreate",
    originalReference: path.join(dir, "reference.png"),
  });
  assert.ok(result.data.findings.some((finding) => finding.rule === "recreate-asset-plan-missing"));
});
