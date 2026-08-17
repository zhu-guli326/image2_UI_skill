import fs from "node:fs";
import path from "node:path";

const FREEFORM_INTENTS = new Set(["text-flow", "text-overlap", "layer-interlock", "cross-boundary"]);

export function runFreeformLayoutGuard({ rootDir } = {}) {
  if (!rootDir) return [];
  const planFile = findVisualRolePlan(rootDir);
  if (!planFile) return [];

  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  } catch {
    return [];
  }

  if (!Array.isArray(plan?.elements)) return [];
  const findings = [];

  for (const element of plan.elements) {
    const asset = element?.assetRole;
    if (!asset || typeof asset !== "object") continue;

    const id = typeof element.id === "string" && element.id.trim() ? element.id : "<missing-id>";
    const intent = asset.freeformLayoutIntent;
    const boundary = asset.compositionBoundary;
    const freeformRequired = FREEFORM_INTENTS.has(intent);

    if (freeformRequired && (asset.role !== "cutout-subject" || asset.needsCutout !== true)) {
      findings.push(fail(
        "freeform-layout-requires-cutout",
        `Element ${id} declares freeformLayoutIntent=${intent}. Text/layers must be able to escape the rectangular media box, so the asset must be a cutout-subject with needsCutout=true.`,
        planFile,
      ));
    }

    if (freeformRequired && boundary !== "freeform-silhouette") {
      findings.push(fail(
        "rectangular-boundary-blocks-freeform-layout",
        `Element ${id} requires ${intent}, but compositionBoundary is ${JSON.stringify(boundary)}. Remove the rectangular image boundary and implement the final transparent silhouette as freeform-silhouette.`,
        planFile,
      ));
    }

    if (asset.role === "cutout-subject" && asset.participatesInOverlap === true) {
      if (!FREEFORM_INTENTS.has(intent)) {
        findings.push(fail(
          "freeform-layout-requires-cutout",
          `Overlapping cutout ${id} must state why the rectangular boundary is being removed via freeformLayoutIntent (text-flow, text-overlap, layer-interlock, or cross-boundary).`,
          planFile,
        ));
      }
      if (boundary !== "freeform-silhouette") {
        findings.push(fail(
          "rectangular-boundary-blocks-freeform-layout",
          `Overlapping cutout ${id} must use compositionBoundary=freeform-silhouette; an opaque rectangular frame defeats the purpose of the cutout.`,
          planFile,
        ));
      }
    }

    if (["background-plate", "inline-photo"].includes(asset.role) && freeformRequired) {
      findings.push(fail(
        "freeform-layout-requires-cutout",
        `Element ${id} is ${asset.role} but requests ${intent}. If text must flow around the subject silhouette, reclassify it as cutout-subject; otherwise keep freeformLayoutIntent=none.`,
        planFile,
      ));
    }
  }

  return findings;
}

function findVisualRolePlan(rootDir) {
  const candidates = [path.join(rootDir, "visual-role-plan.json"), path.join(rootDir, "artifacts", "visual-role-plan.json")]
    .filter((file) => fs.existsSync(file));
  const runRoot = path.join(rootDir, ".image2-ui", "runs");
  if (fs.existsSync(runRoot)) candidates.push(...findNamedFiles(runRoot, "visual-role-plan.json"));
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

function fail(rule, message, file) {
  return { level: "fail", rule, message, file };
}
