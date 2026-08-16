import fs from "node:fs";
import path from "node:path";

const IMAGE_EXT_RE = /\.(?:png|jpe?g|webp|gif|avif)$/i;
const TEXT_SOURCE_EXT_RE = /\.(?:html?|css|scss|sass|less|jsx?|tsx?|vue|svelte)$/i;
const ASSET_KINDS = new Set(["background-plate", "cutout", "inline-photo", "generated-clean", "project-existing"]);
const ASSET_SOURCES = new Set(["reference", "image2", "project"]);
const CLEAN_TEXT_OPS = new Set(["remove-text", "clean-text", "inpaint-text"]);
const CLEAN_UI_OPS = new Set(["remove-ui", "clean-ui", "inpaint-ui"]);
const CUTOUT_OPS = new Set(["remove-background", "background-remove", "cutout"]);

export function runAssetPlanGuard({ rootDir, files, workflowMode = null, originalReference = null } = {}) {
  if (workflowMode !== "recreate") return [];

  const referencedRasters = collectReferencedRasterAssets(rootDir, files)
    .filter((file) => !sameFile(file, originalReference));
  if (referencedRasters.length === 0) return [];

  const planFile = findAssetPlan(rootDir);
  if (!planFile) {
    return [{
      level: "fail",
      rule: "recreate-asset-plan-missing",
      message: "Recreate uses local raster assets but no asset-plan.json was found. Classify every bitmap as background-plate, cutout, inline-photo, generated-clean, or project-existing before implementation; reference crops that may contain code-owned text/UI must be cleaned first.",
      file: null,
    }];
  }

  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  } catch (error) {
    return [{
      level: "fail",
      rule: "asset-plan-invalid-json",
      message: `Could not parse ${path.relative(rootDir, planFile)}: ${error.message}`,
      file: planFile,
    }];
  }

  const findings = [];
  validatePlanHeader(plan, planFile, findings);
  const assets = Array.isArray(plan.assets) ? plan.assets : [];
  const trackedOutputs = new Map();

  for (const asset of assets) {
    validateAsset(asset, rootDir, planFile, findings, trackedOutputs);
  }

  for (const raster of referencedRasters) {
    const normalized = normalizeFile(raster);
    if (!trackedOutputs.has(normalized)) {
      findings.push({
        level: "fail",
        rule: "asset-plan-untracked-raster",
        message: `Rendered UI references ${path.relative(rootDir, raster)} but asset-plan.json does not classify it. Raw screenshot crops may not bypass the asset preparation contract.`,
        file: raster,
      });
    }
  }

  validateReferenceElements(plan, planFile, findings);
  validateDeclaredEmbeddedText(plan, rootDir, files, planFile, findings);
  return findings;
}

function validatePlanHeader(plan, planFile, findings) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    findings.push({ level: "fail", rule: "asset-plan-invalid", message: "asset-plan.json must be a JSON object.", file: planFile });
    return;
  }
  if (plan.version !== 1) {
    findings.push({ level: "fail", rule: "asset-plan-version", message: "asset-plan.json must use version 1.", file: planFile });
  }
  if (plan.workflow !== "recreate") {
    findings.push({ level: "fail", rule: "asset-plan-workflow", message: "A Recreate validation run requires asset-plan.json workflow=\"recreate\".", file: planFile });
  }
  if (!Array.isArray(plan.assets) || plan.assets.length === 0) {
    findings.push({ level: "fail", rule: "asset-plan-assets", message: "asset-plan.json must contain a non-empty assets array when Recreate uses local raster assets.", file: planFile });
  }
}

function validateAsset(asset, rootDir, planFile, findings, trackedOutputs) {
  if (!asset || typeof asset !== "object" || Array.isArray(asset)) {
    findings.push({ level: "fail", rule: "asset-plan-entry-invalid", message: "Each asset-plan entry must be an object.", file: planFile });
    return;
  }

  const id = nonEmpty(asset.id) ? asset.id : "<missing-id>";
  if (!nonEmpty(asset.id)) fail("asset-plan-id", `Asset ${id} requires a stable id.`, planFile, findings);
  if (!ASSET_KINDS.has(asset.kind)) fail("asset-plan-kind", `Asset ${id} has unsupported kind ${JSON.stringify(asset.kind)}.`, planFile, findings);
  if (!ASSET_SOURCES.has(asset.source)) fail("asset-plan-source", `Asset ${id} has unsupported source ${JSON.stringify(asset.source)}.`, planFile, findings);
  if (!nonEmpty(asset.output)) {
    fail("asset-plan-output", `Asset ${id} requires an output path.`, planFile, findings);
    return;
  }

  const output = path.resolve(rootDir, asset.output);
  trackedOutputs.set(normalizeFile(output), asset);
  if (!fs.existsSync(output)) fail("asset-plan-output-missing", `Prepared asset ${id} output does not exist: ${asset.output}.`, output, findings);

  const operations = new Set(Array.isArray(asset.operations) ? asset.operations : []);
  const sourceMayContainText = asset.sourceMayContainText === true || Array.isArray(asset.codeOwnedText) && asset.codeOwnedText.length > 0;
  const sourceMayContainUi = asset.sourceMayContainUi === true;

  if (asset.source === "reference") {
    if (!validRegion(asset.referenceRegion)) {
      fail("asset-plan-reference-region", `Reference-derived asset ${id} requires referenceRegion=[x,y,width,height] so the crop is traceable.`, planFile, findings);
    }

    if (sourceMayContainText) {
      if (!asset.textRemoved || !hasAny(operations, CLEAN_TEXT_OPS)) {
        fail("asset-text-contamination-risk", `Reference asset ${id} may contain code-owned text but is not proven cleaned. Remove/inpaint the text before using it as a bitmap; render the semantic text once in code.`, output, findings);
      }
    }

    if (sourceMayContainUi) {
      if (!asset.uiRemoved || !hasAny(operations, CLEAN_UI_OPS)) {
        fail("asset-ui-contamination-risk", `Reference asset ${id} may contain buttons/status/nav/UI chrome but is not proven cleaned. Remove those pixels before implementation because code owns UI chrome.`, output, findings);
      }
    }

    if (asset.kind === "cutout") {
      if (!asset.backgroundRemoved || !hasAny(operations, CUTOUT_OPS)) {
        fail("asset-kind-mismatch", `Asset ${id} is classified as cutout but has no background-removal operation. Collage/overlapping subjects must be prepared as a real transparent cutout instead of a rectangular screenshot crop.`, output, findings);
      }
      if (!/\.(?:png|webp)$/i.test(asset.output)) {
        fail("cutout-format", `Cutout ${id} should use PNG/WebP so transparency can be preserved.`, output, findings);
      }
    }
  }

  const embeddedText = Array.isArray(asset.embeddedText) ? asset.embeddedText.filter(nonEmpty) : [];
  if (["background-plate", "cutout", "inline-photo", "generated-clean"].includes(asset.kind) && embeddedText.length > 0 && asset.allowEmbeddedText !== true) {
    fail("asset-embedded-ui-text", `Asset ${id} declares readable embedded text (${embeddedText.join(", ")}). Recreate bitmap assets must not retain text that belongs to code UI unless allowEmbeddedText=true with an explicit reason.`, output, findings);
  }

  if (asset.allowEmbeddedText === true && !nonEmpty(asset.embeddedTextReason)) {
    fail("asset-embedded-text-reason", `Asset ${id} allows embedded text but does not explain why it is intrinsic to the image rather than code-owned UI.`, planFile, findings);
  }

  if (asset.source === "image2") validateImage2Sidecar(id, output, findings);
}

function validateImage2Sidecar(id, output, findings) {
  const sidecar = `${output}.provenance.json`;
  if (!fs.existsSync(sidecar)) {
    fail("prepared-asset-missing-provenance", `image2 prepared asset ${id} has no provenance sidecar: ${path.basename(sidecar)}.`, output, findings);
    return;
  }
  try {
    const provenance = JSON.parse(fs.readFileSync(sidecar, "utf8"));
    if (provenance.channel !== "native-image2" || !["project-image2", "openai-imagegen-cli"].includes(provenance.source) || !["generate", "edit"].includes(provenance.action)) {
      fail("prepared-asset-invalid-provenance", `image2 prepared asset ${id} has an unapproved provenance contract.`, sidecar, findings);
    }
  } catch (error) {
    fail("prepared-asset-invalid-provenance", `Could not parse provenance for ${id}: ${error.message}`, sidecar, findings);
  }
}

function validateReferenceElements(plan, planFile, findings) {
  if (!Array.isArray(plan.referenceElements)) return;
  for (const element of plan.referenceElements) {
    if (!element || element.required !== true) continue;
    if (element.status !== "implemented") {
      fail("reference-element-missing", `Required reference element ${element.id || "<unnamed>"} is not marked implemented. Recreate may not silently drop visible controls such as back, heart, menu, action, status, or navigation items.`, planFile, findings);
    }
  }
}

function validateDeclaredEmbeddedText(plan, rootDir, files, planFile, findings) {
  const domText = files
    .filter((file) => TEXT_SOURCE_EXT_RE.test(file))
    .map((file) => stripSourceToText(fs.readFileSync(file, "utf8")))
    .join(" ")
    .toLowerCase();

  for (const asset of Array.isArray(plan.assets) ? plan.assets : []) {
    for (const value of Array.isArray(asset?.embeddedText) ? asset.embeddedText : []) {
      const text = String(value || "").trim();
      if (text.length < 2) continue;
      if (domText.includes(text.toLowerCase())) {
        fail("duplicate-semantic-content", `Text ${JSON.stringify(text)} is declared inside bitmap asset ${asset.id || asset.output || "<unknown>"} and also appears in code. Semantic UI text must be rendered once, not duplicated in both pixels and DOM.`, planFile, findings);
      }
    }
  }
}

function collectReferencedRasterAssets(rootDir, files) {
  const out = new Set();
  for (const file of files.filter((item) => TEXT_SOURCE_EXT_RE.test(item))) {
    let source;
    try { source = fs.readFileSync(file, "utf8"); } catch { continue; }
    const patterns = [
      /(?:src|href)\s*=\s*["']([^"']+\.(?:png|jpe?g|webp|gif|avif))(?:\?[^"']*)?["']/gi,
      /url\(\s*["']?([^"')]+\.(?:png|jpe?g|webp|gif|avif))(?:\?[^"')]+)?["']?\s*\)/gi,
      /["']([^"']+\.(?:png|jpe?g|webp|gif|avif))["']/gi,
    ];
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        const value = match[1];
        if (!value || /^(?:data:|https?:|blob:|\/\/)/i.test(value)) continue;
        const clean = value.split("#")[0].split("?")[0];
        const resolved = clean.startsWith("/")
          ? path.resolve(rootDir, `.${clean}`)
          : path.resolve(path.dirname(file), clean);
        if (resolved.startsWith(rootDir) && fs.existsSync(resolved) && IMAGE_EXT_RE.test(resolved)) out.add(resolved);
      }
    }
  }
  return [...out];
}

function findAssetPlan(rootDir) {
  const direct = [path.join(rootDir, "asset-plan.json"), path.join(rootDir, "artifacts", "asset-plan.json")]
    .filter((file) => fs.existsSync(file));
  const runRoot = path.join(rootDir, ".image2-ui", "runs");
  const runtimePlans = fs.existsSync(runRoot) ? findNamedFiles(runRoot, "asset-plan.json") : [];
  const candidates = [...direct, ...runtimePlans];
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

function stripSourceToText(source) {
  return String(source || "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[{}();,:=<>\/\\]+/g, " ")
    .replace(/\s+/g, " ");
}

function validRegion(value) {
  return Array.isArray(value) && value.length === 4 && value.every((item) => Number.isFinite(item)) && value[2] > 0 && value[3] > 0;
}

function hasAny(values, allowed) {
  for (const value of values) if (allowed.has(value)) return true;
  return false;
}

function sameFile(file, other) {
  if (!other) return false;
  return normalizeFile(file) === normalizeFile(path.resolve(other));
}

function normalizeFile(file) {
  return path.resolve(file).replace(/\\/g, "/").toLowerCase();
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function fail(rule, message, file, findings) {
  findings.push({ level: "fail", rule, message, file });
}
