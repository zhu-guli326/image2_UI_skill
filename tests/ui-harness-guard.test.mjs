import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/luzcswAAAABJRU5ErkJggg==",
  "base64",
);

function makeDemo(html) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-guard-"));
  fs.writeFileSync(path.join(dir, "index.html"), html);
  fs.writeFileSync(path.join(dir, "styles.css"), "body{font-family:sans-serif} button{min-height:44px}");
  fs.writeFileSync(path.join(dir, "app.js"), "document.documentElement.dataset.ready='1';");
  fs.writeFileSync(path.join(dir, "photo.png"), tinyPng);
  return dir;
}

function validate(dir) {
  const result = spawnSync(node, ["scripts/ui_output_audit.mjs", dir, "--json", "--no-browser"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return { result, report: JSON.parse(result.stdout) };
}

test("Harness Guard fails Unicode placeholder glyphs in functional navigation", () => {
  const dir = makeDemo(`<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body>
    <img src="photo.png" alt="Editorial visual">
    <nav class="bottom-nav">
      <button class="nav-item active"><span class="dot">⌂</span>Home</button>
      <button class="nav-item"><span class="dot">●</span>Profile</button>
    </nav>
  </body></html>`);
  const { result, report } = validate(dir);
  assert.equal(result.status, 2);
  assert.ok(report.findings.some((finding) => finding.rule === "placeholder-ui-glyph"));
});

test("Harness Guard accepts a real inline SVG icon system", () => {
  const dir = makeDemo(`<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body>
    <img src="photo.png" alt="Editorial visual">
    <svg width="0" height="0" aria-hidden="true"><symbol id="home" viewBox="0 0 24 24"><path d="M3 11 12 3l9 8"/></symbol></svg>
    <nav class="bottom-nav"><button class="nav-item active"><svg aria-hidden="true"><use href="#home"></use></svg>Home</button></nav>
  </body></html>`);
  const { report } = validate(dir);
  assert.equal(report.findings.some((finding) => finding.rule === "placeholder-ui-glyph"), false);
});

test("Harness Guard requires image2 provenance for generated visual assets", () => {
  const dir = makeDemo(`<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body>
    <img src="photo.png" alt="Editorial visual">
    <img src="assets/generated/hero.png" alt="Generated hero">
  </body></html>`);
  const generated = path.join(dir, "assets", "generated");
  fs.mkdirSync(generated, { recursive: true });
  fs.writeFileSync(path.join(generated, "hero.png"), tinyPng);

  let checked = validate(dir);
  assert.equal(checked.result.status, 2);
  assert.ok(checked.report.findings.some((finding) => finding.rule === "generated-visual-missing-provenance"));

  fs.writeFileSync(path.join(generated, "hero.png.provenance.json"), JSON.stringify({
    channel: "native-image2",
    source: "project-image2",
    action: "generate",
    output: "assets/generated/hero.png",
  }));

  checked = validate(dir);
  assert.equal(checked.report.findings.some((finding) => finding.rule === "generated-visual-missing-provenance"), false);
  assert.equal(checked.report.findings.some((finding) => finding.rule === "generated-visual-unapproved-source"), false);
});

test("Harness Guard blocks semantic raster drawing code", () => {
  const dir = makeDemo(`<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body>
    <img src="photo.png" alt="Editorial visual">
  </body></html>`);
  fs.writeFileSync(path.join(dir, "make-background.py"), `
from PIL import Image, ImageDraw
im = Image.new("RGB", (1200, 800), "white")
draw = ImageDraw.Draw(im)
draw.rectangle((10,10,500,500), fill="black")
im.save("background.png")
`);
  const checked = validate(dir);
  assert.equal(checked.result.status, 2);
  assert.ok(checked.report.findings.some((finding) => finding.rule === "procedural-semantic-visual-generation"));
});
