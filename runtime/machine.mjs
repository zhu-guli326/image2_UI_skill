export const LINEAR_NEXT = Object.freeze({
  init: "preflight",
  preflight: "analyze-reference",
  "analyze-reference": "generate-effect",
  "generate-effect": "review-effect",
  "review-effect": "decompose",
  decompose: "implement",
  implement: "verify",
  verify: "finalize",
  fix: "verify",
  finalize: null,
});

export const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);
export const PAUSED_STATUSES = new Set(["waiting-input", "blocked"]);

export class InvalidTransitionError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidTransitionError";
  }
}

export const isTerminal = (status) => TERMINAL_STATUSES.has(status);
export const isPaused = (status) => PAUSED_STATUSES.has(status);

export function transition(state, event) {
  if (!state || !Object.hasOwn(LINEAR_NEXT, state.stage) || !event?.type) {
    throw new InvalidTransitionError("Invalid state or event");
  }
  if (isTerminal(state.status)) throw new InvalidTransitionError(`Cannot transition terminal ${state.status} run`);
  if (isPaused(state.status) && !["RESUMED", "RUN_CANCELLED", "CANCELLED"].includes(event.type)) {
    throw new InvalidTransitionError(`Cannot continue ${state.status} run`);
  }

  const at = event.at || new Date().toISOString();
  const base = {
    ...state,
    currentOperation: null,
    errors: [...(state.errors || [])],
    blockers: [...(state.blockers || [])],
    artifacts: { ...(state.artifacts || {}) },
    timestamps: { ...state.timestamps, updatedAt: at },
  };

  if (["STAGE_FAILED", "RUN_FAILED"].includes(event.type)) {
    return {
      ...base,
      status: "failed",
      errors: [...base.errors, issue(event.error, at)],
      timestamps: { ...base.timestamps, finishedAt: at },
    };
  }
  if (["STAGE_BLOCKED", "RUN_BLOCKED"].includes(event.type)) {
    return { ...base, status: "blocked", blockers: [...base.blockers, issue(event.error, at)] };
  }
  if (["RUN_CANCELLED", "CANCELLED"].includes(event.type)) {
    return { ...base, status: "cancelled", timestamps: { ...base.timestamps, finishedAt: at } };
  }
  if (["INPUT_REQUIRED", "STAGE_WAITING_INPUT"].includes(event.type)) {
    return { ...base, status: "waiting-input" };
  }
  if (["RUN_STARTED", "RESUMED", "STAGE_RETRY"].includes(event.type)) {
    return { ...base, status: "running", currentOperation: event.operation || null };
  }
  if (event.type === "STAGE_STARTED") {
    return { ...base, status: "running", currentOperation: event.operation || state.currentOperation };
  }
  if (event.type !== "STAGE_SUCCEEDED") throw new InvalidTransitionError(`Unsupported event: ${event.type}`);

  const data = event.result?.ok === true ? event.result.data || {} : event.result || {};
  const next = {
    ...base,
    status: "running",
    artifacts: mergeArtifacts(base.artifacts, event.artifacts || event.result?.artifacts, state, event),
  };

  if (state.stage === "verify") return transitionVerification(state, next, data, at);
  if (state.stage === "fix") {
    next.stage = "verify";
    next.iteration = state.iteration + 1;
    return next;
  }
  if (state.stage === "analyze-reference") {
    next.stage = state.policy?.requireEffectImage ? "generate-effect" : "decompose";
    return next;
  }
  if (state.stage === "review-effect") return transitionEffectReview(state, next, data, at);
  if (state.stage === "finalize") {
    next.status = "completed";
    next.timestamps.finishedAt = at;
    return next;
  }

  next.stage = LINEAR_NEXT[state.stage];
  return next;
}

export function createMachine() {
  return { transition, isTerminal, isPaused };
}

function transitionVerification(state, next, data, at) {
  const source = data.fixQueue || data;
  const mustFix = source.mustFix || [];
  const shouldFix = source.shouldFix || [];
  const counts = data.audit?.counts || data.audit || {};
  next.verification = {
    status: mustFix.length ? "needs-fix" : shouldFix.length ? "needs-review" : data.status === "fail" ? "fail" : "pass",
    mustFix,
    shouldFix,
    audit: {
      fail: counts.fail ?? 0,
      warn: counts.warn ?? 0,
      info: counts.info ?? 0,
    },
    visual: {
      score: data.visual?.score ?? null,
      method: data.visual?.method || "unavailable",
    },
    lastVerifiedAt: data.lastVerifiedAt || at,
  };

  if (mustFix.length && state.iteration >= state.limits.maxIterations) {
    next.status = "blocked";
    next.blockers.push({
      code: "iteration-budget-exhausted",
      message: `Still has ${mustFix.length} Must Fix findings`,
      at,
      retryable: false,
    });
  } else {
    next.stage = mustFix.length ? "fix" : "finalize";
  }
  return next;
}

function transitionEffectReview(state, next, data, at) {
  const decision = effectDecision(data, state.policy?.requireEffectReview);
  if (decision === "rejected") {
    next.stage = "generate-effect";
    next.effectRevision = (state.effectRevision || 0) + 1;
  } else if (decision === "waiting-input") {
    next.status = "waiting-input";
    next.blockers.push({
      code: "approval-required",
      message: "Effect image review approval is required",
      at,
      retryable: true,
    });
  } else {
    next.stage = "decompose";
  }
  return next;
}

function effectDecision(data, requireReview) {
  if (data.approved === true) return "approved";
  if (data.approved === false) return "rejected";
  const value = String(data.decision || data.reviewDecision || data.status || "").toLowerCase();
  if (["approved", "approve"].includes(value)) return "approved";
  if (["rejected", "reject"].includes(value)) return "rejected";
  if (["waiting", "waiting-input", "needs-input"].includes(value)) return "waiting-input";
  return requireReview ? "waiting-input" : "approved";
}

function issue(value, at) {
  return {
    code: value?.code || "runtime-error",
    message: String(value?.message || value || "Runtime operation failed"),
    at: value?.at || at,
    retryable: Boolean(value?.retryable),
    ...(value?.blocked ? { blocked: true } : {}),
    ...(value?.cancelled ? { cancelled: true } : {}),
  };
}

function mergeArtifacts(current, incoming, state, event) {
  if (!incoming) return current;
  const next = { ...current };
  const items = Array.isArray(incoming)
    ? incoming
    : Object.entries(incoming).map(([name, value]) => ({
        name,
        ...(typeof value === "string" ? { path: value } : value),
      }));
  for (const item of items) {
    const key = item.name || item.kind || `artifact-${Object.keys(next).length + 1}`;
    next[key] = {
      ...item,
      kind: item.kind || key,
      producer: item.producer || state.currentOperation?.tool || `stage.${state.stage}`,
      operationId: item.operationId ?? event.operationId ?? null,
    };
  }
  return next;
}

export default transition;
