export const SCHEDULER_PHASES = Object.freeze([
  "discovery",
  "architecture",
  "implementation",
  "review",
  "verification",
  "release",
]);

export const AGENT_ROLES = Object.freeze({
  "visual-analyst": Object.freeze({
    phase: "discovery",
    deps: [],
    outputs: ["ui-audit.md", "code-ui-inventory.md", "image2-assets.md", "visual-risks.md"],
    prompt: "Inspect the workflow source of truth and repository. Split code-rendered UI from bitmap/image2 assets, identify visual risks, and do not edit application source files.",
  }),
  "asset-engineer": Object.freeze({
    phase: "discovery",
    deps: [],
    outputs: ["asset-manifest.json", "image2-prompts.md", "asset-provenance.md"],
    prompt: "Create or verify the image2 asset manifest, prompts, local asset paths, alt text, crop strategy, and provenance. Do not edit application source files.",
  }),
  "ui-architect": Object.freeze({
    phase: "architecture",
    deps: ["visual-analyst"],
    outputs: ["ui-architecture.md"],
    prompt: "Define route and feature boundaries, component APIs, design tokens, i18n structure, responsive strategy, and test surface. Do not implement application code.",
  }),
  "backend-contract": Object.freeze({
    phase: "architecture",
    deps: ["visual-analyst"],
    outputs: ["backend-contract.md"],
    prompt: "Define request/response schemas, error envelopes, permissions, mock-data boundaries, caching, retries, and cancellation only when the task needs them. Do not implement application code.",
  }),
  "state-machine": Object.freeze({
    phase: "architecture",
    deps: ["ui-architect", "backend-contract"],
    outputs: ["state-machine.md"],
    prompt: "Define product UI state transitions, loading, empty, error, offline, disabled, retry, optimistic-update, and rollback behavior. This models the generated product, not the Harness Runtime itself.",
  }),
  "ui-implementer": Object.freeze({
    phase: "implementation",
    deps: ["ui-architect", "backend-contract", "state-machine", "asset-engineer", "visual-analyst"],
    outputs: ["implementation-notes.md"],
    prompt: "Implement the production-shaped UI in the existing project conventions. Respect the workflow source of truth, wire local assets, and include responsive and interaction states. Do not commit or push.",
  }),
  "code-reviewer": Object.freeze({
    phase: "review",
    deps: ["ui-implementer"],
    outputs: ["code-review-report.md"],
    prompt: "Review the implementation as a senior code reviewer. Check correctness, regressions, security, maintainability, standards, scope compliance, missing tests, and unresolved production risks. Report findings first. Do not edit source files.",
  }),
  accessibility: Object.freeze({
    phase: "verification",
    deps: ["ui-implementer", "state-machine", "code-reviewer"],
    outputs: ["accessibility-report.md"],
    prompt: "Audit keyboard flow, focus, accessible names, ARIA, contrast, reduced motion, touch targets, and screen-reader semantics. Do not silently edit source files.",
  }),
  "qa-auditor": Object.freeze({
    phase: "verification",
    deps: ["ui-implementer", "accessibility", "code-reviewer"],
    outputs: ["qa-report.md", "qa-findings.json"],
    prompt: "Run appropriate build, tests, browser checks, asset checks, and visual comparison. Write qa-report.md and a machine-readable qa-findings.json with exactly {\"mustFix\":[{\"rule\":\"...\",\"message\":\"...\",\"location\":\"optional\"}],\"shouldFix\":[...]} so Runtime can merge the findings into its Verify/Fix loop. Do not silently edit implementation files.",
  }),
  release: Object.freeze({
    phase: "release",
    deps: ["qa-auditor", "accessibility", "code-reviewer"],
    outputs: ["release-report.md"],
    prompt: "Review Runtime and scheduler artifacts, git status, validation evidence, changed files, and known risks. Produce a release handoff. Do not commit or push.",
  }),
});

export const AGENT_ROLE_ORDER = Object.freeze(Object.keys(AGENT_ROLES));

export const AGENT_TIERS = Object.freeze({
  simple: Object.freeze([
    "visual-analyst",
    "ui-implementer",
    "qa-auditor",
    "release",
  ]),
  medium: Object.freeze([
    "visual-analyst",
    "asset-engineer",
    "ui-architect",
    "ui-implementer",
    "code-reviewer",
    "accessibility",
    "qa-auditor",
    "release",
  ]),
  complex: AGENT_ROLE_ORDER,
});

export function rolesForTier(tier = "medium") {
  const roles = AGENT_TIERS[tier];
  if (!roles) throw new Error(`Unknown agent tier: ${tier}. Expected simple, medium, or complex.`);
  return [...roles];
}

export function roleSpec(role) {
  const spec = AGENT_ROLES[role];
  if (!spec) throw new Error(`Unknown agent role: ${role}`);
  return spec;
}

export function phaseIndex(phase) {
  const index = SCHEDULER_PHASES.indexOf(phase);
  if (index < 0) throw new Error(`Unknown scheduler phase: ${phase}`);
  return index;
}
