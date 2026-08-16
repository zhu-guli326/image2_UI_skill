import fs from "node:fs";
import path from "node:path";

const TEXT_SOURCE_EXT_RE = /\.(?:html?|css|scss|sass|less|jsx?|tsx?|vue|svelte)$/i;
const INLINE_RASTER_RE = /data:image\/(?:png|jpe?g|webp|gif|avif);base64,/i;
const PREVIEW_ONLY_RE = /data-image2-ui-artifact=["']preview-only["']/i;

export function runReferenceAssetGuard({ files = [], workflowMode = null, originalReference = null } = {}) {
  if (workflowMode !== "recreate") return [];
  const findings = [];
  const referenceBase = originalReference ? path.basename(originalReference).toLowerCase() : null;

  for (const file of files.filter((item) => TEXT_SOURCE_EXT_RE.test(item))) {
    let source;
    try { source = fs.readFileSync(file, "utf8"); } catch { continue; }

    // Portable preview artifacts are intentionally self-contained for delivery environments
    // that do not preserve sibling asset paths. They are not canonical implementation source.
    if (/\.html?$/i.test(file) && PREVIEW_ONLY_RE.test(source)) continue;

    if (INLINE_RASTER_RE.test(source)) {
      findings.push({
        level: "fail",
        rule: "recreate-inline-raster-bypass",
        message: `Recreate source ${path.basename(file)} embeds a raster as a base64 data URI. Prepared bitmap assets must remain traceable files covered by asset-plan.json/provenance; do not hide raw screenshot crops inside HTML/CSS/JS.`,
        file,
      });
    }

    if (referenceBase && source.toLowerCase().includes(referenceBase)) {
      findings.push({
        level: "fail",
        rule: "recreate-reference-flattened",
        message: `Recreate source ${path.basename(file)} directly references the original screenshot ${path.basename(originalReference)}. The reference is a fidelity target, not a shippable background or flattened implementation asset. Decompose code UI and prepare only the required bitmap regions.`,
        file,
      });
    }
  }

  return findings;
}
