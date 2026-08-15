#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const WORKFLOW_STATES = Object.freeze({
  CREATED: "created",
  PLANNED: "planned",
  RUNNING: "running",
  BLOCKED: "blocked",
  COMPLETE: "complete",
  FAILED: "failed",
});

export const ROLE_STATES = Object.freeze({
  PENDING: "pending",
  RUNNING: "running",
  BLOCKED: "blocked",
  COMPLETE: "complete",
  FAILED: "failed",
});

export const ORCHESTRATOR_ROLE_ORDER = Object.freeze([
  "visual-analyst",
  "asset-engineer",
  "ui-architect",
  "backend-contract",
  "state-machine",
  "ui-implementer",
  "code-reviewer",
  "accessibility",
  "qa-auditor",
  "release",
]);

export const WORKFLOW_TRANSITIONS = Object.freeze({
  plan: Object.freeze({ created: WORKFLOW_STATES.PLANNED }),
  start: Object.freeze({
    created: WORKFLOW_STATES.RUNNING,
    planned: WORKFLOW_STATES.RUNNING,
  }),
  block: Object.freeze({ running: WORKFLOW_STATES.BLOCKED }),
  complete: Object.freeze({ running: WORKFLOW_STATES.COMPLETE }),
  fail: Object.freeze({
    planned: WORKFLOW_STATES.FAILED,
    running: WORKFLOW_STATES.FAILED,
  }),
});

export const ROLE_TRANSITIONS = Object.freeze({
  start: Object.freeze({ pending: ROLE_STATES.RUNNING }),
  complete: Object.freeze({ running: ROLE_STATES.COMPLETE }),
  fail: Object.freeze({ running: ROLE_STATES.FAILED }),
  block: Object.freeze({
    pending: ROLE_STATES.BLOCKED,
    running: ROLE_STATES.BLOCKED,
  }),
});

export class InvalidTransitionError extends Error {
  constructor(machineName, state, event, allowedEvents) {
    super(
      "Invalid transition for " + machineName + ': event "' + event +
      '" is not allowed from "' + state + '". Allowed events: ' +
      (allowedEvents.length ? allowedEvents.join(", ") : "none"),
    );
    this.name = "InvalidTransitionError";
    this.machineName = machineName;
    this.state = state;
    this.event = event;
    this.allowedEvents = allowedEvents;
  }
}

export class InvalidSnapshotError extends Error {
  constructor(machineName, message) {
    super("Invalid state-machine snapshot for " + machineName + ": " + message);
    this.name = "InvalidSnapshotError";
    this.machineName = machineName;
  }
}

/**
 * Small deterministic state-machine primitive used by the orchestrator.
 * Transition history is part of the snapshot so a run.json remains auditable
 * after a process exits or an agent fails.
 */
export class StateMachine {
  #state;
  #history;

  constructor({
    name,
    initial,
    transitions,
    clock = () => new Date().toISOString(),
    history = [],
    metadata = {},
  } = {}) {
    if (!name || typeof name !== "string") throw new TypeError("StateMachine name is required");
    if (!transitions || typeof transitions !== "object") {
      throw new TypeError("StateMachine transitions are required for " + name);
    }

    this.name = name;
    this.initial = initial;
    this.transitions = transitions;
    this.clock = clock;
    this.metadata = clone(metadata) || {};
    this.states = collectStates(transitions);
    assertKnownState(this.name, this.states, initial);
    this.#state = initial;
    this.#history = [];
    this.#restoreHistory(history);
  }

  get state() {
    return this.#state;
  }

  get history() {
    return clone(this.#history);
  }

  can(event) {
    return resolveTarget(this.transitions, this.#state, event, this.states) !== null;
  }

  allowedEvents() {
    return Object.keys(this.transitions).filter((event) => this.can(event));
  }

  transition(event, metadata = {}) {
    const target = resolveTarget(this.transitions, this.#state, event, this.states);
    if (target === null) {
      throw new InvalidTransitionError(this.name, this.#state, event, this.allowedEvents());
    }

    const at = this.clock();
    if (typeof at !== "string" || at.length === 0) {
      throw new TypeError("StateMachine clock must return a non-empty string for " + this.name);
    }
    const record = {
      event,
      from: this.#state,
      to: target,
      at,
    };
    if (metadata && Object.keys(metadata).length > 0) record.meta = clone(metadata);
    this.#state = target;
    this.#history.push(record);
    return clone(record);
  }

  snapshot() {
    return {
      name: this.name,
      initial: this.initial,
      state: this.#state,
      history: clone(this.#history),
      metadata: clone(this.metadata),
    };
  }

  #restoreHistory(history = []) {
    if (!Array.isArray(history)) {
      throw new InvalidSnapshotError(this.name, "history must be an array");
    }
    this.#state = this.initial;
    this.#history = [];
    for (const [index, record] of history.entries()) {
      if (!record || typeof record !== "object") {
        throw new InvalidSnapshotError(this.name, "history[" + index + "] must be an object");
      }
      if (record.from !== this.#state) {
        throw new InvalidSnapshotError(
          this.name,
          "history[" + index + "].from is \"" + record.from + "\", expected \"" + this.#state + "\"",
        );
      }
      const target = resolveTarget(this.transitions, this.#state, record.event, this.states);
      if (target === null || target !== record.to) {
        throw new InvalidSnapshotError(
          this.name,
          "history[" + index + "] does not describe a valid \"" + record.event + "\" transition",
        );
      }
      if (typeof record.at !== "string" || record.at.length === 0) {
        throw new InvalidSnapshotError(this.name, "history[" + index + "].at must be a non-empty string");
      }
      this.#state = record.to;
      this.#history.push(clone(record));
    }
    return this;
  }

  static fromSnapshot(snapshot, options = {}) {
    if (!snapshot || typeof snapshot !== "object") {
      throw new InvalidSnapshotError(options.name || "unknown", "snapshot must be an object");
    }
    if (typeof snapshot.name !== "string" || snapshot.name.length === 0) {
      throw new InvalidSnapshotError(options.name || "unknown", "name must be a non-empty string");
    }
    if (options.name && options.name !== snapshot.name) {
      throw new InvalidSnapshotError(options.name, "name is \"" + snapshot.name + "\"");
    }
    if (typeof snapshot.initial !== "string" || typeof snapshot.state !== "string") {
      throw new InvalidSnapshotError(options.name || snapshot.name || "unknown", "initial and state must be strings");
    }
    if (options.initial && snapshot.initial !== options.initial) {
      throw new InvalidSnapshotError(
        options.name || snapshot.name || "unknown",
        "initial is \"" + snapshot.initial + "\", expected \"" + options.initial + "\"",
      );
    }
    const machine = new StateMachine({
      ...options,
      name: options.name || snapshot.name,
      initial: options.initial || snapshot.initial,
      history: snapshot.history || [],
      metadata: snapshot.metadata || {},
    });
    if (snapshot.state !== machine.state) {
      throw new InvalidSnapshotError(
        machine.name,
        "state is \"" + snapshot.state + "\", expected \"" + machine.state + "\" from history",
      );
    }
    return machine;
  }
}

export function createWorkflowStateMachine(options = {}) {
  return new StateMachine({
    ...options,
    name: options.name || "workflow",
    initial: options.initial || WORKFLOW_STATES.CREATED,
    transitions: WORKFLOW_TRANSITIONS,
  });
}

export function createRoleStateMachine(role, options = {}) {
  return new StateMachine({
    ...options,
    name: options.name || "role:" + role,
    initial: options.initial || ROLE_STATES.PENDING,
    transitions: ROLE_TRANSITIONS,
    metadata: { ...(options.metadata || {}), role },
  });
}

export function workflowStatusForState(state) {
  if (state === WORKFLOW_STATES.CREATED || state === WORKFLOW_STATES.PLANNED) return "pending";
  if (state === WORKFLOW_STATES.FAILED) return "blocked";
  return state;
}

export function inspectRunManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") {
    errors.push("Invalid run manifest: expected an object");
  } else {
    if (manifest.schemaVersion !== 1) {
      errors.push("Invalid run manifest: unsupported schemaVersion " + String(manifest.schemaVersion));
    }
    if (typeof manifest.runId !== "string" || manifest.runId.length === 0) {
      errors.push("Invalid run manifest: runId must be a non-empty string");
    }
    if (!Number.isInteger(manifest.revision) || manifest.revision < 1) {
      errors.push("Invalid run manifest: revision must be a positive integer");
    }
    if (typeof manifest.startedAt !== "string" || typeof manifest.updatedAt !== "string") {
      errors.push("Invalid run manifest: startedAt and updatedAt must be strings");
    }
    if (manifest.currentPhase !== null && typeof manifest.currentPhase !== "string") {
      errors.push("Invalid run manifest: currentPhase must be a string or null");
    }
    if (!Array.isArray(manifest.plan)) {
      errors.push("Invalid run manifest: plan must be an array");
    }
  }
  let workflow;
  const roleMachines = {};
  try {
    workflow = StateMachine.fromSnapshot(manifest && manifest.stateMachine, {
      transitions: WORKFLOW_TRANSITIONS,
      name: "workflow",
      initial: WORKFLOW_STATES.CREATED,
    });
    if (manifest.state !== workflow.state) {
      throw new InvalidSnapshotError(
        "workflow",
        "manifest.state is \"" + manifest.state + "\", expected \"" + workflow.state + "\"",
      );
    }
    const expectedStatus = workflowStatusForState(workflow.state);
    if (manifest.status !== expectedStatus) {
      throw new InvalidSnapshotError(
        "workflow",
        "manifest.status is \"" + manifest.status + "\", expected \"" + expectedStatus + "\"",
      );
    }
  } catch (error) {
    errors.push(error.message);
  }

  const manifestRoles = manifest?.roles && typeof manifest.roles === "object" && !Array.isArray(manifest.roles)
    ? manifest.roles
    : {};
  const roleNames = Object.keys(manifestRoles);
  const missingRoles = ORCHESTRATOR_ROLE_ORDER.filter((role) => !roleNames.includes(role));
  const unexpectedRoles = roleNames.filter((role) => !ORCHESTRATOR_ROLE_ORDER.includes(role));
  if (missingRoles.length > 0) errors.push("Invalid run manifest: missing role(s): " + missingRoles.join(", "));
  if (unexpectedRoles.length > 0) errors.push("Invalid run manifest: unexpected role(s): " + unexpectedRoles.join(", "));

  const roles = {};
  for (const [role, entry] of Object.entries(manifestRoles)) {
    try {
      if (!Number.isInteger(entry.attempts) || entry.attempts < 0) {
        throw new InvalidSnapshotError("role:" + role, "attempts must be a non-negative integer");
      }
      if (typeof entry.phase !== "string" || entry.phase.length === 0) {
        throw new InvalidSnapshotError("role:" + role, "phase must be a non-empty string");
      }
      const machine = StateMachine.fromSnapshot(entry.stateMachine, {
        transitions: ROLE_TRANSITIONS,
        name: "role:" + role,
        initial: ROLE_STATES.PENDING,
      });
      if (entry.state !== machine.state) {
        throw new InvalidSnapshotError(
          "role:" + role,
          "entry.state is \"" + entry.state + "\", expected \"" + machine.state + "\"",
        );
      }
      if (entry.status !== machine.state) {
        throw new InvalidSnapshotError(
          "role:" + role,
          "entry.status is \"" + entry.status + "\", expected \"" + machine.state + "\"",
        );
      }
      if (machine.metadata.role !== role) {
        throw new InvalidSnapshotError(
          "role:" + role,
          "metadata.role is \"" + machine.metadata.role + "\", expected \"" + role + "\"",
        );
      }
      roleMachines[role] = machine;
      roles[role] = {
        state: machine.state,
        allowedEvents: machine.allowedEvents(),
        historyLength: machine.history.length,
      };
    } catch (error) {
      errors.push(error.message);
      roles[role] = {
        state: (entry && (entry.state || entry.status)) || "unknown",
        allowedEvents: [],
        historyLength: 0,
      };
    }
  }

  if (workflow && Object.keys(roleMachines).length === roleNames.length) {
    try {
      validateTransitionLog(manifest, workflow, roleMachines);
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (workflow && missingRoles.length === 0 && unexpectedRoles.length === 0) {
    const states = ORCHESTRATOR_ROLE_ORDER.map((role) => roleMachines[role]?.state);
    if (workflow.state === WORKFLOW_STATES.COMPLETE && states.some((state) => state !== ROLE_STATES.COMPLETE)) {
      errors.push("Invalid run manifest: a complete workflow requires every role to be complete");
    }
    if (
      [WORKFLOW_STATES.CREATED, WORKFLOW_STATES.PLANNED].includes(workflow.state) &&
      states.some((state) => state !== ROLE_STATES.PENDING)
    ) {
      errors.push("Invalid run manifest: a created or planned workflow requires every role to be pending");
    }
    if (workflow.state === WORKFLOW_STATES.BLOCKED && !states.includes(ROLE_STATES.BLOCKED)) {
      errors.push("Invalid run manifest: a blocked workflow requires at least one blocked role");
    }
  }

  return {
    valid: errors.length === 0,
    runId: (manifest && manifest.runId) || null,
    state: (workflow && workflow.state) || (manifest && manifest.state) || "unknown",
    status: (manifest && manifest.status) || null,
    allowedEvents: workflow ? workflow.allowedEvents() : [],
    roles,
    errors,
  };
}

function validateTransitionLog(manifest, workflow, roleMachines) {
  if (!Array.isArray(manifest.transitions)) {
    throw new InvalidSnapshotError("workflow", "transitions must be an array");
  }
  const histories = {
    workflow: workflow.history,
    ...Object.fromEntries(
      Object.entries(roleMachines).map(([role, machine]) => ["role:" + role, machine.history]),
    ),
  };
  const cursors = Object.fromEntries(Object.keys(histories).map((key) => [key, 0]));

  for (const [index, record] of manifest.transitions.entries()) {
    if (!record || typeof record !== "object") {
      throw new InvalidSnapshotError("workflow", "transitions[" + index + "] must be an object");
    }
    if (record.sequence !== index + 1) {
      throw new InvalidSnapshotError(
        "workflow",
        "transitions[" + index + "].sequence is " + record.sequence + ", expected " + (index + 1),
      );
    }

    let key;
    if (record.scope === "workflow" && record.subject === manifest.runId) key = "workflow";
    else if (record.scope === "role" && roleMachines[record.subject]) key = "role:" + record.subject;
    else {
      throw new InvalidSnapshotError(
        "workflow",
        "transitions[" + index + "] has an unknown scope or subject",
      );
    }

    const expected = histories[key][cursors[key]];
    if (!expected || !sameTransition(record, expected)) {
      throw new InvalidSnapshotError(
        "workflow",
        "transitions[" + index + "] does not match the " + key + " history",
      );
    }
    cursors[key] += 1;
  }

  for (const [key, history] of Object.entries(histories)) {
    if (cursors[key] !== history.length) {
      throw new InvalidSnapshotError(
        "workflow",
        "transition log is missing " + (history.length - cursors[key]) + " " + key + " event(s)",
      );
    }
  }
}

function sameTransition(actual, expected) {
  return actual.event === expected.event &&
    actual.from === expected.from &&
    actual.to === expected.to &&
    actual.at === expected.at &&
    JSON.stringify(actual.meta || null) === JSON.stringify(expected.meta || null);
}

function resolveTarget(transitions, state, event, states = null) {
  if (!Object.hasOwn(transitions, event)) return null;
  const definition = transitions[event];
  if (definition === undefined) return null;
  if (typeof definition === "string") return definition;
  if (typeof definition === "function") {
    const target = definition(state);
    return typeof target === "string" && (!states || states.has(target)) ? target : null;
  }
  if (definition && typeof definition === "object") {
    if (!Object.hasOwn(definition, state)) return null;
    const target = typeof definition[state] === "string" ? definition[state] : null;
    return target && (!states || states.has(target)) ? target : null;
  }
  return null;
}

function collectStates(transitions) {
  const states = new Set();
  let hasDynamicTransition = false;
  for (const definition of Object.values(transitions)) {
    if (typeof definition === "string") states.add(definition);
    else if (typeof definition === "function") hasDynamicTransition = true;
    else if (definition && typeof definition === "object" && typeof definition !== "function") {
      for (const [from, to] of Object.entries(definition)) {
        states.add(from);
        if (typeof to === "string") states.add(to);
      }
    }
  }
  if (hasDynamicTransition && states.size === 0) {
    throw new TypeError("Dynamic-only transition maps must declare at least one static state");
  }
  return states;
}

function assertKnownState(name, states, state) {
  if (!states.has(state)) throw new TypeError("Unknown initial state \"" + state + "\" for " + name);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function runCli() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const file = args.find((arg) => !arg.startsWith("-"));
  const help = args.includes("--help") || args.includes("-h");
  if (!file || help) {
    console.log("Usage: image2-ui state <run.json> [--json]");
    process.exit(help ? 0 : 1);
  }
  const manifestPath = path.resolve(process.cwd(), file);
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const report = inspectRunManifest(manifest);
    if (json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(
        "Workflow: " + report.state + (report.status ? " (status: " + report.status + ")" : ""),
      );
      for (const [role, roleReport] of Object.entries(report.roles)) {
        console.log("- " + role + ": " + roleReport.state);
      }
      if (report.errors.length > 0) {
        console.error("State validation failed: " + report.errors.join("; "));
      }
    }
    process.exit(report.valid ? 0 : 2);
  } catch (error) {
    console.error("[image2-ui state] " + error.message);
    process.exit(1);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) runCli();
