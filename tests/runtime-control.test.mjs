import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRuntime } from "../runtime/runner.mjs";
import { StateStore } from "../runtime/state-store.mjs";
import { ToolRegistry } from "../runtime/tools/registry.mjs";

test("Runner retries only retryable tool failures within the stage budget", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-retry-"));
  let attempts = 0;
  const tools = new ToolRegistry([{
    name: "ui.validate",
    async invoke() {
      attempts += 1;
      if (attempts === 1) throw Object.assign(new Error("transient"), { code: "transient", retryable: true });
      return { ok: true, data: { mustFix: [], shouldFix: [] } };
    },
  }]);
  const store = new StateStore({ target });
  const result = await createRuntime({ target, store, tools }).run({
    target,
    task: "retry verification",
    stage: "verify",
    limits: { maxStageRetries: 1 },
  });

  assert.equal(result.status, "completed");
  assert.equal(attempts, 2);
  assert.ok((await store.events(result.runId)).some((event) => event.type === "stage.retry"));
});

test("Runner enforces a timeout even when a Tool ignores AbortSignal", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-timeout-"));
  const tools = new ToolRegistry([{ name: "ui.validate", invoke: async () => new Promise(() => {}) }]);
  const result = await createRuntime({ target, tools }).run({
    target,
    task: "timeout verification",
    stage: "verify",
    limits: { toolTimeoutMs: 1_000 },
  });

  assert.equal(result.status, "failed");
  assert.equal(result.errors.at(-1).code, "tool-timeout");
});

test("Runner cancellation reaches a terminal cancelled state", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-cancel-"));
  const tools = new ToolRegistry([{ name: "ui.validate", invoke: async () => new Promise(() => {}) }]);
  const controller = new AbortController();
  const pending = createRuntime({ target, tools }).run({
    target,
    task: "cancel verification",
    stage: "verify",
    signal: controller.signal,
  });
  setTimeout(() => controller.abort(), 10);

  const result = await pending;
  assert.equal(result.status, "cancelled");
  assert.ok(result.timestamps.finishedAt);
});
