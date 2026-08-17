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
    outputs: ["design-system-plan.json", "ui-audit.md", "code-ui-inventory.md", "visual-role-plan.json", "image2-assets.md", "visual-risks.md"],
    prompt: "Before screen-by-screen decomposition, produce design-system-plan.json. Resolve the primary Design System from explicit user/project choice, reference/platform evidence, product-class default, then fallback. Defaults: iOS/mobile or iPhone mockup -> ios-hig; Android mobile -> material-3; dashboard -> ant-design; general web app -> shadcn-radix. Extract shared color/typography/spacing/radius tokens; build one component registry for repeated semantic UI; build one icon registry with the chosen icon system. For ios-hig, enable the shared iOS skeleton (IOSScreenRoot, IOSSafeArea, IOSStatusBar, IOSHomeIndicator plus detected navigation/components) and use SF Symbols semantics by default. Repeated status bars, Dynamic Islands, Home Indicators, bottom navigation, CTA/button families, chips, cards and other shared UI must be one component family with variants, not independently redrawn copies. Resolve components in order design-system -> platform -> project-shared -> compatible-library -> custom-draw. Resolve icons in order design-system-icons -> platform-icons -> project-icon-registry -> compatible-library -> custom-draw. Custom drawing is allowed only after lookupStatus=missing and must record a reason; standard functional icons/components normally require customReason=library-missing. Never add a functional icon the reference marks absent. Do not mix design systems without a reference/project-backed reason. After that, split every visible unit into visual roles: code-ui, graphic-primitive, background-plate, cutout-subject, inline-photo, or generated-clean. Before image2, decide whether semantic imagery needs a freeform silhouette; cutout-subject may use transparent/native-alpha or solid/green extraction, while background plates and inline photos remain complete scenes/frames. If text must flow/overlap around a person/animal/product silhouette, use a cutout rather than a rectangular media box. Write visual-role-plan.json with overlay, z-order, protected zones, cropPolicy, compositionPolicy and screenSafeArea where relevant. Preserve reference density; do not trade crop safety for large dead space. For device mockups measure safe content/system zones. Screenshot pixels are visual evidence only; one image2 job produces one clean semantic asset, never a whole UI mined for crops. Do not edit application source files.",
  }),
  "asset-engineer": Object.freeze({
    phase: "discovery",
    deps: [],
    outputs: ["asset-plan.json", "asset-manifest.json", "image2-prompts.md", "asset-provenance.md"],
    prompt: "Consume design-system-plan.json and visual-role-plan.json. Do not use image2 for standard components or functional icons that belong to the selected Design System/component/icon registry. Execute only semantic assets whose role requires image2/project imagery. Respect the pre-generation background strategy: cutout-subject must end as a real transparent silhouette; background-plate and inline-photo stay full-scene/full-frame. In Recreate, screenshot pixels are guidance only and source=reference is forbidden. Record image2Action, prompt and provenance. Never generate a whole UI screenshot then crop assets from it. Primary hero assets must satisfy cropPolicy, protected focal zones, bleed, CTA/title safe space and composition density. Regenerate/extend/recompose if too tight or too sparse. Generated assets must exclude code-owned text, buttons, status/nav chrome, cards, labels and functional icons. Local image processing is post-processing only after image2/project output exists. Do not edit application source files.",
  }),
  "ui-architect": Object.freeze({
    phase: "architecture",
    deps: ["visual-analyst"],
    outputs: ["ui-architecture.md"],
    prompt: "Consume design-system-plan.json before defining screen components. Turn the shared component registry and tokens into component APIs/variants; do not recreate a matched Design System component per screen. Preserve the selected primary system and forbid mixed systems unless design-system-plan explicitly allows them. Standard UI and functional icons must resolve through componentRef/iconRef; custom drawing is permitted only for lookupStatus=missing entries with justification. Preserve shared system chrome and reuse keys across screens. Then define route/feature boundaries, responsive strategy and visual-role layering. Preserve reference proportions, information density, text-safe/subject-critical/control zones, cropPolicy, compositionPolicy and screenSafeArea. Treat screen bounds and safe content bounds separately. Do not compensate for missing assets by redesigning or blind object-fit cropping. Do not implement application code.",
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
    prompt: "Implement the production-shaped UI from design-system-plan.json, visual-role-plan.json and asset-plan.json. Call matched shared components via componentRef and matched icons via iconRef; do not redraw them locally. Repeated reuseKey instances use one component implementation plus declared variants/tokens. For ios-hig use the shared iOS skeleton and SF Symbols semantics by default; do not hand-build three different status bars or Home Indicators for three iPhone screens. If a standard component/icon is marked matched, custom implementation is blocking. Custom draw only when lookupStatus=missing with a recorded reason. Do not add icons that the reference marks absent. Code/SVG/CSS owns code-ui and graphic primitives; image2/project owns semantic imagery. Cutouts use final transparent freeform silhouettes; background plates remain complete scenes. Respect z-order, masks, protected zones, cropPolicy, compositionPolicy and screenSafeArea. Backgrounds may bleed to screen bounds while critical controls remain safe. Preserve reference density and visible controls. Do not use screenshot crops as frontend imagery. Do not commit or push.",
  }),
  "code-reviewer": Object.freeze({
    phase: "review",
    deps: ["ui-implementer"],
    outputs: ["code-review-report.md"],
    prompt: "Review implementation against design-system-plan.json, visual-role-plan.json and asset-plan.json. Check design-system-selection-required, design-system-default-mismatch, mixed-design-system-without-reason, design-token-contract-required, reuse-before-custom-draw, existing-component-required, custom-draw-without-library-miss, custom-draw-without-justification, ios-skeleton-required, ios-system-chrome-must-be-shared, shared-component-reuse-required, shared-component-drift, icon-system-required, ios-icon-system-default-mismatch, functional-icon-library-required and reference-unrequested-icon. Verify repeated status/nav/button/card/chip families call one component with variants rather than near-duplicate code. Then check raster provenance, visual roles, cutout transparency, image2 generation scope, overlay safety, hero crop/density and screen safe areas. In Recreate source=reference semantic raster is blocking. Report findings first. Do not edit source files.",
  }),
  accessibility: Object.freeze({
    phase: "verification",
    deps: ["ui-implementer", "state-machine", "code-reviewer"],
    outputs: ["accessibility-report.md"],
    prompt: "Audit keyboard flow, focus, accessible names, ARIA, contrast, reduced motion, touch targets, and screen-reader semantics. Shared component variants must retain consistent semantics. Check that overlays and device/system zones do not obscure functional controls. Do not silently edit source files.",
  }),
  "qa-auditor": Object.freeze({
    phase: "verification",
    deps: ["ui-implementer", "accessibility", "code-reviewer"],
    outputs: ["qa-report.md", "qa-findings.json"],
    prompt: "Run build, tests, browser checks, asset checks and visual comparison. First verify that the rendered screens visibly share the component DNA declared by design-system-plan.json: same reuseKey means same component geometry/family, with only declared variants changing. Inspect system chrome, bottom nav, CTA/button families, cards/chips and icons for drift. Block ad-hoc per-screen redraws, mixed Design Systems, custom components/icons that bypass an available library, and reference-unrequested icons. For iOS, status bar/Dynamic Island/Home Indicator/safe-area structure should read as one shared iOS skeleton and functional icon semantics should remain consistent with SF Symbols unless explicitly overridden. Also inspect image2/cutout strategy, freeform silhouettes, crop/bleed, subject-critical/CTA overlap, excessive whitespace, screen-safe-area/system chrome collisions, stacking, asset-text contamination, missing reference controls and layout-ratio drift. A technically valid contract does not excuse a visibly wrong render. Write qa-report.md and qa-findings.json as {\"mustFix\":[{\"rule\":\"...\",\"message\":\"...\",\"location\":\"optional\"}],\"shouldFix\":[...]}.",
  }),
  release: Object.freeze({
    phase: "release",
    deps: ["qa-auditor", "accessibility", "code-reviewer"],
    outputs: ["release-report.md"],
    prompt: "Review validation evidence and block release when design-system-plan is missing for a new run; defaults are wrong; systems are mixed without reason; standard components/icons were custom-drawn before library lookup failed; repeated components drift across screens; iOS skeleton/system chrome is duplicated inconsistently; an icon absent from the reference was added; or any existing asset/image2/crop/density/safe-area/provenance Must Fix remains unresolved. Produce a release handoff. Do not commit or push.",
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
