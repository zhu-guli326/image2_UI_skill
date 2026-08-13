#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(repoRoot, "screenshots");
fs.mkdirSync(outputDir, { recursive: true });
const playwright = await loadPlaywright();
if (!playwright?.chromium) throw new Error("Playwright is unavailable");
const server = await startServer();
const browser = await playwright.chromium.launch({ headless: true });
const failures = [];
const screenshots = [];

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const consoleErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.goto(`${server.url}/brands.html?brand=minimal-tech`, { waitUntil: "networkidle" });
  await page.waitForSelector("#brandDetail h2");
  const initial = await page.evaluate(() => ({ title: document.querySelector("#brandDetail h2")?.textContent, rows: document.querySelectorAll(".brand-row").length, status: document.querySelector(".detail-title-line .status-badge")?.textContent, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }));
  if (initial.title !== "极简科技" || initial.rows !== 3 || initial.status !== "风格参考" || initial.overflow) failures.push(`desktop initial state invalid: ${JSON.stringify(initial)}`);
  const desktop = path.join(outputDir, "brands-desktop-1440.png");
  await page.screenshot({ path: desktop, fullPage: true });
  screenshots.push(desktop);

  await page.selectOption('[name="platform"]', "android");
  const filteredRows = await page.locator(".brand-row").count();
  if (filteredRows !== 1) failures.push(`android filter rendered ${filteredRows} rows`);
  await page.selectOption('[name="platform"]', "");
  await page.locator('[data-brand-id="editorial-commerce"]').click();
  if (!page.url().includes("brand=editorial-commerce")) failures.push("brand selection did not update URL");

  await page.evaluate(() => { window.__copied = []; Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value) => window.__copied.push(value) } }); });
  await page.locator('[data-action="apply"]').click();
  await page.locator('[data-action="prompt"]').click();
  const copied = await page.evaluate(() => window.__copied);
  if (copied.length !== 2 || !copied[0].includes("artifacts/brand-compliance.md") || !copied[1].includes("不得自动生成")) failures.push("copy actions did not produce compliant prompts");
  const downloadPromise = page.waitForEvent("download");
  await page.locator('[data-action="tokens"]').click();
  const download = await downloadPromise;
  if (download.suggestedFilename() !== "editorial-commerce-brand-tokens.json") failures.push(`unexpected token filename: ${download.suggestedFilename()}`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${server.url}/brands.html?brand=soft-lifestyle`, { waitUntil: "networkidle" });
  const mobile = await page.evaluate(() => ({ title: document.querySelector("#brandDetail h2")?.textContent, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, actions: document.querySelectorAll(".detail-actions .action").length }));
  if (mobile.title !== "柔和生活方式" || mobile.overflow || mobile.actions !== 3) failures.push(`mobile state invalid: ${JSON.stringify(mobile)}`);
  const mobileShot = path.join(outputDir, "brands-mobile-390.png");
  await page.screenshot({ path: mobileShot, fullPage: true });
  screenshots.push(mobileShot);
  failures.push(...consoleErrors.map((error) => `console: ${error}`));
  console.log(JSON.stringify({ status: failures.length ? "fail" : "pass", playwright: playwright.source, initial, mobile, screenshots, failures }, null, 2));
  process.exitCode = failures.length ? 2 : 0;
} finally {
  await browser.close();
  await new Promise((resolve) => server.instance.close(resolve));
}

async function loadPlaywright() {
  try { const mod = await import("playwright"); return { chromium: mod.chromium || mod.default?.chromium, source: "project" }; } catch {}
  const require = createRequire(import.meta.url);
  for (const candidate of [process.env.PLAYWRIGHT_NODE_MODULES, path.join(repoRoot, "node_modules"), path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules")].filter(Boolean)) {
    try { const resolved = require.resolve("playwright", { paths: [candidate] }); const mod = await import(pathToFileURL(resolved).href); return { chromium: mod.chromium || mod.default?.chromium, source: resolved }; } catch {}
  }
  return null;
}

async function startServer() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://local").pathname);
    let file = path.resolve(repoRoot, `.${pathname}`);
    if (!file.startsWith(`${repoRoot}${path.sep}`) || !fs.existsSync(file)) { response.writeHead(404); response.end("Not found"); return; }
    if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    const type = ({ ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json" })[path.extname(file)] || "application/octet-stream";
    response.writeHead(200, { "content-type": type }); fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { instance: server, url: `http://127.0.0.1:${server.address().port}` };
}
