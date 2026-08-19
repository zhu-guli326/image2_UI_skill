import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;
const pythonCandidates = process.env.PYTHON
  ? [{ command: process.env.PYTHON, prefixArgs: [] }]
  : process.platform === "win32"
    ? [
        { command: "python", prefixArgs: [] },
        { command: "py", prefixArgs: ["-3"] },
        { command: "python3", prefixArgs: [] },
      ]
    : [{ command: "python3", prefixArgs: [] }, { command: "python", prefixArgs: [] }];
const python = pythonCandidates.find(({ command, prefixArgs }) =>
  spawnSync(command, [...prefixArgs, "--version"], { encoding: "utf8" }).status === 0,
);

if (!python) {
  throw new Error("Python 3.10 or newer is required to run the test suite");
}

function execPython(args, options = {}) {
  return execFileSync(python.command, [...python.prefixArgs, ...args], options);
}

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
  const stdout = execPython(["scripts/image2_asset.py", "generate", "--prompt", "test prompt", "--output", "tmp/generated/test.png", "--prefer", "image2", "--dry-run"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, IMAGE2_COMMAND: "image2-custom" },
  });
  assert.match(stdout, /channel=native-image2/);
  assert.match(stdout, /source=project-image2/);
  assert.match(stdout, /image2-custom/);
});

test("doctor reports a missing configured image2 executable", () => {
  const stdout = execPython(["scripts/image2_asset.py", "doctor"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, IMAGE2_COMMAND: "missing-image2-command-for-test" },
  });
  const channel = JSON.parse(stdout).channels.find((item) => item.source === "project-image2");
  assert.equal(channel.available, false);
  assert.match(channel.reason, /executable not found/);
});

test("skill exposes the three workflow contracts and standalone gallery", () => {
  const skill = fs.readFileSync(path.join(repoRoot, "SKILL.md"), "utf8");
  const guide = fs.readFileSync(path.join(repoRoot, "references/asset-manifest-and-prompts.md"), "utf8");
  assert.match(skill, /1\. `recreate` — 截图 \/ 设计稿 → UI/);
  assert.match(skill, /2\. `redesign` — 参考图 → 新设计 → UI/);
  assert.match(skill, /3\. `create` — 描述 → 新设计 → UI/);
  assert.match(skill, /Do not treat Effect Image as a universal mandatory step/);
  assert.match(skill, /Recreate \| Skip by default \| Original reference \| Original reference/);
  assert.match(skill, /Redesign \| Required by default/);
  assert.match(skill, /Create \| Required by default/);
  assert.match(skill, /one structured follow-up question with exactly three mutually exclusive choices/);
  assert.match(skill, /`request_user_input`/);
  assert.match(skill, /"id": "workflow_mode"/);
  assert.match(skill, /"label": "截图还原 \(Recommended\)"/);
  assert.match(skill, /"label": "参考重设计"/);
  assert.match(skill, /"label": "从零创建"/);
  assert.match(skill, /first navigate the user to the Chinese visual launcher/);
  assert.match(skill, /host's in-app browser or navigation capability/);
  assert.match(skill, /https:\/\/zhu-guli326\.github\.io\/ui_case\/launcher\.html\?lang=zh/);
  assert.match(skill, /Visible Workbench And Progressive Alignment/);
  assert.match(skill, /Ask only load-bearing questions/);
  assert.match(skill, /Group related choices/);
  assert.match(skill, /A successful file write, build, image-generation response, or validator exit is not by itself visual proof/);
  assert.match(skill, /both structural evidence .* and visual evidence/);
  assert.match(skill, /change only the rejected or failing scope/);
  assert.match(skill, /Do not repeat an identical paid or time-consuming image generation/);
  assert.match(skill, /https:\/\/zhu-guli326\.github\.io\/ui_case\//);
  assert.match(guide, /Recreate：直接从原参考图拆分/);
  assert.match(guide, /Redesign \/ Create：先生成并检查完整 Effect Image/);
});

test("orchestrate delegates to Runtime and exposes the scheduler DAG", () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-orchestrate-"));
  const stdout = execFileSync(node, ["scripts/image2-ui", "orchestrate", target, "--task", "Build a production UI", "--dry-run", "--json"], { cwd: repoRoot, encoding: "utf8" });
  const report = JSON.parse(stdout);
  assert.equal(report.runtime.executionMode, "multi-agent");
  assert.equal(report.status, "created");
  assert.deepEqual(report.schedulerPlan.phases.map((phase) => phase.phase), ["discovery", "architecture", "implementation", "review", "verification", "release"]);
  assert.equal(fs.existsSync(path.join(target, ".image2-ui", "agents")), false);
  assert.equal(fs.existsSync(path.join(target, ".image2-ui", "runs", report.runId, "state.json")), true);
});

test("npm package contains Skill tooling and excludes gallery sources", () => {
  const npmArgs = ["pack", "--dry-run", "--json"];
  const npmExecPath = process.env.npm_execpath;
  const stdout = execFileSync(
    npmExecPath ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm",
    npmExecPath ? [npmExecPath, ...npmArgs] : npmArgs,
    { cwd: repoRoot, encoding: "utf8" },
  );
  const files = new Set(JSON.parse(stdout)[0].files.map((file) => file.path));
  for (const required of ["SKILL.md", "README.md", "PRODUCTION.md", "validate.ps1", "agents/openai.yaml", "scripts/image2-ui", "scripts/image2_asset.py", "scripts/image2_orchestrate.mjs", "scripts/workflow_state_machine.mjs", "scripts/ui_compare.mjs", "scripts/ui_loop.mjs", "scripts/ui_output_audit.mjs", "runtime/runner.mjs", "runtime/state-store.mjs", "runtime/tools/registry.mjs", "runtime/scheduler/roles.mjs", "runtime/scheduler/dag.mjs", "runtime/scheduler/executor.mjs", "schemas/state.schema.json", "assets/readme/hero.png"]) {
    assert.ok(files.has(required), required);
  }
  assert.ok([...files].some((file) => file.startsWith("references/")));
  for (const excluded of ["library.html", "launcher.html", "catalog/index.js", "demo/artmuse-ios/index.html", "vocabulary.html"]) {
    assert.equal(files.has(excluded), false, excluded);
  }
});
