import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { StateStore } from "../runtime/state-store.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repoRoot, "scripts", "image2-ui");

function invoke(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

test("Runtime CLI dry-run persists policy and inspect keeps state fields top-level", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-cli-"));
  const created = invoke([
    "run",
    target,
    "--task",
    "Plan a reference UI",
    "--reference",
    "reference.png",
    "--no-effect",
    "--dry-run",
    "--json",
  ]);

  assert.equal(created.status, 0, created.stderr);
  const state = JSON.parse(created.stdout);
  assert.equal(state.status, "created");
  assert.equal(state.policy.requireEffectImage, false);
  assert.equal(state.policy.requireEffectReview, false);
  assert.equal(path.isAbsolute(state.task.reference), true);

  const inspected = invoke(["inspect", target, "--latest", "--json"]);
  assert.equal(inspected.status, 0, inspected.stderr);
  const output = JSON.parse(inspected.stdout);
  assert.equal(output.runId, state.runId);
  assert.equal(output.status, "created");
  assert.deepEqual(output.events.map((event) => event.type), ["run.created"]);
});

test("inspect succeeds even when the inspected run is blocked", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-inspect-"));
  const store = new StateStore({ target });
  const state = await store.create({ target, prompt: "blocked run", stage: "verify" });
  await store.saveAtomic({
    ...state,
    status: "blocked",
    blockers: [{ code: "iteration-budget-exhausted", message: "done", at: new Date().toISOString(), retryable: false }],
  });

  const inspected = invoke(["inspect", target, "--run", state.runId, "--json"]);
  assert.equal(inspected.status, 0, inspected.stderr);
  assert.equal(JSON.parse(inspected.stdout).status, "blocked");

  const resumed = invoke(["resume", target, "--run", state.runId, "--json"]);
  assert.equal(resumed.status, 2, resumed.stderr);
  assert.equal(JSON.parse(resumed.stdout).status, "blocked");
});

test("approval checkpoints are explicit and resume decisions are validated", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-policy-"));
  const created = invoke([
    "run",
    target,
    "--task",
    "Plan a reference UI",
    "--reference",
    "reference.png",
    "--require-effect-review",
    "--dry-run",
    "--json",
  ]);
  assert.equal(created.status, 0, created.stderr);
  assert.equal(JSON.parse(created.stdout).policy.requireEffectReview, true);

  const invalid = invoke(["resume", target, "--latest", "--decision", "maybe", "--json"]);
  assert.equal(invalid.status, 1);
  assert.equal(JSON.parse(invalid.stdout).code, "runtime-command-failed");
});
