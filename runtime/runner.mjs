import crypto from "node:crypto";
import path from "node:path";
import { transition as defaultTransition, isPaused, isTerminal } from "./machine.mjs";
import { executeStage as defaultExecuteStage, stageTool } from "./stages.mjs";
import { StateStore } from "./state-store.mjs";
import { ToolRegistry } from "./tools/registry.mjs";

const RECOVERABLE_BLOCKERS = new Set([
  "capability-unavailable",
  "effect-image-required",
  "tool-timeout",
  "workspace-mutation-not-allowed",
]);

export class Runner {
  constructor(options = {}) {
    this.target = options.target
      ? path.resolve(options.target)
      : options.store?.target
        ? path.resolve(options.store.target)
        : null;
    this.store = options.store || (this.target ? new StateStore({ target: this.target }) : null);
    this.machine = options.machine || { transition: defaultTransition };
    this.tools = options.tools || new ToolRegistry();
    this.executeStage = options.executeStage || defaultExecuteStage;
    this.logger = options.logger || null;
    this.clock = options.clock || Date;
  }

  async run(input = {}) {
    const target = path.resolve(input.target || this.target || ".");
    const store = this.#storeFor(target);
    const state = await store.create({ ...input, target });
    return executeUntilPause(this.#context(store, state.runId, input.signal));
  }

  async resume(input = {}) {
    const target = path.resolve(input.target || this.target || ".");
    const store = this.#storeFor(target);
    let state = await resolveState(store, input);
    assertSameTarget(state.task.target, target);

    if (isTerminal(state.status)) return state;
    if (state.currentOperation) state = await reconcileInterruptedOperation({ store, state, clock: this.clock });

    if (state.status === "waiting-input" && !input.result && !input.decision) return state;
    const resumedPolicy = { ...state.policy, ...(input.policy || {}) };
    const resumedLimits = { ...state.limits, ...(input.limits || {}) };
    if (state.status === "blocked") {
      const blocker = state.blockers.at(-1);
      const budgetRaised = blocker?.code === "iteration-budget-exhausted"
        && input.limits?.maxIterations != null
        && resumedLimits.maxIterations > state.limits.maxIterations
        && resumedLimits.maxIterations > state.iteration;
      if (blocker && blocker.retryable !== true && !RECOVERABLE_BLOCKERS.has(blocker.code) && !budgetRaised) return state;
    }

    if (state.status === "waiting-input") {
      state = this.machine.transition({ ...state, status: "running" }, {
        type: "STAGE_SUCCEEDED",
        result: input.result || { decision: input.decision },
      });
    } else if (isPaused(state.status)) {
      state = {
        ...state,
        status: "running",
        policy: resumedPolicy,
        limits: resumedLimits,
        currentOperation: null,
        timestamps: { ...state.timestamps, updatedAt: nowIso(this.clock) },
      };
    }
    await store.commit({ runId: state.runId, state, event: { type: "run.resumed", stage: state.stage } });
    return executeUntilPause(this.#context(store, state.runId, input.signal));
  }

  async inspect(input = {}) {
    const store = this.#storeFor(path.resolve(input.target || this.target || "."));
    return resolveState(store, input);
  }

  #storeFor(target) {
    if (this.store) {
      if (this.store.target) assertSameTarget(this.store.target, target);
      return this.store;
    }
    this.store = new StateStore({ target });
    this.target = target;
    return this.store;
  }

  #context(store, runId, signal) {
    return {
      store,
      runId,
      machine: this.machine,
      tools: this.tools,
      executeStage: this.executeStage,
      logger: this.logger,
      signal,
      clock: this.clock,
    };
  }
}

export function createRuntime(options = {}) {
  return new Runner(options);
}

export async function run(input = {}, options = {}) {
  return createRuntime({ ...options, target: options.target || input.target }).run(input);
}

export async function resume(input = {}, options = {}) {
  return createRuntime({ ...options, target: options.target || input.target }).resume(input);
}

export async function inspect(input = {}, options = {}) {
  return createRuntime({ ...options, target: options.target || input.target }).inspect(input);
}

export async function executeUntilPause(ctx) {
  let transitions = 0;
  while (true) {
    const state = await ctx.store.load(ctx.runId);
    if (isTerminal(state.status) || isPaused(state.status)) return state;
    if (transitions++ > 10_000) throw new Error("Runtime transition safety limit exceeded");

    const operation = createOperation(state, ctx.tools, ctx.clock);
    let attempt = 1;
    while (true) {
      const activeOperation = { ...operation, attempt };
      await ctx.store.markOperationStarted({ ...activeOperation, runId: state.runId });
      try {
        const result = await runStageWithTimeout(ctx, state, activeOperation);
        if (result?.ok === false) throw resultError(result);
        const nextState = ctx.machine.transition({ ...state, status: "running", currentOperation: activeOperation }, {
          type: "STAGE_SUCCEEDED",
          stage: state.stage,
          result,
          artifacts: result?.artifacts,
          operationId: activeOperation.operationId,
        });
        await ctx.store.commit({
          runId: state.runId,
          state: nextState,
          event: {
            type: "stage.succeeded",
            operationId: activeOperation.operationId,
            stage: state.stage,
            attempt,
          },
        });
        break;
      } catch (error) {
        const problem = classifyError(error);
        if (problem.cancelled) {
          const nextState = ctx.machine.transition(state, { type: "RUN_CANCELLED", error: problem });
          await ctx.store.commit({ runId: state.runId, state: nextState, event: { type: "run.cancelled", operationId: activeOperation.operationId, problem } });
          return nextState;
        }
        if (problem.retryable && !problem.blocked && attempt <= state.limits.maxStageRetries) {
          await ctx.store.commit({
            runId: state.runId,
            state: { ...state, status: "running", currentOperation: null, timestamps: { ...state.timestamps, updatedAt: nowIso(ctx.clock) } },
            event: { type: "stage.retry", operationId: activeOperation.operationId, stage: state.stage, attempt, problem },
          });
          attempt += 1;
          await retryWithBackoff(attempt, ctx.signal);
          continue;
        }
        const nextState = ctx.machine.transition(state, { type: problem.blocked ? "STAGE_BLOCKED" : "STAGE_FAILED", error: problem });
        await ctx.store.commit({
          runId: state.runId,
          state: nextState,
          event: { type: problem.blocked ? "stage.blocked" : "stage.failed", operationId: activeOperation.operationId, stage: state.stage, attempt, problem },
        });
        return nextState;
      }
    }
  }
}

export function createOperation(state, tools, clock = Date) {
  const tool = stageTool(state.stage);
  let access = "read";
  if (tool) {
    try { access = tools?.get(tool)?.access || access; } catch { /* Missing tools are classified by executeStage. */ }
  }
  const mutationPossible = access === "write" || ["generate-effect", "implement", "fix"].includes(state.stage);
  return {
    operationId: `op-${crypto.randomBytes(6).toString("hex")}`,
    stage: state.stage,
    tool: tool || `stage.${state.stage}`,
    attempt: 1,
    startedAt: nowIso(clock),
    mutationPossible,
    timeoutMs: tool === "agent.execute" ? state.limits.agentTimeoutMs : state.limits.toolTimeoutMs,
  };
}

export function classifyError(error) {
  const code = error?.code || (error?.name === "AbortError" ? "cancelled" : "runtime-error");
  const cancelled = code === "cancelled" || code === "ABORT_ERR" || error?.name === "AbortError";
  const blocked = Boolean(error?.blocked) || ["capability-unavailable", "effect-image-required", "workspace-mutation-not-allowed"].includes(code);
  return {
    code,
    message: String(error?.message || error || "Runtime operation failed"),
    retryable: Boolean(error?.retryable || code === "tool-timeout"),
    blocked,
    cancelled,
  };
}

export async function reconcileInterruptedOperation({ store, state, clock = Date }) {
  const interrupted = state.currentOperation;
  const requiresWorkspaceVerification = interrupted.mutationPossible && ["implement", "fix"].includes(interrupted.stage);
  const nextState = {
    ...state,
    status: "running",
    stage: requiresWorkspaceVerification ? "verify" : state.stage,
    currentOperation: null,
    timestamps: { ...state.timestamps, updatedAt: nowIso(clock) },
  };
  await store.commit({
    runId: state.runId,
    state: nextState,
    event: {
      type: requiresWorkspaceVerification ? "recovery.reconcile" : "recovery.retry",
      interruptedOperationId: interrupted.operationId,
      interruptedStage: interrupted.stage,
      stage: nextState.stage,
    },
  });
  return nextState;
}

async function resolveState(store, input) {
  if (input.latest) {
    const state = await store.latest();
    if (!state) throw Object.assign(new Error("No Runtime runs found"), { code: "run-not-found" });
    return state;
  }
  if (!input.runId) throw new TypeError("runId or latest is required");
  return store.load(input.runId);
}

async function runStageWithTimeout(ctx, state, operation) {
  const controller = new AbortController();
  let rejectCancelled;
  const cancellation = new Promise((_, reject) => { rejectCancelled = reject; });
  const onAbort = () => {
    controller.abort(ctx.signal?.reason);
    rejectCancelled(Object.assign(new Error("Runtime cancelled"), { code: "cancelled" }));
  };
  if (ctx.signal?.aborted) onAbort();
  else ctx.signal?.addEventListener("abort", onAbort, { once: true });

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort(new Error("Runtime stage timed out"));
      reject(Object.assign(new Error(`Runtime stage ${state.stage} timed out after ${operation.timeoutMs}ms`), { code: "tool-timeout", retryable: true }));
    }, operation.timeoutMs);
  });
  try {
    const execution = Promise.resolve(ctx.executeStage({ state, tools: ctx.tools, signal: controller.signal, target: state.task.target, operation }));
    return await Promise.race([execution, timeout, cancellation]);
  } finally {
    clearTimeout(timer);
    ctx.signal?.removeEventListener("abort", onAbort);
  }
}

function resultError(result) {
  const data = result?.data || result || {};
  const error = new Error(data.message || "Runtime tool returned an unsuccessful result");
  error.code = data.code || "tool-failed";
  error.retryable = Boolean(data.retryable);
  error.blocked = Boolean(data.blocked);
  return error;
}

function assertSameTarget(savedTarget, requestedTarget) {
  const saved = path.resolve(savedTarget);
  const requested = path.resolve(requestedTarget);
  const equal = process.platform === "win32" ? saved.toLowerCase() === requested.toLowerCase() : saved === requested;
  if (!equal) throw Object.assign(new Error(`Run target mismatch: saved ${saved}, requested ${requested}`), { code: "run-target-mismatch" });
}

async function retryWithBackoff(attempt, signal) {
  const delay = Math.min(250 * 2 ** Math.max(0, attempt - 2), 2_000);
  await new Promise((resolve, reject) => {
    const finish = () => { signal?.removeEventListener("abort", onAbort); resolve(); };
    const timer = setTimeout(finish, delay);
    const onAbort = () => { clearTimeout(timer); signal?.removeEventListener("abort", onAbort); reject(Object.assign(new Error("Runtime cancelled"), { code: "cancelled" })); };
    if (signal?.aborted) onAbort();
    else signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function nowIso(clock = Date) {
  const value = typeof clock === "function" ? clock() : new clock();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export default createRuntime;
