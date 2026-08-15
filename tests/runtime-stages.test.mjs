import assert from "node:assert/strict";
import test from "node:test";
import { executeStage } from "../runtime/stages.mjs";
import { createState } from "../runtime/state-store.mjs";
import { ToolRegistry } from "../runtime/tools/registry.mjs";

const stateAt = (stage, extra = {}) => createState({
  runId: `stage-${stage}`,
  target: ".",
  prompt: "test",
  status: "running",
  stage,
  ...extra,
});

test("Verify blocks when the required validator is unavailable", async () => {
  await assert.rejects(
    executeStage({ state: stateAt("verify"), tools: new ToolRegistry() }),
    (error) => error.code === "capability-unavailable" && error.blocked === true,
  );
});

test("Effect generation requires a persisted effect-image artifact", async () => {
  const tools = new ToolRegistry([{ name: "image.generate", access: "write", invoke: async () => ({ ok: true, data: {} }) }]);
  await assert.rejects(
    executeStage({ state: stateAt("generate-effect", { policy: { requireEffectImage: true } }), tools }),
    (error) => error.code === "effect-image-required" && error.blocked === true,
  );
});

test("Mutation policy prevents implement and fix Tool calls", async () => {
  let calls = 0;
  const tools = new ToolRegistry([{ name: "agent.execute", access: "write", invoke: async () => { calls += 1; return { ok: true }; } }]);
  const result = await executeStage({ state: stateAt("implement", { policy: { allowWorkspaceMutation: false } }), tools });
  assert.equal(result.ok, false);
  assert.equal(result.data.code, "workspace-mutation-not-allowed");
  assert.equal(calls, 0);
});

test("Preflight probes required Agent and image capabilities", async () => {
  const tools = new ToolRegistry([
    { name: "env.doctor", invoke: async () => ({ ok: true, data: { status: "ready", checks: {} } }) },
    { name: "agent.execute", access: "write", probe: async () => ({ available: false, reason: "Codex missing" }), invoke: async () => ({ ok: true }) },
    { name: "ui.validate", invoke: async () => ({ ok: true }) },
  ]);
  await assert.rejects(
    executeStage({ state: stateAt("preflight", { runtime: { requirePreflight: true } }), tools }),
    (error) => error.code === "capability-unavailable" && error.blocked === true,
  );
});
