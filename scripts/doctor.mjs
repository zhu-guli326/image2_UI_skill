#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const report = { status: "ready", checks: {}, recommendations: [] };

report.checks.runtime = {
  node: process.versions.node,
  nodeOk: Number(process.versions.node.split(".")[0]) >= 20,
  python: detectPython(),
};
report.checks.runtime.pythonOk = Boolean(report.checks.runtime.python && report.checks.runtime.python.major >= 3 && report.checks.runtime.python.minor >= 10);
if (!report.checks.runtime.nodeOk) report.recommendations.push("Use Node.js 20 or newer.");
if (!report.checks.runtime.pythonOk) report.recommendations.push("Use Python 3.10 or newer.");

report.checks.browser = await checkBrowser();
if (!report.checks.browser.ready) report.recommendations.push("Install browser dependencies with npx playwright install chromium, or pass --no-browser for static validation.");

const outputDir = path.join(repoRoot, ".image2-ui", "doctor-output");
report.checks.output = { path: outputDir, writable: canWrite(outputDir) };
if (!report.checks.output.writable) report.recommendations.push(`Make the output directory writable: ${outputDir}`);

report.checks.media = {
  ffmpeg: Boolean(commandPath("ffmpeg")),
  ffprobe: Boolean(commandPath("ffprobe")),
  imagemagick: Boolean(commandPath("magick") || commandPath("convert")),
};
report.checks.fonts = detectFonts();
report.status = Object.values(report.checks).some((check) => check && (check.ready === false || check.writable === false || check.nodeOk === false || check.pythonOk === false)) ? "needs-attention" : "ready";
console.log(JSON.stringify(report, null, 2));
process.exit(report.status === "ready" ? 0 : 1);

function detectPython() {
  const command = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
  const result = spawnSync(command, ["-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')"], { encoding: "utf8" });
  if (result.status !== 0) return null;
  const [major, minor, patch] = result.stdout.trim().split(".").map(Number);
  return { command, version: result.stdout.trim(), major, minor, patch };
}

function commandPath(command) { return spawnSync(process.platform === "win32" ? "where" : "which", [command], { encoding: "utf8" }).status === 0 ? command : null; }
function canWrite(directory) { try { fs.mkdirSync(directory, { recursive: true }); const probe = path.join(directory, ".write-test"); fs.writeFileSync(probe, "ok"); fs.unlinkSync(probe); return true; } catch { return false; } }
function detectFonts() {
  if (commandPath("fc-list")) {
    try {
      const result = spawnSync("fc-list", [], { encoding: "utf8", maxBuffer: 2e6 });
      const count = result.status === 0 ? new Set(result.stdout.split("\n").map((line) => line.split(":")[0]).filter(Boolean)).size : 0;
      return { available: count > 0, source: "fontconfig", count };
    } catch {}
  }

  const directories = process.platform === "darwin"
    ? ["/System/Library/Fonts", "/Library/Fonts", path.join(os.homedir(), "Library/Fonts")]
    : process.platform === "win32"
      ? [path.join(process.env.WINDIR || "C:\\Windows", "Fonts")]
      : ["/usr/share/fonts", "/usr/local/share/fonts", path.join(os.homedir(), ".local/share/fonts")];
  const existing = directories.filter((directory) => fs.existsSync(directory));
  return { available: existing.length > 0, source: "system-directories", directories: existing };
}

async function loadPlaywright() {
  try { const mod = await import("playwright"); return { chromium: mod.chromium || mod.default?.chromium, source: "project" }; } catch {}
  const require = createRequire(import.meta.url);
  const candidates = [process.env.PLAYWRIGHT_NODE_MODULES, path.join(repoRoot, "node_modules"), path.join(process.cwd(), "node_modules"), path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules")].filter(Boolean);
  for (const candidate of candidates) {
    try { const resolved = require.resolve("playwright", { paths: [candidate] }); const mod = await import(pathToFileURL(resolved).href); return { chromium: mod.chromium || mod.default?.chromium, source: resolved }; } catch {}
  }
  return null;
}

async function checkBrowser() {
  const playwright = await loadPlaywright();
  if (!playwright?.chromium) return { package: false, ready: false, reason: "Playwright package unavailable" };
  let browser;
  try { browser = await playwright.chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1, height: 1 } }); await page.setContent("<html><body>ok</body></html>"); await page.screenshot({ path: path.join(os.tmpdir(), "image2-ui-doctor.png") }); await browser.close(); return { package: true, ready: true, source: playwright.source, chromium: true, screenshot: true }; }
  catch (error) { try { await browser?.close(); } catch {} return { package: true, ready: false, chromium: false, reason: String(error?.message || error).split("\n")[0] }; }
}
