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

test("reference defaults to Recreate and skips the Effect Image gate", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-recreate-"));
  const created = invoke([
    "run",
    target,
    "--task",
    "Recreate this reference UI",
    "--reference",
    "reference.png",
    "--dry-run",
    "--json",
  ]);

  assert.equal(created.status, 0, created.stderr);
  const state = JSON.parse(created.stdout);
  assert.equal(state.status, "created");
  assert.equal(state.task.intent, "reference-recreation");
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

test("Redesign requires a reference and enables Effect Image by default", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-redesign-"));
  const created = invoke([
    "run",
    target,
    "--mode",
    "redesign",
    "--task",
    "Redesign this reference for a new product",
    "--reference",
    "reference.png",
    "--dry-run",
    "--json",
  ]);

  assert.equal(created.status, 0, created.stderr);
  const state = JSON.parse(created.stdout);
  assert.equal(state.task.intent, "optimize");
  assert.equal(state.policy.requireEffectImage, true);
  assert.equal(state.policy.requireEffectReview, false);

  const missingReference = invoke([
    "run",
    target,
    "--mode",
    "redesign",
    "--task",
    "Redesign without reference",
    "--dry-run",
    "--json",
  ]);
  assert.equal(missingReference.status, 1);
  assert.match(JSON.parse(missingReference.stdout).error, /requires --reference/);
});

test("Create works without a reference and enables Effect Image by default", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-create-"));
  const created = invoke([
    "run",
    target,
    "--mode",
    "create",
    "--task",
    "Create a new dashboard",
    "--dry-run",
    "--json",
  ]);

  assert.equal(created.status, 0, created.stderr);
  const state = JSON.parse(created.stdout);
  assert.equal(state.task.intent, "create");
  assert.equal(state.task.reference, null);
  assert.equal(state.policy.requireEffectImage, true);
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

test("Effect Image approval checkpoint applies to Redesign/Create, not Recreate", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-policy-"));
  const redesign = invoke([
    "run",
    target,
    "--mode",
    "redesign",
    "--task",
    "Redesign a reference UI",
    "--reference",
    "reference.png",
    "--require-effect-review",
    "--dry-run",
    "--json",
  ]);
  assert.equal(redesign.status, 0, redesign.stderr);
  const redesignState = JSON.parse(redesign.stdout);
  assert.equal(redesignState.policy.requireEffectImage, true);
  assert.equal(redesignState.policy.requireEffectReview, true);

  const recreate = invoke([
    "run",
    target,
    "--mode",
    "recreate",
    "--task",
    "Recreate a reference UI",
    "--reference",
    "reference.png",
    "--require-effect-review",
    "--dry-run",
    "--json",
  ]);
  assert.equal(recreate.status, 0, recreate.stderr);
  assert.equal(JSON.parse(recreate.stdout).policy.requireEffectReview, false);

  const invalid = invoke(["resume", target, "--latest", "--decision", "maybe", "--json"]);
  assert.equal(invalid.status, 1);
  assert.equal(JSON.parse(invalid.stdout).code, "runtime-command-failed");
});
