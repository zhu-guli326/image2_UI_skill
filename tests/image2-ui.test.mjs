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

test("validate returns structured warnings without browser checks", () => {
  const demoDir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-ok-demo-"));
  fs.cpSync(path.join(repoRoot, "tests/fixtures/ok-demo"), demoDir, { recursive: true });
  fs.writeFileSync(path.join(demoDir, "hero.png"), tinyPng);

  const result = spawnSync(node, [
    "scripts/ui_output_audit.mjs",
    demoDir,
    "--json",
    "--no-browser",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.counts.fail, 0);
  assert.ok(parsed.findings.some((finding) => finding.rule === "entry"));
});

test("CLI reports package version", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const stdout = execFileSync(node, ["scripts/image2-ui", "--version"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(stdout.trim(), packageJson.version);
});

test("validate fails missing local assets", () => {
  const result = spawnSync(node, [
    "scripts/ui_output_audit.mjs",
    "tests/fixtures/broken-demo",
    "--json",
    "--no-browser",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 2);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.findings.some((finding) => finding.rule === "broken-local-asset"));
});

test("validate fails when local asset references escape the demo root", () => {
  const parentDir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-escape-"));
  const demoDir = path.join(parentDir, "demo");
  fs.mkdirSync(demoDir);
  fs.writeFileSync(path.join(parentDir, "secret.png"), tinyPng);
  fs.writeFileSync(path.join(demoDir, "index.html"), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Escape Fixture</title>
  </head>
  <body>
    <img src="../secret.png" alt="Escaping asset" />
  </body>
</html>
`);

  const result = spawnSync(node, [
    "scripts/ui_output_audit.mjs",
    demoDir,
    "--json",
    "--no-browser",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 2);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.findings.some((finding) => finding.rule === "asset-outside-root"));
});

test("compare writes an HTML review board", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-compare-"));
  const reference = path.join(tmpDir, "reference.png");
  const actual = path.join(tmpDir, "actual.png");
  const out = path.join(tmpDir, "compare.html");
  fs.writeFileSync(reference, tinyPng);
  fs.writeFileSync(actual, tinyPng);

  const result = spawnSync(node, [
    "scripts/ui_compare.mjs",
    "--reference",
    reference,
    "--actual",
    actual,
    "--out",
    out,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(out));
  assert.match(fs.readFileSync(out, "utf8"), /Manual review checklist/);
});

test("image2 asset wrapper dry-runs the project image2 command first", () => {
  const stdout = execFileSync("python3", [
    "scripts/image2_asset.py",
    "generate",
    "--prompt",
    "test prompt",
    "--output",
    "tmp/generated/test.png",
    "--prefer",
    "image2",
    "--dry-run",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      IMAGE2_COMMAND: "image2-custom",
    },
  });

  assert.match(stdout, /channel=native-image2/);
  assert.match(stdout, /source=project-image2/);
  assert.match(stdout, /image2-custom/);
  assert.match(stdout, /--output tmp\/generated\/test\.png/);
});

test("doctor marks a missing IMAGE2_COMMAND executable unavailable", () => {
  const stdout = execFileSync("python3", [
    "scripts/image2_asset.py",
    "doctor",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      IMAGE2_COMMAND: "missing-image2-command-for-test",
    },
  });

  const parsed = JSON.parse(stdout);
  const projectChannel = parsed.channels.find((channel) => channel.source === "project-image2");
  assert.equal(projectChannel.available, false);
  assert.match(projectChannel.reason, /executable not found/);
});

test("npm package dry-run contains production entrypoints", () => {
  const stdout = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const [pack] = JSON.parse(stdout);
  const files = new Set(pack.files.map((file) => file.path));

  assert.ok(files.has("SKILL.md"));
  assert.ok(files.has("PRODUCTION.md"));
  assert.ok(files.has("scripts/image2-ui"));
  assert.ok(files.has("scripts/image2_asset.py"));
  assert.ok(files.has("scripts/image2_orchestrate.mjs"));
  assert.ok([...files].some((file) => file.startsWith("references/")));
  assert.ok(files.has("CONTRIBUTING.md"));
  assert.ok(files.has("CHANGELOG.md"));
  assert.ok(files.has("LICENSE"));
  assert.ok(files.has("quality-baseline.json"));
});

test("repository demo validation covers every bundled demo", () => {
  const result = execFileSync(node, ["scripts/validate_demos.mjs", "--no-browser", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const parsed = JSON.parse(result);
  assert.equal(parsed.status, "pass");
  assert.ok(parsed.demos.length >= 4);
  assert.equal(parsed.summary.fail, 0);
  assert.ok(Object.keys(parsed.baseline).length > 0);
});

test("multi-agent orchestrator exposes the production DAG in dry-run mode", () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-orchestrate-"));
  const result = execFileSync(node, [
    "scripts/image2-ui",
    "orchestrate",
    target,
    "--task",
    "Build a production-shaped UI",
    "--dry-run",
    "--json",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  const parsed = JSON.parse(result);
  assert.equal(parsed.manifest.executionMode, "multi-agent");
  assert.deepEqual(parsed.plan.map((phase) => phase.name), [
    "discovery",
    "architecture",
    "implementation",
    "review",
    "verification",
    "release",
  ]);
  assert.deepEqual(parsed.plan[0].roles, ["visual-analyst", "asset-engineer"]);
  assert.deepEqual(parsed.plan[3].roles, ["code-reviewer"]);
  assert.deepEqual(parsed.plan[4].roles, ["accessibility", "qa-auditor"]);
  assert.deepEqual(parsed.plan[4].batches, [["accessibility"], ["qa-auditor"]]);
  assert.match(parsed.manifest.artifactsDir, /\.image2-ui[\\/]agents/);
});

test("all bundled demos expose shared motion tokens and reduced-motion rules", () => {
  for (const name of ["artmuse-ios", "generated-home-ui", "marble-note", "smart-home-ui-v2"]) {
    const stylesheet = name === "smart-home-ui-v2"
      ? fs.readFileSync(path.join(repoRoot, "demo", name, "src", "styles.css"), "utf8")
      : fs.readFileSync(path.join(repoRoot, "demo", name, "styles.css"), "utf8");
    assert.match(stylesheet, /--motion-duration-fast/);
    assert.match(stylesheet, /--motion-ease-standard/);
    assert.match(stylesheet, /prefers-reduced-motion/);
    assert.match(stylesheet, /motion-fade-up|motion-view-enter/);
  }
});
