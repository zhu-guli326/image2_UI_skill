#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getLibraryPreviewDevice } from "../library-preview-config.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsSource = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(repoRoot, "library.html"), "utf8");
const cssSource = fs.readFileSync(path.join(repoRoot, "library.css"), "utf8");
const catalogCasesDir = path.join(repoRoot, "catalog", "cases");
const failures = [];
const warnings = [];

const caseBlocks = fs.readdirSync(catalogCasesDir).filter((file) => file.endsWith(".json")).sort().map((file) => {
  const data = JSON.parse(fs.readFileSync(path.join(catalogCasesDir, file), "utf8"));
  return { ...data, source: JSON.stringify(data) };
});
const previewImageSetSource = jsSource.match(/const previewImageSets = Object\.freeze\(\{([\s\S]*?)\n\}\);/)?.[1] || "";
const previewImagePaths = [...previewImageSetSource.matchAll(/src:\s*"(\.\/[^\"]+)"/g)].map((match) => match[1]);

function localPath(url) {
  return path.resolve(repoRoot, url.replace(/^\.\//, "").split("?")[0]);
}

function readPngSize(filePath) {
  const header = fs.readFileSync(filePath).subarray(0, 24);
  if (header.toString("hex", 0, 8) !== "89504e470d0a1a0a" || header.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("not a PNG with an IHDR header");
  }
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

function readVideoSize(filePath) {
  const result = spawnSync("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-of", "csv=s=x:p=0",
    filePath,
  ], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr.trim() || "ffprobe failed");
  const [width, height] = result.stdout.trim().split("x").map((value) => Number(value));
  if (!width || !height) throw new Error("ffprobe did not return video dimensions");
  return { width, height };
}

function fittedPixelDensity(size, frame = { width: 390, height: 844 }) {
  return 1 / Math.min(frame.width / size.width, frame.height / size.height);
}

function requireContract(condition, message) {
  if (!condition) failures.push(message);
}

requireContract(caseBlocks.length === 23, `case model contains ${caseBlocks.length} cases; expected 23`);
requireContract(new Set(caseBlocks.map((item) => item.id)).size === caseBlocks.length, "case IDs are not unique");
const expectedCategories = { culture: 1, commerce: 6, editorial: 1, travel: 3, creative: 4, wellness: 8 };
for (const [category, expected] of Object.entries(expectedCategories)) {
  const actual = caseBlocks.filter((item) => item.category === category).length;
  requireContract(actual === expected, `${category}: ${actual} cases; expected ${expected}`);
  requireContract(new RegExp(`data-filter="${category}"[^>]*>[\\s\\S]*?<b>${expected}<\\/b>`).test(htmlSource), `${category}: sidebar count is not ${expected}`);
}

const tagEntries = caseBlocks.flatMap((item) => item.tags.map((tag) => ({ id: item.id, tag })));
const uniqueTags = new Set(tagEntries.map((item) => item.tag.toLocaleLowerCase()));
requireContract(tagEntries.length === 69, `tag model contains ${tagEntries.length} tags; expected 69`);
requireContract(uniqueTags.size > 0, "tag model is empty");
requireContract(previewImagePaths.length >= 40, `preview image collection contains ${previewImagePaths.length} images; expected at least 40`);
for (const imageUrl of previewImagePaths) {
  const imagePath = localPath(imageUrl);
  requireContract(fs.existsSync(imagePath), `missing preview image ${imageUrl}`);
  if (!fs.existsSync(imagePath)) continue;
  try {
    const size = readPngSize(imagePath);
    const density = fittedPixelDensity(size);
    requireContract(density >= 1.99, `${imageUrl}: effective density is ${density.toFixed(2)}x in the 390x844 preview; expected at least 2x`);
  } catch (error) {
    failures.push(`${imageUrl}: cannot inspect preview image (${error.message})`);
  }
}
requireContract(/<a class="style-tag/.test(jsSource) && /href="\.\/library\.html\?tag=/.test(jsSource), "visible tags are not semantic links");
requireContract(/window\.history\.pushState/.test(jsSource) && /window\.addEventListener\("popstate"/.test(jsSource), "tag filters do not preserve browser history");
requireContract(/readTagFromUrl\(\)/.test(jsSource) && /searchParams\.get\("tag"\)/.test(jsSource), "tag filters are not restored from the URL");
requireContract(/event\.stopPropagation\(\)/.test(jsSource), "tag clicks do not stop card event propagation");

let liveDemoCount = 0;
for (const item of caseBlocks) {
  requireContract(item.name && item.style && item.category, `${item.id}: incomplete case metadata`);
  requireContract(item.tags.length === 3, `${item.id}: expected exactly 3 tags, found ${item.tags.length}`);
  for (const [kind, url] of [["reference image", item.referenceImage], ["video", item.video], ["live demo", item.liveDemo]]) {
    if (url && !fs.existsSync(localPath(url))) failures.push(`${item.id}: missing ${kind} ${url}`);
  }

  if (item.video) {
    const videoDevice = getLibraryPreviewDevice(item.id, "video");
    requireContract(videoDevice.width === 390 && videoDevice.height === 844, `${item.id}: video preview is ${videoDevice.width}x${videoDevice.height}; expected 390x844`);
    try {
      const actual = readVideoSize(localPath(item.video));
      const expected = { width: videoDevice.width * 2, height: videoDevice.height * 2 };
      requireContract(
        actual.width === expected.width && actual.height === expected.height,
        `${item.id}: video file is ${actual.width}x${actual.height}; expected ${expected.width}x${expected.height}`,
      );
    } catch (error) {
      failures.push(`${item.id}: cannot inspect video (${error.message})`);
    }
  }

  if (item.liveDemo) {
    liveDemoCount += 1;
    const liveDevice = getLibraryPreviewDevice(item.id, "live");
    requireContract(liveDevice.width === 390 && liveDevice.height === 844, `${item.id}: live preview is ${liveDevice.width}x${liveDevice.height}; expected 390x844`);
    const demoEntry = localPath(item.liveDemo);
    const demoDir = path.dirname(demoEntry);
    const embedSource = [demoEntry, path.join(demoDir, "script.js")].filter(fs.existsSync).map((file) => fs.readFileSync(file, "utf8")).join("\n");
    const stylePath = path.join(demoDir, "styles.css");
    const styleSource = fs.existsSync(stylePath) ? fs.readFileSync(stylePath, "utf8") : embedSource;
    requireContract(/has\(["']embed["']\)/.test(embedSource) && /\.embed(?:-mode)?\b/.test(styleSource), `${item.id}: live demo does not implement the embed=1 contract`);
  }

  const poster = item.liveDemo
    ? path.join(path.dirname(localPath(item.liveDemo)), "screenshots", "library-preview-2x.png")
    : localPath(item.previewImage || item.poster);
  requireContract(fs.existsSync(poster), `${item.id}: missing card poster ${path.relative(repoRoot, poster)}`);
  if (!fs.existsSync(poster)) continue;
  try {
    const actual = readPngSize(poster);
    const mode = item.liveDemo ? "live" : "image";
    const device = getLibraryPreviewDevice(item.id, mode);
    const expected = { width: device.width * 2, height: device.height * 2 };
    requireContract(actual.width === expected.width && actual.height === expected.height, `${item.id}: poster is ${actual.width}x${actual.height}; expected ${expected.width}x${expected.height}`);
  } catch (error) {
    failures.push(`${item.id}: cannot inspect poster (${error.message})`);
  }
}

requireContract(liveDemoCount === 20, `case model contains ${liveDemoCount} live demos; expected 20`);
requireContract(/data-case-id=/.test(jsSource) && /demo-card-details-hitarea/.test(jsSource), "case card bodies do not expose a detail action");
requireContract((htmlSource.match(/<dialog\b/g) || []).length === 3, "library must expose three semantic dialogs");
requireContract((htmlSource.match(/aria-labelledby=/g) || []).length >= 3, "dialogs are missing accessible labels");
requireContract(/event\.target === dialog/.test(jsSource), "dialogs do not close from backdrop clicks");
requireContract(/previewMediaRetry/.test(jsSource) && /Demo 加载超时/.test(jsSource), "iframe loading does not expose timeout and retry states");
requireContract(/object-fit:\s*contain/.test(cssSource), "preview media is not protected from stretching/cropping");
requireContract(/@media \(max-width:\s*760px\)/.test(cssSource), "mobile layout contract is missing");
requireContract(/prefers-reduced-motion/.test(cssSource), "reduced-motion contract is missing");
requireContract(/focus-visible/.test(cssSource), "focus-visible feedback is missing");

const result = {
  cases: caseBlocks.length,
  cardActions: caseBlocks.length * 3,
  liveDemos: liveDemoCount,
  tags: tagEntries.length,
  uniqueTags: uniqueTags.size,
  failures,
  warnings,
  status: failures.length ? "fail" : warnings.length ? "warn" : "pass",
};
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 2 : 0);
