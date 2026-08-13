#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getLibraryPreviewDevice, libraryPreviewProfiles } from "../library-preview-config.mjs";
import { styleGuides } from "../catalog/index.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chrome = [
  process.env.IMAGE2_CHROME,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((candidate) => candidate && fs.existsSync(candidate));

if (!chrome) {
  console.error("Chrome/Chromium was not found. Set IMAGE2_CHROME to its executable path.");
  process.exit(2);
}

const demos = styleGuides
  .filter((guide) => guide.liveDemo)
  .map((guide) => ({ id: guide.id, url: guide.liveDemo }));
const outputName = "library-preview-2x.png";

if (!demos.length) {
  console.error("No live demos were found in catalog/index.js.");
  process.exit(2);
}

function readPngSize(filePath) {
  const header = fs.readFileSync(filePath).subarray(0, 24);
  if (header.toString("hex", 0, 8) !== "89504e470d0a1a0a" || header.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

for (const { id, url: demoUrl } of demos) {
  if (!libraryPreviewProfiles[id]?.live) {
    console.error(`${id}: missing live preview device profile`);
    process.exitCode = 1;
    continue;
  }
  const { width, height } = getLibraryPreviewDevice(id);
  const demoPath = path.resolve(repoRoot, demoUrl.replace(/^\.\//, ""));
  const demoDir = path.dirname(demoPath);
  const outputPath = path.join(demoDir, "screenshots", outputName);
  const temporaryPath = `${outputPath}.tmp.png`;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.rmSync(temporaryPath, { force: true });
  const targetUrl = `file://${demoPath}?embed=1`;
  const result = spawnSync(chrome, [
    "--headless=new", "--hide-scrollbars", "--disable-gpu", "--no-sandbox", "--allow-file-access-from-files",
    "--run-all-compositor-stages-before-draw", "--virtual-time-budget=1200", "--force-device-scale-factor=2",
    `--window-size=${width},${height}`, `--screenshot=${temporaryPath}`, targetUrl,
  ], { encoding: "utf8", stdio: "pipe" });
  const actualSize = fs.existsSync(temporaryPath) ? readPngSize(temporaryPath) : null;
  if (result.status !== 0 || actualSize?.width !== width * 2 || actualSize?.height !== height * 2) {
    fs.rmSync(temporaryPath, { force: true });
    console.error(`${demoUrl}: capture failed${result.stderr ? `: ${result.stderr.trim()}` : ""}`);
    process.exitCode = 1;
    continue;
  }
  fs.renameSync(temporaryPath, outputPath);
  console.log(`${id} (${width}x${height}) -> ${path.relative(repoRoot, outputPath)}`);
}
