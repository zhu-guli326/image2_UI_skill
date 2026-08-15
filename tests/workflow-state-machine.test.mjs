import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  InvalidTransitionError,
  ROLE_TRANSITIONS,
  StateMachine,
  WORKFLOW_TRANSITIONS,
  createRoleStateMachine,
  createWorkflowStateMachine,
  inspectRunManifest,
} from "../scripts/workflow_state_machine.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;

function createFakeAgent(target) {
  const source = [
    'const fs = require("node:fs");',
    'const path = require("node:path");',
    'const args = process.argv.slice(2);',
    'const outputFile = args[args.indexOf("-o") + 1];',
    'const prompt = args.at(-1);',
    'const role = /You are the ([^ ]+) specialist/.exec(prompt)?.[1] || "unknown";',
    'if (process.env.FAKE_AGENT_FAIL_ROLE === role) process.exit(7);',
    'const handoffStatus = process.env.FAKE_AGENT_HANDOFF_STATUS || "complete";',
    'const marker = "Write your required role outputs under the run artifacts directory using these exact filenames:";',
    'const section = prompt.split(marker)[1].split("End your final response")[0];',
    'const outputs = section.split(/\\r?\\n/).map((line) => line.trim()).filter((line) => line.startsWith("- ")).map((line) => line.slice(2));',
    'if (handoffStatus === "complete") for (const file of outputs) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, role + " output\\n"); }',
    'fs.mkdirSync(path.dirname(outputFile), { recursive: true });',
    'fs.writeFileSync(outputFile, "## Agent Handoff\\n- Role: " + role + "\\n- Status: " + handoffStatus + "\\n");',
  ].join("\n");
  fs.writeFileSync(path.join(target, "exec"), source);
}

test("workflow state machine records, restores, and guards transitions", () => {
  const timestamps = [
    "2026-08-15T00:00:00.000Z",
    "2026-08-15T00:00:01.000Z",
    "2026-08-15T00:00:02.000Z",
  ];
  const machine = createWorkflowStateMachine({ clock: () => timestamps.shift() });
  machine.transition("plan", { phaseCount: 6 });
  machine.transition("start");
  machine.transition("complete");

  assert.equal(machine.state, "complete");
  assert.deepEqual(machine.history.map(({ event, from, to }) => ({ event, from, to })), [
    { event: "plan", from: "created", to: "planned" },
    { event: "start", from: "planned", to: "running" },
    { event: "complete", from: "running", to: "complete" },
  ]);
  assert.throws(() => machine.transition("start"), InvalidTransitionError);
  assert.throws(() => machine.transition("toString"), InvalidTransitionError);
  assert.throws(() => createWorkflowStateMachine({ initial: "typo" }), /Unknown initial state/);

  const restored = StateMachine.fromSnapshot(machine.snapshot(), {
    transitions: WORKFLOW_TRANSITIONS,
  });
  assert.equal(restored.state, "complete");
  assert.deepEqual(restored.history, machine.history);
});

test("role state machine distinguishes blocked work from failed work", () => {
  const blocked = createRoleStateMachine("ui-implementer");
  blocked.transition("block", { reason: "Prerequisite agent failed" });
  assert.equal(blocked.state, "blocked");
  assert.deepEqual(blocked.allowedEvents(), []);
  const restored = StateMachine.fromSnapshot(blocked.snapshot(), {
    transitions: ROLE_TRANSITIONS,
  });
  assert.equal(restored.state, "blocked");

  const failed = createRoleStateMachine("qa-auditor");
  failed.transition("start");
  failed.transition("fail", { exitCode: 1 });
  assert.equal(failed.state, "failed");
  assert.deepEqual(failed.allowedEvents(), []);
});

test("workflow terminal events remain explicit", () => {
  for (const [event, expected] of [["complete", "complete"], ["fail", "failed"], ["block", "blocked"]]) {
    const machine = createWorkflowStateMachine();
    machine.transition("plan");
    machine.transition("start");
    machine.transition(event);
    assert.equal(machine.state, expected);
  }

  const complete = createWorkflowStateMachine();
  complete.transition("plan");
  complete.transition("start");
  complete.transition("complete");
  assert.throws(() => complete.transition("start"), InvalidTransitionError);
});

test("snapshot replay rejects tampered transition history", () => {
  const machine = createWorkflowStateMachine();
  machine.transition("plan");
  const validSnapshot = machine.snapshot();
  const snapshot = structuredClone(validSnapshot);
  snapshot.history[0].to = "failed";
  assert.throws(
    () => StateMachine.fromSnapshot(snapshot, { transitions: WORKFLOW_TRANSITIONS }),
    /does not describe a valid/,
  );
  const inspection = inspectRunManifest({
    schemaVersion: 1,
    runId: "test-run",
    state: "planned",
    status: "complete",
    stateMachine: validSnapshot,
    transitions: [{
      sequence: 1,
      scope: "workflow",
      subject: "test-run",
      ...validSnapshot.history[0],
    }],
    roles: {},
  });
  assert.equal(inspection.valid, false);
  assert.ok(inspection.errors.some((error) => /manifest.status/.test(error)));
});

test("dry-run persists a planned and inspectable workflow", () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-state-plan-"));
  const stdout = execFileSync(
    node,
    ["scripts/image2-ui", "orchestrate", target, "--task", "Build a production UI", "--dry-run", "--json"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const report = JSON.parse(stdout);
  assert.equal(report.manifest.schemaVersion, 1);
  assert.equal(report.manifest.state, "planned");
  assert.equal(report.manifest.status, "pending");
  assert.equal(report.manifest.stateMachine.history[0].event, "plan");
  assert.deepEqual(
    report.plan.map((phase) => phase.name),
    ["discovery", "architecture", "implementation", "review", "verification", "release"],
  );

  const runDir = path.dirname(report.manifest.artifactsDir);
  const manifestPath = path.join(runDir, "run.json");
  const persisted = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(inspectRunManifest(persisted).valid, true);
  const tampered = structuredClone(persisted);
  tampered.transitions[0].to = "failed";
  assert.equal(inspectRunManifest(tampered).valid, false);
  const impossible = structuredClone(persisted);
  const completed = createWorkflowStateMachine();
  completed.transition("plan");
  completed.transition("start");
  completed.transition("complete");
  impossible.state = "complete";
  impossible.status = "complete";
  impossible.stateMachine = completed.snapshot();
  impossible.transitions = completed.history.map((record, index) => ({
    sequence: index + 1,
    scope: "workflow",
    subject: impossible.runId,
    ...record,
  }));
  assert.ok(
    inspectRunManifest(impossible).errors.some((error) => /requires every role to be complete/.test(error)),
  );
  assert.equal(fs.readdirSync(runDir).some((name) => name.endsWith(".tmp")), false);

  const stateStdout = execFileSync(
    node,
    ["scripts/image2-ui", "state", manifestPath, "--json"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(JSON.parse(stateStdout).state, "planned");
});

test("orchestrator drives every role through the state machine", () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-state-success-"));
  createFakeAgent(target);
  const result = spawnSync(
    node,
    [
      "scripts/image2-ui",
      "orchestrate",
      target,
      "--task",
      "Build a production UI",
      "--agent-command",
      node,
      "--json",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(result.stdout);
  assert.equal(manifest.state, "complete");
  assert.equal(manifest.status, "complete");
  assert.ok(Object.values(manifest.roles).every((role) => role.state === "complete"));
  assert.ok(Object.values(manifest.roles).every((role) => role.attempts === 1));
  assert.equal(inspectRunManifest(manifest).valid, true);
});

test("agent-declared needs-input becomes a blocked workflow", () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-state-needs-input-"));
  createFakeAgent(target);
  const result = spawnSync(
    node,
    [
      "scripts/image2-ui",
      "orchestrate",
      target,
      "--task",
      "Build a production UI",
      "--agent-command",
      node,
      "--json",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, FAKE_AGENT_HANDOFF_STATUS: "needs-input" },
    },
  );
  assert.equal(result.status, 2);
  const report = JSON.parse(result.stdout);
  assert.equal(report.manifest.state, "blocked");
  assert.equal(report.manifest.status, "blocked");
  assert.ok(Object.values(report.manifest.roles).every((role) => role.state === "blocked"));
  assert.equal(inspectRunManifest(report.manifest).valid, true);
});

test("failed agent blocks every role that can no longer run", () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-state-blocked-"));
  createFakeAgent(target);
  const result = spawnSync(
    node,
    [
      "scripts/image2-ui",
      "orchestrate",
      target,
      "--task",
      "Build a production UI",
      "--agent-command",
      node,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, FAKE_AGENT_FAIL_ROLE: "visual-analyst" },
    },
  );
  assert.equal(result.status, 2);

  const agentsDir = path.join(target, ".image2-ui", "agents");
  const [runId] = fs.readdirSync(agentsDir);
  const manifest = JSON.parse(fs.readFileSync(path.join(agentsDir, runId, "run.json"), "utf8"));
  assert.equal(manifest.state, "failed");
  assert.equal(manifest.status, "blocked");
  assert.equal(manifest.roles["visual-analyst"].state, "failed");
  assert.equal(manifest.roles["asset-engineer"].state, "complete");
  for (const role of Object.keys(manifest.roles).filter((role) => !["visual-analyst", "asset-engineer"].includes(role))) {
    assert.equal(manifest.roles[role].state, "blocked", role);
  }
  assert.equal(inspectRunManifest(manifest).valid, true);
});

test("relative Windows agent launch failures cannot leave running roles", { skip: process.platform !== "win32" }, () => {
  const invocationDir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-state-launch-"));
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-state-target-"));
  fs.writeFileSync(path.join(invocationDir, "agent.cmd"), "@echo off\r\nexit /b 0\r\n");
  const result = spawnSync(
    node,
    [
      path.join(repoRoot, "scripts/image2-ui"),
      "orchestrate",
      target,
      "--task",
      "Build a production UI",
      "--agent-command",
      ".\\agent.cmd",
      "--json",
    ],
    { cwd: invocationDir, encoding: "utf8" },
  );
  assert.equal(result.status, 2, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.manifest.state, "failed");
  assert.ok(Object.values(report.manifest.roles).every((role) => role.state !== "running"));
});

test("Windows agent lookup honors PATHEXT", { skip: process.platform !== "win32" }, () => {
  const invocationDir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-state-pathext-"));
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-state-target-"));
  fs.writeFileSync(path.join(invocationDir, "agent.cmd"), "@echo off\r\nexit /b 0\r\n");
  const result = spawnSync(
    node,
    [
      path.join(repoRoot, "scripts/image2-ui"),
      "orchestrate",
      target,
      "--task",
      "Build a production UI",
      "--agent-command",
      "agent",
      "--json",
    ],
    {
      cwd: invocationDir,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: invocationDir + path.delimiter + process.env.PATH,
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
      },
    },
  );
  assert.equal(result.status, 2, result.stderr);
  assert.equal(JSON.parse(result.stdout).manifest.state, "failed");
});

test("agent startup failure persists a failed workflow", () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-state-fail-"));
  const missingAgent = path.join(target, "missing-agent");
  const result = spawnSync(
    node,
    [
      "scripts/image2-ui",
      "orchestrate",
      target,
      "--task",
      "Build a production UI",
      "--agent-command",
      missingAgent,
      "--json",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  const emitted = JSON.parse(result.stdout);

  const agentsDir = path.join(target, ".image2-ui", "agents");
  const [runId] = fs.readdirSync(agentsDir);
  const manifest = JSON.parse(fs.readFileSync(path.join(agentsDir, runId, "run.json"), "utf8"));
  assert.equal(manifest.state, "failed");
  assert.equal(manifest.status, "blocked");
  assert.equal(emitted.runId, manifest.runId);
  assert.deepEqual(manifest.transitions.map(({ event }) => event), ["plan", "start", "fail"]);
  assert.equal(inspectRunManifest(manifest).valid, true);
});
