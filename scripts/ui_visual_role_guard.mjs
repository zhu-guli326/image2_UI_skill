import fs from "node:fs";
import path from "node:path";

const ROLES = new Set(["code-ui", "graphic-primitive", "background-plate", "cutout-subject", "inline-photo", "generated-clean"]);
const RENDERERS = new Set(["code", "image2", "project"]);
const PLACEMENTS = new Set(["code", "background", "layered", "container"]);
const OVERLAYS = new Set(["none", "side-by-side", "safe-overlap", "masked-overlay", "cutout-layered", "card-overlay"]);
const MASKS = new Set(["none", "gradient", "solid-backplate", "blur"]);
const CODE_ROLES = new Set(["code-ui", "graphic-primitive"]);
const RASTER_ROLES = new Set(["background-plate", "cutout-subject", "inline-photo", "generated-clean"]);
const CUTOUT_BACKGROUNDS = new Set(["transparent", "solid-color", "green-screen"]);
const CUTOUT_KEYING = new Set(["native-alpha", "background-removal", "chroma-key"]);

const HERO_BLEED_MIN = Object.freeze({ top: 10, sides: 8, bottom: 12 });
const HERO_CRITICAL_CROP_MAX = 3;
const TIGHT_MAX_UNASSIGNED_WHITESPACE = 0.25;
const RECREATE_MAX_DENSITY_DRIFT_PERCENT = 15;

export function runVisualRoleGuard({ rootDir, workflowMode = null } = {}) {
  if (!rootDir) return [];
  const planFile = findVisualRolePlan(rootDir);
  if (!planFile) {
    const assetPlan = findNamedPlan(rootDir, "asset-plan.json");
    if (assetPlan && ["recreate", "redesign", "create"].includes(workflowMode)) {
      return [{
        level: "warn",
        rule: "visual-role-plan-missing",
        message: "An asset plan exists but visual-role-plan.json is missing. New UI runs should classify assetRole + overlayRole before implementation so image/text overlap decisions are explicit.",
        file: assetPlan,
      }];
    }
    return [];
  }

  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  } catch (error) {
    return [fail("visual-role-plan-invalid-json", `Could not parse ${path.relative(rootDir, planFile)}: ${error.message}`, planFile)];
  }

  const findings = [];
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    return [fail("visual-role-plan-invalid", "visual-role-plan.json must be a JSON object.", planFile)];
  }
  if (plan.version !== 1) findings.push(fail("visual-role-plan-version", "visual-role-plan.json must use version 1.", planFile));
  validateCompositionPolicy(plan, planFile, findings, workflowMode || plan.workflow);
  if (!Array.isArray(plan.elements) || plan.elements.length === 0) {
    findings.push(fail("visual-role-plan-elements", "visual-role-plan.json requires a non-empty elements array.", planFile));
    return findings;
  }

  const seen = new Set();
  for (const element of plan.elements) validateElement(element, planFile, findings, seen);
  return findings;
}

function validateCompositionPolicy(plan, planFile, findings, workflowMode) {
  const policy = plan.compositionPolicy;
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    if (workflowMode === "recreate") {
      findings.push(warn(
        "composition-policy-missing",
        "Recreate should declare compositionPolicy so whitespace and information density are matched to the reference instead of being improvised during implementation.",
        planFile,
      ));
    }
    return;
  }

  if (workflowMode === "recreate" && policy.preserveReferenceDensity !== true) {
    findings.push(fail(
      "composition-density-drift",
      "Recreate must preserve the reference information density. Do not turn a tight editorial composition into a sparse layout just to make image placement easier.",
      planFile,
    ));
  }

  if (policy.allowLargeEmptyRegions === true && !nonEmpty(policy.referenceBackedWhitespaceReason)) {
    findings.push(fail(
      "excessive-unreferenced-whitespace",
      "Large empty regions require an explicit reference-backed reason. Breathing room around a focal subject is not permission to create large unassigned blank areas.",
      planFile,
    ));
  }

  const whitespaceRatio = finiteNumber(policy.maxUnassignedWhitespaceRatio);
  if (policy.densityIntent === "tight" && (whitespaceRatio === null || whitespaceRatio > TIGHT_MAX_UNASSIGNED_WHITESPACE)) {
    findings.push(fail(
      "excessive-unreferenced-whitespace",
      `Tight compositions must cap unassigned whitespace at ${Math.round(TIGHT_MAX_UNASSIGNED_WHITESPACE * 100)}% or less. Keep local breathing room, but do not shrink content into a large empty canvas.`,
      planFile,
    ));
  }

  const densityDrift = finiteNumber(policy.maxDensityDriftPercent);
  if (workflowMode === "recreate" && densityDrift !== null && densityDrift > RECREATE_MAX_DENSITY_DRIFT_PERCENT) {
    findings.push(fail(
      "composition-density-drift",
      `Recreate density drift must stay within ${RECREATE_MAX_DENSITY_DRIFT_PERCENT}% unless the reference itself changes across responsive breakpoints.`,
      planFile,
    ));
  }
}

function validateElement(element, planFile, findings, seen) {
  if (!element || typeof element !== "object" || Array.isArray(element)) {
    findings.push(fail("visual-role-entry-invalid", "Each visual-role element must be an object.", planFile));
    return;
  }
  const id = nonEmpty(element.id) ? element.id : "<missing-id>";
  if (!nonEmpty(element.id)) findings.push(fail("visual-role-id", "Each visual-role element requires a stable id.", planFile));
  if (seen.has(id)) findings.push(fail("visual-role-id-duplicate", `Duplicate visual-role id ${id}.`, planFile));
  seen.add(id);

  const asset = element.assetRole;
  const overlay = element.overlayRole;
  if (!asset || typeof asset !== "object") {
    findings.push(fail("asset-role-missing", `Element ${id} requires assetRole.`, planFile));
    return;
  }
  if (!overlay || typeof overlay !== "object") {
    findings.push(fail("overlay-role-missing", `Element ${id} requires overlayRole.`, planFile));
    return;
  }

  const role = asset.role;
  const renderer = asset.renderer;
  const placement = asset.placement;
  const mode = overlay.mode;

  if (!ROLES.has(role)) findings.push(fail("asset-role-invalid", `Element ${id} has unsupported assetRole.role ${JSON.stringify(role)}.`, planFile));
  if (!RENDERERS.has(renderer)) findings.push(fail("asset-renderer-invalid", `Element ${id} has unsupported renderer ${JSON.stringify(renderer)}.`, planFile));
  if (!PLACEMENTS.has(placement)) findings.push(fail("asset-placement-invalid", `Element ${id} has unsupported placement ${JSON.stringify(placement)}.`, planFile));
  if (!OVERLAYS.has(mode)) findings.push(fail("overlay-role-invalid", `Element ${id} has unsupported overlay mode ${JSON.stringify(mode)}.`, planFile));

  if (CODE_ROLES.has(role)) {
    if (renderer !== "code" || placement !== "code") {
      findings.push(fail("placeholder-renderer-violation", `Element ${id} is ${role} and must be rendered as code, not ${renderer}/${placement}.`, planFile));
    }
    if (asset.generationScope && asset.generationScope !== "none") {
      findings.push(fail("full-ui-image2-generation", `Element ${id} is ${role}; simple UI/graphic primitives must not be generated by image2.`, planFile));
    }
  }

  if (RASTER_ROLES.has(role)) {
    if (!["image2", "project"].includes(renderer)) {
      findings.push(fail("asset-role-renderer-mismatch", `Element ${id} is semantic raster role ${role} and must use renderer=image2 or project.`, planFile));
    }
    if (renderer === "image2" && asset.generationScope !== "asset-only") {
      findings.push(fail("full-ui-image2-generation", `Element ${id} uses image2 but generationScope must be asset-only. Generate one clean visual asset, never a full UI screenshot to crop later.`, planFile));
    }
    if (asset.containsCodeOwnedText === true) {
      findings.push(fail("bitmap-code-content", `Element ${id} declares code-owned text/UI inside a semantic bitmap. Text and controls must be code-rendered.`, planFile));
    }
  }

  if (renderer === "image2") validateImage2BackgroundStrategy(asset, role, id, planFile, findings);

  if (role === "cutout-subject") {
    if (placement !== "layered") findings.push(fail("asset-role-renderer-mismatch", `Cutout ${id} must use placement=layered.`, planFile));
    if (asset.requiresTransparency !== true) findings.push(fail("cutout-transparency-required", `Cutout ${id} must require transparency/background removal.`, planFile));
    if (asset.participatesInOverlap === true && mode !== "cutout-layered") {
      findings.push(fail("cutout-overlay-required", `Cutout ${id} participates in freeform overlap and must use overlayRole.mode=cutout-layered.`, planFile));
    }
  }

  if (mode === "cutout-layered" && role !== "cutout-subject") {
    findings.push(fail("asset-role-overlay-mismatch", `Element ${id} uses cutout-layered overlay but assetRole.role is ${role}; reclassify as cutout-subject or change overlay mode.`, planFile));
  }
  if (role === "background-plate" && placement !== "background") {
    findings.push(fail("asset-role-renderer-mismatch", `Background plate ${id} must use placement=background.`, planFile));
  }
  if (role === "background-plate" && mode === "cutout-layered") {
    findings.push(fail("asset-role-overlay-mismatch", `Background plate ${id} cannot use cutout-layered overlay.`, planFile));
  }
  if (role === "inline-photo" && placement !== "container") {
    findings.push(fail("asset-role-renderer-mismatch", `Inline photo ${id} must stay container-bound with placement=container.`, planFile));
  }
  if (role === "inline-photo" && mode === "cutout-layered") {
    findings.push(fail("asset-role-overlay-mismatch", `Inline photo ${id} cannot use freeform cutout-layered overlay; reclassify it as cutout-subject if the silhouette leaves its container.`, planFile));
  }

  const overlapMode = !["none", "side-by-side"].includes(mode);
  if (overlapMode && !["text-over-image", "image-over-text"].includes(overlay.zOrder)) {
    findings.push(fail("overlay-z-order-required", `Element ${id} overlaps text/image but has no explicit zOrder.`, planFile));
  }
  if (mode === "safe-overlap" && (!Array.isArray(overlay.textSafeZones) || overlay.textSafeZones.length === 0)) {
    findings.push(fail("overlay-safe-zone-required", `Element ${id} uses safe-overlap but declares no textSafeZones.`, planFile));
  }
  if (mode === "masked-overlay" && (!MASKS.has(overlay.mask) || overlay.mask === "none")) {
    findings.push(fail("overlay-mask-required", `Element ${id} uses masked-overlay but has no readability mask.`, planFile));
  }
  if (mode === "cutout-layered" && (!Array.isArray(overlay.subjectCriticalZones) || overlay.subjectCriticalZones.length === 0)) {
    findings.push(fail("subject-critical-zone-required", `Element ${id} uses cutout-layered but declares no subjectCriticalZones.`, planFile));
  }
  if (overlay.allowTextOverSubject === true && !nonEmpty(overlay.referenceBackedOverlapReason)) {
    findings.push(fail("subject-critical-overlap", `Element ${id} allows text over the subject but has no reference-backed reason.`, planFile));
  }
  if (overlay.allowControlOverSubject === true && !nonEmpty(overlay.referenceBackedControlOverlapReason)) {
    findings.push(fail("cta-subject-overlap", `Element ${id} allows persistent controls over the subject but has no reference-backed reason.`, planFile));
  }
  if (overlay.safeArea && !["inside", "not-applicable"].includes(overlay.safeArea)) {
    findings.push(fail("safe-area-overlap", `Element ${id} has invalid safeArea contract ${JSON.stringify(overlay.safeArea)}.`, planFile));
  }

  const criticalZones = rectList(overlay.subjectCriticalZones);
  const textZones = rectList(overlay.textSafeZones);
  const controlZones = rectList(overlay.persistentControlZones);
  if (criticalZones.length && textZones.length && overlay.allowTextOverSubject !== true && anyOverlap(criticalZones, textZones)) {
    findings.push(fail("subject-critical-overlap", `Element ${id} declares a text-safe zone that intersects a subject-critical zone. Move the text zone or record an explicit reference-backed exception.`, planFile));
  }
  if (criticalZones.length && controlZones.length && overlay.allowControlOverSubject !== true && anyOverlap(criticalZones, controlZones)) {
    findings.push(fail("cta-subject-overlap", `Element ${id} places a persistent CTA/nav/status zone across a subject-critical region. Controls must sit in reserved safe space rather than cover the focal subject.`, planFile));
  }

  validateHeroCrop(element, planFile, findings, id, role, criticalZones);
}

function validateImage2BackgroundStrategy(asset, role, id, planFile, findings) {
  if (typeof asset.needsCutout !== "boolean" || !nonEmpty(asset.generationBackground) || !nonEmpty(asset.keyingMode)) {
    findings.push(fail(
      "asset-background-strategy-required",
      `Image2 asset ${id} must decide before generation whether it is a cutout or a complete rectangular/full-scene asset, including generationBackground and keyingMode.`,
      planFile,
    ));
    return;
  }

  if (role === "cutout-subject") {
    if (asset.needsCutout !== true || !CUTOUT_BACKGROUNDS.has(asset.generationBackground) || !CUTOUT_KEYING.has(asset.keyingMode)) {
      findings.push(fail(
        "cutout-background-strategy-invalid",
        `Cutout ${id} must be generated for extraction: transparent preferred, or solid-color/green-screen for background removal. Its final implementation must have a freeform transparent silhouette.`,
        planFile,
      ));
    }
    if (asset.generationBackground === "green-screen" && asset.keyingMode !== "chroma-key") {
      findings.push(fail("green-screen-keying-required", `Cutout ${id} uses green-screen generation and must use keyingMode=chroma-key.`, planFile));
    }
    if (asset.generationBackground === "transparent" && asset.keyingMode !== "native-alpha") {
      findings.push(fail("transparent-alpha-required", `Cutout ${id} requests transparent generation and must preserve native alpha.`, planFile));
    }
  }

  if (role === "background-plate") {
    if (asset.needsCutout !== false || asset.generationBackground !== "full-scene" || asset.keyingMode !== "none") {
      findings.push(fail(
        "background-plate-cutout-violation",
        `Background plate ${id} must stay a complete composed scene. Do not green-screen or remove its background merely to make layout easier.`,
        planFile,
      ));
    }
  }

  if (role === "inline-photo") {
    if (asset.needsCutout !== false || asset.generationBackground !== "full-scene" || asset.keyingMode !== "none") {
      findings.push(fail(
        "inline-photo-keying-overkill",
        `Inline photo ${id} is container-bound and should be generated as a complete frame, not as a green-screen/transparent cutout.`,
        planFile,
      ));
    }
  }
}

function validateHeroCrop(element, planFile, findings, id, role, criticalZones) {
  const isPrimaryHero = role === "background-plate" && element.semanticPriority === "primary";
  if (!isPrimaryHero) return;

  const crop = element.cropPolicy;
  if (!crop || typeof crop !== "object") {
    findings.push(fail("hero-cover-without-focal-point", `Primary hero ${id} requires cropPolicy so frontend placement cannot fall back to blind object-fit cropping.`, planFile));
    findings.push(fail("insufficient-hero-bleed", `Primary hero ${id} requires explicit top/side/bottom bleed budgets.`, planFile));
    findings.push(fail("critical-subject-crop", `Primary hero ${id} requires a criticalCropMaxPercent budget.`, planFile));
    return;
  }

  if (crop.fit === "cover" && !validPoint(crop.focalPoint) && !validRect(crop.safeCropBox)) {
    findings.push(fail("hero-cover-without-focal-point", `Primary hero ${id} uses fit=cover without focalPoint or safeCropBox. Blind cover cropping can cut faces/products at container edges.`, planFile));
  }

  const top = finiteNumber(crop.minBleedTop);
  const sides = finiteNumber(crop.minBleedSides);
  const bottom = finiteNumber(crop.minBleedBottom);
  if (top === null || sides === null || bottom === null || top < HERO_BLEED_MIN.top || sides < HERO_BLEED_MIN.sides || bottom < HERO_BLEED_MIN.bottom) {
    findings.push(fail(
      "insufficient-hero-bleed",
      `Primary hero ${id} must reserve at least ${HERO_BLEED_MIN.top}% top, ${HERO_BLEED_MIN.sides}% side, and ${HERO_BLEED_MIN.bottom}% bottom bleed for target-layout cropping and overlays.`,
      planFile,
    ));
  }

  const maxCrop = finiteNumber(crop.criticalCropMaxPercent);
  if (maxCrop === null || maxCrop > HERO_CRITICAL_CROP_MAX) {
    findings.push(fail("critical-subject-crop", `Primary hero ${id} must cap critical-subject crop at ${HERO_CRITICAL_CROP_MAX}% or less; faces, eyes, product silhouettes and focal objects may not be visibly chopped by the hero container.`, planFile));
  }

  if (criticalZones.length === 0) {
    findings.push(fail("subject-critical-zone-required", `Primary hero ${id} requires subjectCriticalZones so crop/CTA QA can protect the focal subject.`, planFile));
  }
}

function findVisualRolePlan(rootDir) {
  return findNamedPlan(rootDir, "visual-role-plan.json");
}

function findNamedPlan(rootDir, name) {
  const direct = [path.join(rootDir, name), path.join(rootDir, "artifacts", name)].filter((file) => fs.existsSync(file));
  const runRoot = path.join(rootDir, ".image2-ui", "runs");
  const runtime = fs.existsSync(runRoot) ? findNamedFiles(runRoot, name) : [];
  const candidates = [...direct, ...runtime];
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

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function validPoint(value) {
  return Array.isArray(value) && value.length === 2 && value.every((item) => finiteNumber(item) !== null);
}

function validRect(value) {
  return Array.isArray(value) && value.length === 4 && value.every((item) => finiteNumber(item) !== null) && value[2] > 0 && value[3] > 0;
}

function rectList(value) {
  return Array.isArray(value) ? value.filter(validRect) : [];
}

function anyOverlap(a, b) {
  return a.some((left) => b.some((right) => rectsOverlap(left, right)));
}

function rectsOverlap(a, b) {
  const [ax, ay, aw, ah] = a;
  const [bx, by, bw, bh] = b;
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function fail(rule, message, file) {
  return { level: "fail", rule, message, file };
}

function warn(rule, message, file) {
  return { level: "warn", rule, message, file };
}
