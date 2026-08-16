import assert from "node:assert/strict";
import test from "node:test";
import {
  InvalidTransitionError,
  ORCHESTRATOR_ROLE_ORDER,
  ROLE_TRANSITIONS,
  StateMachine,
  WORKFLOW_TRANSITIONS,
  createRoleStateMachine,
  createWorkflowStateMachine,
  inspectRunManifest,
} from "../scripts/workflow_state_machine.mjs";

test("legacy workflow state machine records, restores, and guards transitions", () => {
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

test("legacy role state machine distinguishes blocked work from failed work", () => {
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

test("legacy workflow terminal events remain explicit", () => {
  for (const [event, expected] of [["complete", "complete"], ["fail", "failed"], ["block", "blocked"]]) {
    const machine = createWorkflowStateMachine();
    machine.transition("plan");
    machine.transition("start");
    machine.transition(event);
    assert.equal(machine.state, expected);
  }
});

test("legacy snapshot replay rejects tampered transition history", () => {
  const machine = createWorkflowStateMachine();
  machine.transition("plan");
  const validSnapshot = machine.snapshot();
  const snapshot = structuredClone(validSnapshot);
  snapshot.history[0].to = "failed";
  assert.throws(
    () => StateMachine.fromSnapshot(snapshot, { transitions: WORKFLOW_TRANSITIONS }),
    /does not describe a valid/,
  );
});

test("legacy run manifest inspection remains available for pre-Runtime scheduler runs", () => {
  const workflow = createWorkflowStateMachine({ clock: () => "2026-08-15T00:00:01.000Z" });
  workflow.transition("plan");
  const roles = Object.fromEntries(ORCHESTRATOR_ROLE_ORDER.map((role) => {
    const machine = createRoleStateMachine(role);
    return [role, {
      phase: "legacy",
      attempts: 0,
      state: machine.state,
      status: machine.state,
      stateMachine: machine.snapshot(),
    }];
  }));
  const manifest = {
    schemaVersion: 1,
    revision: 1,
    runId: "legacy-run",
    startedAt: "2026-08-15T00:00:00.000Z",
    updatedAt: "2026-08-15T00:00:01.000Z",
    currentPhase: null,
    plan: [],
    state: "planned",
    status: "pending",
    stateMachine: workflow.snapshot(),
    transitions: workflow.history.map((record, index) => ({
      sequence: index + 1,
      scope: "workflow",
      subject: "legacy-run",
      ...record,
    })),
    roles,
  };
  assert.equal(inspectRunManifest(manifest).valid, true);

  const tampered = structuredClone(manifest);
  tampered.status = "complete";
  assert.equal(inspectRunManifest(tampered).valid, false);
});
