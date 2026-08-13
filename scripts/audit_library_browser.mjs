#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const targetUrl = process.env.LIBRARY_URL || "http://127.0.0.1:4173/library.html";
const failures = [];
const screenshots = [];

async function loadPlaywright() {
  try {
    const mod = await import("playwright");
    return { chromium: mod.chromium || mod.default?.chromium, source: "project" };
  } catch {}
  const require = createRequire(import.meta.url);
  const candidates = [
    process.env.PLAYWRIGHT_NODE_MODULES,
    path.join(repoRoot, "node_modules"),
    path.join(process.cwd(), "node_modules"),
    path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const resolved = require.resolve("playwright", { paths: [candidate] });
      const mod = await import(pathToFileURL(resolved).href);
      return { chromium: mod.chromium || mod.default?.chromium, source: resolved };
    } catch {}
  }
  return null;
}

async function settleCardImages(page) {
  await page.evaluate(async () => {
    const cards = [...document.querySelectorAll(".demo-card")];
    const paint = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (const card of cards) {
      const image = card.querySelector(".phone-preview-media img");
      card.scrollIntoView({ block: "center" });
      if (image && !image.complete) await new Promise((resolve) => image.addEventListener("load", resolve, { once: true }));
      if (image?.decode) await image.decode().catch(() => {});
      await paint();
    }
    scrollTo(0, 0);
    await paint();
  });
}

async function inspectRenderedPixels(page, screenshot) {
  const dataUrl = `data:image/png;base64,${screenshot.toString("base64")}`;
  return page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonWhite = 0;
    let dark = 0;
    for (let offset = 0; offset < data.length; offset += 4) {
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      if (red < 248 || green < 248 || blue < 248) nonWhite += 1;
      if (red < 225 || green < 225 || blue < 225) dark += 1;
    }
    const pixels = canvas.width * canvas.height;
    return {
      width: canvas.width,
      height: canvas.height,
      nonWhiteRatio: nonWhite / pixels,
      darkRatio: dark / pixels,
    };
  }, dataUrl);
}

function escapedAttribute(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const playwright = await loadPlaywright();
if (!playwright?.chromium) {
  console.error(JSON.stringify({ status: "fail", failures: ["Playwright is unavailable"], screenshots }, null, 2));
  process.exit(2);
}
const browser = await playwright.chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const viewportResults = [];
  for (const viewport of [
    { name: "desktop-1920", width: 1920, height: 1080 },
    { name: "desktop-1440", width: 1440, height: 900 },
    { name: "tablet-1024", width: 1024, height: 768 },
    { name: "mobile-390", width: 390, height: 844 },
    { name: "mobile-375", width: 375, height: 667 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await settleCardImages(page);
    const metrics = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".demo-card")];
      const images = [...document.images].filter((image) => image.currentSrc);
      return {
        cards: cards.length,
        tags: document.querySelectorAll(".style-tag").length,
        brokenImages: images.filter((image) => image.naturalWidth === 0).map((image) => image.currentSrc),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        cardOverflow: cards.filter((card) => card.scrollWidth > card.clientWidth + 1).length,
        bodyOverflow: document.body.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    if (metrics.cards !== 23) failures.push(`${viewport.name}: rendered ${metrics.cards} cards`);
    if (metrics.tags !== 69) failures.push(`${viewport.name}: rendered ${metrics.tags} tags`);
    if (metrics.brokenImages.length) failures.push(`${viewport.name}: broken images ${metrics.brokenImages.join(", ")}`);
    if (metrics.horizontalOverflow || metrics.bodyOverflow || metrics.cardOverflow) failures.push(`${viewport.name}: horizontal overflow detected`);
    viewportResults.push({ ...viewport, ...metrics });
    if (viewport.name === "desktop-1440" || viewport.name === "mobile-390") {
      const output = path.join(repoRoot, "screenshots", `library-final-${viewport.name}.png`);
      await page.screenshot({ path: output, fullPage: true });
      screenshots.push(output);
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(targetUrl, { waitUntil: "networkidle" });
  const caseIds = await page.locator(".demo-card").evaluateAll((cards) => cards.map((card) => card.dataset.caseId));
  await settleCardImages(page);
  const cardImageResults = [];
  for (const id of caseIds) {
    const image = page.locator(`[data-case-id="${escapedAttribute(id)}"] .phone-preview-media img`);
    const screenshot = await image.screenshot();
    const pixels = await inspectRenderedPixels(page, screenshot);
    const painted = pixels.nonWhiteRatio >= 0.02 && pixels.darkRatio >= 0.002;
    if (!painted) failures.push(`${id}: card image rendered as blank (${(pixels.nonWhiteRatio * 100).toFixed(2)}% non-white pixels)`);
    cardImageResults.push({ id, painted, ...pixels });
  }
  const dialogResults = [];
  for (const id of caseIds) {
    const hitarea = page.locator(`[data-case-id="${escapedAttribute(id)}"] .demo-card-details-hitarea`);
    await hitarea.evaluate((element) => element.click());
    const dialog = page.locator("#styleDialog");
    await dialog.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const image = document.querySelector("#styleDialog img");
      return Boolean(image?.complete && image.naturalWidth > 0);
    }, null, { timeout: 5000 });
    const state = await dialog.evaluate((element) => {
      const image = element.querySelector("img");
      const rect = element.getBoundingClientRect();
      return {
        open: element.open,
        title: element.querySelector("h2")?.textContent || "",
        imageLoaded: Boolean(image?.complete && image?.naturalWidth),
        contained: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
        bodyLocked: getComputedStyle(document.body).overflow === "hidden",
      };
    });
    if (!state.open || !state.title || !state.imageLoaded || !state.contained || !state.bodyLocked) failures.push(`${id}: invalid detail dialog state`);
    await dialog.locator(".dialog-close").click();
    await dialog.waitFor({ state: "hidden" });
    dialogResults.push({ id, ...state });
  }

  await page.goto(targetUrl, { waitUntil: "networkidle" });
  const imagePreviewResults = [];
  for (const id of caseIds) {
    await page.locator(`[data-case-id="${escapedAttribute(id)}"] .preview-open-button`).click();
    const dialog = page.locator("#previewDialog");
    await dialog.waitFor({ state: "visible" });
    const imageMode = dialog.locator('[data-preview-view="image"]');
    if (await imageMode.count()) await imageMode.click();
    const count = await page.locator("#previewImageCount").evaluate((element) => Number(element.textContent.split("/").at(-1)?.trim()) || 1);
    for (let index = 0; index < count; index += 1) {
      await page.waitForFunction(() => {
        const image = document.querySelector("#previewDialogImage");
        return Boolean(!image?.hidden && image.complete && image.naturalWidth > 0);
      }, null, { timeout: 5000 });
      const state = await page.locator("#previewDialogImage").evaluate((image) => {
        const rect = image.getBoundingClientRect();
        const scale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
        return {
          src: image.currentSrc,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          renderedWidth: rect.width,
          renderedHeight: rect.height,
          density: 1 / scale,
        };
      });
      const screenshot = await page.locator("#previewDialogImage").screenshot();
      const pixels = await inspectRenderedPixels(page, screenshot);
      state.painted = pixels.nonWhiteRatio >= 0.02 && pixels.darkRatio >= 0.002;
      state.nonWhiteRatio = pixels.nonWhiteRatio;
      state.darkRatio = pixels.darkRatio;
      if (state.density < 1.99) failures.push(`${id}: ${state.src} renders at ${state.density.toFixed(2)}x; expected at least 2x`);
      if (!state.painted) failures.push(`${id}: ${state.src} preview image rendered as blank`);
      imagePreviewResults.push({ id, index, ...state });
      if (index + 1 < count) await page.locator("#previewImageNext").click();
    }
    await dialog.locator(".dialog-close").click();
    await dialog.waitFor({ state: "hidden" });
  }

  await page.goto(targetUrl, { waitUntil: "networkidle" });
  const liveIds = await page.locator('[data-preview-id][data-preview-mode="live"]').evaluateAll((buttons) => [...new Set(buttons.map((button) => button.dataset.previewId))]);
  const liveResults = [];
  for (const id of liveIds) {
    await page.locator(`[data-case-id="${escapedAttribute(id)}"] [data-preview-id="${escapedAttribute(id)}"][data-preview-mode="live"]`).first().click();
    const dialog = page.locator("#previewDialog");
    await dialog.waitFor({ state: "visible" });
    const state = await page.locator("#previewDialogDemo").evaluate((iframe) => ({
      visible: !iframe.hidden,
      src: iframe.src,
      hasEmbed: iframe.src.includes("embed=1"),
      loadedDocument: Boolean(iframe.contentDocument?.body),
    }));
    if (!state.visible || !state.hasEmbed) failures.push(`${id}: live preview iframe is not configured correctly`);
    await dialog.locator(".dialog-close").click();
    await dialog.waitFor({ state: "hidden" });
    liveResults.push({ id, ...state });
  }

  await page.goto(targetUrl, { waitUntil: "networkidle" });
  const tags = await page.locator(".style-tag").evaluateAll((links) => [...new Set(links.map((link) => link.dataset.tag))]);
  const tagResults = [];
  for (const tag of tags) {
    const link = page.locator(`[data-tag="${escapedAttribute(tag)}"]`).first();
    await link.click();
    const state = await page.evaluate((expected) => ({
      tag: new URL(location.href).searchParams.get("tag"),
      cards: document.querySelectorAll(".demo-card").length,
      active: [...document.querySelectorAll(".style-tag.is-active")].some((item) => item.dataset.tag === expected),
    }), tag);
    if (state.tag !== tag || state.cards < 1 || !state.active) failures.push(`tag ${tag}: filter route failed`);
    tagResults.push({ tag, expected: tag, ...state });
    await page.goBack({ waitUntil: "networkidle" });
  }

  console.log(JSON.stringify({
    status: failures.length ? "fail" : "pass",
    playwright: playwright.source,
    viewports: viewportResults,
    dialogs: { total: dialogResults.length, failed: dialogResults.filter((item) => !item.open || !item.imageLoaded).length },
    cardImages: { total: cardImageResults.length, blank: cardImageResults.filter((item) => !item.painted).length },
    imagePreviews: {
      total: imagePreviewResults.length,
      lowDensity: imagePreviewResults.filter((item) => item.density < 1.99).length,
      blank: imagePreviewResults.filter((item) => !item.painted).length,
    },
    liveDemos: { total: liveResults.length, failed: liveResults.filter((item) => !item.hasEmbed).length },
    tags: { total: tagResults.length, failed: tagResults.filter((item) => item.tag !== item.expected || item.cards < 1 || !item.active).length },
    screenshots,
    failures,
  }, null, 2));
  process.exit(failures.length ? 2 : 0);
} finally {
  await browser.close();
}
