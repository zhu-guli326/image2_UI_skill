#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import os from "node:os";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const APPROVED_ICON_PACKAGES = new Set([
  "@phosphor-icons/react",
  "hugeicons-react",
  "@radix-ui/react-icons",
  "@tabler/icons-react",
]);

const UI_GLYPH_ROLE_RE = /(?:^|[-_\s.])(?:icon|glyph|status|statusbar|navbar|nav|tabbar|toolbar|battery|wifi|signal|back|close|settings|gear|menu|dots|kebab|tab|button|btn|quick-action|quick|action|plus|minus|power|play|pause|next|prev|previous|volume|toggle|switch|control|chevron|arrow)(?:[-_\s.]|$)/i;
const UI_CONTROL_CONTEXT_RE = /(?:^|[-_\s.])(?:status|statusbar|navbar|nav|tabbar|toolbar|button|btn|tab|quick-action|quick|action|control|toggle|switch|menu|player|playback)(?:[-_\s.]|$)/i;
const VISUAL_ASSET_ROLE_RE = /(?:^|[-_\s.])(?:photo|cutout|hero|visual|background|texture|thumb|thumbnail|screenshot|reference|preview|demo|mockup|foreground|portrait|avatar|scene|render|rendering|product-image|product-cutout|object-cutout|foreground-cutout|object-thumbnail|device-product)(?:[-_\s.]|$)/i;
const VISUAL_CONTEXT_RE = /(?:^|[-_\s.])(?:product|object|room|living|device|appliance)(?:[-_\s.]|$)/i;
const PHYSICAL_OBJECT_NAME_RE = /(?:^|[-_\s.])(?:lamp|camera|speaker|tv|television|air-conditioner|aircon|conditioner|thermostat|router|plug|lock|sensor|chair|sofa|table|phone|watch|shoe|bag|bottle|plant)(?:[-_\s.]|$)/i;

const args = process.argv.slice(2);
const targetArg = args.find((arg) => !arg.startsWith("-"));
const jsonMode = args.includes("--json");
const noBrowser = args.includes("--no-browser");
const reference = readOption("--reference");

if (!targetArg || args.includes("--help") || args.includes("-h")) {
  printUsage();
  process.exit(targetArg ? 0 : 1);
}

const targetPath = path.resolve(process.cwd(), targetArg);
if (!fs.existsSync(targetPath)) {
  failEarly(`Target does not exist: ${targetPath}`);
}

const targetStat = fs.statSync(targetPath);
const rootDir = targetStat.isDirectory() ? targetPath : path.dirname(targetPath);
const entryFile = targetStat.isDirectory() ? findEntryHtml(rootDir) : targetPath;
const findings = [];

if (!entryFile) {
  add("fail", "missing-entry", "No HTML entry file found. Expected index.html or another .html file.", rootDir);
} else {
  add("info", "entry", `Using HTML entry: ${path.relative(rootDir, entryFile) || path.basename(entryFile)}`, entryFile);
}

if (reference) {
  const referencePath = path.resolve(process.cwd(), reference);
  if (fs.existsSync(referencePath)) {
    add("info", "reference-registered", `Reference image registered: ${referencePath}`, referencePath);
  } else {
    add("warn", "reference-missing", `Reference image was provided but not found: ${referencePath}`, referencePath);
  }
}

const files = listFiles(rootDir);
runStaticChecks(files, rootDir);

if (entryFile && !noBrowser) {
  await runBrowserChecks(rootDir, entryFile, findings);
}

const result = buildResult(rootDir, entryFile, findings);
if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  printSummary(result);
}

process.exit(result.ok ? 0 : 2);

function readOption(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] && !args[index + 1].startsWith("-") ? args[index + 1] : null;
}

function printUsage() {
  console.log(`Usage:
  node scripts/ui_output_audit.mjs <demo-dir-or-html> [--reference reference.png] [--json] [--no-browser]

Checks static assets in any image-to-UI demo and, when Playwright is available, opens the page in desktop and mobile viewports.`);
}

function failEarly(message) {
  console.error(message);
  process.exit(1);
}

function findEntryHtml(dir) {
  const index = path.join(dir, "index.html");
  if (fs.existsSync(index)) return index;
  return listFiles(dir).find((file) => file.endsWith(".html")) || null;
}

function listFiles(dir) {
  const ignored = new Set([".git", "node_modules", ".next", "dist", "build", ".turbo"]);
  const out = [];
  walk(dir);
  return out;

  function walk(current) {
    for (const name of fs.readdirSync(current)) {
      if (ignored.has(name)) continue;
      const full = path.join(current, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else {
        out.push(full);
      }
    }
  }
}

function runStaticChecks(files, rootDir) {
  const htmlFiles = files.filter((file) => file.endsWith(".html"));
  const cssFiles = files.filter((file) => file.endsWith(".css"));
  const scriptFiles = files.filter((file) => /\.(?:js|mjs|cjs|jsx|ts|tsx)$/i.test(file));
  const packageFiles = files.filter((file) => path.basename(file) === "package.json");
  const imageFiles = files.filter((file) => /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(file));

  if (htmlFiles.length === 0) add("fail", "missing-html", "No HTML file found in target.", rootDir);
  if (cssFiles.length === 0) add("warn", "missing-css", "No CSS file found. Confirm styles are intentionally inline.", rootDir);
  if (scriptFiles.length === 0) add("warn", "missing-js", "No JS/TS file found. Confirm interactions are intentionally minimal.", rootDir);
  if (imageFiles.length === 0) add("warn", "no-local-images", "No local image assets found. Image-to-UI demos usually need local visual assets.", rootDir);
  runImageAssetNameChecks(imageFiles, rootDir);

  for (const file of files) {
    const stat = fs.statSync(file);
    if (stat.size === 0) add("warn", "empty-asset", `Empty file: ${path.relative(rootDir, file)}`, file);
  }

  for (const file of [...htmlFiles, ...cssFiles]) {
    const content = fs.readFileSync(file, "utf8");
    for (const ref of extractRefs(content, file.endsWith(".css") ? "css" : "html")) {
      classifyRef(ref, file, rootDir);
    }
  }

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    runStaticHtmlDesignChecks(html, file, rootDir);
  }

  for (const file of scriptFiles) {
    const script = fs.readFileSync(file, "utf8");
    runStaticJsIconChecks(script, file, rootDir);
  }

  for (const file of packageFiles) {
    runPackageIconChecks(file, rootDir);
  }

  const cssText = cssFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  runStaticCssDesignChecks(cssText, rootDir);
}

function runStaticHtmlDesignChecks(html, file, rootDir) {
  if (/<meta\s+name=["']viewport["'][^>]*user-scalable\s*=\s*no/i.test(html)) {
    add("fail", "zoom-disabled", `Viewport disables user zoom in ${path.relative(rootDir, file)}. Keep zoom enabled for accessibility.`, file);
  }

  if (!/<meta\s+name=["']viewport["']/i.test(html)) {
    add("warn", "missing-viewport-meta", `No viewport meta tag found in ${path.relative(rootDir, file)}. Mobile rendering may be unreliable.`, file);
  }

  runIconSystemStaticChecks(html, file, rootDir);

  const imagePattern = /<img\b([^>]*)>/gi;
  for (const match of html.matchAll(imagePattern)) {
    const attrs = match[1] || "";
    if (isCutoutOrProductAssetName(attrs) && !/\balt\s*=/i.test(attrs)) {
      add("warn", "cutout-asset-missing-alt", `Product/cutout image appears to lack alt text in ${path.relative(rootDir, file)}. Use useful alt text for meaningful product imagery, or alt="" when decorative.`, file);
    }
  }

  const interactivePattern = /<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  for (const match of html.matchAll(interactivePattern)) {
    const tag = match[1];
    const attrs = match[2] || "";
    const body = match[3] || "";
    const hasIcon = /<(?:svg|i|img)\b/i.test(body);
    if (!hasIcon) continue;
    const visibleText = stripTags(body).trim();
    const hasName = /\b(?:aria-label|aria-labelledby|title)\s*=/i.test(attrs) || /\btitle\s*=/i.test(body);
    const imageIcon = body.match(/<img\b([^>]*)>/i);
    if (imageIcon && likelyImageIconInControl(imageIcon[1], body)) {
      add("warn", "image-icon-in-control", `Raster image appears to be used as a UI icon inside ${tag} in ${path.relative(rootDir, file)}. Prefer a code-rendered icon library/SVG/CSS glyph.`, file);
    }
    if (!visibleText && !hasName) {
      add("warn", "unlabeled-icon-button", `Icon-only ${tag} appears to lack aria-label/title in ${path.relative(rootDir, file)}.`, file);
    }
  }

  const repeatedCardIconPattern = /class=["'][^"']*(?:card|tile|feature)[^"']*["'][\s\S]{0,700}<(?:svg|i|img)\b[\s\S]{0,700}<h[2-4]\b[\s\S]{0,500}<p\b/gi;
  const repeatedCardIcons = [...html.matchAll(repeatedCardIconPattern)];
  if (repeatedCardIcons.length >= 4) {
    add("warn", "repeated-icon-card-grid", `Found ${repeatedCardIcons.length} repeated icon + heading + paragraph card patterns. Break up template-like card grids unless the reference requires them.`, file);
  }
}

function runIconSystemStaticChecks(html, file, rootDir) {
  const iconTechs = [];
  if (/<svg\b/i.test(html)) iconTechs.push("inline-svg");
  if (/<i\b[^>]*class=["'][^"']*(?:icon|fa-|material-icons|tabler|phosphor|lucide)/i.test(html)) iconTechs.push("icon-font-or-class");
  const rasterIconImages = [...html.matchAll(/<img\b([^>]*)>/gi)]
    .filter((match) => classifyRasterAssetRole(match[1] || "") === "ui-glyph");
  if (rasterIconImages.length > 0) iconTechs.push("raster-icon");
  if (/data-icon=|class=["'][^"']*(?:lucide|phosphor|tabler|radix|iconify)/i.test(html)) iconTechs.push("icon-library");
  const uniqueTechs = [...new Set(iconTechs)];
  if (uniqueTechs.length >= 3) {
    add("warn", "mixed-icon-tech", `Multiple icon technologies detected in ${path.relative(rootDir, file)} (${uniqueTechs.join(", ")}). Prefer one coherent icon system per UI.`, file);
  }

  const iconTilePattern = /<(?<tileTag>div|span|button|a)\b(?<attrs>[^>]*)>(?<body>[\s\S]{0,700}?(?:<svg\b[\s\S]{0,300}?<\/svg>|<i\b[^>]*>|<img\b[^>]*>)[\s\S]{0,700}?)<\/\k<tileTag>>\s*<h(?<level>[1-6])\b[^>]*>(?<heading>[\s\S]{0,140}?)<\/h\k<level>>/gi;
  for (const match of html.matchAll(iconTilePattern)) {
    const attrs = match.groups?.attrs || "";
    const body = match.groups?.body || "";
    const combined = `${attrs} ${body}`;
    if (!looksLikeIconTile(combined)) continue;
    const heading = stripTags(match.groups?.heading || "").trim().replace(/\s+/g, " ").slice(0, 60);
    add("warn", "icon-tile-stack", `Rounded/square icon tile appears stacked above h${match.groups?.level} "${heading}" in ${path.relative(rootDir, file)}. Prefer inline icons, side-by-side rows, or real imagery unless the reference explicitly requires icon tiles.`, file);
  }
}

function runStaticJsIconChecks(script, file, rootDir) {
  const imports = extractIconPackageImports(script);
  const unique = [...new Set(imports)];
  const approved = unique.filter((name) => APPROVED_ICON_PACKAGES.has(name));
  const unapproved = unique.filter((name) => !APPROVED_ICON_PACKAGES.has(name));

  if (approved.length > 1) {
    add("warn", "multiple-approved-icon-libraries", `Multiple approved icon libraries imported in ${path.relative(rootDir, file)} (${approved.join(", ")}). Pick one library for the whole UI glyph system.`, file);
  }

  if (unapproved.length > 0) {
    add("warn", "unapproved-icon-library", `Unapproved icon library import in ${path.relative(rootDir, file)} (${unapproved.join(", ")}). Prefer one of @phosphor-icons/react, hugeicons-react, @radix-ui/react-icons, or @tabler/icons-react unless preserving an existing project icon system.`, file);
  }
}

function runPackageIconChecks(file, rootDir) {
  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    add("warn", "package-json-parse", `Could not parse ${path.relative(rootDir, file)} for icon package checks.`, file);
    return;
  }

  const dependencyNames = [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {}),
  ];
  const unique = [...new Set(dependencyNames.filter(looksLikeIconPackage))];
  const approved = unique.filter((name) => APPROVED_ICON_PACKAGES.has(name));
  const unapproved = unique.filter((name) => !APPROVED_ICON_PACKAGES.has(name));

  if (approved.length > 1) {
    add("warn", "multiple-approved-icon-libraries", `Multiple approved icon libraries are declared in ${path.relative(rootDir, file)} (${approved.join(", ")}). Use one as the UI glyph source and remove unused icon packs when possible.`, file);
  }

  if (unapproved.length > 0) {
    add("warn", "unapproved-icon-library", `Unapproved icon library dependency in ${path.relative(rootDir, file)} (${unapproved.join(", ")}). Prefer one of @phosphor-icons/react, hugeicons-react, @radix-ui/react-icons, or @tabler/icons-react unless preserving an existing project icon system.`, file);
  }
}

function extractIconPackageImports(script) {
  const packages = [];
  const importPattern = /\bimport\b[\s\S]{0,240}?\bfrom\s*["']([^"']+)["']/g;
  for (const match of script.matchAll(importPattern)) {
    if (looksLikeIconPackage(match[1])) packages.push(match[1]);
  }
  const requirePattern = /\brequire\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of script.matchAll(requirePattern)) {
    if (looksLikeIconPackage(match[1])) packages.push(match[1]);
  }
  return packages;
}

function looksLikeIconPackage(name) {
  return APPROVED_ICON_PACKAGES.has(name) ||
    /(?:lucide|heroicons|iconify|react-icons|feather-icons|fontawesome|bootstrap-icons|material-icons|remixicon|ionicons)/i.test(name);
}

function looksLikeIconTile(text) {
  return (
    /(?:class|style)=["'][^"']*(?:icon|tile|badge|feature|action|quick|rounded|radius|circle|square|pill)/i.test(text) ||
    /(?:width|height)\s*:\s*(?:3[2-9]|[4-9]\d|1[01]\d|12[0-8])px/i.test(text) ||
    /(?:w|h)-(?:8|9|10|11|12|14|16|20|24)\b/i.test(text)
  ) && /(?:border-radius|rounded|radius|background|bg-|border)/i.test(text);
}

function runImageAssetNameChecks(imageFiles, rootDir) {
  for (const file of imageFiles) {
    if (/\.svg$/i.test(file)) continue;
    const name = path.basename(file).toLowerCase();
    if (classifyRasterAssetRole(name) !== "ui-glyph") continue;
    add(
      "warn",
      "generated-ui-glyph-asset",
      `Raster asset filename looks like a generated UI glyph: ${path.relative(rootDir, file)}. Status bars, nav icons, playback controls, buttons, toggles, and tiny device glyphs should be code-rendered. Product/object/cutout imagery such as device-product-image or object-cutout is allowed as a visual asset.`,
      file,
    );
  }
}

function isUiGlyphName(name) {
  return UI_GLYPH_ROLE_RE.test(normalizeAssetRoleText(name));
}

function isCutoutOrProductAssetName(name) {
  const normalized = normalizeAssetRoleText(name);
  return VISUAL_ASSET_ROLE_RE.test(normalized) || VISUAL_CONTEXT_RE.test(normalized) || PHYSICAL_OBJECT_NAME_RE.test(normalized);
}

function classifyRasterAssetRole(text) {
  const normalized = normalizeAssetRoleText(text);
  const hasVisualSlot = VISUAL_ASSET_ROLE_RE.test(normalized);
  const hasVisualContext = VISUAL_CONTEXT_RE.test(normalized);
  const hasPhysicalObject = PHYSICAL_OBJECT_NAME_RE.test(normalized);
  const isUiGlyph = isUiGlyphName(normalized);
  const hasControlContext = UI_CONTROL_CONTEXT_RE.test(normalized);

  if (hasVisualSlot && (!isUiGlyph || !hasControlContext)) return "visual-asset";
  if (isUiGlyph) return "ui-glyph";
  if (hasVisualSlot || hasVisualContext || hasPhysicalObject) return "visual-asset";
  return "unknown";
}

function normalizeAssetRoleText(text) {
  return String(text || "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[/"'=<>:()]+/g, " ")
    .toLowerCase();
}

function likelyImageIconInControl(imgAttrs, body) {
  const combined = `${imgAttrs || ""} ${body || ""}`.toLowerCase();
  const role = classifyRasterAssetRole(combined);
  if (role === "visual-asset") return false;
  if (role === "ui-glyph") return true;
  const visibleText = stripTags(body).trim();
  const onlyImageControl = /<img\b/i.test(body) && !visibleText && !/<(?:svg|i)\b/i.test(body);
  return onlyImageControl && !isCutoutOrProductAssetName(combined);
}

function stripTags(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ");
}

function runStaticCssDesignChecks(cssText, rootDir) {
  if (/\blinear-gradient\([^)]*\)[\s\S]{0,200}(background-clip:\s*text|-webkit-background-clip:\s*text|-webkit-text-fill-color:\s*transparent)/i.test(cssText)) {
    add("warn", "gradient-text", "Gradient text detected. Keep only when the reference explicitly needs it.", rootDir);
  }

  const sideStripeMatches = [...cssText.matchAll(/border-(?:left|right)\s*:\s*(\d+(?:\.\d+)?)px\s+solid/gi)]
    .filter((match) => Number(match[1]) > 1);
  if (sideStripeMatches.length > 0) {
    add("warn", "side-stripe-border", "Thick side border accents detected. Prefer full borders, background tints, icons, or spacing unless the reference explicitly uses side stripes.", rootDir);
  }

  const colors = extractHexColors(cssText);
  const palette = dominantPalette(colors);
  if (palette && palette.ratio >= 0.55 && colors.length >= 6) {
    add("warn", "single-family-palette", `CSS colors lean heavily toward ${palette.name} (${Math.round(palette.ratio * 100)}%). Add contrast or a secondary accent if this was not intentional.`, rootDir);
  }

  const largeRadiusMatches = [...cssText.matchAll(/border-radius\s*:\s*(\d+(?:\.\d+)?)px/gi)].filter((match) => Number(match[1]) >= 28);
  if (largeRadiusMatches.length >= 6) {
    add("warn", "over-rounded-ui", "Many elements use large border radii. Check whether the page is becoming too generic or pill-heavy.", rootDir);
  }

  if (/(box-shadow|filter:\s*drop-shadow)/i.test(cssText)) {
    const shadowCount = (cssText.match(/box-shadow|filter:\s*drop-shadow/gi) || []).length;
    if (shadowCount >= 10) add("warn", "shadow-heavy", "Many shadow effects detected. Check visual hierarchy and avoid heavy card stacks.", rootDir);
  }

  const tinyFontMatches = [...cssText.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/gi)].filter((match) => Number(match[1]) < 14);
  if (tinyFontMatches.length >= 3) {
    add("warn", "tiny-fonts", "Several font sizes below 14px detected. Body and interactive text should generally stay at 16px or above.", rootDir);
  }

  const fixedTextWidthMatches = [...cssText.matchAll(/(?:width|min-width|max-width)\s*:\s*(\d+(?:\.\d+)?)px/gi)].filter((match) => Number(match[1]) >= 40 && Number(match[1]) <= 180);
  if (fixedTextWidthMatches.length >= 10) {
    add("warn", "many-fixed-small-widths", "Many small fixed pixel widths detected. Check labels, buttons, and translated text for overflow risk.", rootDir);
  }
}

function extractRefs(content, type) {
  const refs = [];
  if (type === "html") {
    const attrPattern = /\b(?:src|href|poster|data-src|data-image)\s*=\s*["']([^"']+)["']/gi;
    for (const match of content.matchAll(attrPattern)) refs.push(match[1]);
    const stylePattern = /url\((["']?)([^"')]+)\1\)/gi;
    for (const match of content.matchAll(stylePattern)) refs.push(match[2]);
  } else {
    const urlPattern = /url\((["']?)([^"')]+)\1\)/gi;
    for (const match of content.matchAll(urlPattern)) refs.push(match[2]);
  }
  return refs.map((ref) => ref.trim()).filter(Boolean);
}

function classifyRef(rawRef, ownerFile, rootDir) {
  if (/^(#|mailto:|tel:|javascript:|data:|blob:)/i.test(rawRef)) return;
  if (/^https?:\/\//i.test(rawRef) || rawRef.startsWith("//")) {
    add("warn", "remote-asset", `Remote asset still referenced from ${path.relative(rootDir, ownerFile)}: ${rawRef}`, ownerFile);
    return;
  }

  const clean = decodeURIComponent(rawRef.split("#")[0].split("?")[0]);
  if (!clean || clean.startsWith("#")) return;
  if (/^\w+:/.test(clean)) return;

  const candidate = clean.startsWith("/")
    ? path.join(rootDir, clean.slice(1))
    : path.resolve(path.dirname(ownerFile), clean);

  if (!fs.existsSync(candidate)) {
    add("fail", "broken-local-asset", `Missing local asset referenced from ${path.relative(rootDir, ownerFile)}: ${rawRef}`, candidate);
  }
}

function extractHexColors(cssText) {
  const colors = [];
  for (const match of cssText.matchAll(/#([0-9a-f]{3,8})\b/gi)) {
    const rgb = hexToRgb(match[1]);
    if (rgb) colors.push(rgb);
  }
  return colors;
}

function hexToRgb(hex) {
  let value = hex;
  if (value.length === 3 || value.length === 4) {
    value = value.slice(0, 3).split("").map((char) => char + char).join("");
  } else {
    value = value.slice(0, 6);
  }
  if (value.length !== 6) return null;
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function dominantPalette(colors) {
  if (colors.length === 0) return null;
  const buckets = {
    "purple-blue": 0,
    "slate-blue": 0,
    "cream-sand": 0,
    "brown-orange": 0,
  };

  for (const color of colors) {
    const hsl = rgbToHsl(color.r, color.g, color.b);
    if (hsl.h >= 235 && hsl.h <= 295 && hsl.s > 0.18) buckets["purple-blue"] += 1;
    if (hsl.h >= 200 && hsl.h <= 235 && hsl.s <= 0.35 && hsl.l <= 0.55) buckets["slate-blue"] += 1;
    if (hsl.h >= 35 && hsl.h <= 70 && hsl.l >= 0.72) buckets["cream-sand"] += 1;
    if (hsl.h >= 15 && hsl.h <= 40 && hsl.s > 0.2) buckets["brown-orange"] += 1;
  }

  const [name, count] = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
  return { name, ratio: count / colors.length };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    if (max === g) h = (b - r) / d + 2;
    if (max === b) h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

async function runBrowserChecks(rootDir, entryFile) {
  const playwright = await loadPlaywright(rootDir);
  if (!playwright?.chromium) {
    add("info", "browser-skip", "Playwright is not available; browser render checks skipped.", rootDir);
    return;
  }
  if (playwright.source !== "project") {
    add("info", "browser-playwright-source", `Using Playwright from ${playwright.source}.`, rootDir);
  }

  const browserTarget = resolveBrowserTarget(rootDir, entryFile);
  if (browserTarget.rootDir !== rootDir || browserTarget.entryFile !== entryFile) {
    add("info", "browser-entry", `Using built browser entry: ${path.relative(rootDir, browserTarget.entryFile)}`, rootDir);
  }
  const server = await startServer(browserTarget.rootDir);
  const entryPath = path.relative(browserTarget.rootDir, browserTarget.entryFile).split(path.sep).map(encodeURIComponent).join("/");
  const url = `${server.url}/${entryPath}`;
  const browser = await playwright.chromium.launch({ headless: true });

  try {
    const viewports = [
      { name: "desktop", width: 1440, height: 1000, isMobile: false },
      { name: "mobile", width: 390, height: 844, isMobile: true },
    ];

    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.isMobile });
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => consoleErrors.push(error.message));

      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(250);

      for (const message of consoleErrors.slice(0, 5)) {
        add("fail", "console-error", `${viewport.name}: ${message}`, rootDir);
      }

      const audit = await page.evaluate(() => {
        const textSelector = "p,span,a,button,h1,h2,h3,h4,h5,h6,li,label,input,textarea,figcaption";
        const panelSelector = '[class*="card" i], [class*="panel" i], [class*="tile" i], [class*="surface" i]';
        const root = document.scrollingElement || document.documentElement;
        const brokenImages = [...document.images]
          .filter((img) => img.currentSrc && img.naturalWidth === 0)
          .map((img) => img.getAttribute("src") || img.currentSrc)
          .slice(0, 10);
        const overflowText = [...document.querySelectorAll(textSelector)]
          .filter((el) => {
            const style = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if (rect.width < 4 || rect.height < 4 || style.visibility === "hidden" || style.display === "none") return false;
            if (!String(el.textContent || el.value || "").trim()) return false;
            if (Number.parseFloat(style.fontSize) < 13 && !/(hidden|clip|auto|scroll)/.test(`${style.overflow} ${style.overflowX} ${style.overflowY}`)) return false;
            if (Number.parseFloat(style.fontSize) < 10 && rect.width < 80 && rect.height < 20) return false;
            return hasTextOverflow(el, style);
          })
          .map(labelFor)
          .slice(0, 10);
        const lowContrast = [...document.querySelectorAll(textSelector)]
          .map((el) => contrastFinding(el))
          .filter(Boolean)
          .slice(0, 10);
        const smallTouchTargets = [...document.querySelectorAll('button,a,input,select,textarea,[role="button"],[tabindex]')]
          .filter((el) => {
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            if (rect.width < 4 || rect.height < 4 || style.visibility === "hidden" || style.display === "none") return false;
            return rect.width < 44 || rect.height < 44;
          })
          .map((el) => `${labelFor(el)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}px`)
          .slice(0, 10);
        const denseMicroText = [...document.querySelectorAll('[class*="card" i], [class*="tile" i], [class*="device" i], [data-asset-role*="device" i]')]
          .flatMap((container) => [...container.querySelectorAll('p,span,small,h1,h2,h3,h4,h5,h6,button,a,label')].map((el) => ({ container, el })))
          .filter(({ el }) => {
            const text = String(el.innerText || el.textContent || "").trim();
            if (!text || text.length > 42) return false;
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            if (rect.width < 3 || rect.height < 3 || style.visibility === "hidden" || style.display === "none") return false;
            if (el.closest(".sr-only,[aria-hidden='true']")) return false;
            const size = Number.parseFloat(style.fontSize) || 16;
            return size < 8 || rect.height < 8;
          })
          .map(({ container, el }) => {
            const size = Number.parseFloat(getComputedStyle(el).fontSize) || 0;
            return `${labelFor(container)} contains ${labelFor(el)} at ${size.toFixed(1)}px`;
          })
          .slice(0, 10);
        const unlabeledIconButtons = [...document.querySelectorAll('button,a,[role="button"]')]
          .filter((el) => {
            const text = String(el.innerText || "").trim();
            if (text) return false;
            if (!el.querySelector("svg,i,img")) return false;
            return !accessibleName(el);
          })
          .map(labelFor)
          .slice(0, 10);
        const offCenterIcons = findOffCenterIcons().slice(0, 12);
        const nestedPanels = [...document.querySelectorAll(panelSelector)]
          .filter((el) => el.querySelector(panelSelector))
          .map(labelFor)
          .slice(0, 10);
        const horizontalOverflow = root.scrollWidth > window.innerWidth + 2;
        const blankish = document.body.innerText.trim().length < 20 && document.images.length === 0;
        return { brokenImages, overflowText, lowContrast, smallTouchTargets, denseMicroText, unlabeledIconButtons, offCenterIcons, nestedPanels, horizontalOverflow, blankish };

        function labelFor(el) {
          const text = String(el.innerText || el.getAttribute("aria-label") || el.getAttribute("alt") || el.className || el.tagName).trim().replace(/\s+/g, " ");
          return `${el.tagName.toLowerCase()} ${text.slice(0, 80)}`;
        }

        function findOffCenterIcons() {
          const iconContextSelector = [
            "button",
            "a",
            "[role='button']",
            "[class*='icon-button' i]",
            "[class*='status' i]",
            "[class*='nav' i]",
            "[class*='toolbar' i]",
            "[class*='tab' i]",
            "[class*='player' i]",
            "[class*='quick' i]",
            "[class*='action' i]",
            "[class*='toggle' i]",
            "[class*='switch' i]",
          ].join(",");
          const contexts = [...document.querySelectorAll(iconContextSelector)];
          const findings = [];
          for (const context of contexts) {
            if (context.closest("[data-asset-role*='device-product' i], [data-asset-role*='product' i], [data-asset-role*='cutout' i]")) continue;
            const contextRect = context.getBoundingClientRect();
            const contextStyle = getComputedStyle(context);
            if (contextRect.width < 12 || contextRect.height < 12 || contextStyle.visibility === "hidden" || contextStyle.display === "none") continue;
            const svgs = [...context.querySelectorAll("svg")].filter((svg) => {
              const rect = svg.getBoundingClientRect();
              const style = getComputedStyle(svg);
              if (rect.width < 5 || rect.height < 5 || style.visibility === "hidden" || style.display === "none") return false;
              if (svg.closest("[data-asset-role*='device-product' i], [data-asset-role*='product' i], [data-asset-role*='cutout' i]")) return false;
              return true;
            });
            if (svgs.length !== 1) continue;
            const svg = svgs[0];
            const svgRect = svg.getBoundingClientRect();
            const text = String(context.innerText || "").trim();
            const iconOnly = !text || context.matches("[class*='icon-button' i], [class*='status-icons' i], [class*='toggle' i], [class*='switch' i]");
            if (!iconOnly) continue;
            const contextCenterX = contextRect.left + contextRect.width / 2;
            const contextCenterY = contextRect.top + contextRect.height / 2;
            const svgCenterX = svgRect.left + svgRect.width / 2;
            const svgCenterY = svgRect.top + svgRect.height / 2;
            const dx = svgCenterX - contextCenterX;
            const dy = svgCenterY - contextCenterY;
            const offset = iconOnly ? Math.hypot(dx, dy) : Math.abs(dx);
            const expectedMax = Math.max(1.75, Math.min(contextRect.width, contextRect.height) * 0.065);
            const tooSmall = iconOnly && Math.min(svgRect.width, svgRect.height) < Math.min(contextRect.width, contextRect.height) * 0.34;
            const tooLarge = iconOnly && Math.max(svgRect.width, svgRect.height) > Math.min(contextRect.width, contextRect.height) * 0.82;
            if (offset > expectedMax || tooSmall || tooLarge) {
              const sizeNote = tooSmall ? ", icon too small for container" : tooLarge ? ", icon too large for container" : "";
              const axisNote = iconOnly ? `dx=${dx.toFixed(1)}px dy=${dy.toFixed(1)}px` : `horizontal dx=${dx.toFixed(1)}px`;
              findings.push(`${labelFor(context)} icon center offset ${axisNote} in ${Math.round(contextRect.width)}x${Math.round(contextRect.height)}px container${sizeNote}`);
            }
          }
          return findings;
        }

        function hasTextOverflow(el, style) {
          const horizontal = el.scrollWidth > el.clientWidth + 3;
          const vertical = el.scrollHeight > el.clientHeight + 3;
          const allowsEllipsis = style.textOverflow === "ellipsis" && /(hidden|clip)/.test(style.overflowX || style.overflow);
          if (horizontal && !allowsEllipsis) {
            const clipsHorizontal = /(hidden|clip|auto|scroll)/.test(style.overflowX || style.overflow);
            if (clipsHorizontal) return true;
            const textRect = textBounds(el);
            const guardRect = (el.closest("button,a,[class*='card' i],[class*='tile' i],[class*='device' i],[class*='chip' i],[class*='pill' i],[class*='panel' i]") || el).getBoundingClientRect();
            if (textRect && (textRect.left < guardRect.left - 2 || textRect.right > guardRect.right + 2)) return true;
          }
          if (!vertical) return false;
          const clipsVertical = /(hidden|clip|auto|scroll)/.test(style.overflowY || style.overflow);
          return clipsVertical;
        }

        function textBounds(el) {
          try {
            const range = document.createRange();
            range.selectNodeContents(el);
            const rect = range.getBoundingClientRect();
            range.detach();
            return rect.width || rect.height ? rect : null;
          } catch {
            return null;
          }
        }

        function contrastFinding(el) {
          const text = String(el.innerText || el.value || "").trim();
          if (!text) return null;
          const rect = el.getBoundingClientRect();
          if (rect.width < 4 || rect.height < 4) return null;
          const style = getComputedStyle(el);
          const fg = parseRgb(style.color);
          const bg = effectiveBackground(el);
          if (!fg || !bg) return null;
          const ratio = contrastRatio(fg, bg);
          const fontSize = Number.parseFloat(style.fontSize) || 16;
          const threshold = fontSize >= 24 ? 3 : 4.5;
          if (ratio >= threshold) return null;
          return `${labelFor(el)} contrast ${ratio.toFixed(2)}:1`;
        }

        function accessibleName(el) {
          const direct = el.getAttribute("aria-label") || el.getAttribute("title") || el.getAttribute("alt");
          if (direct && direct.trim()) return direct.trim();
          const labelledBy = el.getAttribute("aria-labelledby");
          if (labelledBy) {
            return labelledBy
              .split(/\s+/)
              .map((id) => document.getElementById(id)?.innerText || "")
              .join(" ")
              .trim();
          }
          const imgAlt = el.querySelector("img[alt]")?.getAttribute("alt");
          const svgTitle = el.querySelector("svg title")?.textContent;
          return String(imgAlt || svgTitle || "").trim();
        }

        function effectiveBackground(el) {
          let current = el;
          while (current && current !== document.documentElement) {
            const bg = parseRgb(getComputedStyle(current).backgroundColor);
            if (bg && bg.a > 0.05) return bg;
            current = current.parentElement;
          }
          return { r: 255, g: 255, b: 255, a: 1 };
        }

        function parseRgb(value) {
          const match = value && value.match(/rgba?\(([^)]+)\)/i);
          if (!match) return null;
          const parts = match[1].split(",").map((part) => Number.parseFloat(part));
          if (parts.length < 3) return null;
          return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
        }

        function luminance(color) {
          const channel = [color.r, color.g, color.b].map((value) => {
            value /= 255;
            return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * channel[0] + 0.7152 * channel[1] + 0.0722 * channel[2];
        }

        function contrastRatio(a, b) {
          const la = luminance(a);
          const lb = luminance(b);
          return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
        }
      });

      if (audit.blankish) add("fail", "blank-render", `${viewport.name}: page appears blank or nearly empty.`, rootDir);
      if (audit.horizontalOverflow) add("fail", "horizontal-scroll", `${viewport.name}: document is wider than viewport.`, rootDir);
      for (const img of audit.brokenImages) add("fail", "broken-image", `${viewport.name}: broken image ${img}`, rootDir);
      for (const item of audit.overflowText) add("fail", "text-overflow", `${viewport.name}: ${item}`, rootDir);
      for (const item of audit.lowContrast) add("warn", "low-contrast", `${viewport.name}: ${item}`, rootDir);
      for (const item of audit.smallTouchTargets) add("warn", "small-touch-target", `${viewport.name}: ${item}`, rootDir);
      for (const item of audit.denseMicroText) add("warn", "dense-micro-text", `${viewport.name}: ${item}. Card/device UI text this small can render like pseudo text or garbled marks; hide nonessential metadata or enlarge it.`, rootDir);
      for (const item of audit.unlabeledIconButtons) add("warn", "unlabeled-icon-button", `${viewport.name}: icon-only control lacks accessible name around ${item}`, rootDir);
      for (const item of audit.offCenterIcons) add("warn", "off-center-icon", `${viewport.name}: ${item}. Check optical centering with a zoomed screenshot; UI glyphs should be code-rendered and visually centered in their hit area.`, rootDir);
      for (const item of audit.nestedPanels) add("warn", "nested-panel", `${viewport.name}: nested card/panel structure around ${item}`, rootDir);

      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.instance.close(resolve));
  }
}

async function loadPlaywright(rootDir) {
  try {
    const mod = await import("playwright");
    const chromium = mod.chromium || mod.default?.chromium;
    if (chromium) return { chromium, source: "project" };
  } catch {
    // Fall through to explicit module search paths.
  }

  const require = createRequire(import.meta.url);
  const nodePathDirs = String(process.env.NODE_PATH || "")
    .split(path.delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
  const candidates = [
    process.env.PLAYWRIGHT_NODE_MODULES,
    ...nodePathDirs,
    path.join(rootDir, "node_modules"),
    path.join(process.cwd(), "node_modules"),
    path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const resolved = require.resolve("playwright", { paths: [candidate] });
      const mod = await import(pathToFileURL(resolved).href);
      const chromium = mod.chromium || mod.default?.chromium;
      if (chromium) return { chromium, source: resolved };
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function resolveBrowserTarget(rootDir, entryFile) {
  const distEntry = path.join(rootDir, "dist", "index.html");
  if (!fs.existsSync(distEntry)) return { rootDir, entryFile };

  let html = "";
  try {
    html = fs.readFileSync(entryFile, "utf8");
  } catch {
    return { rootDir, entryFile };
  }

  const packagePath = path.join(rootDir, "package.json");
  const isViteLike = fs.existsSync(packagePath) && /"vite"\s*:/.test(fs.readFileSync(packagePath, "utf8"));
  const importsUnbuiltSource = /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["'][^"']*\.(?:jsx|tsx)["']/i.test(html) ||
    /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']\/?src\//i.test(html);

  if (isViteLike || importsUnbuiltSource) {
    return { rootDir: path.dirname(distEntry), entryFile: distEntry };
  }

  return { rootDir, entryFile };
}

async function startServer(rootDir) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://local").pathname);
    let filePath = path.join(rootDir, urlPath);
    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": contentType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return { instance: server, url: `http://127.0.0.1:${address.port}` };
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
  }[ext] || "application/octet-stream";
}

function add(level, rule, message, file = null) {
  findings.push({ level, rule, message, file: file ? path.resolve(file) : null });
}

function buildResult(rootDir, entryFile, findings) {
  const failCount = findings.filter((finding) => finding.level === "fail").length;
  const warnCount = findings.filter((finding) => finding.level === "warn").length;
  return {
    ok: failCount === 0,
    status: failCount > 0 ? "fail" : warnCount > 0 ? "pass-with-warnings" : "pass",
    target: rootDir,
    entry: entryFile,
    counts: {
      fail: failCount,
      warn: warnCount,
      info: findings.filter((finding) => finding.level === "info").length,
    },
    findings,
  };
}

function printSummary(result) {
  console.log(`Image2 UI output audit: ${result.status}`);
  console.log(`Target: ${result.target}`);
  if (result.entry) console.log(`Entry: ${result.entry}`);
  console.log(`Findings: ${result.counts.fail} fail, ${result.counts.warn} warn, ${result.counts.info} info`);
  for (const finding of result.findings) {
    const label = finding.level.toUpperCase().padEnd(4);
    console.log(`[${label}] ${finding.rule}: ${finding.message}`);
  }
  if (!result.ok) {
    console.log("\nFix FAIL items before calling the demo finished.");
  }
}
