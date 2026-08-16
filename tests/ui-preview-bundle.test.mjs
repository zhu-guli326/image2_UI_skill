import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { bundlePreview } from "../scripts/ui_preview_bundle.mjs";
import { runReferenceAssetGuard } from "../scripts/ui_reference_asset_guard.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/luzcswAAAABJRU5ErkJggg==",
  "base64",
);

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-preview-"));
  fs.mkdirSync(path.join(dir, "assets"));
  fs.writeFileSync(path.join(dir, "assets", "hero.png"), tinyPng);
  fs.writeFileSync(path.join(dir, "assets", "bg.png"), tinyPng);
  fs.writeFileSync(path.join(dir, "styles.css"), 'body{background-image:url("./assets/bg.png")}');
  fs.writeFileSync(path.join(dir, "app.js"), 'document.documentElement.dataset.ready="true";');
  fs.writeFileSync(
    path.join(dir, "index.html"),
    '<!doctype html><html><head><link rel="stylesheet" href="./styles.css"></head><body><img src="./assets/hero.png" alt="Hero"><script src="./app.js"></script></body></html>',
  );
  return dir;
}

test("preview bundler creates a self-contained delivery artifact without changing canonical source", () => {
  const dir = fixture();
  const canonical = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const output = path.join(dir, "delivery-preview.html");
  const result = bundlePreview(dir, { out: output });
  const bundled = fs.readFileSync(output, "utf8");

  assert.equal(result.artifact, "preview-only");
  assert.ok(result.inlined.includes("assets/hero.png"));
  assert.ok(result.inlined.includes("assets/bg.png"));
  assert.ok(result.inlined.includes("styles.css"));
  assert.ok(result.inlined.includes("app.js"));
  assert.match(bundled, /data-image2-ui-artifact="preview-only"/);
  assert.match(bundled, /data:image\/png;base64,/);
  assert.match(bundled, /<style data-preview-source="styles\.css">/);
  assert.match(bundled, /<script data-preview-source="app\.js">/);
  assert.doesNotMatch(bundled, /assets\/hero\.png|assets\/bg\.png|href="\.\/styles\.css"|src="\.\/app\.js"/);
  assert.equal(fs.readFileSync(path.join(dir, "index.html"), "utf8"), canonical);

  const findings = runReferenceAssetGuard({
    files: [output],
    workflowMode: "recreate",
    originalReference: path.join(dir, "reference.png"),
  });
  assert.equal(findings.length, 0, JSON.stringify(findings));
});

test("image2-ui preview command produces the same portable artifact contract", () => {
  const dir = fixture();
  const output = path.join(dir, "cli-preview.html");
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "image2-ui"), "preview", dir, "--out", output, "--json"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.artifact, "preview-only");
  assert.equal(path.resolve(report.output), path.resolve(output));
  assert.ok(fs.existsSync(output));
  assert.match(fs.readFileSync(output, "utf8"), /data-image2-ui-artifact="preview-only"/);
});
