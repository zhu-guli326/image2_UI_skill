import fs from "node:fs";
import path from "node:path";

const IMAGE2_SOURCES = new Set(["project-image2", "openai-imagegen-cli"]);
const IMAGE2_ACTIONS = new Set(["generate", "edit"]);

export function runRecreateImage2PolicyGuard({ rootDir, workflowMode = null } = {}) {
  if (workflowMode !== "recreate" || !rootDir) return [];
  const planFile = findAssetPlan(path.resolve(rootDir));
  if (!planFile) return [];

  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  } catch {
    return [];
  }

  const findings = [];
  for (const asset of Array.isArray(plan?.assets) ? plan.assets : []) {
    validateAsset(asset, path.resolve(rootDir), planFile, findings);
  }
  return findings;
}

function validateAsset(asset, rootDir, planFile, findings) {
  if (!asset || typeof asset !== "object") return;
  const id = text(asset.id) || text(asset.output) || "<unknown>";

  if (asset.source === "reference") {
    fail(
      "recreate-reference-raster-forbidden",
      `Recreate asset ${id} uses source=\"reference\". Screenshot pixels are analysis evidence only and may not ship as implementation imagery. Identify the visual region, call the project-designated image2 generate/edit path, and use the generated asset with provenance instead.`,
      planFile,
      findings,
    );
    return;
  }

  if (asset.source === "project") return;

  if (asset.source !== "image2") {
    fail(
      "recreate-asset-source-invalid",
      `Recreate asset ${id} must use source=\"image2\" or source=\"project\". Screenshot-derived implementation assets are not allowed.`,
      planFile,
      findings,
    );
    return;
  }

  if (!validRegion(asset.referenceRegion)) {
    fail(
      "image2-reference-region-missing",
      `image2 asset ${id} must record referenceRegion=[x,y,width,height] identifying the visual being recreated from the screenshot. The region is guidance, not a shippable crop.`,
      planFile,
      findings,
    );
  }
  if (asset.referenceRole !== "visual-guide-only") {
    fail(
      "image2-reference-role-invalid",
      `image2 asset ${id} must declare referenceRole=\"visual-guide-only\" so the screenshot is never treated as implementation pixels.`,
      planFile,
      findings,
    );
  }
  if (!IMAGE2_ACTIONS.has(asset.image2Action)) {
    fail("image2-action-missing", `image2 asset ${id} requires image2Action=\"generate\" or \"edit\".`, planFile, findings);
  }
  if (!text(asset.image2Prompt)) {
    fail("image2-prompt-missing", `image2 asset ${id} requires image2Prompt describing the clean standalone asset to generate.`, planFile, findings);
  }
  if (!text(asset.output)) return;

  const output = path.resolve(rootDir, asset.output);
  const sidecar = `${output}.provenance.json`;
  if (!fs.existsSync(sidecar)) {
    fail("image2-provenance-required", `image2 asset ${id} is missing provenance sidecar ${path.basename(sidecar)}.`, output, findings);
    return;
  }

  try {
    const provenance = JSON.parse(fs.readFileSync(sidecar, "utf8"));
    if (provenance.channel !== "native-image2" || !IMAGE2_SOURCES.has(provenance.source)) {
      fail("image2-provenance-channel", `image2 asset ${id} was not produced by an approved native image2 channel.`, sidecar, findings);
    }
    if (!IMAGE2_ACTIONS.has(provenance.action) || provenance.action !== asset.image2Action) {
      fail("image2-provenance-action", `image2 asset ${id} provenance action must match asset-plan image2Action.`, sidecar, findings);
    }
    if (!text(provenance.prompt)) {
      fail("image2-provenance-prompt", `image2 asset ${id} provenance must preserve the generation/edit prompt.`, sidecar, findings);
    } else if (text(asset.image2Prompt) && normalize(provenance.prompt) !== normalize(asset.image2Prompt)) {
      fail("image2-prompt-drift", `image2 asset ${id} provenance prompt does not match asset-plan image2Prompt.`, sidecar, findings);
    }
  } catch (error) {
    fail("image2-provenance-invalid", `Could not parse image2 provenance for ${id}: ${error.message}`, sidecar, findings);
  }
}

function findAssetPlan(rootDir) {
  const candidates = [path.join(rootDir, "asset-plan.json"), path.join(rootDir, "artifacts", "asset-plan.json")]
    .filter((file) => fs.existsSync(file));
  const runRoot = path.join(rootDir, ".image2-ui", "runs");
  if (fs.existsSync(runRoot)) candidates.push(...findNamedFiles(runRoot, "asset-plan.json"));
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

function validRegion(value) {
  return Array.isArray(value) && value.length === 4 && value.every(Number.isFinite) && value[2] > 0 && value[3] > 0;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value) {
  return text(value).replace(/\s+/g, " ");
}

function fail(rule, message, file, findings) {
  findings.push({ level: "fail", rule, message, file });
}
