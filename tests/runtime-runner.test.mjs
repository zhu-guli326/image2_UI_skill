import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { StateStore } from "../runtime/state-store.mjs";
import { createRuntime } from "../runtime/runner.mjs";
import { ToolRegistry } from "../runtime/tools/registry.mjs";
test("Runner closes the loop and reconciles interrupted mutation", async () => { const target = await fs.mkdtemp(path.join(os.tmpdir(), "runtime-runner-")); let validations = 0, agents = 0; const tools = new ToolRegistry([{ name: "ui.validate", invoke: async () => ({ ok: true, data: ++validations === 1 ? { mustFix: [{ rule: "x", message: "x" }] } : { mustFix: [] } }) }, { name: "agent.execute", invoke: async () => { agents += 1; return { ok: true, data: {} }; } }]); const store = new StateStore({ target }); const runtime = createRuntime({ target, store, tools }); const result = await runtime.run({ target, task: "build", stage: "implement", maxIterations: 2 }); assert.equal(result.status, "completed"); assert.equal(result.iteration, 1); assert.equal(validations, 2); assert.equal(agents, 2); const created = await store.create({ target, prompt: "resume", stage: "fix" }); await store.saveAtomic({ ...created, status: "running", currentOperation: { operationId: "op", stage: "fix", tool: "agent.execute", attempt: 1, startedAt: new Date().toISOString(), mutationPossible: true } }); validations = 2; agents = 0; assert.equal((await runtime.resume({ target, runId: created.runId })).status, "completed"); assert.equal(agents, 0); assert.ok((await store.events(created.runId)).some((x) => x.type === "recovery.reconcile")); });
