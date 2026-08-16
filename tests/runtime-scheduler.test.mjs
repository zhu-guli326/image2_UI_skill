import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildDagPlan } from "../runtime/scheduler/dag.mjs";
import {
  executeAgentDag,
  invalidateSchedulerFromPhase,
  loadSchedulerManifest,
  schedulerPaths,
} from "../runtime/scheduler/executor.mjs";
import { createState } from "../runtime/state-store.mjs";
import { ToolRegistry } from "../runtime/tools/registry.mjs";
import { executeVerify } from "../runtime/stages.mjs";

function runtimeState(target, extra = {}) {
  return createState({
    runId: extra.runId || "scheduler-test",
    target,
    prompt: "Build a production UI",
    status: extra.status || "running",
    stage: extra.stage || "implement",
    task: {
      target,
      prompt: "Build a production UI",
      intent: "create",
      reference: null,
    },
    limits: { maxParallel: 2, ...(extra.limits || {}) },
    runtime: { executionMode: "multi-agent", noBrowser: true, ...(extra.runtime || {}) },
    ...extra,
  });
}

function fakeTools({ blockRole = null, qaMustFix = [], invalidQaJson = false } = {}) {
  const tools = new ToolRegistry();
  tools.register({
    name: "agent.execute",
    access: "write",
    async invoke(input) {
      const marker = "Write your required role outputs under the run artifacts directory using these exact filenames:";
      const section = input.prompt.split(marker)[1].split("End your final response")[0];
      const outputs = section
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("- "))
        .map((line) => line.slice(2));
      const status = input.role === blockRole ? "blocked" : "complete";
      if (status === "complete") {
        for (const file of outputs) {
          await fs.mkdir(path.dirname(file), { recursive: true });
          if (file.endsWith("qa-findings.json")) {
            await fs.writeFile(
              file,
              invalidQaJson ? "{not-json" : JSON.stringify({ mustFix: qaMustFix, shouldFix: [] }),
              "utf8",
            );
          } else {
            await fs.writeFile(file, `${input.role} output\n`, "utf8");
          }
        }
      }
      await fs.mkdir(path.dirname(input.outputFile), { recursive: true });
      await fs.writeFile(input.outputFile, `## Agent Handoff\n- Role: ${input.role}\n- Status: ${status}\n`, "utf8");
      return { ok: true, data: { role: input.role } };
    },
  });
  tools.register({
    name: "ui.validate",
    access: "read",
    async invoke() {
      return { ok: true, data: { status: "pass", mustFix: [], shouldFix: [], audit: { fail: 0, warn: 0, info: 0 } } };
    },
  });
  return tools;
}

test("DAG planner produces dependency-safe phase batches", () => {
  const plan = buildDagPlan({ tier: "medium", mode: "parallel", maxParallel: 2 });
  assert.deepEqual(plan.phases.map((phase) => phase.phase), [
    "discovery",
    "architecture",
    "implementation",
    "review",
    "verification",
    "release",
  ]);
  assert.deepEqual(plan.phases[0].batches[0], ["visual-analyst", "asset-engineer"]);
  assert.deepEqual(plan.phases.find((phase) => phase.phase === "review").roles, ["code-reviewer"]);
  assert.ok(plan.roles.includes("qa-auditor"));
});

test("Runtime scheduler persists node progress under the canonical run", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-scheduler-"));
  const state = runtimeState(target);
  const tools = fakeTools();

  const implementation = await executeAgentDag({ state, tools, throughPhase: "implementation" });
  assert.equal(implementation.ok, true);
  assert.ok(implementation.data.completedRoles.includes("ui-implementer"));

  const paths = schedulerPaths(target, state.runId);
  let manifest = await loadSchedulerManifest(paths.manifest);
  assert.equal(manifest.roles["ui-implementer"].status, "complete");
  assert.equal(manifest.roles["code-reviewer"].status, "pending");
  await assert.rejects(fs.access(path.join(target, ".image2-ui", "agents")));

  const verification = await executeAgentDag({ state: { ...state, stage: "verify" }, tools, throughPhase: "verification" });
  assert.equal(verification.data.findings.mustFix.length, 0);
  manifest = await loadSchedulerManifest(paths.manifest);
  assert.equal(manifest.roles["qa-auditor"].status, "complete");
  await fs.access(path.join(paths.artifacts, "qa-findings.json"));

  await invalidateSchedulerFromPhase({ target, runId: state.runId, phase: "review" });
  manifest = await loadSchedulerManifest(paths.manifest);
  assert.equal(manifest.roles["ui-implementer"].status, "complete");
  assert.equal(manifest.roles["code-reviewer"].status, "pending");
  assert.equal(manifest.roles["qa-auditor"].status, "pending");
  await assert.rejects(fs.access(path.join(paths.artifacts, "qa-findings.json")));

  await executeAgentDag({ state: { ...state, stage: "verify" }, tools, throughPhase: "verification" });
  manifest = await loadSchedulerManifest(paths.manifest);
  assert.equal(manifest.roles["code-reviewer"].attempts, 2);
  assert.equal(manifest.roles["qa-auditor"].attempts, 2);

  await executeAgentDag({ state: { ...state, stage: "finalize" }, tools, throughPhase: "release" });
  manifest = await loadSchedulerManifest(paths.manifest);
  assert.equal(manifest.status, "complete");
  assert.equal(manifest.roles.release.status, "complete");
});

test("scheduler QA findings feed the Runtime Verify/Fix contract", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-scheduler-qa-"));
  const state = runtimeState(target, { stage: "verify", runId: "scheduler-qa" });
  const tools = fakeTools({
    qaMustFix: [{ rule: "scheduler-visual-gap", message: "Hero spacing differs from the source of truth", location: "hero" }],
  });

  const result = await executeVerify({ state, tools, target, operation: { operationId: "op-qa", timeoutMs: 900_000 } });
  assert.equal(result.ok, true);
  assert.equal(result.data.status, "needs-fix");
  assert.deepEqual(result.data.mustFix, [
    { rule: "scheduler-visual-gap", message: "Hero spacing differs from the source of truth", location: "hero" },
  ]);
  assert.ok(result.artifacts.some((artifact) => artifact.kind === "scheduler-manifest"));
});

test("invalid machine-readable QA evidence fails the scheduler node", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-scheduler-invalid-qa-"));
  const state = runtimeState(target, { stage: "verify", runId: "scheduler-invalid-qa" });
  const tools = fakeTools({ invalidQaJson: true });

  await assert.rejects(
    executeAgentDag({ state, tools, throughPhase: "verification" }),
    (error) => error.code === "scheduler-agent-failed" && /qa-findings\.json is invalid JSON/.test(error.message),
  );
  const manifest = await loadSchedulerManifest(schedulerPaths(target, state.runId).manifest);
  assert.equal(manifest.roles["qa-auditor"].status, "failed");
});

test("a blocked specialist blocks the subordinate scheduler without creating a second run lifecycle", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "image2-runtime-scheduler-block-"));
  const state = runtimeState(target, { runId: "scheduler-block" });
  const tools = fakeTools({ blockRole: "visual-analyst" });

  await assert.rejects(
    executeAgentDag({ state, tools, throughPhase: "implementation" }),
    (error) => error.code === "scheduler-blocked" && error.blocked === true,
  );
  const manifest = await loadSchedulerManifest(schedulerPaths(target, state.runId).manifest);
  assert.equal(manifest.status, "blocked");
  assert.equal(manifest.roles["visual-analyst"].status, "blocked");
  await assert.rejects(fs.access(path.join(target, ".image2-ui", "agents")));
});
