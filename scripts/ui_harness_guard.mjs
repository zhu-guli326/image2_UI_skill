#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ALLOWED_IMAGE_SOURCES = new Set(["project-image2", "openai-imagegen-cli"]);
const IMAGE_EXT_RE = /\.(?:png|jpe?g|webp|gif|avif)$/i;
const MARKUP_EXT_RE = /\.(?:html?|jsx?|tsx?|vue|svelte)$/i;
const SCRIPT_EXT_RE = /\.(?:py|js|mjs|cjs|jsx|ts|tsx)$/i;
const GENERATED_PATH_RE = /(?:^|[/\\])(?:generated|generated-assets|ai-assets|image2-assets)(?:[/\\]|$)|(?:^|[/\\])generated[-_]/i;
const ICON_CONTEXT_RE = /(?:^|[-_\s])(?:icon|glyph|dot|symbol|status|signal|wifi|battery|nav|tab|toolbar|menu|control|action|circle)(?:[-_\s]|$)/i;
const KNOWN_ICON_SYSTEM_RE = /(?:data-icon(?:-family)?\s*=|class=["'][^"']*(?:lucide|phosphor|tabler|radix|hugeicon|icon-registry|ui-icon))/i;
const PLACEHOLDER_SYMBOL_RE = /[⌂◉♟●◎☰♡▣⌁◆◇○◈◦•▪▫▮▯♢♧♤♠♣♥♦★☆✦]/u;
const PROCEDURAL_VISUAL_RE = /(?:ImageDraw\.Draw|Image\.new\s*\(|PIL\.Image\.new\s*\(|createElement\s*\(\s*["']canvas["']\s*\)|getContext\s*\(\s*["']2d["']\s*\)|toDataURL\s*\(|canvas\.toBlob\s*\()/i;
const SEMANTIC_DRAW_RE = /(?:ImageDraw\.(?:text|rectangle|ellipse|polygon)|\b(?:draw|ctx|context)\.(?:text|rectangle|ellipse|polygon|fillText|strokeText|fillRect|strokeRect|drawImage)\s*\(|\.fillText\s*\(|\.strokeText\s*\(|\.fillRect\s*\(|\.strokeRect\s*\(|\.drawImage\s*\()/i;

export function runHarnessGuard({ target, workflowMode = null, originalReference = null } = {}) {
  if (!target) throw new TypeError("runHarnessGuard requires target");
  const targetPath = path.resolve(target);
  if (!fs.existsSync(targetPath)) {
    return buildResult(targetPath, [{
      level: "fail",
      rule: "guard-target-missing",
      message: `Harness Guard target does not exist: ${targetPath}`,
      file: targetPath,
    }]);
  }

  const stat = fs.statSync(targetPath);
  const rootDir = stat.isDirectory() ? targetPath : path.dirname(targetPath);
  const files = stat.isDirectory() ? listFiles(rootDir) : [targetPath];
  const findings = [];

  for (const file of files.filter((item) => MARKUP_EXT_RE.test(item))) {
    checkPlaceholderUiGlyphs(file, rootDir, findings);
    checkAdHocFunctionalSvgs(file, rootDir, findings);
  }

  checkGeneratedVisualProvenance(files, rootDir, findings);

  for (const file of files.filter((item) => SCRIPT_EXT_RE.test(item))) {
    checkProceduralVisualGeneration(file, rootDir, findings);
  }

  if (workflowMode) {
    findings.push({
      level: "info",
      rule: "guard-workflow-mode",
      message: `Harness Guard workflow mode: ${workflowMode}`,
      file: null,
    });
  }
  if (originalReference) {
    findings.push({
      level: "info",
      rule: "guard-original-reference",
      message: `Original reference registered for asset/source-of-truth checks: ${originalReference}`,
      file: path.resolve(originalReference),
    });
  }

  return buildResult(rootDir, findings);
}

function checkPlaceholderUiGlyphs(file, rootDir, findings) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(rootDir, file) || path.basename(file);

  const controlPattern = /<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  for (const match of source.matchAll(controlPattern)) {
    const attrs = match[2] || "";
    const body = match[3] || "";
    if (hasRealIcon(body)) continue;

    const suspicious = findPlaceholderSymbol(body, attrs);
    if (!suspicious) continue;

    findings.push({
      level: "fail",
      rule: "placeholder-ui-glyph",
      message: `Functional ${match[1]} in ${relative} uses "${suspicious}" as a placeholder/Unicode glyph. Use the project's single icon library or one SVG sprite/IconRegistry instead of circles, diamonds, emoji, or Unicode symbols.`,
      file,
    });
  }

  const semanticSpanPattern = /<(span|div)\b([^>]*)>([^<]{1,16})<\/\1>/gi;
  for (const match of source.matchAll(semanticSpanPattern)) {
    const attrs = match[2] || "";
    const text = decodeEntities(match[3] || "").trim();
    if (!ICON_CONTEXT_RE.test(attrs) || !symbolOnly(text)) continue;

    findings.push({
      level: "fail",
      rule: "placeholder-ui-glyph",
      message: `UI icon/status element in ${relative} uses "${text}" as a placeholder/Unicode glyph. Status bar, nav, tab, toolbar and action glyphs must be code-rendered by the unified icon system.`,
      file,
    });
  }
}

function checkAdHocFunctionalSvgs(file, rootDir, findings) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(rootDir, file) || path.basename(file);
  const trackedSprite = /<svg\b[^>]*data-icon-family=["'][^"']+["'][^>]*>[\s\S]*?<symbol\b/i.test(source);
  const controlPattern = /<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi;

  for (const match of source.matchAll(controlPattern)) {
    const controlAttrs = match[2] || "";
    const body = match[3] || "";
    for (const svg of body.matchAll(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/gi)) {
      const svgAttrs = svg[1] || "";
      const svgBody = svg[2] || "";
      const usesTrackedComponent = KNOWN_ICON_SYSTEM_RE.test(svgAttrs) || KNOWN_ICON_SYSTEM_RE.test(controlAttrs);
      const usesSprite = /<use\b[^>]*(?:href|xlink:href)=["']#[^"']+["']/i.test(svgBody);
      if (usesTrackedComponent || (usesSprite && trackedSprite)) continue;

      findings.push({
        level: "fail",
        rule: "ad-hoc-functional-svg",
        message: `Functional ${match[1]} in ${relative} contains an untracked inline SVG. Do not hand-draw one-off arrows or action glyphs. Use the project's declared icon family/IconRegistry, or mark a single SVG sprite with data-icon-family so the icon source is explicit and consistent.`,
        file,
      });
      break;
    }
  }
}

function hasRealIcon(body) {
  return /<(?:svg|img|i)\b/i.test(body)
    || /\bdata-icon\s*=/i.test(body)
    || /class=["'][^"']*(?:phosphor|tabler|radix|hugeicon|icon-registry|ui-icon)/i.test(body);
}

function findPlaceholderSymbol(body, attrs) {
  const text = decodeEntities(stripTags(body)).trim();
  const nested = [...body.matchAll(/<(?:span|div)\b([^>]*)>([^<]{1,16})<\/(?:span|div)>/gi)];
  for (const match of nested) {
    const nestedAttrs = match[1] || "";
    const nestedText = decodeEntities(match[2] || "").trim();
    if (symbolOnly(nestedText) && (ICON_CONTEXT_RE.test(nestedAttrs) || ICON_CONTEXT_RE.test(attrs))) {
      return nestedText;
    }
    if (symbolOnly(nestedText) && PLACEHOLDER_SYMBOL_RE.test(nestedText)) return nestedText;
  }

  if (ICON_CONTEXT_RE.test(attrs) && symbolOnly(text)) return text;
  return null;
}

function symbolOnly(text) {
  if (!text) return false;
  if (PLACEHOLDER_SYMBOL_RE.test(text)) return true;
  try {
    return /^\p{Extended_Pictographic}+$/u.test(text);
  } catch {
    return false;
  }
}

function checkGeneratedVisualProvenance(files, rootDir, findings) {
  for (const file of files.filter((item) => IMAGE_EXT_RE.test(item))) {
    const relative = path.relative(rootDir, file);
    if (!GENERATED_PATH_RE.test(relative)) continue;

    const provenanceFile = `${file}.provenance.json`;
    if (!fs.existsSync(provenanceFile)) {
      findings.push({
        level: "fail",
        rule: "generated-visual-missing-provenance",
        message: `Generated visual asset ${relative} has no image2 provenance sidecar. New semantic backgrounds, people, products, illustrations, and scenes must be created through image2/image.generate; local code may only post-process an existing asset.`,
        file,
      });
      continue;
    }

    let provenance;
    try {
      provenance = JSON.parse(fs.readFileSync(provenanceFile, "utf8"));
    } catch (error) {
      findings.push({
        level: "fail",
        rule: "generated-visual-invalid-provenance",
        message: `Could not parse ${path.relative(rootDir, provenanceFile)}: ${error.message}`,
        file: provenanceFile,
      });
      continue;
    }

    if (provenance.channel !== "native-image2" || !ALLOWED_IMAGE_SOURCES.has(provenance.source)) {
      findings.push({
        level: "fail",
        rule: "generated-visual-unapproved-source",
        message: `Generated visual ${relative} is not proven to come from an approved image2 channel (channel=${provenance.channel || "missing"}, source=${provenance.source || "missing"}).`,
        file: provenanceFile,
      });
    }
    if (!["generate", "edit"].includes(provenance.action)) {
      findings.push({
        level: "fail",
        rule: "generated-visual-invalid-action",
        message: `Generated visual ${relative} has invalid provenance action "${provenance.action || "missing"}"; expected generate or edit.`,
        file: provenanceFile,
      });
    }
  }
}

function checkProceduralVisualGeneration(file, rootDir, findings) {
  const source = fs.readFileSync(file, "utf8");
  if (!PROCEDURAL_VISUAL_RE.test(source) || !SEMANTIC_DRAW_RE.test(source)) return;

  const relative = path.relative(rootDir, file);
  const postprocessOnly = /image2-postprocess-only/i.test(source)
    || /(?:^|[/\\_-])(?:crop|resize|compress|optimi[sz]e|remove[-_]?background|postprocess)(?:[/\\_.-]|$)/i.test(relative);

  findings.push({
    level: postprocessOnly ? "warn" : "fail",
    rule: postprocessOnly ? "procedural-image-postprocess-review" : "procedural-semantic-visual-generation",
    message: postprocessOnly
      ? `Procedural image code found in ${relative}. Keep it limited to crop/resize/compress/remove-background operations and preserve the image2 provenance sidecar.`
      : `Procedural drawing code in ${relative} appears capable of creating semantic visual content. Do not paint backgrounds, people, products, illustrations, or reference replacements with Pillow/Canvas/local drawing code; use image2/image.generate instead.`,
    file,
  });
}

function listFiles(rootDir) {
  const ignored = new Set([".git", "node_modules", ".next", "dist", "build", ".turbo", ".image2-ui"]);
  const out = [];
  walk(rootDir);
  return out;

  function walk(current) {
    for (const name of fs.readdirSync(current)) {
      if (ignored.has(name)) continue;
      const full = path.join(current, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else out.push(full);
    }
  }
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]+>/g, "");
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&hearts;/gi, "♥")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&nbsp;/gi, " ");
}

function buildResult(target, findings) {
  const fail = findings.filter((item) => item.level === "fail").length;
  const warn = findings.filter((item) => item.level === "warn").length;
  const info = findings.filter((item) => item.level === "info").length;
  return {
    ok: fail === 0,
    status: fail ? "fail" : warn ? "pass-with-warnings" : "pass",
    target,
    counts: { fail, warn, info },
    findings,
  };
}

function parseCliArgs(argv) {
  const args = [...argv];
  const valueOptions = new Set(["--workflow-mode", "--original-reference"]);
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith("-")) {
      if (valueOptions.has(arg)) index += 1;
      continue;
    }
    positionals.push(arg);
  }
  const read = (name) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] || null : null;
  };
  return {
    target: positionals[0] || null,
    workflowMode: read("--workflow-mode"),
    originalReference: read("--original-reference"),
    json: args.includes("--json"),
  };
}

function printResult(result) {
  console.log(`Image2 UI Harness Guard: ${result.status}`);
  console.log(`Target: ${result.target}`);
  console.log(`Findings: ${result.counts.fail} fail, ${result.counts.warn} warn, ${result.counts.info} info`);
  for (const finding of result.findings) {
    console.log(`[${finding.level.toUpperCase()}] ${finding.rule}: ${finding.message}`);
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  const cli = parseCliArgs(process.argv.slice(2));
  if (!cli.target) {
    console.error("Usage: node scripts/ui_harness_guard.mjs <demo-dir-or-html> [--workflow-mode recreate|redesign|create] [--original-reference ref.png] [--json]");
    process.exit(1);
  }
  const result = runHarnessGuard(cli);
  if (cli.json) console.log(JSON.stringify(result, null, 2));
  else printResult(result);
  process.exit(result.ok ? 0 : 2);
}
