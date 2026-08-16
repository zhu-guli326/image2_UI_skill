import { implementationSource, normalizeWorkflowMode, verificationReference } from "./workflow-modes.mjs";
import { executeAgentDag, invalidateSchedulerFromPhase } from "./scheduler/executor.mjs";

export const STAGES = [
  "init",
  "preflight",
  "analyze-reference",
  "generate-effect",
  "review-effect",
  "decompose",
  "implement",
  "verify",
  "fix",
  "finalize",
];

export const STAGE_TOOLS = {
  preflight: "env.doctor",
  "generate-effect": "image.generate",
  implement: "agent.execute",
  verify: "ui.validate",
  fix: "agent.execute",
};

export const stageTool = (stage) => STAGE_TOOLS[stage] || null;

export async function executeStage({ state, tools, signal, target, operation, stageHandlers = {} } = {}) {
  const stage = state?.stage;
  if (!stage) throw new TypeError("executeStage requires state.stage");
  if (stageHandlers[stage]) return normalize(await stageHandlers[stage]({ state, tools, signal, target, operation }));
  if (["init", "analyze-reference", "review-effect", "decompose"].includes(stage)) return executeNonIoStage(state);
  if (stage === "verify") return executeVerify({ state, tools, signal, target, operation });
  if (stage === "finalize") {
    if (state.runtime?.executionMode !== "multi-agent") return executeNonIoStage(state);
    return executeAgentDag({ state, tools, signal, target: target || state.task.target, operation, throughPhase: "release" });
  }

  if (["implement", "fix"].includes(stage) && state.policy?.allowWorkspaceMutation === false) {
    return {
      ok: false,
      data: {
        code: "workspace-mutation-not-allowed",
        message: "Workspace mutation is disabled",
        blocked: true,
      },
    };
  }
  if (stage === "implement" && state.policy?.requireEffectImage && !effectArtifact(state)) {
    return {
      ok: false,
      data: {
        code: "effect-image-required",
        message: "Effect image is required",
        blocked: true,
      },
    };
  }

  const effectiveTarget = target || state.task.target;
  if (stage === "implement" && state.runtime?.executionMode === "multi-agent") {
    return executeAgentDag({ state, tools, signal, target: effectiveTarget, operation, throughPhase: "implementation" });
  }

  const name = STAGE_TOOLS[stage];
  if (!has(tools, name)) {
    const required = (stage === "preflight" && state.runtime?.requirePreflight)
      || ["implement", "fix"].includes(stage)
      || (stage === "generate-effect" && state.policy?.requireEffectImage);
    if (required) {
      throw blocked(
        stage === "generate-effect" ? "effect-image-required" : "capability-unavailable",
        `Required Runtime tool is unavailable: ${name}`,
      );
    }
    return { ok: true, data: { skipped: true } };
  }

  const input = stage === "fix"
    ? buildFixRequest(state, effectiveTarget)
    : stage === "implement"
      ? buildImplementRequest(state, effectiveTarget)
      : stage === "generate-effect"
        ? {
            target: effectiveTarget,
            runId: state.runId,
            effectRevision: state.effectRevision,
            prompt: buildImagePrompt(state),
            task: state.task,
            access: "write",
          }
        : { target: effectiveTarget, task: state.task, policy: state.policy };

  const result = await tools.invoke(name, input, {
    state,
    target: effectiveTarget,
    signal,
    operation,
    timeoutMs: operation?.timeoutMs,
  });

  if (stage === "preflight") {
    validatePreflightResult(state, result);
    await probeRequiredCapabilities({ state, tools, signal, operation });
  }
  if (stage === "generate-effect" && state.policy?.requireEffectImage) {
    const artifact = (result?.artifacts || []).find((item) => item?.kind === "effect-image" && item?.path);
    if (!artifact) throw blocked("effect-image-required", "Image generation did not produce an effect-image artifact");
  }
  if (stage === "fix" && state.runtime?.executionMode === "multi-agent" && result?.ok !== false) {
    await invalidateSchedulerFromPhase({ target: effectiveTarget, runId: state.runId, phase: "review" });
  }
  return normalize(result);
}

export async function executeVerify({ state, tools, signal, target, operation } = {}) {
  if (!has(tools, "ui.validate")) throw blocked("capability-unavailable", "Required Runtime tool is unavailable: ui.validate");
  const effectiveTarget = target || state.task.target;
  const context = { state, signal, operation, timeoutMs: operation?.timeoutMs };
  const results = [];
  let schedulerFindings = { mustFix: [], shouldFix: [] };
  let schedulerArtifacts = [];

  if (state.runtime?.executionMode === "multi-agent") {
    const schedulerResult = await executeAgentDag({
      state,
      tools,
      signal,
      target: effectiveTarget,
      operation,
      throughPhase: "verification",
    });
    schedulerFindings = unwrap(schedulerResult).findings || schedulerFindings;
    schedulerArtifacts = schedulerResult.artifacts || [];
  }

  if (has(tools, "ui.build") && state.runtime?.verifyBuild !== false) {
    results.push(await tools.invoke("ui.build", { target: effectiveTarget, command: state.task.buildCommand }, context));
  }
  results.push(await tools.invoke("ui.validate", {
    target: effectiveTarget,
    reference: verificationReference(state),
    originalReference: state.task.reference,
    workflowMode: normalizeWorkflowMode(state.task.intent, { hasReference: Boolean(state.task.reference) }),
    noBrowser: state.runtime?.noBrowser === true,
  }, context));

  const all = results.map(unwrap);
  const validation = all.find((item) => item.mustFix || item.fixQueue?.mustFix || item.findings) || {};
  const mustFix = [
    ...(schedulerFindings.mustFix || []),
    ...all.flatMap((item) => {
      const source = item.fixQueue || item;
      return source.mustFix || (source.findings || []).filter((finding) => finding.level === "fail");
    }),
  ];
  const shouldFix = [
    ...(schedulerFindings.shouldFix || []),
    ...all.flatMap((item) => {
      const source = item.fixQueue || item;
      return source.shouldFix || (source.findings || []).filter((finding) => finding.level === "warn");
    }),
  ];
  return {
    ok: true,
    data: {
      status: mustFix.length ? "needs-fix" : shouldFix.length ? "needs-review" : "pass",
      mustFix,
      shouldFix,
      audit: validation.audit?.counts || validation.audit || validation.counts || {},
      visual: { score: null, method: "unavailable" },
      lastVerifiedAt: new Date().toISOString(),
    },
    artifacts: [
      ...schedulerArtifacts,
      ...results.flatMap((item) => item.artifacts || []),
    ],
  };
}

export const verifyStage = executeVerify;

export function executeNonIoStage(state) {
  return { ok: true, data: { stage: state?.stage || null, skipped: true } };
}

export function buildImagePrompt(state) {
  const mode = normalizeWorkflowMode(state.task.intent, { hasReference: Boolean(state.task.reference) });
  if (mode === "redesign") {
    return `${state.task.prompt}\n\nReference: ${state.task.reference}\nCreate a new full-frame UI design inspired by the reference's visual language, while following the requested product/content changes. This effect image becomes the design source of truth. Avoid readable final UI text where possible.`;
  }
  return `${state.task.prompt}\n\nCreate a complete full-frame UI concept from the description. This effect image becomes the design source of truth. Avoid readable final UI text where possible.`;
}

export function buildImplementRequest(state, target = state.task.target) {
  const source = implementationSource(state);
  return {
    stage: "implement",
    access: "write",
    target,
    task: state.task,
    workflowMode: source.mode,
    prompt: [
      state.task.prompt,
      "",
      `Workflow mode: ${source.mode}`,
      `Original reference: ${state.task.reference || "none"}`,
      `${source.kind === "reference" ? "Reference source" : "Approved effect image"}: ${source.path || "none"}`,
      source.instruction,
      source.mode === "recreate"
        ? "Preserve the original composition, hierarchy, spacing, typography, component geometry, imagery, and interaction structure as faithfully as possible. Do not redesign the reference."
        : "Implement the approved design faithfully with real code-rendered text, controls, states, and interactions.",
      "Keep the result clickable and editable; never ship a flattened effect image as the UI.",
    ].join("\n"),
    policy: state.policy,
    artifacts: state.artifacts,
  };
}

export function buildFixRequest(state, target = state.task.target) {
  const source = implementationSource(state);
  return {
    stage: "fix",
    access: "write",
    target,
    task: state.task,
    findings: state.verification.mustFix,
    artifacts: state.artifacts,
    workflowMode: source.mode,
    prompt: [
      state.task.prompt,
      "",
      `Workflow mode: ${source.mode}`,
      `Verification source: ${source.path || "none"}`,
      source.instruction,
      "Fix every Must Fix finding:",
      ...state.verification.mustFix.map((finding) => `${finding.rule}: ${finding.message}`),
    ].join("\n"),
  };
}

async function probeRequiredCapabilities({ state, tools, signal, operation }) {
  if (typeof tools?.probe !== "function") return;
  const required = ["agent.execute", "ui.validate"];
  if (state.policy?.requireEffectImage) required.push("image.generate");
  for (const name of required) {
    if (!has(tools, name)) throw blocked("capability-unavailable", `Required Runtime tool is unavailable: ${name}`);
    const result = await tools.probe(name, { state, signal, timeoutMs: operation?.timeoutMs });
    if (result?.available === false) {
      const code = name === "image.generate" ? "effect-image-required" : "capability-unavailable";
      throw blocked(code, result.reason || `Required Runtime capability is unavailable: ${name}`);
    }
  }
}

function validatePreflightResult(state, result) {
  const data = unwrap(result);
  const browserOnly = state.runtime?.noBrowser
    && data.checks?.browser?.ready === false
    && Object.entries(data.checks)
      .filter(([key]) => key !== "browser")
      .every(([, check]) => check.nodeOk !== false && check.pythonOk !== false && check.ready !== false && check.writable !== false);
  if (data.status && !["ready", "ok"].includes(data.status) && !browserOnly) {
    throw blocked("capability-unavailable", "Runtime preflight capabilities are not ready");
  }
}

function effectArtifact(state) {
  return Object.values(state.artifacts || {}).find((artifact) => artifact?.kind === "effect-image" && artifact?.path);
}

function has(tools, name) {
  try { return Boolean(name && tools && (tools.has ? tools.has(name) : tools.get(name))); } catch { return false; }
}

function unwrap(result) {
  return result?.ok === true ? result.data || {} : result || {};
}

function normalize(result) {
  return result && typeof result.ok === "boolean" ? result : { ok: true, data: result || {} };
}

function blocked(code, message) {
  const error = new Error(message);
  error.code = code;
  error.blocked = true;
  error.retryable = true;
  return error;
}

export default executeStage;
