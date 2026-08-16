#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIME_BY_EXT = Object.freeze({
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
});

const REMOTE_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;
const PREVIEW_MARKER = 'data-image2-ui-artifact="preview-only"';

export function bundlePreview(input, options = {}) {
  if (!input) throw new TypeError("bundlePreview requires a demo directory or HTML file");
  const resolvedInput = path.resolve(input);
  const stat = fs.statSync(resolvedInput);
  const root = stat.isDirectory() ? resolvedInput : path.dirname(resolvedInput);
  const entry = stat.isDirectory() ? path.join(resolvedInput, "index.html") : resolvedInput;
  if (!fs.existsSync(entry)) throw new Error(`Preview entry HTML not found: ${entry}`);
  if (!/\.html?$/i.test(entry)) throw new Error(`Preview entry must be an HTML file: ${entry}`);

  const output = path.resolve(options.out || defaultOutput(entry, root, stat.isDirectory()));
  const inlined = [];
  let html = fs.readFileSync(entry, "utf8");

  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    const rel = attr(tag, "rel");
    const href = attr(tag, "href");
    if (!href || !rel?.toLowerCase().split(/\s+/).includes("stylesheet")) return tag;
    const asset = resolveLocal(href, path.dirname(entry), root);
    if (!asset) return tag;
    const css = inlineCss(fs.readFileSync(asset, "utf8"), path.dirname(asset), root, inlined);
    inlined.push(relativeLabel(root, asset));
    return `<style data-preview-source="${escapeAttr(relativeLabel(root, asset))}">${escapeStyle(css)}</style>`;
  });

  html = html.replace(/<script\b[^>]*\bsrc=(?:"([^"]+)"|'([^']+)')[^>]*>\s*<\/script>/gi, (tag, doubleSrc, singleSrc) => {
    const src = doubleSrc || singleSrc;
    const asset = resolveLocal(src, path.dirname(entry), root);
    if (!asset) return tag;
    const js = fs.readFileSync(asset, "utf8").replace(/<\/script/gi, "<\\/script");
    inlined.push(relativeLabel(root, asset));
    return `<script data-preview-source="${escapeAttr(relativeLabel(root, asset))}">${js}</script>`;
  });

  html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (full, attrs, css) => {
    return `<style${attrs}>${inlineCss(css, path.dirname(entry), root, inlined)}</style>`;
  });

  html = html.replace(/\bstyle=("([^"]*)"|'([^']*)')/gi, (full, quoted, doubleStyle, singleStyle) => {
    const value = doubleStyle ?? singleStyle ?? "";
    const processed = inlineCss(value, path.dirname(entry), root, inlined);
    const quote = quoted[0];
    return `style=${quote}${processed}${quote}`;
  });

  html = html.replace(/\b(src|poster)=("([^"]+)"|'([^']+)')/gi, (full, name, quoted, doubleRef, singleRef) => {
    const ref = doubleRef || singleRef;
    const asset = resolveLocal(ref, path.dirname(entry), root);
    if (!asset || !isBinaryAsset(asset)) return full;
    inlined.push(relativeLabel(root, asset));
    return `${name}="${toDataUri(asset)}"`;
  });

  html = html.replace(/\bsrcset=("([^"]+)"|'([^']+)')/gi, (full, quoted, doubleSet, singleSet) => {
    const value = doubleSet || singleSet;
    const items = value.split(",").map((item) => item.trim()).filter(Boolean);
    const bundled = items.map((item) => {
      const match = item.match(/^(\S+)(\s+.+)?$/);
      if (!match) return item;
      const asset = resolveLocal(match[1], path.dirname(entry), root);
      if (!asset || !isBinaryAsset(asset)) return item;
      inlined.push(relativeLabel(root, asset));
      return `${toDataUri(asset)}${match[2] || ""}`;
    });
    return `srcset="${bundled.join(", ")}"`;
  });

  html = markPreviewOnly(html);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html, "utf8");

  return {
    ok: true,
    artifact: "preview-only",
    input: entry,
    output,
    inlined: [...new Set(inlined)].sort(),
    bytes: fs.statSync(output).size,
  };
}

function inlineCss(source, baseDir, root, inlined) {
  return source.replace(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s]+))\s*\)/gi, (full, doubleRef, singleRef, bareRef) => {
    const ref = doubleRef || singleRef || bareRef;
    const asset = resolveLocal(ref, baseDir, root);
    if (!asset || !isBinaryAsset(asset)) return full;
    inlined.push(relativeLabel(root, asset));
    return `url("${toDataUri(asset)}")`;
  });
}

function resolveLocal(ref, baseDir, root) {
  if (!ref || REMOTE_RE.test(ref) || ref.startsWith("data:")) return null;
  const clean = ref.split(/[?#]/, 1)[0];
  if (!clean) return null;
  const asset = path.resolve(baseDir, decodeURIComponent(clean));
  if (!isWithin(root, asset)) {
    const error = new Error(`Preview asset escapes demo root: ${ref}`);
    error.code = "preview-asset-outside-root";
    throw error;
  }
  if (!fs.existsSync(asset) || !fs.statSync(asset).isFile()) {
    const error = new Error(`Preview asset is missing: ${ref}`);
    error.code = "preview-asset-missing";
    throw error;
  }
  return asset;
}

function toDataUri(file) {
  const mime = MIME_BY_EXT[path.extname(file).toLowerCase()] || "application/octet-stream";
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

function isBinaryAsset(file) {
  return Boolean(MIME_BY_EXT[path.extname(file).toLowerCase()]);
}

function markPreviewOnly(html) {
  if (html.includes(PREVIEW_MARKER)) return html;
  if (/<html\b/i.test(html)) return html.replace(/<html\b/i, `<html ${PREVIEW_MARKER}`);
  return `<!-- image2-ui preview-only -->\n<div ${PREVIEW_MARKER} hidden></div>\n${html}`;
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`, "i"));
  return match ? match[1] ?? match[2] ?? "" : null;
}

function isWithin(root, file) {
  const relative = path.relative(root, file);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function relativeLabel(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function escapeAttr(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function escapeStyle(value) {
  return value.replace(/<\/style/gi, "<\\/style");
}

function defaultOutput(entry, root, inputWasDirectory) {
  if (inputWasDirectory) return path.join(root, ".image2-ui", "preview", "preview.html");
  const ext = path.extname(entry);
  return path.join(path.dirname(entry), `${path.basename(entry, ext)}.preview${ext || ".html"}`);
}

function parseCli(argv) {
  const args = [...argv];
  const input = args.shift();
  let out = null;
  let json = false;
  while (args.length) {
    const arg = args.shift();
    if (arg === "--out") out = args.shift();
    else if (arg === "--json") json = true;
    else if (arg === "--help" || arg === "-h") return { help: true };
    else throw new Error(`Unknown preview option: ${arg}`);
  }
  return { input, out, json };
}

function printHelp() {
  console.log(`Usage:\n  image2-ui preview <demo-dir-or-html> [--out preview.html] [--json]\n\nCreates a preview-only self-contained HTML artifact by inlining local CSS, JS, images, fonts, and media. The canonical implementation remains unchanged.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const options = parseCli(process.argv.slice(2));
    if (options.help || !options.input) {
      printHelp();
      process.exit(options.input ? 0 : 1);
    }
    const result = bundlePreview(options.input, { out: options.out });
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(result.output);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}
