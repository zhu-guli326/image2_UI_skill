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
    prompt: "Inspect the workflow source of truth and repository. Split code-rendered UI from bitmap/image2 assets. In Recreate, screenshot pixels are visual evidence only: identify/select the referenceRegion for every photographic, product, person, animal, illustration, background, thumbnail, or cutout that is not already a legitimate project asset, classify the intended asset kind, and describe what image2 must generate/edit. Never propose a screenshot crop, cleaned crop, masked crop, or background-removed reference crop as the final implementation asset. Flag code-owned text/UI inside visual regions, missing visible controls, and major layout/proportion risks. Do not edit application source files.",
  }),
  "asset-engineer": Object.freeze({
    phase: "discovery",
    deps: [],
    outputs: ["asset-plan.json", "asset-manifest.json", "image2-prompts.md", "asset-provenance.md"],
    prompt: "Create asset-plan.json before implementation and execute the bitmap pipeline. In Recreate, any semantic bitmap visible only inside the screenshot MUST be regenerated through the project-designated image2 generate/edit path; source=reference is forbidden for final assets. Use the selected referenceRegion only as visual guidance, set referenceRole=visual-guide-only, record image2Action and image2Prompt, call image2, and preserve its provenance sidecar. A legitimate existing project asset may use source=project. Local Pillow/Canvas work is post-processing only after image2 output exists (resize/compress/format/background removal); it may not convert screenshot pixels into final semantic imagery. Generated assets must exclude code-owned text, buttons, status/nav chrome, labels, and functional icons. Produce local paths, alt text, crop/placement strategy, prompts, and provenance. Do not edit application source files.",
  }),
  "ui-architect": Object.freeze({
    phase: "architecture",
    deps: ["visual-analyst"],
    outputs: ["ui-architecture.md"],
    prompt: "Define route and feature boundaries, component APIs, design tokens, i18n structure, responsive strategy, and test surface. Preserve reference composition and major region proportions in Recreate; do not compensate for missing or inaccurate image2 assets by changing the layout. Do not implement application code.",
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
    prompt: "Implement the production-shaped UI in the existing project conventions. Respect the workflow source of truth and consume the prepared asset plan. In Recreate, do not use screenshot/reference crops as frontend imagery, even if they were cleaned or had backgrounds removed. Only consume provenance-tracked source=image2 assets or legitimate source=project assets. Code owns semantic text, buttons, status bars, navigation, controls, labels, and functional icons. Use generated background-plate assets as backgrounds, generated transparent cutouts as layered subjects, and generated inline photos only in their intended media slots. Preserve major reference region proportions and visible controls. Include responsive and interaction states. Do not commit or push.",
  }),
  "code-reviewer": Object.freeze({
    phase: "review",
    deps: ["ui-implementer"],
    outputs: ["code-review-report.md"],
    prompt: "Review the implementation as a senior code reviewer. Check correctness, regressions, security, maintainability, standards, scope compliance, missing tests, unresolved production risks, untracked raster assets, ad-hoc icons, and any screenshot/reference pixels shipped as implementation imagery. In Recreate, final non-project semantic raster assets must be source=image2 with provenance; source=reference is a blocking defect. Report findings first. Do not edit source files.",
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
    prompt: "Run appropriate build, tests, browser checks, asset checks, and visual comparison against the workflow source of truth. In Recreate, explicitly inspect for: recreate-reference-raster-forbidden (screenshot/reference pixels used directly as imagery), image2-provenance-required (screenshot-only semantic visuals not regenerated through image2), asset-text-contamination (code-owned text/UI inside generated bitmap assets), duplicate-semantic-content (same text in bitmap and DOM), asset-kind-mismatch (cutout/background/inline-photo implemented as the wrong asset type), reference-element-missing (visible controls omitted), and layout-ratio-drift (major hero/card/nav/media region proportions materially differ from the reference). These are Must Fix when they affect visible fidelity. Also check icon-family consistency and asset provenance. Write qa-report.md and a machine-readable qa-findings.json with exactly {\"mustFix\":[{\"rule\":\"...\",\"message\":\"...\",\"location\":\"optional\"}],\"shouldFix\":[...]} so Runtime can merge the findings into its Verify/Fix loop. Do not silently edit implementation files.",
  }),
  release: Object.freeze({
    phase: "release",
    deps: ["qa-auditor", "accessibility", "code-reviewer"],
    outputs: ["release-report.md"],
    prompt: "Review Runtime and scheduler artifacts, git status, validation evidence, changed files, and known risks. Do not release Recreate work that ships screenshot/reference pixels as imagery or lacks required image2 provenance. Also block unresolved asset-text-contamination, duplicate-semantic-content, asset-kind-mismatch, missing reference controls, or major layout-ratio-drift findings. Produce a release handoff. Do not commit or push.",
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
