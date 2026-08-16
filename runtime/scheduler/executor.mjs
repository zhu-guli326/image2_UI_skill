import fs from "node:fs/promises";
import path from "node:path";
import { buildDagPlan, effectiveDeps } from "./dag.mjs";
import { AGENT_ROLES, phaseIndex, rolesForTier } from "./roles.mjs";
import { implementationSource, normalizeWorkflowMode } from "../workflow-modes.mjs";

export const SCHEDULER_SCHEMA_VERSION = 1;
const DEFAULT_AGENT_TIER = "medium";

export function schedulerPaths(target, runId) {
  const root = path.join(target, ".image2-ui", "runs", runId, "scheduler");
  return {
    root,
    manifest: path.join(root, "scheduler.json"),
    artifacts: path.join(root, "artifacts"),
    roles: path.join(root, "roles"),
  };
}

export async function executeAgentDag({ state, tools, target = state?.task?.target, signal, operation, throughPhase = "implementation" } = {}) {
  if (!state?.runId || !target) throw new TypeError("executeAgentDag requires a Runtime state and target");
  if (!has(tools, "agent.execute")) throw schedulerError("capability-unavailable", "Runtime DAG Scheduler requires agent.execute", true);

  const tier = DEFAULT_AGENT_TIER;
  const maxParallel = state.limits?.maxParallel || 1;
  const mode = maxParallel === 1 ? "sequential" : "parallel";
  const fullPlan = buildDagPlan({ tier, mode, maxParallel, throughPhase: "release" });
  const activePlan = buildDagPlan({ tier, mode, maxParallel, throughPhase });
  const paths = schedulerPaths(target, state.runId);
  await fs.mkdir(paths.artifacts, { recursive: true });
  await fs.mkdir(paths.roles, { recursive: true });

  let manifest = await loadSchedulerManifest(paths.manifest);
  if (!manifest) manifest = createSchedulerManifest({ state, target, tier, mode, maxParallel, plan: fullPlan, paths });
  validateManifestIdentity(manifest, { state, target, tier, mode, maxParallel });
  manifest = reconcileInterruptedRoles(manifest);

  for (const batch of activePlan.batches) {
    const runnable = batch.roles.filter((role) => manifest.roles[role]?.status !== "complete");
    if (!runnable.length) continue;

    for (const role of runnable) {
      const deps = effectiveDeps(role, activePlan.roles);
      const incomplete = deps.filter((dep) => manifest.roles[dep]?.status !== "complete");
      if (incomplete.length) {
        throw schedulerError("scheduler-dependency-blocked", `${role} is waiting for: ${incomplete.join(", ")}`, true);
      }
      const entry = manifest.roles[role];
      entry.status = "running";
      entry.attempts += 1;
      entry.startedAt = new Date().toISOString();
      entry.finishedAt = null;
      entry.error = null;
    }
    manifest.status = "running";
    manifest.updatedAt = new Date().toISOString();
    await writeSchedulerManifest(paths.manifest, manifest);

    const results = await Promise.all(runnable.map((role) => runRole({
      role,
      state,
      tools,
      target,
      signal,
      operation,
      paths,
      selectedRoles: activePlan.roles,
    })));

    for (const result of results) {
      const entry = manifest.roles[result.role];
      entry.status = result.status;
      entry.finishedAt = new Date().toISOString();
      entry.error = result.error || null;
      entry.outputFile = result.outputFile;
      entry.outputs = result.outputs;
    }
    manifest.updatedAt = new Date().toISOString();

    const blocked = results.find((result) => result.status === "blocked");
    const failed = results.find((result) => result.status === "failed");
    if (blocked || failed) {
      manifest.status = blocked ? "blocked" : "failed";
      await writeSchedulerManifest(paths.manifest, manifest);
      if (blocked) throw schedulerError("scheduler-blocked", blocked.error || `${blocked.role} requires input`, true);
      throw schedulerError("scheduler-agent-failed", failed.error || `${failed.role} failed`, false);
    }
    await writeSchedulerManifest(paths.manifest, manifest);
  }

  const selected = rolesForTier(tier);
  manifest.status = selected.every((role) => manifest.roles[role]?.status === "complete") ? "complete" : "running";
  manifest.currentThroughPhase = throughPhase;
  manifest.updatedAt = new Date().toISOString();
  await writeSchedulerManifest(paths.manifest, manifest);

  return {
    ok: true,
    data: {
      status: manifest.status,
      throughPhase,
      tier,
      mode,
      completedRoles: selected.filter((role) => manifest.roles[role]?.status === "complete"),
      findings: await readQaFindings(paths.artifacts),
    },
    artifacts: schedulerArtifacts(manifest, paths, operation),
  };
}

export async function invalidateSchedulerFromPhase({ target, runId, phase = "review" } = {}) {
  if (!target || !runId) return null;
  const paths = schedulerPaths(target, runId);
  const manifest = await loadSchedulerManifest(paths.manifest);
  if (!manifest) return null;
  const from = phaseIndex(phase);
  for (const [role, entry] of Object.entries(manifest.roles || {})) {
    if (phaseIndex(AGENT_ROLES[role].phase) < from) continue;
    for (const file of [...(entry.outputs || []), entry.outputFile].filter(Boolean)) await safeUnlink(file);
    entry.status = "pending";
    entry.startedAt = null;
    entry.finishedAt = null;
    entry.error = null;
    entry.outputFile = null;
    entry.outputs = [];
  }
  manifest.status = "running";
  manifest.currentThroughPhase = null;
  manifest.updatedAt = new Date().toISOString();
  await writeSchedulerManifest(paths.manifest, manifest);
  return manifest;
}

export async function loadSchedulerManifest(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function writeSchedulerManifest(file, manifest) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(temp, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.rename(temp, file);
}

function createSchedulerManifest({ state, target, tier, mode, maxParallel, plan, paths }) {
  const now = new Date().toISOString();
  const roles = Object.fromEntries(rolesForTier(tier).map((role) => [role, {
    phase: AGENT_ROLES[role].phase,
    deps: effectiveDeps(role, plan.roles),
    status: "pending",
    attempts: 0,
    startedAt: null,
    finishedAt: null,
    error: null,
    outputFile: null,
    outputs: [],
  }]));
  return {
    schemaVersion: SCHEDULER_SCHEMA_VERSION,
    runId: state.runId,
    target,
    workflowMode: normalizeWorkflowMode(state.task?.intent, { hasReference: Boolean(state.task?.reference) }),
    tier,
    mode,
    maxParallel,
    status: "pending",
    currentThroughPhase: null,
    artifactsDir: paths.artifacts,
    createdAt: now,
    updatedAt: now,
    plan,
    roles,
  };
}

function validateManifestIdentity(manifest, { state, target, tier, mode, maxParallel }) {
  if (manifest.schemaVersion !== SCHEDULER_SCHEMA_VERSION) throw new Error(`Unsupported scheduler schema: ${manifest.schemaVersion}`);
  if (manifest.runId !== state.runId) throw new Error("Scheduler manifest runId does not match Runtime state");
  if (path.resolve(manifest.target) !== path.resolve(target)) throw new Error("Scheduler manifest target does not match Runtime target");
  if (manifest.tier !== tier) throw new Error(`Cannot change agent tier mid-run (${manifest.tier} -> ${tier})`);
  if (manifest.mode !== mode || manifest.maxParallel !== maxParallel) {
    throw new Error(`Cannot change scheduler concurrency mid-run (${manifest.mode}/${manifest.maxParallel} -> ${mode}/${maxParallel})`);
  }
}

function reconcileInterruptedRoles(manifest) {
  for (const entry of Object.values(manifest.roles || {})) {
    if (entry.status === "running") {
      entry.status = "pending";
      entry.error = "Recovered an interrupted scheduler role; retrying from the current workspace state.";
      entry.startedAt = null;
      entry.finishedAt = null;
    }
  }
  return manifest;
}

async function runRole({ role, state, tools, target, signal, operation, paths, selectedRoles }) {
  const spec = AGENT_ROLES[role];
  const roleDir = path.join(paths.roles, role);
  const outputFile = path.join(roleDir, "final-message.md");
  await fs.mkdir(roleDir, { recursive: true });
  const outputPaths = spec.outputs.map((name) => path.join(paths.artifacts, name));
  const prompt = buildRolePrompt({ role, state, target, paths, selectedRoles });

  try {
    await tools.invoke("agent.execute", {
      stage: `scheduler:${role}`,
      role,
      access: "write",
      target,
      task: state.task,
      workflowMode: normalizeWorkflowMode(state.task?.intent, { hasReference: Boolean(state.task?.reference) }),
      prompt,
      outputFile,
      artifactsDir: paths.artifacts,
    }, {
      state,
      target,
      signal,
      operation,
      timeoutMs: state.limits?.agentTimeoutMs || operation?.timeoutMs,
    });

    const handoff = await readHandoff(outputFile);
    const missing = [];
    for (const file of outputPaths) {
      try { await fs.access(file); } catch { missing.push(file); }
    }
    if (["needs-input", "blocked"].includes(handoff.status)) {
      return { role, status: "blocked", error: `${role} reported ${handoff.status}`, outputFile, outputs: outputPaths };
    }
    if (handoff.status !== "complete") {
      return { role, status: "failed", error: `${role} did not return a valid Agent Handoff status`, outputFile, outputs: outputPaths };
    }
    if (missing.length) {
      return { role, status: "failed", error: `${role} did not create required outputs: ${missing.join(", ")}`, outputFile, outputs: outputPaths };
    }
    const outputError = await validateRoleOutputs(role, outputPaths);
    if (outputError) {
      return { role, status: "failed", error: outputError, outputFile, outputs: outputPaths };
    }
    return { role, status: "complete", error: null, outputFile, outputs: outputPaths };
  } catch (error) {
    if (error?.name === "AbortError" || error?.code === "cancelled" || error?.code === "ABORT_ERR") throw error;
    return { role, status: "failed", error: String(error?.message || error), outputFile, outputs: outputPaths };
  }
}

function buildRolePrompt({ role, state, target, paths, selectedRoles }) {
  const spec = AGENT_ROLES[role];
  const source = implementationSource(state);
  const deps = effectiveDeps(role, selectedRoles);
  const dependencyPaths = deps.flatMap((dep) => AGENT_ROLES[dep].outputs.map((name) => path.join(paths.artifacts, name)));
  const outputPaths = spec.outputs.map((name) => path.join(paths.artifacts, name));
  return `You are the ${role} specialist inside the Image2 UI Harness Runtime DAG Scheduler.

The Runtime owns the run lifecycle. You own only this DAG node and its declared outputs.

User task:
<user-task>
${state.task.prompt}
</user-task>

Workflow mode: ${source.mode}
Repository target: ${target}
Original reference: ${state.task.reference || "none"}
Primary implementation source of truth: ${source.path || "none"}
Source policy: ${source.instruction}
Run scheduler artifacts directory: ${paths.artifacts}
Your role instruction: ${spec.prompt}

Read dependency artifacts when present:
${dependencyPaths.length ? dependencyPaths.map((file) => `- ${file}`).join("\n") : "- none"}

Write your required role outputs under the run artifacts directory using these exact filenames:
${outputPaths.map((file) => `- ${file}`).join("\n")}

${role === "qa-auditor" ? "qa-findings.json must be valid JSON and must contain mustFix and shouldFix arrays. Every finding needs rule and message; location is optional.\n" : ""}
End your final response with this handoff structure:
## Agent Handoff
- Role: ${role}
- Status: complete | needs-input | blocked
- Scope:
- Files created:
- Files changed:
- Decisions:
- Open questions:
- Validation run:
- Next agent:

Do not commit, push, delete unrelated files, redefine the workflow mode, or claim checks you did not run.`;
}

async function readHandoff(file) {
  try {
    const text = await fs.readFile(file, "utf8");
    const match = /^- Status:\s*(complete|needs-input|blocked)\s*$/im.exec(text);
    return { status: match?.[1]?.toLowerCase() || null, text };
  } catch {
    return { status: null, text: "" };
  }
}

async function validateRoleOutputs(role, outputPaths) {
  if (role !== "qa-auditor") return null;
  const file = outputPaths.find((item) => path.basename(item) === "qa-findings.json");
  if (!file) return "qa-auditor is missing the qa-findings.json output contract";
  try {
    const value = JSON.parse(await fs.readFile(file, "utf8"));
    if (!Array.isArray(value.mustFix) || !Array.isArray(value.shouldFix)) {
      return "qa-findings.json must contain mustFix and shouldFix arrays";
    }
    for (const finding of [...value.mustFix, ...value.shouldFix]) {
      if (!finding || typeof finding.rule !== "string" || !finding.rule || typeof finding.message !== "string" || !finding.message) {
        return "qa-findings.json contains a finding without a non-empty rule and message";
      }
      if (finding.location !== undefined && typeof finding.location !== "string") {
        return "qa-findings.json finding.location must be a string when present";
      }
    }
    return null;
  } catch (error) {
    return `qa-findings.json is invalid JSON: ${error.message}`;
  }
}

async function readQaFindings(artifactsDir) {
  try {
    const value = JSON.parse(await fs.readFile(path.join(artifactsDir, "qa-findings.json"), "utf8"));
    return {
      mustFix: normalizeFindings(value.mustFix),
      shouldFix: normalizeFindings(value.shouldFix),
    };
  } catch (error) {
    if (error?.code === "ENOENT") return { mustFix: [], shouldFix: [] };
    throw error;
  }
}

function normalizeFindings(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item.rule === "string" && typeof item.message === "string")
    .map((item) => ({
      rule: item.rule,
      message: item.message,
      ...(typeof item.location === "string" && item.location ? { location: item.location } : {}),
    }));
}

function schedulerArtifacts(manifest, paths, operation) {
  const artifacts = [{
    name: "scheduler-manifest",
    kind: "scheduler-manifest",
    path: paths.manifest,
    producer: "runtime.scheduler",
    operationId: operation?.operationId || null,
  }];
  for (const [role, entry] of Object.entries(manifest.roles || {})) {
    if (entry.status !== "complete") continue;
    for (const file of entry.outputs || []) {
      artifacts.push({
        name: `agent-${role}-${path.basename(file)}`,
        kind: "agent-artifact",
        path: file,
        producer: `runtime.scheduler:${role}`,
        operationId: operation?.operationId || null,
      });
    }
  }
  return artifacts;
}

async function safeUnlink(file) {
  try { await fs.unlink(file); } catch (error) { if (error?.code !== "ENOENT") throw error; }
}

function has(tools, name) {
  try { return Boolean(name && tools && (tools.has ? tools.has(name) : tools.get(name))); } catch { return false; }
}

function schedulerError(code, message, blocked) {
  const error = new Error(message);
  error.code = code;
  error.blocked = blocked;
  error.retryable = blocked;
  return error;
}
