#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  ORCHESTRATOR_ROLE_ORDER,
  createRoleStateMachine,
  createWorkflowStateMachine,
  workflowStatusForState,
} from "./workflow_state_machine.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const positionals = positionalArgs();
const targetArg = positionals[0];
const task = readOption("--task");
const reference = readOption("--reference");
const mode = readOption("--mode") || "parallel";
const agentCommand = readOption("--agent-command") || process.env.IMAGE2_AGENT_COMMAND || "codex";
const model = readOption("--model");
const maxParallel = Number.parseInt(readOption("--max-parallel") || "2", 10);
const dryRun = args.includes("--dry-run");
const jsonMode = args.includes("--json");

const ROLE_ORDER = ORCHESTRATOR_ROLE_ORDER;

const ROLES = {
  "visual-analyst": {
    phase: "discovery",
    deps: [],
    outputs: ["ui-audit.md", "code-ui-inventory.md", "image2-assets.md", "visual-risks.md"],
    prompt: "Inspect the reference and repository. Split code-rendered UI from image2 bitmap assets. Do not edit application source files.",
  },
  "asset-engineer": {
    phase: "discovery",
    deps: [],
    outputs: ["asset-manifest.json", "image2-prompts.md", "asset-provenance.md"],
    prompt: "Create or verify the image2 asset manifest, prompts, local asset paths, alt text, and provenance. Do not edit application source files.",
  },
  "ui-architect": {
    phase: "architecture",
    deps: ["visual-analyst"],
    outputs: ["ui-architecture.md"],
    prompt: "Define route and feature boundaries, component APIs, design tokens, i18n structure, and test surface. Do not implement application code.",
  },
  "backend-contract": {
    phase: "architecture",
    deps: ["visual-analyst"],
    outputs: ["backend-contract.md"],
    prompt: "Define request/response schemas, error envelopes, permissions, mock data boundaries, caching, retries, and cancellation. Do not implement application code.",
  },
  "state-machine": {
    phase: "architecture",
    deps: ["ui-architect", "backend-contract"],
    outputs: ["state-machine.md"],
    prompt: "Define user-flow state transitions, loading, empty, error, offline, disabled, retry, optimistic update, and rollback behavior. Do not implement application code.",
  },
  "ui-implementer": {
    phase: "implementation",
    deps: ["ui-architect", "backend-contract", "state-machine", "asset-engineer"],
    outputs: ["implementation-notes.md"],
    prompt: "Implement the production-shaped UI in the existing project conventions. Respect the assigned repository scope, wire local assets, and include responsive, loading, empty, error, and disabled states where relevant. Do not commit changes.",
  },
  "code-reviewer": {
    phase: "review",
    deps: ["ui-implementer"],
    outputs: ["code-review-report.md"],
    prompt: "Review the implementation as a senior code reviewer. Check correctness, regressions, security, maintainability, standards, scope compliance, missing tests, and unresolved production risks. Report findings first with severity and exact file/line references. Do not edit source files.",
  },
  accessibility: {
    phase: "verification",
    deps: ["ui-implementer", "state-machine", "code-reviewer"],
    outputs: ["accessibility-report.md"],
    prompt: "Audit the implementation for keyboard flow, focus, accessible names, ARIA, contrast, reduced motion, touch targets, and screen-reader semantics. Do not silently edit source files.",
  },
  "qa-auditor": {
    phase: "verification",
    deps: ["ui-implementer", "accessibility", "code-reviewer"],
    outputs: ["qa-report.md"],
    prompt: "Run build, tests, browser checks, asset checks, and visual comparison. Produce a prioritized fix queue. Do not silently edit implementation files.",
  },
  release: {
    phase: "release",
    deps: ["qa-auditor", "accessibility", "code-reviewer"],
    outputs: ["release-report.md"],
    prompt: "Review all artifacts, git status, tests, and known risks. Produce a release handoff with execution mode, agent list, skipped checks, and unresolved warnings. Do not commit or push.",
  },
};

if (args.includes("--help") || args.includes("-h") || !targetArg) {
  printUsage();
  process.exit(targetArg ? 0 : 1);
}
if (!task && !dryRun) fail("--task is required unless --dry-run is used");
const targetPath = path.resolve(process.cwd(), targetArg);
if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) fail(`Target directory not found: ${targetPath}`);
const referencePath = reference ? path.resolve(process.cwd(), reference) : null;
if (referencePath && (!fs.existsSync(referencePath) || !fs.statSync(referencePath).isFile())) fail(`Reference file not found: ${referencePath}`);
if (!Number.isInteger(maxParallel) || maxParallel < 1) fail("--max-parallel must be a positive integer");
if (!["parallel", "sequential"].includes(mode)) fail("--mode must be parallel or sequential");

const runId = `${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${process.pid}`;
const runDir = path.join(targetPath, ".image2-ui", "agents", runId);
const artifactsDir = path.join(runDir, "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });

const workflowMachine = createWorkflowStateMachine();
const roleMachines = new Map(ROLE_ORDER.map((role) => [role, createRoleStateMachine(role)]));
const manifest = {
  schemaVersion: 1,
  runId,
  target: targetPath,
  task: task || "dry-run",
  reference: referencePath,
  executionMode: mode === "parallel" ? "multi-agent" : "multi-agent-sequential",
  artifactsDir,
  agentCommand,
  model: model || null,
  startedAt: new Date().toISOString(),
  updatedAt: null,
  revision: 0,
  currentPhase: null,
  state: workflowMachine.state,
  status: "pending",
  stateMachine: workflowMachine.snapshot(),
  transitions: [],
  roles: Object.fromEntries(ROLE_ORDER.map((role) => {
    const machine = roleMachines.get(role);
    return [role, {
      phase: ROLES[role].phase,
      attempts: 0,
      state: machine.state,
      status: machine.state,
      stateMachine: machine.snapshot(),
    }];
  })),
};
const plan = buildPlan();
manifest.plan = plan;
transitionWorkflow("plan", {
  phaseCount: plan.length,
  roleCount: ROLE_ORDER.length,
});

if (dryRun) {
  if (jsonMode) console.log(JSON.stringify({ manifest, plan }, null, 2));
  else {
    console.log(`Image2 UI multi-agent plan: ${targetPath}`);
    for (const phase of plan) console.log(`- ${phase.name}: ${phase.roles.join(", ")}`);
    console.log(`Artifacts: ${artifactsDir}`);
  }
  process.exit(0);
}

transitionWorkflow("start");
const executable = resolveExecutable(agentCommand);
if (!executable) {
  manifest.finishedAt = new Date().toISOString();
  transitionWorkflow("fail", { reason: "agent-command-not-found", agentCommand });
  if (jsonMode) console.log(JSON.stringify(manifest, null, 2));
  fail(`Agent command not found: ${agentCommand}. Install Codex CLI or pass --agent-command.`);
}

for (const phase of plan) {
  manifest.currentPhase = phase.name;
  writeManifest();
  const results = await runPhase(phase.roles);
  if (results.some((result) => result.status !== "complete")) {
    blockPendingRoles("Workflow stopped after an incomplete " + phase.name + " phase");
    const failedRoles = ROLE_ORDER.filter((role) => manifest.roles[role].state === "failed");
    const blockedRoles = ROLE_ORDER.filter((role) => manifest.roles[role].state === "blocked");
    manifest.finishedAt = new Date().toISOString();
    const event = failedRoles.length > 0 ? "fail" : "block";
    transitionWorkflow(event, {
      phase: phase.name,
      failedRoles,
      blockedRoles,
    });
    if (jsonMode) console.log(JSON.stringify({ manifest, results }, null, 2));
    else printResults(results);
    process.exit(2);
  }
}

manifest.currentPhase = null;
manifest.finishedAt = new Date().toISOString();
transitionWorkflow("complete");
if (jsonMode) console.log(JSON.stringify(manifest, null, 2));
else {
  console.log(`Image2 UI multi-agent run complete: ${runDir}`);
  printResults(ROLE_ORDER.map((role) => ({ role, status: manifest.roles[role].status })));
}

function buildPlan() {
  const phases = [];
  const completed = new Set();
  for (const phaseName of ["discovery", "architecture", "implementation", "review", "verification", "release"]) {
    const roles = ROLE_ORDER.filter((role) => ROLES[role].phase === phaseName);
    const pending = new Set(roles);
    const batches = [];
    while (pending.size > 0) {
      const ready = [...pending].filter((role) => ROLES[role].deps.every((dependency) => completed.has(dependency)));
      if (ready.length === 0) break;
      const batch = mode === "sequential" ? ready.slice(0, 1) : ready.slice(0, maxParallel);
      batch.forEach((role) => {
        pending.delete(role);
        completed.add(role);
      });
      batches.push(batch);
    }
    phases.push({
      name: phaseName,
      roles,
      batches,
    });
  }
  return phases.filter((phase) => phase.roles.length > 0);
}

async function runPhase(roles) {
  const results = [];
  const pending = new Set(roles);
  while (pending.size > 0) {
    const ready = [...pending].filter((role) => ROLES[role].deps.every((dependency) => manifest.roles[dependency]?.status === "complete"));
    if (ready.length === 0) {
      results.push(...[...pending].map((role) => blockRole(role, "Dependency cycle or failed prerequisite")));
      pending.clear();
      break;
    }
    const batch = mode === "sequential" ? ready.slice(0, 1) : ready.slice(0, maxParallel);
    batch.forEach((role) => pending.delete(role));
    results.push(...await Promise.all(batch.map((role) => runRole(role))));
    if (batch.some((role) => manifest.roles[role].status !== "complete")) {
      results.push(...[...pending].map((role) => blockRole(role, "Prerequisite agent failed")));
      pending.clear();
      break;
    }
  }
  return results;
}

function runRole(role) {
  const spec = ROLES[role];
  const roleDir = path.join(runDir, role);
  fs.mkdirSync(roleDir, { recursive: true });
  const outputFile = path.join(roleDir, "final-message.md");
  const logFile = path.join(roleDir, "agent.jsonl");
  const prompt = buildPrompt(role, spec);
  transitionRole(role, "start", {
    startedAt: new Date().toISOString(),
    outputFile,
    logFile,
    attempts: manifest.roles[role].attempts + 1,
    error: null,
  }, { phase: spec.phase });

  return new Promise((resolve) => {
    const commandArgs = ["exec", "--ephemeral", "--json", "--skip-git-repo-check", "--sandbox", "workspace-write", "--ask-for-approval", "never", "-C", targetPath, "-o", outputFile];
    if (model) commandArgs.push("--model", model);
    commandArgs.push(prompt);
    const log = fs.createWriteStream(logFile, { encoding: "utf8" });
    let finished = false;
    let child;
    try {
      child = spawn(executable, commandArgs, { cwd: targetPath, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      finish(1, error.message);
      return;
    }
    child.stdout.pipe(log);
    child.stderr.pipe(log);
    child.on("error", (error) => finish(1, error.message));
    child.on("close", (code) => finish(code ?? 1, code === 0 ? null : `Agent exited with status ${code}`));

    function finish(code, error) {
      if (finished) return;
      finished = true;
      log.end();
      const contract = code === 0 ? validateHandoff(spec, outputFile) : { ok: false, status: null, error: null };
      const status = code === 0 && contract.ok
        ? "complete"
        : code === 0 && contract.status === "blocked"
          ? "blocked"
          : "failed";
      const finalError = error || contract.error;
      const event = status === "complete" ? "complete" : status === "blocked" ? "block" : "fail";
      transitionRole(role, event, {
        exitCode: code,
        finishedAt: new Date().toISOString(),
        error: finalError,
      }, { exitCode: code, error: finalError });
      resolve({ role, status, exitCode: code, error: finalError });
    }
  });
}

function buildPrompt(role, spec) {
  const dependencyPaths = spec.deps.flatMap((dependency) => ROLES[dependency].outputs.map((file) => path.join(artifactsDir, file)));
  return `You are the ${role} specialist in a production image-to-UI multi-agent workflow.

Task:
<user-task>
${task}
</user-task>

Repository target: ${targetPath}
Reference: ${referencePath || "none provided"}
Run artifacts directory: ${artifactsDir}
Your role instruction: ${spec.prompt}

Read dependency artifacts when present:
${dependencyPaths.length ? dependencyPaths.map((file) => `- ${file}`).join("\n") : "- none"}

Write your required role outputs under the run artifacts directory using these exact filenames:
${spec.outputs.map((file) => `- ${path.join(artifactsDir, file)}`).join("\n")}

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

Do not commit, push, delete unrelated files, or claim checks you did not run.`;
}

function resolveExecutable(command) {
  const value = String(command || "");
  if (!value) return null;
  if (path.isAbsolute(value) || /[\\/]/.test(value)) {
    const candidate = path.isAbsolute(value) ? path.normalize(value) : path.resolve(process.cwd(), value);
    return isExecutableFile(candidate) ? candidate : null;
  }
  const extensions = process.platform === "win32" && !path.extname(value)
    ? ["", ...String(process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean)]
    : [""];
  const paths = String(process.env.PATH || "").split(path.delimiter);
  for (const directory of paths) {
    for (const extension of extensions) {
      const candidate = path.join(directory, value + extension);
      if (isExecutableFile(candidate)) return candidate;
    }
  }
  return null;
}

function isExecutableFile(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function validateHandoff(spec, outputFile) {
  if (!fs.existsSync(outputFile) || fs.statSync(outputFile).size === 0) {
    return { ok: false, status: null, error: "Handoff contract failed: final agent message is missing or empty" };
  }
  const handoff = fs.readFileSync(outputFile, "utf8");
  const statusMatch = /^- Status:\s*(complete|blocked|needs-input)\s*$/mi.exec(handoff);
  if (!statusMatch) {
    return {
      ok: false,
      status: null,
      error: "Handoff contract failed: final message must declare complete, blocked, or needs-input status",
    };
  }
  if (statusMatch[1].toLowerCase() !== "complete") {
    return {
      ok: false,
      status: "blocked",
      error: "Agent declared handoff status " + statusMatch[1].toLowerCase(),
    };
  }
  const missing = spec.outputs.filter((file) => {
    const output = path.join(artifactsDir, file);
    return !fs.existsSync(output) || !fs.statSync(output).isFile() || fs.statSync(output).size === 0;
  });
  if (missing.length > 0) {
    return {
      ok: false,
      status: null,
      error: "Handoff contract failed: missing or empty artifact(s): " + missing.join(", "),
    };
  }
  return { ok: true, status: "complete", error: null };
}

function blockRole(role, error) {
  transitionRole(role, "block", {
    exitCode: 2,
    finishedAt: new Date().toISOString(),
    error,
  }, { reason: error });
  return { role, status: "blocked", exitCode: 2, error };
}

function blockPendingRoles(error) {
  for (const role of ROLE_ORDER) {
    if (roleMachines.get(role).state === "pending") blockRole(role, error);
  }
}

function transitionWorkflow(event, metadata = {}) {
  const record = workflowMachine.transition(event, metadata);
  manifest.transitions.push({
    sequence: manifest.transitions.length + 1,
    scope: "workflow",
    subject: runId,
    ...record,
  });
  writeManifest();
  return record;
}

function transitionRole(role, event, patch = {}, metadata = {}) {
  const machine = roleMachines.get(role);
  if (!machine) throw new Error("Unknown orchestrator role: " + role);
  const record = machine.transition(event, metadata);
  manifest.roles[role] = { ...manifest.roles[role], ...patch };
  manifest.transitions.push({
    sequence: manifest.transitions.length + 1,
    scope: "role",
    subject: role,
    ...record,
  });
  writeManifest();
  return record;
}

function syncManifestState() {
  manifest.state = workflowMachine.state;
  manifest.status = workflowStatusForState(workflowMachine.state);
  manifest.stateMachine = workflowMachine.snapshot();
  for (const role of ROLE_ORDER) {
    const machine = roleMachines.get(role);
    manifest.roles[role].state = machine.state;
    manifest.roles[role].status = machine.state;
    manifest.roles[role].stateMachine = machine.snapshot();
  }
}

function writeManifest() {
  syncManifestState();
  manifest.revision += 1;
  manifest.updatedAt = new Date().toISOString();
  const outputFile = path.join(runDir, "run.json");
  const temporaryFile = outputFile + "." + process.pid + ".tmp";
  fs.writeFileSync(temporaryFile, JSON.stringify(manifest, null, 2) + "\n");
  fs.renameSync(temporaryFile, outputFile);
}

function printResults(results) {
  for (const result of results) console.log(`- ${result.role}: ${result.status}${result.error ? ` (${result.error})` : ""}`);
}

function readOption(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] && !args[index + 1].startsWith("-") ? args[index + 1] : null;
}

function positionalArgs() {
  const valueOptions = new Set(["--task", "--reference", "--mode", "--agent-command", "--model", "--max-parallel"]);
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (valueOptions.has(argument)) {
      index += 1;
      continue;
    }
    if (argument === "--") {
      positionals.push(...args.slice(index + 1));
      break;
    }
    if (!argument.startsWith("-")) positionals.push(argument);
  }
  return positionals;
}

function printUsage() {
  console.log(`Usage:
  image2-ui orchestrate <project-dir> --task "..." [options]

Options:
  --reference image.png       Reference image for visual analysis.
  --mode parallel|sequential  Run independent roles concurrently or one by one.
  --max-parallel 2            Maximum concurrent agents in a phase.
  --agent-command codex       Agent CLI executable, or IMAGE2_AGENT_COMMAND.
  --model MODEL               Model passed to codex exec.
  --dry-run                   Print the execution graph without starting agents.
  --json                      Print machine-readable run information.

The orchestrator writes run metadata, JSONL logs, and handoff artifacts under
<project>/.image2-ui/agents/<run-id>/. It never commits or pushes changes.`);
}

function fail(message) {
  console.error(`[image2-ui orchestrate] ${message}`);
  process.exit(1);
}
