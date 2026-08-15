import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * The durable state file is intentionally small.  Events are kept in a
 * separate JSONL file so a run can be inspected without continually growing
 * the snapshot.
 */

export const STATE_SCHEMA_VERSION = "1.0";
export const DEFAULT_RUNS_DIR = ".image2-ui/runs";
export const LATEST_RUN_FILE = ".latest";

export const DEFAULT_LIMITS = Object.freeze({
  maxIterations: 3,
  maxStageRetries: 0,
  maxParallel: 1,
  toolTimeoutMs: 120_000,
  agentTimeoutMs: 900_000,
});

export const DEFAULT_POLICY = Object.freeze({
  requireEffectImage: false,
  requireEffectReview: false,
  requireHumanFinalReview: true,
  allowWorkspaceMutation: true,
});

export function nowIso(clock = Date) {
  const value = typeof clock === "function" ? clock() : new clock();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function createRunId(clock = Date) {
  const timestamp = nowIso(clock)
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const random = crypto.randomBytes(4).toString("hex");
  return `${timestamp}-${random}`;
}

/**
 * Build a valid initial runtime snapshot.  The function accepts the public
 * run input as well as an already-normalised `task` object, which keeps the
 * CLI adapter and programmatic API interchangeable.
 */
export function createState(input = {}, options = {}) {
  const clock = options.clock || Date;
  const createdAt = input.timestamps?.createdAt || nowIso(clock);
  const taskInput = input.task && typeof input.task === "object"
    ? input.task
    : {
        ...input,
        ...(typeof input.task === "string" ? { prompt: input.task } : {}),
      };
  const target = String(taskInput.target ?? input.target ?? ".");
  const prompt = String(taskInput.prompt ?? input.prompt ?? input.taskPrompt ?? "").trim() || "Build the requested UI.";
  const reference = taskInput.reference ?? input.reference ?? null;
  const task = {
    intent: taskInput.intent || input.intent || "create",
    target,
    prompt,
    reference: reference == null ? null : String(reference),
  };
  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}) };
  const limits = {
    ...DEFAULT_LIMITS,
    ...(input.limits || {}),
    ...(input.maxIterations == null ? {} : { maxIterations: input.maxIterations }),
  };
  const state = {
    schemaVersion: STATE_SCHEMA_VERSION,
    runId: String(input.runId || createRunId(clock)),
    status: input.status || "created",
    stage: input.stage || "init",
    task,
    policy,
    iteration: Number.isInteger(input.iteration) ? input.iteration : 0,
    effectRevision: Number.isInteger(input.effectRevision) ? input.effectRevision : 0,
    limits,
    artifacts: { ...(input.artifacts || {}) },
    verification: normaliseVerification(input.verification),
    runtime: {
      agentProvider: "codex-cli",
      executionMode: "single-agent",
      ...(input.runtime || {}),
    },
    currentOperation: input.currentOperation || null,
    errors: Array.isArray(input.errors) ? [...input.errors] : [],
    blockers: Array.isArray(input.blockers) ? [...input.blockers] : [],
    timestamps: {
      createdAt,
      updatedAt: input.timestamps?.updatedAt || createdAt,
      finishedAt: input.timestamps?.finishedAt ?? null,
    },
  };
  assertState(state);
  return state;
}

function normaliseVerification(value) {
  return {
    status: value?.status || "unknown",
    mustFix: Array.isArray(value?.mustFix) ? [...value.mustFix] : [],
    shouldFix: Array.isArray(value?.shouldFix) ? [...value.shouldFix] : [],
    audit: {
      fail: Number.isInteger(value?.audit?.fail) ? value.audit.fail : 0,
      warn: Number.isInteger(value?.audit?.warn) ? value.audit.warn : 0,
      info: Number.isInteger(value?.audit?.info) ? value.audit.info : 0,
    },
    visual: {
      score: typeof value?.visual?.score === "number" ? value.visual.score : null,
      method: value?.visual?.method || "unavailable",
    },
    lastVerifiedAt: value?.lastVerifiedAt ?? null,
  };
}

/**
 * Dependency-free mirror of the shipped JSON Schema. Resume validates the
 * complete durable snapshot before any workspace mutation is allowed.
 */
export function assertState(state) {
  if (!state || typeof state !== "object") throw new TypeError("Runtime state must be an object");
  assertOnlyKeys(state, ["schemaVersion", "runId", "status", "stage", "task", "policy", "iteration", "effectRevision", "limits", "artifacts", "verification", "runtime", "currentOperation", "errors", "blockers", "timestamps"], "state");
  const required = ["schemaVersion", "runId", "status", "stage", "task", "policy", "iteration", "limits", "artifacts", "verification", "runtime", "currentOperation", "errors", "blockers", "timestamps"];
  for (const key of required) {
    if (!(key in state)) throw new TypeError(`Runtime state is missing ${key}`);
  }
  if (state.schemaVersion !== STATE_SCHEMA_VERSION) throw new TypeError(`Unsupported state schema version: ${state.schemaVersion}`);
  const statuses = new Set(["created", "running", "waiting-input", "blocked", "failed", "completed", "cancelled"]);
  if (!statuses.has(state.status)) throw new TypeError(`Runtime state status is invalid: ${state.status}`);
  const stages = new Set(["init", "preflight", "analyze-reference", "generate-effect", "review-effect", "decompose", "implement", "verify", "fix", "finalize"]);
  if (!stages.has(state.stage)) throw new TypeError(`Runtime state stage is invalid: ${state.stage}`);
  if (typeof state.runId !== "string" || !state.runId) throw new TypeError("Runtime state runId must not be empty");
  if (!Number.isInteger(state.iteration) || state.iteration < 0) throw new TypeError("Runtime state iteration must be a non-negative integer");
  if (state.effectRevision !== undefined && (!Number.isInteger(state.effectRevision) || state.effectRevision < 0)) throw new TypeError("Runtime state effectRevision must be a non-negative integer");
  if (!state.task || typeof state.task !== "object" || typeof state.task.target !== "string" || !state.task.target) throw new TypeError("Runtime state task.target must not be empty");
  assertOnlyKeys(state.task, ["intent", "target", "prompt", "reference"], "task");
  if (!["recreate", "redesign", "create", "reference-recreation", "optimize", "switch-design-system", "explore"].includes(state.task.intent)) throw new TypeError(`Runtime state task.intent is invalid: ${state.task.intent}`);
  if (typeof state.task.prompt !== "string" || !state.task.prompt.trim()) throw new TypeError("Runtime state task.prompt must not be empty");
  if (!("reference" in state.task) || (state.task.reference !== null && typeof state.task.reference !== "string")) throw new TypeError("Runtime state task.reference must be a string or null");
  if (!state.policy || typeof state.policy !== "object") throw new TypeError("Runtime state policy is required");
  assertOnlyKeys(state.policy, ["requireEffectImage", "requireEffectReview", "requireHumanFinalReview", "allowWorkspaceMutation"], "policy");
  for (const key of ["requireEffectImage", "requireEffectReview", "requireHumanFinalReview", "allowWorkspaceMutation"]) {
    if (typeof state.policy[key] !== "boolean") throw new TypeError(`Runtime state policy.${key} must be boolean`);
  }
  if (!state.limits || !Number.isInteger(state.limits.maxIterations) || state.limits.maxIterations < 1) throw new TypeError("Runtime state limits.maxIterations must be a positive integer");
  assertOnlyKeys(state.limits, ["maxIterations", "maxStageRetries", "maxParallel", "toolTimeoutMs", "agentTimeoutMs"], "limits");
  for (const key of ["maxStageRetries", "maxParallel", "toolTimeoutMs", "agentTimeoutMs"]) {
    if (!Number.isInteger(state.limits[key]) || state.limits[key] < (key === "maxParallel" ? 1 : key.endsWith("TimeoutMs") ? 1000 : 0)) throw new TypeError(`Runtime state limits.${key} is invalid`);
  }
  if (!state.verification || !["unknown", "pass", "needs-fix", "needs-review", "fail"].includes(state.verification.status) || !Array.isArray(state.verification.mustFix) || !Array.isArray(state.verification.shouldFix)) throw new TypeError("Runtime state verification is incomplete");
  assertOnlyKeys(state.verification, ["status", "mustFix", "shouldFix", "accepted", "audit", "visual", "lastVerifiedAt", "raw"], "verification");
  assertOnlyKeys(state.verification.audit, ["fail", "warn", "info"], "verification.audit");
  assertOnlyKeys(state.verification.visual, ["score", "method"], "verification.visual");
  for (const key of ["fail", "warn", "info"]) if (!Number.isInteger(state.verification.audit?.[key]) || state.verification.audit[key] < 0) throw new TypeError(`Runtime state verification.audit.${key} is invalid`);
  if (!state.verification.visual || typeof state.verification.visual.method !== "string") throw new TypeError("Runtime state verification.visual is incomplete");
  if (!("score" in state.verification.visual) || (state.verification.visual.score !== null && (typeof state.verification.visual.score !== "number" || state.verification.visual.score < 0 || state.verification.visual.score > 1))) throw new TypeError("Runtime state verification.visual.score must be between 0 and 1 or null");
  if (state.verification.lastVerifiedAt !== null && state.verification.lastVerifiedAt !== undefined) assertDateTime(state.verification.lastVerifiedAt, "verification.lastVerifiedAt");
  if (state.verification.accepted !== undefined && !Array.isArray(state.verification.accepted)) throw new TypeError("Runtime state verification.accepted must be an array");
  for (const [index, finding] of [...state.verification.mustFix, ...state.verification.shouldFix].entries()) assertFinding(finding, `verification.findings[${index}]`);
  if (!state.artifacts || typeof state.artifacts !== "object" || Array.isArray(state.artifacts)) throw new TypeError("Runtime state artifacts must be an object");
  for (const [name, artifact] of Object.entries(state.artifacts)) {
    if (!artifact || typeof artifact !== "object") throw new TypeError(`Runtime state artifact ${name} must be an object`);
    for (const key of ["kind", "path", "producer"]) if (typeof artifact[key] !== "string" || !artifact[key]) throw new TypeError(`Runtime state artifact ${name}.${key} is required`);
    if (artifact.operationId !== undefined && artifact.operationId !== null && typeof artifact.operationId !== "string") throw new TypeError(`Runtime state artifact ${name}.operationId is invalid`);
  }
  if (!state.runtime || typeof state.runtime.agentProvider !== "string" || !["single-agent", "multi-agent"].includes(state.runtime.executionMode)) throw new TypeError("Runtime state runtime metadata is invalid");
  assertOnlyKeys(state.runtime, ["agentProvider", "agentCommand", "model", "executionMode", "verifyBuild", "verifyCapture", "verifyCompare", "requirePreflight", "noBrowser", "viewport"], "runtime");
  for (const key of ["agentCommand", "model"]) if (state.runtime[key] !== undefined && state.runtime[key] !== null && typeof state.runtime[key] !== "string") throw new TypeError(`Runtime state runtime.${key} is invalid`);
  for (const key of ["verifyBuild", "verifyCapture", "verifyCompare", "requirePreflight", "noBrowser"]) if (state.runtime[key] !== undefined && typeof state.runtime[key] !== "boolean") throw new TypeError(`Runtime state runtime.${key} is invalid`);
  if (state.runtime.viewport !== undefined && state.runtime.viewport !== null && typeof state.runtime.viewport !== "string" && (typeof state.runtime.viewport !== "object" || Array.isArray(state.runtime.viewport))) throw new TypeError("Runtime state runtime.viewport is invalid");
  if (state.currentOperation !== null) {
    const operation = state.currentOperation;
    assertOnlyKeys(operation, ["operationId", "stage", "tool", "attempt", "startedAt", "mutationPossible", "timeoutMs"], "currentOperation");
    for (const key of ["operationId", "stage", "tool", "startedAt"]) if (typeof operation[key] !== "string" || !operation[key]) throw new TypeError(`Runtime state currentOperation.${key} is required`);
    if (!Number.isInteger(operation.attempt) || operation.attempt < 1) throw new TypeError("Runtime state currentOperation.attempt is invalid");
    assertDateTime(operation.startedAt, "currentOperation.startedAt");
    if (operation.mutationPossible !== undefined && typeof operation.mutationPossible !== "boolean") throw new TypeError("Runtime state currentOperation.mutationPossible is invalid");
    if (operation.timeoutMs !== undefined && (!Number.isInteger(operation.timeoutMs) || operation.timeoutMs < 1)) throw new TypeError("Runtime state currentOperation.timeoutMs is invalid");
  }
  if (!Array.isArray(state.errors) || !Array.isArray(state.blockers)) throw new TypeError("Runtime state errors/blockers must be arrays");
  state.errors.forEach((problem, index) => assertProblem(problem, `errors[${index}]`));
  state.blockers.forEach((problem, index) => assertProblem(problem, `blockers[${index}]`));
  if (!state.timestamps?.createdAt || !state.timestamps?.updatedAt) throw new TypeError("Runtime state timestamps are incomplete");
  assertOnlyKeys(state.timestamps, ["createdAt", "updatedAt", "finishedAt"], "timestamps");
  assertDateTime(state.timestamps.createdAt, "timestamps.createdAt");
  assertDateTime(state.timestamps.updatedAt, "timestamps.updatedAt");
  if (state.timestamps.finishedAt !== null && state.timestamps.finishedAt !== undefined) assertDateTime(state.timestamps.finishedAt, "timestamps.finishedAt");
  return state;
}

function assertOnlyKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`Runtime state ${label} must be an object`);
  const allowedKeys = new Set(allowed);
  const unexpected = Object.keys(value).find((key) => !allowedKeys.has(key));
  if (unexpected) throw new TypeError(`Runtime state ${label} contains unexpected property: ${unexpected}`);
}

function assertFinding(finding, label) {
  if (!finding || typeof finding !== "object" || typeof finding.rule !== "string" || typeof finding.message !== "string") throw new TypeError(`Runtime state ${label} is invalid`);
  if (finding.location !== undefined && finding.location !== null && typeof finding.location !== "string") throw new TypeError(`Runtime state ${label}.location is invalid`);
}

function assertProblem(problem, label) {
  if (!problem || typeof problem !== "object" || typeof problem.code !== "string" || typeof problem.message !== "string") throw new TypeError(`Runtime state ${label} is invalid`);
  assertDateTime(problem.at, `${label}.at`);
  for (const key of ["retryable", "blocked", "cancelled"]) if (problem[key] !== undefined && typeof problem[key] !== "boolean") throw new TypeError(`Runtime state ${label}.${key} is invalid`);
}

function assertDateTime(value, label) {
  const dateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  if (typeof value !== "string" || !dateTime.test(value) || Number.isNaN(Date.parse(value))) throw new TypeError(`Runtime state ${label} must be a date-time string`);
}

export function validateState(state) {
  try {
    assertState(state);
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: [error.message] };
  }
}

export async function saveStateAtomic(file, state, options = {}) {
  if (file && typeof file === "object" && typeof state === "string") {
    const value = file;
    file = state;
    state = value;
  }
  assertState(state);
  const destination = path.resolve(file);
  const dir = path.dirname(destination);
  await fs.mkdir(dir, { recursive: true });
  const suffix = `${process.pid}.${crypto.randomBytes(5).toString("hex")}.tmp`;
  const temp = `${destination}.${suffix}`;
  const payload = `${JSON.stringify(state, null, 2)}\n`;
  try {
    await fs.writeFile(temp, payload, "utf8");
    try {
      await fs.rename(temp, destination);
    } catch (error) {
      if (error?.code !== "EEXIST" && error?.code !== "EPERM" && error?.code !== "ENOTEMPTY") throw error;
      await fs.rm(destination, { force: true });
      await fs.rename(temp, destination);
    }
  } finally {
    await fs.rm(temp, { force: true }).catch(() => {});
  }
  return state;
}

export async function loadState(file, options = {}) {
  const raw = await fs.readFile(path.resolve(file), "utf8");
  let state;
  try {
    state = JSON.parse(raw);
  } catch (error) {
    throw new TypeError(`Invalid runtime state JSON at ${file}: ${error.message}`);
  }
  if (options.validate !== false) assertState(state);
  return state;
}

export async function appendEvent(file, event, options = {}) {
  const eventFile = path.resolve(file);
  await fs.mkdir(path.dirname(eventFile), { recursive: true });
  let sequence = 1;
  try {
    const existing = await fs.readFile(eventFile, "utf8");
    const lines = existing.split(/\r?\n/).filter(Boolean);
    if (lines.length) {
      try {
        const last = JSON.parse(lines.at(-1));
        sequence = Number.isInteger(last.seq) ? last.seq + 1 : lines.length + 1;
      } catch {
        sequence = lines.length + 1;
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const record = {
    seq: sequence,
    at: event.at || nowIso(options.clock || Date),
    ...event,
  };
  record.seq = sequence;
  record.at = event.at || record.at;
  await fs.appendFile(eventFile, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

export async function markOperationStarted(file, state, operation, options = {}) {
  const next = {
    ...state,
    status: "running",
    currentOperation: { ...operation },
    timestamps: { ...state.timestamps, updatedAt: operation.startedAt || nowIso(options.clock || Date) },
  };
  await saveStateAtomic(file, next, options);
  return next;
}

export async function clearOperation(file, state, options = {}) {
  const next = {
    ...state,
    currentOperation: null,
    timestamps: { ...state.timestamps, updatedAt: nowIso(options.clock || Date) },
  };
  await saveStateAtomic(file, next, options);
  return next;
}

export class StateStore {
  constructor(options = {}) {
    if (typeof options === "string") options = { target: options };
    this.target = options.target ? path.resolve(options.target) : null;
    this.rootDir = options.runsDir
      ? path.resolve(options.runsDir)
      : options.rootDir
        ? path.resolve(options.rootDir)
        : (this.target ? path.join(this.target, DEFAULT_RUNS_DIR) : null);
    this.stateFile = options.stateFile ? path.resolve(options.stateFile) : null;
    this.eventsFile = options.eventsFile ? path.resolve(options.eventsFile) : null;
    this.clock = options.clock || Date;
    this.validate = options.validate !== false;
  }

  paths(runId = null) {
    if (this.stateFile) {
      return { stateFile: this.stateFile, eventsFile: this.eventsFile || path.join(path.dirname(this.stateFile), "events.jsonl") };
    }
    if (!this.rootDir) throw new Error("StateStore requires target, rootDir, or stateFile");
    if (!runId) throw new Error("runId is required to resolve runtime state path");
    const id = String(runId);
    if (
      !id ||
      id === "." ||
      id === ".." ||
      id.endsWith(".json") ||
      path.isAbsolute(id) ||
      id.includes("/") ||
      id.includes("\\") ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)
    ) {
      throw new TypeError(`Invalid Runtime runId: ${id}`);
    }
    const runDir = path.join(this.rootDir, id);
    return { stateFile: path.join(runDir, "state.json"), eventsFile: path.join(runDir, "events.jsonl") };
  }

  latestPath() {
    if (!this.rootDir) throw new Error("StateStore.latest requires target or rootDir");
    return path.join(this.rootDir, LATEST_RUN_FILE);
  }

  async #writeLatest(runId) {
    if (!this.rootDir) return;
    await fs.mkdir(this.rootDir, { recursive: true });
    const file = this.latestPath();
    const temp = `${file}.${process.pid}.${crypto.randomBytes(5).toString("hex")}.tmp`;
    try {
      await fs.writeFile(temp, `${runId}\n`, "utf8");
      try {
        await fs.rename(temp, file);
      } catch (error) {
        if (!["EEXIST", "EPERM", "ENOTEMPTY"].includes(error?.code)) throw error;
        await fs.rm(file, { force: true });
        await fs.rename(temp, file);
      }
    } finally {
      await fs.rm(temp, { force: true }).catch(() => {});
    }
  }

  statePath(runId) { return this.paths(runId).stateFile; }
  eventsPath(runId) { return this.paths(runId).eventsFile; }

  async create(input = {}) {
    const state = createState(input, { clock: this.clock });
    const files = this.paths(state.runId);
    await saveStateAtomic(files.stateFile, state);
    await appendEvent(files.eventsFile, { type: "run.created", runId: state.runId }, { clock: this.clock });
    await this.#writeLatest(state.runId);
    return state;
  }

  async load(runId = null) {
    const files = this.paths(runId || undefined);
    return loadState(files.stateFile, { validate: this.validate });
  }

  async saveAtomic(stateOrRunId, maybeState) {
    const state = maybeState === undefined ? stateOrRunId : maybeState;
    const runId = maybeState === undefined ? state?.runId : stateOrRunId;
    const files = this.paths(runId || state?.runId);
    const saved = await saveStateAtomic(files.stateFile, state);
    await this.#writeLatest(saved.runId);
    return saved;
  }

  async appendEvent(runIdOrEvent, maybeEvent) {
    const runId = maybeEvent === undefined ? null : runIdOrEvent;
    const event = maybeEvent === undefined ? runIdOrEvent : maybeEvent;
    const files = this.paths(runId || event.runId || null);
    return appendEvent(files.eventsFile, event, { clock: this.clock });
  }

  async markOperationStarted(runIdOrOperation, maybeOperation) {
    const runId = maybeOperation === undefined ? null : runIdOrOperation;
    const operationInput = maybeOperation === undefined ? runIdOrOperation : maybeOperation;
    const effectiveRunId = runId || operationInput.runId;
    const { runId: _runId, ...operation } = operationInput;
    const state = await this.load(effectiveRunId);
    const files = this.paths(state.runId);
    const next = await markOperationStarted(files.stateFile, state, operation, { clock: this.clock });
    await this.#writeLatest(state.runId);
    await appendEvent(files.eventsFile, { type: "stage.started", runId: state.runId, operationId: operation.operationId, stage: operation.stage, tool: operation.tool }, { clock: this.clock });
    return next;
  }

  async clearOperation(runIdOrState, maybeState) {
    const state = maybeState === undefined ? runIdOrState : maybeState;
    const runId = maybeState === undefined ? state.runId : runIdOrState;
    const files = this.paths(runId);
    const next = await clearOperation(files.stateFile, state, { clock: this.clock });
    await this.#writeLatest(runId);
    return next;
  }

  async commit({ runId, state, event } = {}) {
    const effectiveState = state || await this.load(runId);
    const files = this.paths(runId || effectiveState.runId);
    await saveStateAtomic(files.stateFile, effectiveState);
    if (event) await appendEvent(files.eventsFile, { runId: effectiveState.runId, ...event }, { clock: this.clock });
    await this.#writeLatest(effectiveState.runId);
    return effectiveState;
  }

  async events(runId = null) {
    const files = this.paths(runId || undefined);
    try {
      const raw = await fs.readFile(files.eventsFile, "utf8");
      return raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  async latest() {
    if (!this.rootDir) throw new Error("StateStore.latest requires target or rootDir");
    try {
      const runId = (await fs.readFile(this.latestPath(), "utf8")).trim();
      if (runId) return await this.load(runId);
    } catch (error) {
      if (error.code !== "ENOENT") {
        // A stale pointer is recoverable by scanning the run directory.
      }
    }
    let entries = [];
    try { entries = await fs.readdir(this.rootDir, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
    const candidates = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const state = await this.load(entry.name);
        const stat = await fs.stat(this.statePath(entry.name));
        candidates.push({ state, mtimeMs: stat.mtimeMs });
      } catch {
        // Ignore incomplete/foreign directories when selecting --latest.
      }
    }
    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs || String(b.state.runId).localeCompare(String(a.state.runId)));
    const state = candidates[0]?.state || null;
    if (state) await this.#writeLatest(state.runId);
    return state;
  }
}

export function createStateStore(options = {}) {
  return new StateStore(options);
}

export const create = createState;
export const save = saveStateAtomic;
export const load = loadState;

export default StateStore;
