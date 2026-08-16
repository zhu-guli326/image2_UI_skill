#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { runRuntimeCli } from "../runtime/cli.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printUsage();
  process.exit(0);
}

try {
  const parsed = parseCompatArgs(args);
  if (!parsed.target) {
    printUsage();
    process.exit(1);
  }

  const runtimeArgs = [
    parsed.target,
    "--execution",
    "multi-agent",
    "--max-parallel",
    String(parsed.schedulerMode === "sequential" ? 1 : parsed.maxParallel),
  ];
  if (parsed.task) runtimeArgs.push("--task", parsed.task);
  if (parsed.reference) runtimeArgs.push("--reference", parsed.reference);
  if (parsed.workflow) runtimeArgs.push("--mode", parsed.workflow);
  if (parsed.agentCommand) runtimeArgs.push("--agent-command", parsed.agentCommand);
  if (parsed.model) runtimeArgs.push("--model", parsed.model);
  if (parsed.requireEffectReview) runtimeArgs.push("--require-effect-review");
  if (parsed.noBrowser) runtimeArgs.push("--no-browser");
  if (parsed.dryRun) runtimeArgs.push("--dry-run");
  if (parsed.json) runtimeArgs.push("--json");

  process.exit(await runRuntimeCli("run", runtimeArgs, { repoRoot }));
} catch (error) {
  if (args.includes("--json")) console.log(JSON.stringify({ ok: false, error: error.message, code: "orchestrate-compat-failed" }, null, 2));
  else console.error(`[image2-ui orchestrate] ${error.message}`);
  process.exit(1);
}

function parseCompatArgs(argv) {
  const valueOptions = new Set([
    "--task",
    "--reference",
    "--workflow",
    "--mode",
    "--max-parallel",
    "--agent-command",
    "--model",
  ]);
  const values = {};
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (valueOptions.has(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("-")) throw new Error(`${arg} requires a value`);
      values[arg] = value;
      index += 1;
      continue;
    }
    if (["--dry-run", "--json", "--require-effect-review", "--no-browser"].includes(arg)) continue;
    if (arg.startsWith("-")) throw new Error(`Unknown orchestrate option: ${arg}`);
    positionals.push(arg);
  }

  if (positionals.length > 1) throw new Error(`Unexpected positional argument: ${positionals[1]}`);
  const schedulerMode = values["--mode"] || "parallel";
  if (!["parallel", "sequential"].includes(schedulerMode)) throw new Error("orchestrate --mode must be parallel or sequential; use --workflow for recreate, redesign, or create");
  const workflow = values["--workflow"] || null;
  if (workflow && !["recreate", "redesign", "create"].includes(workflow)) throw new Error("--workflow must be recreate, redesign, or create");
  const maxParallel = Number.parseInt(values["--max-parallel"] || "2", 10);
  if (!Number.isInteger(maxParallel) || maxParallel < 1) throw new Error("--max-parallel must be a positive integer");

  return {
    target: positionals[0] || null,
    task: values["--task"] || null,
    reference: values["--reference"] || null,
    workflow,
    schedulerMode,
    maxParallel,
    agentCommand: values["--agent-command"] || null,
    model: values["--model"] || null,
    dryRun: argv.includes("--dry-run"),
    json: argv.includes("--json"),
    requireEffectReview: argv.includes("--require-effect-review"),
    noBrowser: argv.includes("--no-browser"),
  };
}

function printUsage() {
  console.log(`Usage:
  image2-ui orchestrate <project-dir> --task "..." [--reference reference.png] [--workflow recreate|redesign|create] [--mode parallel|sequential] [--max-parallel N] [--agent-command COMMAND] [--model MODEL] [--dry-run] [--json]

Compatibility command:
  orchestrate now delegates to the durable UI Harness Runtime with --execution multi-agent.
  Runtime state is canonical under .image2-ui/runs/<run-id>/state.json.
  Scheduler node progress lives under the same run at .image2-ui/runs/<run-id>/scheduler/scheduler.json.
  New orchestrate runs do not create a second .image2-ui/agents lifecycle.

Options:
  --workflow       UI workflow: recreate, redesign, or create. Defaults follow Runtime rules.
  --mode           DAG scheduling: parallel or sequential. This is not the UI workflow mode.
  --max-parallel   Maximum concurrent ready DAG roles in parallel mode (default: 2).
  --dry-run        Persist a Runtime planned state and print the Runtime scheduler plan without invoking agents.`);
}
