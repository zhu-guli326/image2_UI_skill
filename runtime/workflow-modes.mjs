export const WORKFLOW_MODES = Object.freeze({
  RECREATE: "recreate",
  REDESIGN: "redesign",
  CREATE: "create",
});

export const WORKFLOW_MODE_VALUES = Object.freeze(Object.values(WORKFLOW_MODES));

const LEGACY_MODE_ALIASES = Object.freeze({
  "reference-recreation": WORKFLOW_MODES.RECREATE,
  optimize: WORKFLOW_MODES.REDESIGN,
});

export function normalizeWorkflowMode(value, { hasReference = false } = {}) {
  if (!value) return hasReference ? WORKFLOW_MODES.RECREATE : WORKFLOW_MODES.CREATE;
  const normalized = LEGACY_MODE_ALIASES[value] || value;
  if (!WORKFLOW_MODE_VALUES.includes(normalized)) {
    throw new Error(`Unknown workflow mode: ${value}. Expected recreate, redesign, or create.`);
  }
  return normalized;
}

export function assertWorkflowInputs(mode, { reference = null } = {}) {
  if ([WORKFLOW_MODES.RECREATE, WORKFLOW_MODES.REDESIGN].includes(mode) && !reference) {
    throw new Error(`${mode} mode requires --reference`);
  }
}

export function workflowPolicy(mode, {
  noEffect = false,
  requireEffectReview = false,
} = {}) {
  const effectByDefault = [WORKFLOW_MODES.REDESIGN, WORKFLOW_MODES.CREATE].includes(mode);
  const requireEffectImage = effectByDefault && !noEffect;
  return {
    requireEffectImage,
    requireEffectReview: requireEffectImage && requireEffectReview,
  };
}

export function implementationSource(state) {
  const mode = normalizeWorkflowMode(state?.task?.intent, { hasReference: Boolean(state?.task?.reference) });
  if (mode === WORKFLOW_MODES.RECREATE) {
    return {
      mode,
      kind: "reference",
      path: state?.task?.reference || null,
      instruction: "Use the original reference as the implementation source of truth.",
    };
  }

  const effect = Object.values(state?.artifacts || {}).find(
    (artifact) => artifact?.kind === "effect-image" && artifact?.path,
  );
  return {
    mode,
    kind: "effect-image",
    path: effect?.path || null,
    instruction: "Use the approved effect image as the implementation source of truth.",
  };
}

export function verificationReference(state) {
  return implementationSource(state).path || state?.task?.reference || null;
}
