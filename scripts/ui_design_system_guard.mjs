import fs from "node:fs";
import path from "node:path";

const REQUIRED_TOKEN_CATEGORIES = new Set(["color", "typography", "spacing", "radius"]);
const IOS_REQUIRED_SKELETON = ["IOSScreenRoot", "IOSSafeArea", "IOSStatusBar", "IOSHomeIndicator"];
const STANDARD_COMPONENT_ROLES = new Set([
  "screen-root", "safe-area", "status-bar", "dynamic-island", "home-indicator", "nav-bar", "bottom-nav",
  "tab-bar", "primary-button", "secondary-button", "search-bar", "filter-chip", "segmented-control", "card",
  "media-card", "list-row", "avatar", "badge", "toggle", "sheet-handle", "modal", "progress", "page-dots",
]);
const STANDARD_FUNCTIONAL_ICONS = new Set([
  "back", "search", "close", "heart", "wishlist", "share", "profile", "home", "settings", "menu", "filter",
  "play", "pause", "next", "ticket", "calendar", "location", "person", "artists", "events",
]);

export function runDesignSystemGuard({ rootDir, workflowMode = null } = {}) {
  if (!rootDir) return [];
  const planFile = findPlan(rootDir, "design-system-plan.json");
  if (!planFile) {
    const visualPlan = findPlan(rootDir, "visual-role-plan.json");
    if (!visualPlan) return [];
    const level = workflowMode ? "fail" : "warn";
    return [finding(level, "design-system-plan-missing", "A UI run must resolve design system, tokens, shared components, icon system and reuse policy before implementation. Legacy artifacts without design-system-plan.json are tolerated only as warnings.", visualPlan)];
  }

  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  } catch (error) {
    return [fail("design-system-plan-invalid-json", `Could not parse design-system-plan.json: ${error.message}`, planFile)];
  }
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return [fail("design-system-plan-invalid", "design-system-plan.json must be an object.", planFile)];

  const findings = [];
  validateSelection(plan, planFile, findings);
  validateTokens(plan, planFile, findings);
  validateReusePolicy(plan, planFile, findings);
  validateIOSDefaults(plan, planFile, findings);
  validateComponents(plan, planFile, findings);
  validateIcons(plan, planFile, findings);
  return findings;
}

function validateSelection(plan, file, findings) {
  const selection = plan.selection;
  if (!selection || typeof selection !== "object") {
    findings.push(fail("design-system-selection-required", "Select a primary design system before decomposing screens or drawing components.", file));
    return;
  }
  if (!nonEmpty(selection.primarySystem) || !nonEmpty(selection.reason)) {
    findings.push(fail("design-system-selection-required", "selection.primarySystem and selection.reason are required.", file));
    return;
  }
  if (selection.allowMixedSystems === true && !nonEmpty(selection.mixedSystemReason)) {
    findings.push(fail("mixed-design-system-without-reason", "Mixing design systems requires a concrete reference/project-backed reason.", file));
  }

  if (["product-default", "fallback-default"].includes(selection.reason)) {
    const expected = defaultSystem(plan.platformIntent, plan.productClass);
    if (expected && selection.primarySystem !== expected) {
      findings.push(fail("design-system-default-mismatch", `Default selection for platform=${plan.platformIntent} productClass=${plan.productClass} must resolve to ${expected}, not ${selection.primarySystem}.`, file));
    }
  }
}

function validateTokens(plan, file, findings) {
  const tokens = plan.tokens;
  if (!tokens || !Array.isArray(tokens.categories)) {
    findings.push(fail("design-token-contract-required", "Extract shared design tokens before per-screen implementation.", file));
    return;
  }
  const categories = new Set(tokens.categories);
  const missing = [...REQUIRED_TOKEN_CATEGORIES].filter((item) => !categories.has(item));
  if (missing.length) findings.push(fail("design-token-contract-required", `Shared token contract is missing: ${missing.join(", ")}.`, file));
}

function validateReusePolicy(plan, file, findings) {
  const reuse = plan.reusePolicy;
  if (!reuse || reuse.reuseBeforeCustomDraw !== true || reuse.customDrawOnlyWhenMissing !== true || reuse.sharedComponentDriftForbidden !== true) {
    findings.push(fail("reuse-before-custom-draw", "Reuse policy must require existing components before custom drawing and forbid shared-component drift.", file));
  }
  const expected = ["design-system", "platform", "project-shared", "compatible-library", "custom-draw"];
  if (!sameArray(reuse?.componentFallbackOrder, expected)) {
    findings.push(fail("reuse-before-custom-draw", `Component fallback order must be ${expected.join(" -> ")}.`, file));
  }
}

function validateIOSDefaults(plan, file, findings) {
  if (plan.selection?.primarySystem !== "ios-hig") return;
  const skeleton = plan.iosSkeleton;
  if (!skeleton || skeleton.enabled !== true || skeleton.systemChromeShared !== true || !Array.isArray(skeleton.components)) {
    findings.push(fail("ios-skeleton-required", "iOS HIG runs must enable the shared iOS component skeleton and shared system chrome.", file));
    return;
  }
  for (const component of IOS_REQUIRED_SKELETON) {
    if (!skeleton.components.includes(component)) findings.push(fail("ios-skeleton-required", `Default iOS skeleton is missing ${component}.`, file));
  }
  if (plan.iconPolicy?.primaryIconSystem !== "sf-symbols") {
    findings.push(fail("ios-icon-system-default-mismatch", "iOS HIG defaults to SF Symbols semantics. Use another primary icon system only by selecting a different explicit/project design system.", file));
  }
}

function validateComponents(plan, file, findings) {
  if (!Array.isArray(plan.components)) {
    findings.push(fail("component-registry-required", "design-system-plan.json requires a component registry.", file));
    return;
  }
  const reuseKeys = new Map();
  for (const component of plan.components) {
    const id = nonEmpty(component?.id) ? component.id : "<missing-id>";
    if (!component || typeof component !== "object") continue;
    if (!nonEmpty(component.reuseKey) || !nonEmpty(component.semanticRole) || !nonEmpty(component.source)) continue;

    if (component.source === "custom") {
      if (component.lookupStatus !== "missing") {
        findings.push(fail("custom-draw-without-library-miss", `Component ${id} is custom-drawn even though lookupStatus is not missing. Existing components must win.`, file));
      }
      if (!nonEmpty(component.customReason)) {
        findings.push(fail("custom-draw-without-justification", `Custom component ${id} requires a recorded customReason.`, file));
      }
      if (STANDARD_COMPONENT_ROLES.has(component.semanticRole) && component.customReason !== "library-missing") {
        findings.push(fail("existing-component-required", `Standard component ${id} (${component.semanticRole}) may be custom-drawn only after all reusable sources are missing; use customReason=library-missing.`, file));
      }
    } else if (!nonEmpty(component.componentRef)) {
      findings.push(fail("existing-component-required", `Reusable component ${id} must name the actual componentRef it will call.`, file));
    }

    if (Array.isArray(component.instances) && component.instances.length > 1 && component.shared !== true) {
      findings.push(fail("shared-component-reuse-required", `Component ${id} appears in ${component.instances.length} instances but is not marked shared. Repeated screens must call one component family with variants.`, file));
    }

    if (component.source === "design-system" && nonEmpty(component.systemRef) && plan.selection?.allowMixedSystems !== true && component.systemRef !== plan.selection?.primarySystem) {
      findings.push(fail("mixed-design-system-without-reason", `Component ${id} comes from ${component.systemRef} while primarySystem=${plan.selection?.primarySystem}.`, file));
    }

    const prior = reuseKeys.get(component.reuseKey);
    const signature = `${component.source}|${component.systemRef || ""}|${component.componentRef || "custom"}`;
    if (prior && prior !== signature) {
      findings.push(fail("shared-component-drift", `reuseKey=${component.reuseKey} resolves to multiple component families. Put visual differences into variants instead of duplicating the component.`, file));
    } else {
      reuseKeys.set(component.reuseKey, signature);
    }
  }
}

function validateIcons(plan, file, findings) {
  const policy = plan.iconPolicy;
  const expectedFallback = ["design-system-icons", "platform-icons", "project-icon-registry", "compatible-library", "custom-draw"];
  if (!policy || !nonEmpty(policy.primaryIconSystem) || policy.functionalIconsMustUseLibrary !== true || !sameArray(policy.fallbackOrder, expectedFallback)) {
    findings.push(fail("icon-system-required", "Resolve icons through the selected design/platform/project libraries before custom drawing.", file));
  }
  if (!Array.isArray(plan.icons)) return;

  for (const icon of plan.icons) {
    const id = nonEmpty(icon?.id) ? icon.id : "<missing-id>";
    if (!icon || typeof icon !== "object") continue;
    if (icon.referencePresence === "absent") {
      findings.push(fail("reference-unrequested-icon", `Icon ${id} is absent from the reference and must not be added as decorative/functional chrome.`, file));
    }
    if (icon.source === "custom") {
      if (icon.lookupStatus !== "missing") findings.push(fail("custom-draw-without-library-miss", `Icon ${id} is custom even though an existing icon lookup did not fail.`, file));
      if (!nonEmpty(icon.customReason)) findings.push(fail("custom-draw-without-justification", `Custom icon ${id} requires customReason.`, file));
      if (icon.functional === true && icon.customReason !== "library-missing") {
        findings.push(fail("functional-icon-library-required", `Functional icon ${id} must use the icon system/library unless every lookup source is missing.`, file));
      }
    } else if (!nonEmpty(icon.iconRef)) {
      findings.push(fail("functional-icon-library-required", `Icon ${id} must name the library/system iconRef it resolves to.`, file));
    }
    if (icon.functional === true && STANDARD_FUNCTIONAL_ICONS.has(icon.semanticRole) && icon.source === "custom" && icon.lookupStatus !== "missing") {
      findings.push(fail("functional-icon-library-required", `Standard functional icon ${icon.semanticRole} must come from the selected icon system or fallback library.`, file));
    }
  }
}

function defaultSystem(platform, productClass) {
  if (platform === "android" && ["mobile-app", "device-mockup"].includes(productClass)) return "material-3";
  if (platform === "ios" && ["mobile-app", "device-mockup"].includes(productClass)) return "ios-hig";
  if (productClass === "mobile-app") return "ios-hig";
  if (productClass === "dashboard") return "ant-design";
  if (productClass === "web-app") return "shadcn-radix";
  return null;
}

function findPlan(rootDir, name) {
  const candidates = [path.join(rootDir, name), path.join(rootDir, "artifacts", name)].filter((file) => fs.existsSync(file));
  const runRoot = path.join(rootDir, ".image2-ui", "runs");
  if (fs.existsSync(runRoot)) candidates.push(...findNamedFiles(runRoot, name));
  candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return candidates[0] || null;
}

function findNamedFiles(root, name) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name === name) out.push(full);
    }
  }
  return out;
}

function sameArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}
function nonEmpty(value) { return typeof value === "string" && value.trim().length > 0; }
function finding(level, rule, message, file) { return { level, rule, message, file }; }
function fail(rule, message, file) { return finding("fail", rule, message, file); }
