import fs from "node:fs";
import path from "node:path";
import { createRuntime } from "./runner.mjs";
import { StateStore } from "./state-store.mjs";
import { createLegacyToolRegistry } from "./tools/legacy-cli.mjs";
import { buildDagPlan } from "./scheduler/dag.mjs";
import {
  assertWorkflowInputs,
  normalizeWorkflowMode,
  workflowPolicy,
} from "./workflow-modes.mjs";

const VALUE_OPTIONS = new Map([
  ["--task", "task"],
  ["--reference", "reference"],
  ["--run", "runId"],
  ["--max-iterations", "maxIterations"],
  ["--max-parallel", "maxParallel"],
  ["--agent-command", "agentCommand"],
  ["--model", "model"],
  ["--mode", "mode"],
  ["--intent", "intent"],
  ["--execution", "execution"],
  ["--decision", "decision"],
]);

const FLAG_OPTIONS = new Set([
  "--latest",
  "--dry-run",
  "--no-effect",
  "--no-browser",
  "--require-effect-review",
  "--json",
  "--help",
  "-h",
]);

export async function runRuntimeCli(action, argv, options = {}) {
  const json = argv.includes("--json");
  try {
    if (argv.includes("--help") || argv.includes("-h")) {
      printHelp(action);
      return 0;
    }

    const parsed = parseRuntimeArgs(argv);
    if (!parsed.target) throw new Error(`${action} requires a project directory`);
    const target = path.resolve(process.cwd(), parsed.target);
    if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) throw new Error(`Target directory not found: ${target}`);

    const store = new StateStore({ target });
    const runtime = createRuntime({
      target,
      store,
      tools: createLegacyToolRegistry({
        repoRoot: options.repoRoot,
        agentCommand: parsed.agentCommand,
        model: parsed.model,
      }),
    });

    let state;
    if (action === "run") {
      if (!parsed.task && !parsed.dryRun) throw new Error("run requires --task unless --dry-run is supplied");
      const input = buildRunInput(target, parsed);
      state = parsed.dryRun ? await store.create(input) : await runtime.run(input);
    } else {
      assertRunSelector(action, parsed);
      state = action === "resume"
        ? await runtime.resume({
            target,
            runId: parsed.runId,
            latest: parsed.latest,
            decision: parsed.decision,
            limits: parsed.maxIterations == null ? undefined : { maxIterations: parsed.maxIterations },
          })
        : await runtime.inspect({ runId: parsed.runId, latest: parsed.latest });
    }

    let output = action === "inspect"
      ? { ...state, events: await store.events(state.runId) }
      : state;
    if (action === "run" && parsed.dryRun && state.runtime.executionMode === "multi-agent") {
      output = {
        ...state,
        schedulerPlan: buildDagPlan({
          tier: "medium",
          mode: state.limits.maxParallel === 1 ? "sequential" : "parallel",
          maxParallel: state.limits.maxParallel,
          throughPhase: "release",
        }),
      };
    }

    if (json) console.log(JSON.stringify(output, null, 2));
    else {
      const mode = normalizeWorkflowMode(state.task.intent, { hasReference: Boolean(state.task.reference) });
      console.log(`Runtime ${action}: ${state.status} (${state.stage})\nMode: ${mode}\nExecution: ${state.runtime.executionMode}\nRun: ${state.runId}`);
    }
    return exitCodeFor(action, state.status);
  } catch (error) {
    if (json) console.log(JSON.stringify({ ok: false, error: error.message, code: error.code || "runtime-command-failed" }, null, 2));
    else console.error(`[image2-ui ${action}] ${error.message}`);
    return 1;
  }
}

export function parseRuntimeArgs(args) {
  const out = {
    latest: args.includes("--latest"),
    dryRun: args.includes("--dry-run"),
    noEffect: args.includes("--no-effect"),
    noBrowser: args.includes("--no-browser"),
    requireEffectReview: args.includes("--require-effect-review"),
  };
  const positionals = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (VALUE_OPTIONS.has(arg)) {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) throw new Error(`${arg} requires a value`);
      out[VALUE_OPTIONS.get(arg)] = value;
      index += 1;
    } else if (FLAG_OPTIONS.has(arg)) {
      continue;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown Runtime option: ${arg}`);
    } else {
      positionals.push(arg);
    }
  }

  if (positionals.length > 1) throw new Error(`Unexpected positional argument: ${positionals[1]}`);
  out.target = positionals[0];
  if (out.mode && out.intent && out.mode !== out.intent) throw new Error("Use --mode or --intent, not conflicting values");
  if (out.execution && !["single-agent", "multi-agent"].includes(out.execution)) throw new Error("--execution must be single-agent or multi-agent");
  if (out.maxIterations != null) {
    out.maxIterations = Number.parseInt(out.maxIterations, 10);
    if (!Number.isInteger(out.maxIterations) || out.maxIterations < 1) throw new Error("--max-iterations must be positive");
  }
  if (out.maxParallel != null) {
    out.maxParallel = Number.parseInt(out.maxParallel, 10);
    if (!Number.isInteger(out.maxParallel) || out.maxParallel < 1) throw new Error("--max-parallel must be positive");
  }
  if (out.decision && !["approved", "rejected"].includes(out.decision)) throw new Error("--decision must be approved or rejected");
  return out;
}

export function buildRunInput(target, parsed) {
  const reference = parsed.reference ? path.resolve(process.cwd(), parsed.reference) : null;
  const mode = normalizeWorkflowMode(parsed.mode || parsed.intent, { hasReference: Boolean(reference) });
  assertWorkflowInputs(mode, { reference });
  const effectPolicy = workflowPolicy(mode, parsed);
  const executionMode = parsed.execution || "single-agent";
  const maxParallel = parsed.maxParallel ?? (executionMode === "multi-agent" ? 2 : undefined);

  return {
    target,
    task: {
      target,
      prompt: parsed.task || "Planned UI Harness run",
      reference,
      intent: mode,
    },
    limits: {
      ...(parsed.maxIterations == null ? {} : { maxIterations: parsed.maxIterations }),
      ...(maxParallel == null ? {} : { maxParallel }),
    },
    policy: {
      ...effectPolicy,
      requireHumanFinalReview: true,
      allowWorkspaceMutation: true,
    },
    runtime: {
      agentProvider: "codex-cli",
      executionMode,
      agentCommand: parsed.agentCommand || "codex",
      model: parsed.model || null,
      noBrowser: parsed.noBrowser,
      requirePreflight: true,
    },
  };
}

function assertRunSelector(action, parsed) {
  if (!parsed.latest && !parsed.runId) throw new Error(`${action} requires --run RUN_ID or --latest`);
  if (parsed.latest && parsed.runId) throw new Error("Use either --run RUN_ID or --latest, not both");
}

function exitCodeFor(action, status) {
  if (action === "inspect") return 0;
  if (["blocked", "waiting-input"].includes(status)) return 2;
  if (["failed", "cancelled"].includes(status)) return 1;
  return 0;
}

function printHelp(action) {
  const usage = action === "run"
    ? [
        "Usage: image2-ui run <project-dir> --task \"...\" [--mode recreate|redesign|create] [--reference FILE] [--execution single-agent|multi-agent] [--max-parallel N] [--require-effect-review] [--max-iterations N] [--dry-run] [--json]",
        "",
        "Workflow modes:",
        "  recreate  Screenshot/reference -> UI. Original reference is the source of truth; no effect image gate.",
        "  redesign  Reference -> new design -> UI. Generates an effect image before implementation.",
        "  create    Description -> new design -> UI. Generates an effect image before implementation.",
        "",
        "Execution:",
        "  single-agent  Runtime invokes one implementation/fix agent at a time (default).",
        "  multi-agent   Runtime owns a subordinate DAG Scheduler for specialist analysis, implementation, review, QA, and release.",
        "",
        "Defaults: with --reference => recreate; without --reference => create. Multi-agent defaults to maxParallel=2.",
      ].join("\n")
    : `Usage: image2-ui ${action} <project-dir> (--run RUN_ID | --latest)${action === "resume" ? " [--decision approved|rejected] [--max-iterations N]" : ""} [--json]`;
  console.log(usage);
}

export default runRuntimeCli;
