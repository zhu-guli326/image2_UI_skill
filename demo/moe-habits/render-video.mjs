import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.join(demoDir, "screenshots", "video-2x");
const recordingsDir = path.join(demoDir, ".recordings");
const outputPath = path.join(demoDir, "moe-habits-demo.mp4");
const temporaryOutput = path.join(demoDir, ".moe-habits-demo.tmp.mp4");
const targetUrl = process.argv[2] || "http://127.0.0.1:4174/demo/moe-habits/index.html";
const recordingSize = { width: 1170, height: 2080 };

const playwright = await loadPlaywright();
if (!playwright?.chromium) throw new Error("Playwright is unavailable.");

fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(recordingsDir, { recursive: true });

const browser = await playwright.chromium.launch({ headless: true });
let recordedPath;
try {
  const context = await browser.newContext({
    viewport: recordingSize,
    deviceScaleFactor: 1,
    recordVideo: { dir: recordingsDir, size: recordingSize },
  });
  const page = await context.newPage();
  const embeddedUrl = new URL(targetUrl);
  embeddedUrl.searchParams.set("embed", "1");
  await page.goto(embeddedUrl.href, { waitUntil: "networkidle" });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  await page.addStyleTag({ content: `
    .app-view.is-active { animation: recording-view-in .3s cubic-bezier(.2,.75,.25,1) both; }
    #recording-touch { position:fixed; z-index:999; top:0; left:0; width:38px; height:38px; border:2px solid rgba(255,255,255,.94); border-radius:50%; background:rgba(29,36,32,.28); box-shadow:0 2px 10px rgba(0,0,0,.26); opacity:0; pointer-events:none; transform:translate(-50%,-50%) scale(.85); transition:left .28s ease,top .28s ease,opacity .12s ease,transform .12s ease,background .12s ease; }
    #recording-touch.is-visible { opacity:1; transform:translate(-50%,-50%) scale(1); }
    #recording-touch.is-pressed { background:rgba(33,108,61,.72); transform:translate(-50%,-50%) scale(.7); }
    @keyframes recording-view-in { from { opacity:.35; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  ` });
  await page.evaluate(() => {
    const touch = document.createElement("i");
    touch.id = "recording-touch";
    touch.setAttribute("aria-hidden", "true");
    document.documentElement.append(touch);
  });

  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(framesDir, "01-intro.png") });

  await touchAndClick(page, page.locator(".intro-start"), 1100);
  await page.screenshot({ path: path.join(framesDir, "02-home.png") });

  await touchAndClick(page, page.locator('[data-open-task="walk"]'), 1100);
  await page.screenshot({ path: path.join(framesDir, "03-task.png") });

  await touchAndClick(page, page.locator("[data-finish]"), 1300);
  await page.screenshot({ path: path.join(framesDir, "04-celebration.png") });
  await page.waitForTimeout(500);

  const recording = page.video();
  await context.close();
  recordedPath = await recording.path();
} finally {
  await browser.close();
}

const ffmpeg = spawnSync("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel", "error",
  "-i", recordedPath,
  "-vf", "fps=30,format=yuv420p",
  "-c:v", "libx264",
  "-preset", "slow",
  "-tune", "animation",
  "-crf", "10",
  "-profile:v", "high",
  "-level:v", "4.2",
  "-movflags", "+faststart",
  "-an",
  temporaryOutput,
], { encoding: "utf8" });

fs.rmSync(recordingsDir, { recursive: true, force: true });
if (ffmpeg.status !== 0) {
  fs.rmSync(temporaryOutput, { force: true });
  throw new Error(ffmpeg.stderr || "ffmpeg failed.");
}

fs.renameSync(temporaryOutput, outputPath);
console.log(`Rendered ${outputPath}`);

async function touchAndClick(page, locator, holdAfter) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Unable to locate an interaction target.");
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.evaluate(({ x, y }) => {
    const touch = document.querySelector("#recording-touch");
    touch.style.left = `${x}px`;
    touch.style.top = `${y}px`;
    touch.classList.add("is-visible");
  }, point);
  await page.waitForTimeout(320);
  await page.evaluate(() => document.querySelector("#recording-touch")?.classList.add("is-pressed"));
  await page.waitForTimeout(120);
  await locator.click();
  await page.waitForTimeout(160);
  await page.evaluate(() => document.querySelector("#recording-touch")?.classList.remove("is-pressed", "is-visible"));
  await page.waitForTimeout(holdAfter);
}

async function loadPlaywright() {
  try {
    const mod = await import("playwright");
    const chromium = mod.chromium || mod.default?.chromium;
    if (chromium) return { chromium };
  } catch {
    // Fall through to the bundled runtime lookup.
  }

  const require = createRequire(import.meta.url);
  const candidates = [
    process.env.PLAYWRIGHT_NODE_MODULES,
    ...String(process.env.NODE_PATH || "").split(path.delimiter),
    path.join(demoDir, "node_modules"),
    path.join(process.cwd(), "node_modules"),
    path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const resolved = require.resolve("playwright", { paths: [candidate] });
      const mod = await import(pathToFileURL(resolved).href);
      const chromium = mod.chromium || mod.default?.chromium;
      if (chromium) return { chromium };
    } catch {
      // Try the next runtime path.
    }
  }

  return null;
}
