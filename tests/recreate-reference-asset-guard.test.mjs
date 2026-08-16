import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runReferenceAssetGuard } from "../scripts/ui_reference_asset_guard.mjs";

function makeFile(html) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-reference-asset-"));
  const file = path.join(dir, "index.html");
  fs.writeFileSync(file, html);
  return { dir, file };
}

test("Recreate rejects base64 raster assets hidden inside source", () => {
  const { file } = makeFile('<!doctype html><img src="data:image/png;base64,AAAA" alt="hero">');
  const findings = runReferenceAssetGuard({
    files: [file],
    workflowMode: "recreate",
    originalReference: "/tmp/reference.png",
  });
  assert.ok(findings.some((finding) => finding.rule === "recreate-inline-raster-bypass"));
});

test("Recreate rejects shipping the original screenshot as an implementation image", () => {
  const { file } = makeFile('<!doctype html><img src="reference.png" alt="page">');
  const findings = runReferenceAssetGuard({
    files: [file],
    workflowMode: "recreate",
    originalReference: "/tmp/reference.png",
  });
  assert.ok(findings.some((finding) => finding.rule === "recreate-reference-flattened"));
});

test("Create mode does not apply Recreate-specific reference asset guards", () => {
  const { file } = makeFile('<!doctype html><img src="data:image/png;base64,AAAA" alt="hero">');
  const findings = runReferenceAssetGuard({
    files: [file],
    workflowMode: "create",
    originalReference: null,
  });
  assert.equal(findings.length, 0);
});
