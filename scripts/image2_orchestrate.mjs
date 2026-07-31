#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const targetArg = args.find((arg) => !arg.startsWith("-"));
const task = readOption("--task");
const reference = readOption("--reference");
const mode = readOption("--mode") || "parallel";
const agentCommand = readOption("--agent-command") || process.env.IMAGE2_AGENT_COMMAND || "codex";
const model = readOption("--model");
const maxParallel = Number.parseInt(readOption("--max-parallel") || "2", 10);
const dryRun = args.includes("--dry-run");
const jsonMode = args.includes("--json");

const ROLE_ORDER = [
  "visual-analyst",
  "asset-engineer",
  "ui-architect",
  "backend-contract",
  "state-machine",
  "ui-implementer",
  "accessibility",
  "qa-auditor",
  "release",
];

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
  accessibility: {
    phase: "verification",
    deps: ["ui-implementer", "state-machine"],
    outputs: ["accessibility-report.md"],
    prompt: "Audit the implementation for keyboard flow, focus, accessible names, ARIA, contrast, reduced motion, touch targets, and screen-reader semantics. Do not silently edit source files.",
  },
  "qa-auditor": {
    phase: "verification",
    deps: ["ui-implementer", "accessibility"],
    outputs: ["qa-report.md"],
    prompt: "Run build, tests, browser checks, asset checks, and visual comparison. Produce a prioritized fix queue. Do not silently edit implementation files.",
  },
  release: {
    phase: "release",
    deps: ["qa-auditor", "accessibility"],
    outputs: ["release-report.md"],
    prompt: "Review all artifacts, git status, tests, and known risks. Produce a release handoff with execution mode, agent list, skipped checks, and unresolved warnings. Do not commit or push.",
  },
};

if (args.includes("--help") || args.includes("-h") || !targetArg) {
  printUsage();
  process.exit(targetArg ? 0 : 1);
}
if (!task && !dryRun) fail("--task is required unless --dry-run is used");
if (!ROLES[targetArg] && targetArg !== "orchestrate") {
  // The first positional is the target directory; keep this guard for accidental role names.
}
const targetPath = path.resolve(process.cwd(), targetArg);
if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) fail(`Target directory not found: ${targetPath}`);
if (!Number.isInteger(maxParallel) || maxParallel < 1) fail("--max-parallel must be a positive integer");
if (!["parallel", "sequential"].includes(mode)) fail("--mode must be parallel or sequential");

const runId = `${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${process.pid}`;
const runDir = path.join(targetPath, ".image2-ui", "agents", runId);
const artifactsDir = path.join(runDir, "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });

const manifest = {
  runId,
  target: targetPath,
  task: task || "dry-run",
  reference: reference ? path.resolve(process.cwd(), reference) : null,
  executionMode: mode === "parallel" ? "multi-agent" : "multi-agent-sequential",
  artifactsDir,
  agentCommand,
  model: model || null,
  startedAt: new Date().toISOString(),
  roles: Object.fromEntries(ROLE_ORDER.map((role) => [role, { status: "pending", phase: ROLES[role].phase }])),
};
writeManifest();

if (dryRun) {
  const plan = buildPlan();
  if (jsonMode) console.log(JSON.stringify({ manifest, plan }, null, 2));
  else {
    console.log(`Image2 UI multi-agent plan: ${targetPath}`);
    for (const phase of plan) console.log(`- ${phase.name}: ${phase.roles.join(", ")}`);
    console.log(`Artifacts: ${artifactsDir}`);
  }
  process.exit(0);
}

const executable = resolveExecutable(agentCommand);
if (!executable) fail(`Agent command not found: ${agentCommand}. Install Codex CLI or pass --agent-command.`);

for (const phase of buildPlan()) {
  const results = await runPhase(phase.roles);
  if (results.some((result) => result.status !== "complete")) {
    manifest.status = "blocked";
    manifest.finishedAt = new Date().toISOString();
    writeManifest();
    printResults(results);
    process.exit(2);
  }
}

manifest.status = "complete";
manifest.finishedAt = new Date().toISOString();
writeManifest();
if (jsonMode) console.log(JSON.stringify(manifest, null, 2));
else {
  console.log(`Image2 UI multi-agent run complete: ${runDir}`);
  printResults(ROLE_ORDER.map((role) => ({ role, status: manifest.roles[role].status })));
}

function buildPlan() {
  const phases = [];
  const completed = new Set();
  for (const phaseName of ["discovery", "architecture", "implementation", "verification", "release"]) {
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
      results.push(...[...pending].map((role) => ({ role, status: "failed", exitCode: 2, error: "Dependency cycle or failed prerequisite" })));
      break;
    }
    const batch = mode === "sequential" ? ready.slice(0, 1) : ready.slice(0, maxParallel);
    batch.forEach((role) => pending.delete(role));
    results.push(...await Promise.all(batch.map((role) => runRole(role))));
    if (batch.some((role) => manifest.roles[role].status !== "complete")) {
      results.push(...[...pending].map((role) => ({ role, status: "failed", exitCode: 2, error: "Prerequisite agent failed" })));
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
  manifest.roles[role] = { status: "running", phase: spec.phase, startedAt: new Date().toISOString(), outputFile, logFile };
  writeManifest();

  return new Promise((resolve) => {
    const commandArgs = ["exec", "--ephemeral", "--json", "--skip-git-repo-check", "--sandbox", "workspace-write", "--ask-for-approval", "never", "-C", targetPath, "-o", outputFile];
    if (model) commandArgs.push("--model", model);
    commandArgs.push(prompt);
    const child = spawn(executable, commandArgs, { cwd: targetPath, stdio: ["ignore", "pipe", "pipe"] });
    const log = fs.createWriteStream(logFile, { encoding: "utf8" });
    child.stdout.pipe(log);
    child.stderr.pipe(log);
    child.on("error", (error) => finish(1, error.message));
    child.on("close", (code) => finish(code ?? 1, code === 0 ? null : `Agent exited with status ${code}`));

    function finish(code, error) {
      log.end();
      const status = code === 0 ? "complete" : "failed";
      manifest.roles[role] = { ...manifest.roles[role], status, exitCode: code, finishedAt: new Date().toISOString(), error };
      writeManifest();
      resolve({ role, status, exitCode: code, error });
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
Reference: ${reference ? path.resolve(process.cwd(), reference) : "none provided"}
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
  if (path.isAbsolute(command) || command.includes(path.sep)) return fs.existsSync(command) ? command : null;
  const paths = String(process.env.PATH || "").split(path.delimiter);
  for (const directory of paths) {
    const candidate = path.join(directory, command);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function writeManifest() {
  fs.writeFileSync(path.join(runDir, "run.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

function printResults(results) {
  for (const result of results) console.log(`- ${result.role}: ${result.status}${result.error ? ` (${result.error})` : ""}`);
}

function readOption(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] && !args[index + 1].startsWith("-") ? args[index + 1] : null;
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
