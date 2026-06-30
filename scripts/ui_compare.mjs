#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const referenceArg = readOption("--reference") || readOption("-r");
const actualArg = readOption("--actual") || readOption("-a") || positionalArgs()[0];
const outArg = readOption("--out") || readOption("-o");
const title = readOption("--title") || "Image2 UI Reference Compare";

if (args.includes("--help") || args.includes("-h")) {
  printUsage();
  process.exit(0);
}

if (!referenceArg || !actualArg) {
  printUsage();
  process.exit(1);
}

const referencePath = path.resolve(process.cwd(), referenceArg);
const actualPath = path.resolve(process.cwd(), actualArg);

if (!fs.existsSync(referencePath)) fail(`Reference image not found: ${referencePath}`);
if (!fs.existsSync(actualPath)) fail(`Actual image not found: ${actualPath}`);

const referenceInfo = readImageInfo(referencePath);
const actualInfo = readImageInfo(actualPath);
const outPath = path.resolve(process.cwd(), outArg || defaultOutPath(actualPath, "html"));
const html = buildHtml({ title, referencePath, actualPath, referenceInfo, actualInfo });

if (path.extname(outPath).toLowerCase() === ".png") {
  const htmlPath = outPath.replace(/\.png$/i, ".html");
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, html);
  renderPng(htmlPath, outPath);
  console.log(`Compare HTML: ${htmlPath}`);
  console.log(`Compare PNG: ${outPath}`);
} else {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  console.log(`Compare HTML: ${outPath}`);
}

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
      if (args[index + 1] && !args[index + 1].startsWith("-")) index += 1;
      continue;
    }
    out.push(arg);
  }
  return out;
}

function defaultOutPath(actualPath, extension) {
  const dir = path.dirname(actualPath);
  const stem = path.basename(actualPath).replace(/\.[^.]+$/, "");
  return path.join(dir, `${stem}-compare.${extension}`);
}

function printUsage() {
  console.log(`Usage:
  image2-ui compare --reference reference.png --actual output.png --out comparison.html
  image2-ui compare --reference reference.png --actual output.png --out comparison.png

Creates a side-by-side reference/output comparison board. PNG output uses local Chrome when available.`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readImageInfo(file) {
  const buffer = fs.readFileSync(file);
  const ext = path.extname(file).toLowerCase();
  let size = null;
  if (ext === ".png") size = readPngSize(buffer);
  if (ext === ".jpg" || ext === ".jpeg") size = readJpegSize(buffer);
  return {
    width: size?.width ?? null,
    height: size?.height ?? null,
    bytes: buffer.length,
    hash: crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 12),
    mime: mimeType(ext),
    dataUri: `data:${mimeType(ext)};base64,${buffer.toString("base64")}`,
  };
}

function readPngSize(buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegSize(buffer) {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  return null;
}

function mimeType(ext) {
  return {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
  }[ext] || "application/octet-stream";
}

function buildHtml({ title, referencePath, actualPath, referenceInfo, actualInfo }) {
  const ratioDelta = aspectRatioDelta(referenceInfo, actualInfo);
  const compareId = `${referenceInfo.hash}-${actualInfo.hash}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color: #171716;
      background: #d2d2cf;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; }
    .page { width: min(1540px, 100%); margin: 0 auto; }
    header { display: flex; justify-content: space-between; gap: 24px; align-items: end; margin-bottom: 18px; }
    h1 { margin: 0; font-size: 24px; line-height: 1.05; letter-spacing: 0; }
    .stamp { color: #5f5d58; font-size: 12px; font-weight: 700; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
    .panel { background: #f7f6f1; border: 1px solid rgb(20 20 18 / 0.09); border-radius: 12px; padding: 14px; box-shadow: 0 10px 28px rgb(20 20 18 / 0.08); }
    .panel h2 { margin: 0 0 8px; font-size: 14px; }
    .meta { color: #67635d; font-size: 12px; line-height: 1.45; word-break: break-all; }
    .frame { margin-top: 12px; min-height: 420px; display: grid; place-items: center; overflow: hidden; border-radius: 10px; background: #bfbfbc; }
    img { display: block; max-width: 100%; max-height: 720px; object-fit: contain; }
    .overlay { margin-top: 16px; display: grid; grid-template-columns: 360px 1fr; gap: 16px; }
    .overlay-stage { position: relative; min-height: 360px; overflow: hidden; border-radius: 10px; background: #bfbfbc; display: grid; place-items: center; }
    .overlay-stage img { position: absolute; max-width: 100%; max-height: 100%; opacity: 0.58; }
    .overlay-stage img.actual { mix-blend-mode: multiply; filter: hue-rotate(160deg) saturate(1.4); }
    .notes { color: #35332f; font-size: 13px; line-height: 1.55; }
    .notes strong { display: block; margin-bottom: 6px; }
    ul { margin: 8px 0 0; padding-left: 18px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  </style>
</head>
<body>
  <main class="page">
    <header>
      <div>
        <h1>${escapeHtml(title)}</h1>
        <div class="stamp">Input hash ${escapeHtml(compareId)}</div>
      </div>
      <div class="stamp">Aspect ratio delta: ${ratioDelta == null ? "unknown" : `${ratioDelta.toFixed(2)}%`}</div>
    </header>
    <section class="grid">
      <article class="panel">
        <h2>Reference</h2>
        <div class="meta">${escapeHtml(referencePath)}<br />${formatImageInfo(referenceInfo)}</div>
        <div class="frame"><img src="${referenceInfo.dataUri}" alt="Reference image" /></div>
      </article>
      <article class="panel">
        <h2>Actual Output</h2>
        <div class="meta">${escapeHtml(actualPath)}<br />${formatImageInfo(actualInfo)}</div>
        <div class="frame"><img src="${actualInfo.dataUri}" alt="Actual output image" /></div>
      </article>
    </section>
    <section class="overlay">
      <article class="panel">
        <h2>Overlay</h2>
        <div class="overlay-stage">
          <img src="${referenceInfo.dataUri}" alt="" />
          <img class="actual" src="${actualInfo.dataUri}" alt="" />
        </div>
      </article>
      <article class="panel notes">
        <strong>Manual review checklist</strong>
        <ul>
          <li>Phone scale, vertical offsets, and spacing between screens.</li>
          <li>Status bar, back/menu/settings, player controls, quick actions, room stats, toggles, and bottom/home indicators.</li>
          <li>Whether UI glyphs are code-rendered and visually centered, not embedded in generated images.</li>
          <li>Whether product/object images match the reference role and do not collide with toggles or labels.</li>
          <li>Text density and tiny labels that may read as pseudo text in screenshots.</li>
        </ul>
      </article>
    </section>
  </main>
</body>
</html>`;
}

function formatImageInfo(info) {
  const dimensions = info.width && info.height ? `${info.width}x${info.height}` : "unknown size";
  return `${dimensions}, ${formatBytes(info.bytes)}`;
}

function aspectRatioDelta(a, b) {
  if (!a.width || !a.height || !b.width || !b.height) return null;
  const arA = a.width / a.height;
  const arB = b.width / b.height;
  return Math.abs(arA - arB) / arA * 100;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function renderPng(htmlPath, outPath) {
  const chrome = findChrome();
  if (!chrome) {
    console.error("Chrome was not found; wrote HTML only. Re-run with --out comparison.html or install Chrome for PNG output.");
    return;
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const result = spawnSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=1600,1120",
    `--screenshot=${outPath}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: "inherit" });
  if (result.status !== 0) fail(`Chrome screenshot failed with status ${result.status}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate.includes(path.sep) && fs.existsSync(candidate)) return candidate;
    if (!candidate.includes(path.sep)) {
      const result = spawnSync(os.platform() === "win32" ? "where" : "which", [candidate], { encoding: "utf8" });
      if (result.status === 0) return result.stdout.trim().split(/\r?\n/)[0];
    }
  }
  return null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
