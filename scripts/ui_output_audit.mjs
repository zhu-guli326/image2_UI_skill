#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runHarnessGuard } from "./ui_harness_guard_v2.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const workflowMode = readOption("--workflow-mode");
const originalReference = readOption("--original-reference");
const target = positionalArgs()[0];

if (!target || args.includes("--help") || args.includes("-h")) {
  console.log(`Usage:
  node scripts/ui_output_audit.mjs <demo-dir-or-html> [--reference reference.png] [--workflow-mode recreate|redesign|create] [--original-reference reference.png] [--json] [--no-browser]

Runs the legacy output audit plus Harness hard guards for icon integrity, generated-visual provenance, and Recreate asset preparation.`);
  process.exit(target ? 0 : 1);
}

const coreArgs = stripGuardOnlyArgs(args);
if (!coreArgs.includes("--json")) coreArgs.push("--json");
const core = spawnSync(
  process.execPath,
  [path.join(__dirname, "ui_output_audit_core.mjs"), ...coreArgs],
  { cwd: process.cwd(), encoding: "utf8", stdio: "pipe" },
);

let audit;
try {
  audit = JSON.parse(core.stdout || "{}");
} catch (error) {
  audit = {
    ok: false,
    status: "fail",
    target: path.resolve(target),
    entry: null,
    counts: { fail: 1, warn: 0, info: 0 },
    findings: [{
      level: "fail",
      rule: "core-audit-parse",
      message: `Could not parse core audit JSON: ${error.message}`,
      file: null,
    }],
  };
}

const guard = runHarnessGuard({
  target,
  workflowMode,
  originalReference,
});

const findings = [...(audit.findings || []), ...(guard.findings || [])];
const result = {
  ...audit,
  ok: findings.every((item) => item.level !== "fail"),
  status: findings.some((item) => item.level === "fail")
    ? "fail"
    : findings.some((item) => item.level === "warn")
      ? "pass-with-warnings"
      : "pass",
  counts: {
    fail: findings.filter((item) => item.level === "fail").length,
    warn: findings.filter((item) => item.level === "warn").length,
    info: findings.filter((item) => item.level === "info").length,
  },
  findings,
  harnessGuard: {
    status: guard.status,
    counts: guard.counts,
  },
};

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  printSummary(result);
}

if (core.stderr) process.stderr.write(core.stderr);
process.exit(result.ok ? 0 : 2);

function readOption(name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  return args[index + 1] && !args[index + 1].startsWith("-") ? args[index + 1] : null;
}

function positionalArgs() {
  const valueOptions = new Set(["--reference", "--workflow-mode", "--original-reference"]);
  const out = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith("-")) {
      if (valueOptions.has(arg) && args[index + 1] && !args[index + 1].startsWith("-")) index += 1;
      continue;
    }
    out.push(arg);
  }
  return out;
}

function stripGuardOnlyArgs(values) {
  const out = [];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (["--workflow-mode", "--original-reference"].includes(value)) {
      index += 1;
      continue;
    }
    out.push(value);
  }
  return out;
}

function printSummary(result) {
  console.log(`Image2 UI output audit + Harness Guard: ${result.status}`);
  console.log(`Target: ${result.target}`);
  if (result.entry) console.log(`Entry: ${result.entry}`);
  console.log(`Findings: ${result.counts.fail} fail, ${result.counts.warn} warn, ${result.counts.info} info`);
  for (const finding of result.findings) {
    const label = finding.level.toUpperCase().padEnd(4);
    console.log(`[${label}] ${finding.rule}: ${finding.message}`);
  }
}
