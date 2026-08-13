#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { libraryEffectCaptures } from "../library-effect-captures.mjs";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

async function loadPlaywright() {
  try {
    const mod = await import("playwright");
    return mod.chromium || mod.default?.chromium;
  } catch {}
  const require = createRequire(import.meta.url);
  const candidates = [
    process.env.PLAYWRIGHT_NODE_MODULES,
    path.join(repoRoot, "node_modules"),
    path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const resolved = require.resolve("playwright", { paths: [candidate] });
      const mod = await import(pathToFileURL(resolved).href);
      return mod.chromium || mod.default?.chromium;
    } catch {}
  }
  return null;
}

const chromium = await loadPlaywright();
if (!chromium) {
  console.error("Playwright is unavailable.");
  process.exit(2);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ deviceScaleFactor: 2 });
const page = await context.newPage();

try {
  for (const capture of libraryEffectCaptures) {
    await page.setViewportSize({ width: capture.width, height: capture.height });
    const entry = path.join(repoRoot, "demo", capture.demo, "index.html");
    const url = new URL(pathToFileURL(entry));
    url.searchParams.set("embed", "1");
    if (capture.view) url.searchParams.set("view", capture.view);
    if (Number.isInteger(capture.card)) url.searchParams.set("card", String(capture.card));
    await page.goto(url.href, { waitUntil: "networkidle" });
    if (capture.action) await page.locator(capture.action).click();
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
    const output = path.join(repoRoot, "demo", capture.demo, "screenshots", capture.output);
    const temporary = `${output}.tmp.png`;
    fs.mkdirSync(path.dirname(output), { recursive: true });
    await page.screenshot({ path: temporary, fullPage: false });
    fs.renameSync(temporary, output);
    console.log(`${capture.id}: ${capture.width * 2}x${capture.height * 2} -> ${path.relative(repoRoot, output)}`);
  }
} finally {
  await context.close();
  await browser.close();
}
