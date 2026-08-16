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
    outputs: ["ui-audit.md", "code-ui-inventory.md", "visual-role-plan.json", "image2-assets.md", "visual-risks.md"],
    prompt: "Inspect the workflow source of truth and repository. Split every meaningful visible unit into a visual role before implementation: code-ui, graphic-primitive, background-plate, cutout-subject, inline-photo, or generated-clean. Also classify its text/image relationship as none, side-by-side, safe-overlap, masked-overlay, cutout-layered, or card-overlay. Write visual-role-plan.json with explicit renderer, placement, z-order, text-safe zones, subject-critical zones, safe-area contract, and semantic priority where applicable. Treat lines, dividers, dots, flat blocks and other simple placeholders as code/graphic primitives, not image2 assets. In Recreate, screenshot pixels are visual evidence only: identify/select referenceRegion for semantic imagery and describe what image2 must generate/edit. A freeform subject whose silhouette participates in the composition is a cutout-subject; a bounded card/media photo is inline-photo; a scene whose background matters is background-plate. One image2 job must represent one clean asset, never a full UI screenshot later mined for crops. Flag code-owned text/UI inside visual regions, missing visible controls, unsafe text/image overlap, subject-critical occlusion, stacking/safe-area risks, and major layout/proportion risks. Do not edit application source files.",
  }),
  "asset-engineer": Object.freeze({
    phase: "discovery",
    deps: [],
    outputs: ["asset-plan.json", "asset-manifest.json", "image2-prompts.md", "asset-provenance.md"],
    prompt: "Consume visual-role-plan.json and create asset-plan.json before implementation. Execute only the assets whose role requires image2/project imagery. code-ui and graphic-primitive roles remain code-rendered. In Recreate, any semantic bitmap visible only inside the screenshot MUST be regenerated through the project-designated image2 generate/edit path; source=reference is forbidden. Use referenceRegion only as visual guidance, set referenceRole=visual-guide-only, record image2Action and image2Prompt, call image2 once per clean standalone asset, and preserve provenance. Never ask image2 to generate the whole UI and then crop animals/products/backgrounds out of that UI. For cutout-subject, generate the subject independently and perform background removal so the final PNG/WebP has real transparency. background-plate keeps its intended scene/background; inline-photo remains container-bound. A legitimate existing project asset may use source=project. Generated assets must exclude code-owned text, buttons, status/nav chrome, cards, labels and functional icons. Local Pillow/Canvas work is post-processing only after image2 output exists. Produce local paths, alt text, crop/placement strategy, prompts and provenance. Do not edit application source files.",
  }),
  "ui-architect": Object.freeze({
    phase: "architecture",
    deps: ["visual-analyst"],
    outputs: ["ui-architecture.md"],
    prompt: "Define route and feature boundaries, component APIs, design tokens, i18n structure, responsive strategy, test surface, and the layout/layering contract needed by visual-role-plan.json. Preserve the reference composition and major region proportions in Recreate. Do not turn a cutout-layered composition into a rectangular side-by-side photo merely because it is easier to code. Preserve declared text-safe zones, subject-critical zones, masks, z-order, persistent-control safe areas, and overlay mode. Do not compensate for missing/inaccurate image2 assets by redesigning the layout. Do not implement application code.",
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
    prompt: "Implement the production-shaped UI in the existing project conventions. Treat visual-role-plan.json as the placement/layering contract and asset-plan.json as the bitmap/provenance contract. code-ui and graphic-primitive roles are rendered with code/SVG/CSS. background-plate assets stay backgrounds; cutout-subject assets use transparent layered placement; inline-photo stays inside its media/card container. Respect overlay mode, explicit z-order, text-safe zones, subject-critical zones, readability masks, semantic priority and safe-area rules. Do not improvise text on top of high-detail imagery when the plan says side-by-side. Do not let imagery/device frames cover CTA, bottom navigation, status chrome or other persistent controls. In Recreate, do not use screenshot/reference crops as frontend imagery; only consume provenance-tracked source=image2 assets or legitimate source=project assets. Code owns semantic text, controls and functional icons. Preserve reference proportions and visible controls. Include responsive and interaction states. Do not commit or push.",
  }),
  "code-reviewer": Object.freeze({
    phase: "review",
    deps: ["ui-implementer"],
    outputs: ["code-review-report.md"],
    prompt: "Review the implementation as a senior code reviewer. Check correctness, regressions, security, maintainability, standards, scope compliance, missing tests, unresolved production risks, untracked raster assets and ad-hoc icons. Check visual-role-plan.json against implementation: graphic primitives must not be image2 assets; semantic raster role/renderer/placement must match; cutouts need real transparency and layered placement; inline photos must remain container-bound; image2 generationScope must be asset-only rather than a full UI composition; overlapping layers need explicit z-order; safe-overlap needs textSafeZones; masked-overlay needs a readability mask; subject-critical zones must not be covered without reference-backed justification; persistent controls must stay inside safe areas and above device/frame imagery. In Recreate, final non-project semantic raster assets must be source=image2 with provenance; source=reference is blocking. Report findings first. Do not edit source files.",
  }),
  accessibility: Object.freeze({
    phase: "verification",
    deps: ["ui-implementer", "state-machine", "code-reviewer"],
    outputs: ["accessibility-report.md"],
    prompt: "Audit keyboard flow, focus, accessible names, ARIA, contrast, reduced motion, touch targets, and screen-reader semantics. Also check that image/text overlays preserve readable contrast and that functional controls are not visually or interactively obscured by imagery, masks, or device decoration. Do not silently edit source files.",
  }),
  "qa-auditor": Object.freeze({
    phase: "verification",
    deps: ["ui-implementer", "accessibility", "code-reviewer"],
    outputs: ["qa-report.md", "qa-findings.json"],
    prompt: "Run appropriate build, tests, browser checks, asset checks, and visual comparison against the workflow source of truth. Validate visual-role-plan.json and visually verify the rendered result. In Recreate, explicitly inspect for: recreate-reference-raster-forbidden, image2-provenance-required, placeholder-renderer-violation, asset-role-renderer-mismatch, cutout-transparency-required, cutout-overlay-required, overlay-safe-zone-required, overlay-mask-required, overlay-z-order-required, subject-critical-overlap, bitmap-code-content, full-ui-image2-generation, safe-area-overlap, stacking-order-violation, asset-text-contamination, duplicate-semantic-content, asset-kind-mismatch, reference-element-missing, and layout-ratio-drift. A cutout must visually behave as a cutout rather than a rectangular image. Text must stay in declared safe zones or use the specified mask; do not accept text covering faces/eyes/product focal points merely because the DOM does not technically overlap. Persistent CTA/nav/status content must remain above imagery and inside safe areas. These are Must Fix when materially visible or contract-breaking. Also check icon-family consistency and asset provenance. Write qa-report.md and machine-readable qa-findings.json with exactly {\"mustFix\":[{\"rule\":\"...\",\"message\":\"...\",\"location\":\"optional\"}],\"shouldFix\":[...]} so Runtime can merge findings into Verify/Fix. Do not silently edit implementation files.",
  }),
  release: Object.freeze({
    phase: "release",
    deps: ["qa-auditor", "accessibility", "code-reviewer"],
    outputs: ["release-report.md"],
    prompt: "Review Runtime and scheduler artifacts, git status, validation evidence, changed files, visual-role-plan.json, asset-plan.json and known risks. Do not release Recreate work that ships screenshot/reference pixels as imagery, lacks required image2 provenance, generates full UI screenshots to mine for assets, misclassifies graphic primitives/cutouts/backgrounds/inline photos, leaves unsafe text/image overlap, covers subject-critical zones without reference-backed justification, or has safe-area/stacking-order violations. Also block unresolved asset-text-contamination, duplicate-semantic-content, missing reference controls, or major layout-ratio-drift findings. Produce a release handoff. Do not commit or push.",
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
