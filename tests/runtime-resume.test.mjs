import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRuntime } from "../runtime/runner.mjs";
import { StateStore } from "../runtime/state-store.mjs";
import { ToolRegistry } from "../runtime/tools/registry.mjs";

const passingTools = () => new ToolRegistry([
  { name: "agent.execute", access: "write", invoke: async () => ({ ok: true, data: { edited: true } }) },
  { name: "ui.validate", invoke: async () => ({ ok: true, data: { mustFix: [], shouldFix: [] } }) },
]);

test("resume reconciles an interrupted read-only operation by retrying its stage", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-read-recovery-"));
  const store = new StateStore({ target });
  const state = await store.create({
    target,
    prompt: "resume verification",
    status: "running",
    stage: "verify",
    currentOperation: {
      operationId: "verify-interrupted",
      stage: "verify",
      tool: "ui.validate",
      attempt: 1,
      startedAt: new Date().toISOString(),
      mutationPossible: false,
    },
  });

  const result = await createRuntime({ target, store, tools: passingTools() }).resume({ target, runId: state.runId });
  assert.equal(result.status, "completed");
  assert.ok((await store.events(state.runId)).some((event) => event.type === "recovery.retry"));
});

test("resume can continue a recoverable blocker after capabilities change", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-blocked-recovery-"));
  const store = new StateStore({ target });
  const state = await store.create({
    target,
    prompt: "resume blocked verification",
    status: "blocked",
    stage: "verify",
    blockers: [{ code: "capability-unavailable", message: "validator missing", at: new Date().toISOString(), retryable: false }],
  });

  const result = await createRuntime({ target, store, tools: passingTools() }).resume({ target, runId: state.runId });
  assert.equal(result.status, "completed");
});

test("resume applies an effect review decision before continuing", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-approval-"));
  const store = new StateStore({ target });
  const state = await store.create({
    target,
    prompt: "approve effect",
    status: "waiting-input",
    stage: "review-effect",
    policy: { requireEffectImage: true, requireEffectReview: true },
    artifacts: {
      effect: { kind: "effect-image", path: path.join(target, "effect.png"), producer: "image.generate", operationId: "effect-op" },
    },
  });

  const result = await createRuntime({ target, store, tools: passingTools() }).resume({ target, runId: state.runId, decision: "approved" });
  assert.equal(result.status, "completed");
});

test("interrupted effect generation retries the effect stage instead of verifying the UI", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-effect-recovery-"));
  const store = new StateStore({ target });
  const state = await store.create({
    target,
    prompt: "resume effect generation",
    status: "running",
    stage: "generate-effect",
    policy: { requireEffectImage: true, requireEffectReview: false },
    currentOperation: {
      operationId: "effect-interrupted",
      stage: "generate-effect",
      tool: "image.generate",
      attempt: 1,
      startedAt: new Date().toISOString(),
      mutationPossible: true,
    },
  });
  const calls = [];
  const tools = passingTools().register({
    name: "image.generate",
    access: "write",
    async invoke(_input, ctx) {
      calls.push("image.generate");
      return {
        ok: true,
        data: {},
        artifacts: [{ kind: "effect-image", path: path.join(target, "effect.png"), producer: "image.generate", operationId: ctx.operation.operationId }],
      };
    },
  });

  const result = await createRuntime({ target, store, tools }).resume({ target, runId: state.runId });
  assert.equal(result.status, "completed");
  assert.deepEqual(calls, ["image.generate"]);
  assert.ok((await store.events(state.runId)).some((event) => event.type === "recovery.retry" && event.interruptedStage === "generate-effect"));
});

test("raising the iteration budget resumes a budget-exhausted run", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-budget-recovery-"));
  const store = new StateStore({ target });
  const state = await store.create({
    target,
    prompt: "raise budget",
    status: "blocked",
    stage: "verify",
    iteration: 2,
    limits: { maxIterations: 2 },
    blockers: [{ code: "iteration-budget-exhausted", message: "budget", at: new Date().toISOString(), retryable: false }],
  });

  const result = await createRuntime({ target, store, tools: passingTools() }).resume({
    target,
    runId: state.runId,
    limits: { maxIterations: 3 },
  });
  assert.equal(result.status, "completed");
  assert.equal(result.limits.maxIterations, 3);
});

test("resume rejects a different target workspace", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-target-a-"));
  const otherTarget = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-target-b-"));
  const store = new StateStore({ target });
  const state = await store.create({ target, prompt: "identity" });
  const runtime = createRuntime({ target, store, tools: passingTools() });

  await assert.rejects(
    runtime.resume({ target: otherTarget, runId: state.runId }),
    (error) => error.code === "run-target-mismatch",
  );
});
