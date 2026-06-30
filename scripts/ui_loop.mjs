#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const VALUE_OPTIONS = new Set([
  "--reference",
  "-r",
  "--actual",
  "-a",
  "--out-dir",
  "--viewport",
  "--build",
  "--capture-class",
  "--capture-selector",
  "--wait",
  "--title",
]);
const positionals = positionalArgs();
const targetArg = positionals[0];
const referenceArg = readOption("--reference") || readOption("-r");
const actualArg = readOption("--actual") || readOption("-a");
const outDirArg = readOption("--out-dir");
const viewportArg = readOption("--viewport") || "1280x760";
const buildCommand = readOption("--build");
const captureClass = readOption("--capture-class");
const captureSelector = readOption("--capture-selector");
const waitMs = Number.parseInt(readOption("--wait") || "350", 10);
const jsonMode = args.includes("--json");
const noBrowser = args.includes("--no-browser");
const strictMode = args.includes("--strict");
const fullPage = args.includes("--full-page");
const title = readOption("--title") || "Image2 UI Loop Compare";

if (!targetArg || args.includes("--help") || args.includes("-h")) {
  printUsage();
  process.exit(args.includes("--help") || args.includes("-h") ? 0 : 1);
}

const targetPath = path.resolve(process.cwd(), targetArg);
if (!fs.existsSync(targetPath)) fail(`Target does not exist: ${targetPath}`);

const targetStat = fs.statSync(targetPath);
const rootDir = targetStat.isDirectory() ? targetPath : path.dirname(targetPath);
const entryFile = targetStat.isDirectory() ? findEntryHtml(rootDir) : targetPath;
const referencePath = referenceArg ? path.resolve(process.cwd(), referenceArg) : null;
if (referencePath && !fs.existsSync(referencePath)) fail(`Reference image not found: ${referencePath}`);
if (!entryFile) fail(`No HTML entry file found in ${rootDir}`);

const viewport = parseViewport(viewportArg);
const outDir = path.resolve(process.cwd(), outDirArg || path.join(rootDir, ".image2-ui"));
const actualPath = actualArg ? path.resolve(process.cwd(), actualArg) : path.join(outDir, "loop-actual.png");
const comparePath = referencePath ? path.join(outDir, "loop-reference-compare.png") : null;
const reportJsonPath = path.join(outDir, "loop-report.json");
const reportMdPath = path.join(outDir, "loop-report.md");
const commands = [];
const artifacts = {};

fs.mkdirSync(outDir, { recursive: true });

log(`Image2 UI loop target: ${rootDir}`);
if (buildCommand) runBuild(buildCommand, rootDir);

let capture = null;
if (actualArg) {
  if (!fs.existsSync(actualPath)) fail(`Actual screenshot not found: ${actualPath}`);
  capture = { ok: true, skipped: true, path: actualPath, reason: "--actual was provided" };
  artifacts.actual = actualPath;
} else if (!noBrowser) {
  capture = await captureScreenshot({ rootDir, entryFile, actualPath, viewport, captureClass, captureSelector, waitMs, fullPage });
  artifacts.actual = actualPath;
} else {
  capture = { ok: false, skipped: true, reason: "--no-browser was provided and no --actual screenshot was supplied" };
}

const audit = runAudit({ target: targetPath, referencePath, noBrowser });
const compare = referencePath && fs.existsSync(actualPath)
  ? runCompare({ referencePath, actualPath, comparePath, title })
  : { ok: false, skipped: true, reason: referencePath ? "Actual screenshot unavailable" : "No --reference provided" };

if (comparePath && fs.existsSync(comparePath)) artifacts.compare = comparePath;
const compareHtmlPath = comparePath ? comparePath.replace(/\.png$/i, ".html") : null;
if (compareHtmlPath && fs.existsSync(compareHtmlPath)) artifacts.compareHtml = compareHtmlPath;

const report = buildLoopReport({
  rootDir,
  entryFile,
  referencePath,
  viewport,
  capture,
  audit,
  compare,
  artifacts,
  commands,
  strictMode,
});

artifacts.reportJson = reportJsonPath;
artifacts.reportMd = reportMdPath;
report.artifacts = artifacts;

fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(reportMdPath, buildMarkdownReport(report));

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printSummary(report);
}

const hasAuditFail = (audit.result?.counts?.fail || 0) > 0 || !audit.ok;
const strictFailure = strictMode && (report.fixQueue.mustFix.length > 0 || report.fixQueue.shouldFix.length > 0);
process.exit(hasAuditFail || strictFailure ? 2 : 0);

function readOption(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  return value && !value.startsWith("-") ? value : null;
}

function positionalArgs() {
  const out = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith("-")) {
      if (VALUE_OPTIONS.has(arg) && args[index + 1] && !args[index + 1].startsWith("-")) index += 1;
      continue;
    }
    out.push(arg);
  }
  return out;
}

function printUsage() {
  console.log(`Usage:
  image2-ui loop <demo-dir-or-html> --reference reference.png [--build "npm run build"]

Options:
  --actual output.png              Use an existing screenshot instead of capturing a new one.
  --out-dir .image2-ui             Directory for loop artifacts. Defaults to <demo>/.image2-ui.
  --viewport 1280x760              Browser viewport used for capture.
  --capture-class capture-wide     Add a class to <html> before screenshot capture.
  --capture-selector .stage        Screenshot one element instead of the viewport.
  --full-page                      Capture the whole page instead of the viewport.
  --no-browser                     Skip browser capture and browser audit checks.
  --strict                         Exit non-zero on warnings and prioritized fix items.
  --json                           Print the loop report JSON.

The loop command runs build -> screenshot -> validate -> compare -> report. It does not mutate UI code; use the generated fix queue for the next Codex edit pass.`);
}

function log(message) {
  if (!jsonMode) console.log(message);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseViewport(value) {
  const match = String(value).match(/^(\d{3,5})x(\d{3,5})$/i);
  if (!match) fail(`Invalid --viewport value: ${value}. Expected WIDTHxHEIGHT, e.g. 1280x760.`);
  return { width: Number(match[1]), height: Number(match[2]), label: `${match[1]}x${match[2]}` };
}

function findEntryHtml(dir) {
  const index = path.join(dir, "index.html");
  if (fs.existsSync(index)) return index;
  return listFiles(dir).find((file) => file.endsWith(".html")) || null;
}

function listFiles(dir) {
  const ignored = new Set([".git", "node_modules", ".next", "dist", "build", ".turbo", ".image2-ui"]);
  const out = [];
  walk(dir);
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

function runBuild(command, cwd) {
  log(`Running build: ${command}`);
  commands.push({ name: "build", command, cwd });
  const result = spawnSync(command, {
    cwd,
    shell: true,
    stdio: jsonMode ? "pipe" : "inherit",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    if (jsonMode && result.stderr) console.error(result.stderr.trim());
    fail(`Build command failed with status ${result.status}: ${command}`);
  }
}

function runAudit({ target, referencePath, noBrowser }) {
  const auditScript = path.join(__dirname, "ui_output_audit.mjs");
  const auditArgs = [auditScript, target, "--json"];
  if (referencePath) auditArgs.push("--reference", referencePath);
  if (noBrowser) auditArgs.push("--no-browser");
  commands.push({ name: "validate", command: `${process.execPath} ${quoteArgs(auditArgs)}`, cwd: process.cwd() });
  log("Running audit: image2-ui validate");
  const result = spawnSync(process.execPath, auditArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });

  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (error) {
    return {
      ok: false,
      status: "parse-error",
      exitCode: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      error: `Could not parse audit JSON: ${error.message}`,
    };
  }

  return {
    ok: result.status === 0 || result.status === 2,
    status: parsed.status,
    exitCode: result.status,
    result: parsed,
    stderr: result.stderr,
  };
}

function runCompare({ referencePath, actualPath, comparePath, title }) {
  const compareScript = path.join(__dirname, "ui_compare.mjs");
  const compareArgs = [
    compareScript,
    "--reference",
    referencePath,
    "--actual",
    actualPath,
    "--out",
    comparePath,
    "--title",
    title,
  ];
  commands.push({ name: "compare", command: `${process.execPath} ${quoteArgs(compareArgs)}`, cwd: process.cwd() });
  log("Running compare: image2-ui compare");
  const result = spawnSync(process.execPath, compareArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  return {
    ok: result.status === 0,
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    path: comparePath,
    htmlPath: comparePath.replace(/\.png$/i, ".html"),
  };
}

async function captureScreenshot({ rootDir, entryFile, actualPath, viewport, captureClass, captureSelector, waitMs, fullPage }) {
  const playwright = await loadPlaywright(rootDir);
  if (!playwright?.chromium) fail("Playwright is not available; pass --actual output.png or install Playwright to capture a screenshot.");

  const browserTarget = resolveBrowserTarget(rootDir, entryFile);
  const server = await startServer(browserTarget.rootDir);
  const browser = await playwright.chromium.launch({ headless: true });
  const urlPath = path.relative(browserTarget.rootDir, browserTarget.entryFile).split(path.sep).map(encodeURIComponent).join("/");
  const url = `${server.url}/${urlPath}`;
  commands.push({ name: "capture", command: `playwright screenshot ${url} ${actualPath}`, cwd: rootDir });
  log(`Capturing screenshot: ${actualPath}`);

  try {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.goto(url, { waitUntil: "networkidle" });
    if (captureClass) {
      await page.evaluate((className) => {
        document.documentElement.classList.add(...className.split(/\s+/).filter(Boolean));
      }, captureClass);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(Number.isFinite(waitMs) ? waitMs : 350);

    if (captureSelector) {
      const element = await page.$(captureSelector);
      if (element) {
        await element.screenshot({ path: actualPath });
      } else {
        await page.screenshot({ path: actualPath, fullPage });
      }
    } else {
      await page.screenshot({ path: actualPath, fullPage });
    }
    await page.close();
    return {
      ok: true,
      path: actualPath,
      viewport: viewport.label,
      captureClass: captureClass || null,
      captureSelector: captureSelector || null,
      playwrightSource: playwright.source,
      browserEntry: browserTarget.entryFile,
    };
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

  if (isViteLike || importsUnbuiltSource) return { rootDir: path.dirname(distEntry), entryFile: distEntry };
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

function buildLoopReport({ rootDir, entryFile, referencePath, viewport, capture, audit, compare, artifacts, commands, strictMode }) {
  const findings = audit.result?.findings || [];
  const fixQueue = buildFixQueue(findings, Boolean(referencePath));
  const status = statusFor(audit, fixQueue);
  const report = {
    status,
    strict: strictMode,
    target: rootDir,
    entry: entryFile,
    reference: referencePath,
    viewport: viewport.label,
    generatedAt: new Date().toISOString(),
    audit: {
      ok: audit.ok,
      status: audit.status,
      exitCode: audit.exitCode,
      counts: audit.result?.counts || { fail: 0, warn: 0, info: 0 },
      error: audit.error || null,
    },
    capture,
    compare,
    fixQueue,
    commands,
    artifacts,
    nextLoop: [
      "Fix every must-fix item first, especially broken assets, overflow, generated UI glyphs, icon alignment, and dense pseudo text.",
      "Then address should-fix items that affect reference similarity, contrast, tap targets, spacing, or AI-template visual patterns.",
      "Re-run the same image2-ui loop command and compare loop-report.md plus loop-reference-compare.png against the previous round.",
    ],
  };
  return report;
}

function statusFor(audit, fixQueue) {
  if (!audit.ok || (audit.result?.counts?.fail || 0) > 0) return "fail";
  if (fixQueue.mustFix.length > 0) return "needs-fix";
  if (fixQueue.shouldFix.length > 0) return "needs-review";
  return "ready-for-human-review";
}

function buildFixQueue(findings, hasReference) {
  const mustRules = new Set([
    "broken-local-asset",
    "broken-image",
    "blank-render",
    "console-error",
    "horizontal-scroll",
    "missing-entry",
    "missing-html",
    "text-overflow",
    "zoom-disabled",
    "generated-ui-glyph-asset",
    "image-icon-in-control",
    "off-center-icon",
  ]);
  const shouldRules = new Set([
    "dense-micro-text",
    "low-contrast",
    "small-touch-target",
    "nested-panel",
    "gradient-text",
    "single-family-palette",
    "over-rounded-ui",
    "shadow-heavy",
    "icon-tile-stack",
    "mixed-icon-tech",
    "multiple-approved-icon-libraries",
    "unapproved-icon-library",
    "repeated-icon-card-grid",
    "remote-asset",
    "tiny-fonts",
    "many-fixed-small-widths",
    "cutout-asset-missing-alt",
    "no-local-images",
  ]);
  const mustFix = [];
  const shouldFix = [];
  const accepted = [];
  const maps = {
    mustFix: new Map(),
    shouldFix: new Map(),
    accepted: new Map(),
  };

  for (const finding of findings) {
    const normalized = normalizeFindingMessage(finding.message);
    const item = {
      rule: finding.rule,
      level: finding.level,
      message: normalized.message,
      file: finding.file,
      viewports: normalized.viewport ? [normalized.viewport] : [],
      occurrences: 1,
      action: actionFor(finding),
    };
    const key = `${item.level}:${item.rule}:${item.message}:${item.file || ""}`;
    if (finding.level === "fail" || mustRules.has(finding.rule)) pushDedup(mustFix, maps.mustFix, key, item);
    else if (finding.level === "warn" || shouldRules.has(finding.rule)) pushDedup(shouldFix, maps.shouldFix, key, item);
    else pushDedup(accepted, maps.accepted, key, item);
  }

  const referenceReview = hasReference ? referenceReviewItems() : [];
  return { mustFix, shouldFix, referenceReview, accepted };
}

function normalizeFindingMessage(message) {
  const match = String(message || "").match(/^(desktop|mobile):\s*(.+)$/i);
  if (!match) return { message, viewport: null };
  return { message: match[2], viewport: match[1].toLowerCase() };
}

function pushDedup(queue, map, key, item) {
  const existing = map.get(key);
  if (!existing) {
    map.set(key, item);
    queue.push(item);
    return;
  }
  existing.occurrences += 1;
  for (const viewport of item.viewports) {
    if (!existing.viewports.includes(viewport)) existing.viewports.push(viewport);
  }
}

function actionFor(finding) {
  const actions = {
    "broken-local-asset": "Fix the local asset path or generate/copy the missing image into the demo assets folder.",
    "broken-image": "Fix the image source and confirm the rendered screenshot shows the asset, not a blank slot.",
    "blank-render": "Fix app boot/runtime errors before visual polish; the page is not inspectable yet.",
    "console-error": "Resolve the browser error, then rerun the loop so layout and image checks are trustworthy.",
    "horizontal-scroll": "Remove fixed widths that exceed the viewport; add min-width: 0 and responsive grid/flex constraints.",
    "text-overflow": "Give the text more space, reduce visible copy, add min-width: 0, or move secondary metadata into aria-label/title.",
    "generated-ui-glyph-asset": "Replace generated/raster UI glyphs with the unified UiIcon/IconRegistry/SVG sprite system.",
    "image-icon-in-control": "Replace bitmap icons inside buttons/nav/tabs with code-rendered icons from the chosen icon system.",
    "off-center-icon": "Separate hit area from glyph size, use grid centering, line-height: 0, and optical offsets for asymmetric glyphs.",
    "dense-micro-text": "Remove visible micro metadata, enlarge the card/text, or move details into aria-label/title/detail screens.",
    "low-contrast": "Darken foreground text or add a stable background plate until contrast clears the audit threshold.",
    "small-touch-target": "Keep the visible glyph small if needed, but expand the interactive hit area to at least 44x44px.",
    "nested-panel": "Flatten nested card/panel structures and use spacing or section bands for hierarchy.",
    "gradient-text": "Remove template-like gradient text unless the reference explicitly depends on it.",
    "single-family-palette": "Add a second supporting accent or neutral contrast so the page does not read as one-note AI color.",
    "over-rounded-ui": "Reduce large radius repetition unless the reference uses pill-heavy controls.",
    "shadow-heavy": "Reduce stacked shadows and use border, spacing, or tone for hierarchy.",
    "icon-tile-stack": "Avoid decorative rounded icon tiles above headings; use inline glyphs, rows, or real imagery.",
    "mixed-icon-tech": "Choose one icon source and route all UI glyphs through the same UiIcon/IconRegistry entry.",
    "multiple-approved-icon-libraries": "Keep only one approved icon package for the UI glyph language.",
    "unapproved-icon-library": "Switch new glyph work to @phosphor-icons/react, hugeicons-react, @radix-ui/react-icons, or @tabler/icons-react.",
    "remote-asset": "Land remote images/fonts/scripts locally or document why the demo intentionally depends on them.",
    "cutout-asset-missing-alt": "Add useful alt text for meaningful product/cutout imagery, or explicit empty alt for decorative assets.",
    "no-local-images": "Image-to-UI demos usually need local assets; generate or copy the required visual slots into the project.",
  };
  return actions[finding.rule] || "Inspect this finding in the rendered screenshot and either fix it or record why it is acceptable.";
}

function referenceReviewItems() {
  return [
    "Compare phone/canvas scale, vertical offsets, and page framing against loop-reference-compare.png.",
    "Zoom into status bar, back/menu/settings, player controls, bottom tabs, quick actions, toggles, and device glyphs; every UI glyph should be code-rendered and visually centered.",
    "Check product/device/object images separately from UI icons: product cutouts should sit in image slots and must not overlap labels, switches, or icon buttons.",
    "Look for pseudo text or garbled micro labels in cards, tiles, player controls, and quick actions; remove or enlarge them before another image2 round.",
    "If the reference uses generated visual assets, confirm prompts exclude UI symbols, labels, status bars, arrows, menu dots, toggles, and playback controls.",
  ];
}

function buildMarkdownReport(report) {
  return `# Image2 UI Loop Report

- Status: ${report.status}
- Target: ${report.target}
- Entry: ${report.entry}
- Reference: ${report.reference || "not provided"}
- Viewport: ${report.viewport}
- Audit: ${report.audit.status || "unknown"} (${report.audit.counts.fail} fail, ${report.audit.counts.warn} warn, ${report.audit.counts.info} info)

## Artifacts

- Actual screenshot: ${report.artifacts.actual || "not captured"}
- Compare PNG: ${report.artifacts.compare || "not generated"}
- Compare HTML: ${report.artifacts.compareHtml || "not generated"}
- JSON report: ${report.artifacts.reportJson}

## Must Fix

${formatQueue(report.fixQueue.mustFix, "No must-fix items.")}

## Should Fix

${formatQueue(report.fixQueue.shouldFix, "No should-fix items.")}

## Reference Review

${report.fixQueue.referenceReview.length ? report.fixQueue.referenceReview.map((item) => `- ${item}`).join("\n") : "- No reference image was provided."}

## Next Loop

${report.nextLoop.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## Commands

${report.commands.map((item) => `- ${item.name}: \`${item.command}\``).join("\n")}
`;
}

function formatQueue(items, emptyText) {
  if (!items.length) return `- ${emptyText}`;
  return items.map((item) => {
    const file = item.file ? ` (${item.file})` : "";
    const viewport = item.viewports?.length ? `[${item.viewports.join(", ")}] ` : "";
    const count = item.occurrences > 1 ? ` (${item.occurrences} occurrences)` : "";
    return `- [${item.level}/${item.rule}] ${viewport}${item.message}${count}${file}\n  Action: ${item.action}`;
  }).join("\n");
}

function printSummary(report) {
  console.log(`Image2 UI loop: ${report.status}`);
  console.log(`Audit: ${report.audit.status || "unknown"} (${report.audit.counts.fail} fail, ${report.audit.counts.warn} warn)`);
  if (report.artifacts.actual) console.log(`Actual screenshot: ${report.artifacts.actual}`);
  if (report.artifacts.compare) console.log(`Compare PNG: ${report.artifacts.compare}`);
  console.log(`Loop report: ${report.artifacts.reportMd}`);
  console.log(`Fix queue: ${report.fixQueue.mustFix.length} must-fix, ${report.fixQueue.shouldFix.length} should-fix`);
  if (report.fixQueue.mustFix.length > 0) {
    console.log("\nTop must-fix items:");
    for (const item of report.fixQueue.mustFix.slice(0, 5)) {
      console.log(`- ${item.rule}: ${item.message}`);
    }
  }
}

function quoteArgs(commandArgs) {
  return commandArgs.map((arg) => {
    if (/^[A-Za-z0-9_./:=@+-]+$/.test(arg)) return arg;
    return `"${String(arg).replace(/"/g, '\\"')}"`;
  }).join(" ");
}
