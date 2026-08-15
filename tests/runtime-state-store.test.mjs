import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createState, StateStore, validateState } from "../runtime/state-store.mjs";
test("StateStore writes atomic state and ordered events", async () => { const target = await fs.mkdtemp(path.join(os.tmpdir(), "runtime-store-")); const store = new StateStore({ target, clock: () => "2026-08-15T00:00:00.000Z" }); const state = await store.create({ runId: "run-1", target, prompt: "test" }); await store.appendEvent(state.runId, { type: "custom" }); await store.markOperationStarted(state.runId, { operationId: "op", stage: "implement", tool: "agent.execute", attempt: 1, startedAt: "2026-08-15T00:00:01.000Z", mutationPossible: true }); assert.deepEqual((await store.events(state.runId)).map((x) => x.seq), [1, 2, 3]); const second = await store.create({ runId: "run-2", target, prompt: "test" }); assert.equal((await store.latest()).runId, second.runId); assert.throws(() => store.paths("../../escape"), /Invalid Runtime runId/); assert.throws(() => store.paths(path.resolve("escape.json")), /Invalid Runtime runId/); });

test("Runtime validation mirrors nested additionalProperties and structure constraints", () => {
  const state = createState({ runId: "strict", target: ".", prompt: "strict" });
  assert.equal(validateState(state).valid, true);
  assert.equal(validateState({ ...state, runtime: { ...state.runtime, unexpected: true } }).valid, false);
  assert.equal(validateState({ ...state, verification: { ...state.verification, mustFix: [{ message: "missing rule" }] } }).valid, false);
  assert.equal(validateState({ ...state, timestamps: { ...state.timestamps, updatedAt: "not-a-date" } }).valid, false);
});
