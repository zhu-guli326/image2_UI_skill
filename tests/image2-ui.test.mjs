import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/luzcswAAAABJRU5ErkJggg==",
  "base64",
);

test("CLI reports the package version", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const stdout = execFileSync(node, ["scripts/image2-ui", "--version"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(stdout.trim(), pkg.version);
});

test("validate returns structured findings for a valid fixture", () => {
  const demoDir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-ok-"));
  fs.cpSync(path.join(repoRoot, "tests/fixtures/ok-demo"), demoDir, { recursive: true });
  fs.writeFileSync(path.join(demoDir, "hero.png"), tinyPng);
  const result = spawnSync(node, ["scripts/ui_output_audit.mjs", demoDir, "--json", "--no-browser"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.counts.fail, 0);
});

test("validate fails missing and escaping local assets", () => {
  const missing = spawnSync(node, ["scripts/ui_output_audit.mjs", "tests/fixtures/broken-demo", "--json", "--no-browser"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(missing.status, 2);
  assert.ok(JSON.parse(missing.stdout).findings.some((finding) => finding.rule === "broken-local-asset"));

  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-escape-"));
  const demoDir = path.join(parent, "demo");
  fs.mkdirSync(demoDir);
  fs.writeFileSync(path.join(parent, "secret.png"), tinyPng);
  fs.writeFileSync(path.join(demoDir, "index.html"), '<img src="../secret.png" alt="Escaping asset">');
  const escaping = spawnSync(node, ["scripts/ui_output_audit.mjs", demoDir, "--json", "--no-browser"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(escaping.status, 2);
  assert.ok(JSON.parse(escaping.stdout).findings.some((finding) => finding.rule === "asset-outside-root"));
});

test("compare writes an HTML review board", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-compare-"));
  const reference = path.join(dir, "reference.png");
  const actual = path.join(dir, "actual.png");
  const output = path.join(dir, "compare.html");
  fs.writeFileSync(reference, tinyPng);
  fs.writeFileSync(actual, tinyPng);
  execFileSync(node, ["scripts/ui_compare.mjs", "--reference", reference, "--actual", actual, "--out", output], { cwd: repoRoot });
  assert.match(fs.readFileSync(output, "utf8"), /Reference|Overlay/);
});

test("image2 wrapper prefers the configured project command", () => {
  const stdout = execFileSync("python3", ["scripts/image2_asset.py", "generate", "--prompt", "test prompt", "--output", "tmp/generated/test.png", "--prefer", "image2", "--dry-run"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, IMAGE2_COMMAND: "image2-custom" },
  });
  assert.match(stdout, /channel=native-image2/);
  assert.match(stdout, /source=project-image2/);
  assert.match(stdout, /image2-custom/);
});

test("doctor reports a missing configured image2 executable", () => {
  const stdout = execFileSync("python3", ["scripts/image2_asset.py", "doctor"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, IMAGE2_COMMAND: "missing-image2-command-for-test" },
  });
  const channel = JSON.parse(stdout).channels.find((item) => item.source === "project-image2");
  assert.equal(channel.available, false);
  assert.match(channel.reason, /executable not found/);
});

test("skill keeps the effect-image gate and points to the standalone gallery", () => {
  const skill = fs.readFileSync(path.join(repoRoot, "SKILL.md"), "utf8");
  const guide = fs.readFileSync(path.join(repoRoot, "references/asset-manifest-and-prompts.md"), "utf8");
  assert.match(skill, /reference image -> complete effect image -> effect-image review -> UI decomposition -> clickable implementation/);
  assert.match(skill, /start frontend implementation before the effect image has been saved and inspected/);
  assert.match(skill, /https:\/\/zhu-guli326\.github\.io\/ui_case\/launcher\.html\?intent=explore/);
  assert.match(skill, /https:\/\/zhu-guli326\.github\.io\/ui_case\//);
  assert.match(guide, /第一轮审查只服务于生成完整效果图，不做代码组件和图片资产拆分/);
});

test("multi-agent orchestrator exposes its production DAG", () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-orchestrate-"));
  const stdout = execFileSync(node, ["scripts/image2-ui", "orchestrate", target, "--task", "Build a production UI", "--dry-run", "--json"], { cwd: repoRoot, encoding: "utf8" });
  const report = JSON.parse(stdout);
  assert.equal(report.manifest.executionMode, "multi-agent");
  assert.deepEqual(report.plan.map((phase) => phase.name), ["discovery", "architecture", "implementation", "review", "verification", "release"]);
});

test("npm package contains Skill tooling and excludes gallery sources", () => {
  const stdout = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: repoRoot, encoding: "utf8" });
  const files = new Set(JSON.parse(stdout)[0].files.map((file) => file.path));
  for (const required of ["SKILL.md", "README.md", "PRODUCTION.md", "scripts/image2-ui", "scripts/image2_asset.py", "scripts/image2_orchestrate.mjs", "assets/readme/hero.png"]) {
    assert.ok(files.has(required), required);
  }
  assert.ok([...files].some((file) => file.startsWith("references/")));
  for (const excluded of ["library.html", "launcher.html", "catalog/index.js", "demo/artmuse-ios/index.html", "vocabulary.html"]) {
    assert.equal(files.has(excluded), false, excluded);
  }
});
