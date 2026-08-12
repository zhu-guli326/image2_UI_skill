import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/luzcswAAAABJRU5ErkJggg==",
  "base64",
);

test("validate returns structured warnings without browser checks", () => {
  const demoDir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-ok-demo-"));
  fs.cpSync(path.join(repoRoot, "tests/fixtures/ok-demo"), demoDir, { recursive: true });
  fs.writeFileSync(path.join(demoDir, "hero.png"), tinyPng);

  const result = spawnSync(node, [
    "scripts/ui_output_audit.mjs",
    demoDir,
    "--json",
    "--no-browser",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.counts.fail, 0);
  assert.ok(parsed.findings.some((finding) => finding.rule === "entry"));
});

test("CLI reports package version", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const stdout = execFileSync(node, ["scripts/image2-ui", "--version"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(stdout.trim(), packageJson.version);
});

test("validate fails missing local assets", () => {
  const result = spawnSync(node, [
    "scripts/ui_output_audit.mjs",
    "tests/fixtures/broken-demo",
    "--json",
    "--no-browser",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 2);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.findings.some((finding) => finding.rule === "broken-local-asset"));
});

test("validate fails when local asset references escape the demo root", () => {
  const parentDir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-escape-"));
  const demoDir = path.join(parentDir, "demo");
  fs.mkdirSync(demoDir);
  fs.writeFileSync(path.join(parentDir, "secret.png"), tinyPng);
  fs.writeFileSync(path.join(demoDir, "index.html"), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Escape Fixture</title>
  </head>
  <body>
    <img src="../secret.png" alt="Escaping asset" />
  </body>
</html>
`);

  const result = spawnSync(node, [
    "scripts/ui_output_audit.mjs",
    demoDir,
    "--json",
    "--no-browser",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 2);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.findings.some((finding) => finding.rule === "asset-outside-root"));
});

test("compare writes an HTML review board", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-compare-"));
  const reference = path.join(tmpDir, "reference.png");
  const actual = path.join(tmpDir, "actual.png");
  const out = path.join(tmpDir, "compare.html");
  fs.writeFileSync(reference, tinyPng);
  fs.writeFileSync(actual, tinyPng);

  const result = spawnSync(node, [
    "scripts/ui_compare.mjs",
    "--reference",
    reference,
    "--actual",
    actual,
    "--out",
    out,
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(out));
  assert.match(fs.readFileSync(out, "utf8"), /Manual review checklist/);
});

test("image2 asset wrapper dry-runs the project image2 command first", () => {
  const stdout = execFileSync("python3", [
    "scripts/image2_asset.py",
    "generate",
    "--prompt",
    "test prompt",
    "--output",
    "tmp/generated/test.png",
    "--prefer",
    "image2",
    "--dry-run",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      IMAGE2_COMMAND: "image2-custom",
    },
  });

  assert.match(stdout, /channel=native-image2/);
  assert.match(stdout, /source=project-image2/);
  assert.match(stdout, /image2-custom/);
  assert.match(stdout, /--output tmp\/generated\/test\.png/);
});

test("doctor marks a missing IMAGE2_COMMAND executable unavailable", () => {
  const stdout = execFileSync("python3", [
    "scripts/image2_asset.py",
    "doctor",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      IMAGE2_COMMAND: "missing-image2-command-for-test",
    },
  });

  const parsed = JSON.parse(stdout);
  const projectChannel = parsed.channels.find((channel) => channel.source === "project-image2");
  assert.equal(projectChannel.available, false);
  assert.match(projectChannel.reason, /executable not found/);
});

test("npm package dry-run contains production entrypoints", () => {
  const stdout = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const [pack] = JSON.parse(stdout);
  const files = new Set(pack.files.map((file) => file.path));

  assert.ok(files.has("SKILL.md"));
  assert.ok(files.has("PRODUCTION.md"));
  assert.ok(files.has("scripts/image2-ui"));
  assert.ok(files.has("scripts/image2_asset.py"));
  assert.ok(files.has("scripts/image2_orchestrate.mjs"));
  assert.ok(files.has("reference.html"));
  assert.ok(files.has("reference.js"));
  assert.ok(files.has("markdown.html"));
  assert.ok(files.has("markdown.css"));
  assert.ok(files.has("markdown.js"));
  assert.ok([...files].some((file) => file.startsWith("references/")));
  assert.ok(files.has("CONTRIBUTING.md"));
  assert.ok(files.has("CHANGELOG.md"));
  assert.ok(files.has("LICENSE"));
  assert.ok(files.has("quality-baseline.json"));
});

test("skill requires a complete effect image before UI decomposition", () => {
  const skill = fs.readFileSync(path.join(repoRoot, "SKILL.md"), "utf8");
  const promptGuide = fs.readFileSync(
    path.join(repoRoot, "references", "asset-manifest-and-prompts.md"),
    "utf8",
  );

  assert.match(skill, /reference image -> complete effect image -> effect-image review -> UI decomposition -> clickable implementation/);
  assert.match(skill, /Do not produce the implementation-level `code-ui` \/ `image2-assets` split yet/);
  assert.match(skill, /start frontend implementation before the effect image has been saved and inspected/);
  assert.match(skill, /Treat the original reference as a fidelity check, not as the implementation decomposition source/);
  assert.match(skill, /explicitly asks to skip effect-image generation/);
  assert.match(promptGuide, /第一轮审查只服务于生成完整效果图，不做代码组件和图片资产拆分/);
  assert.match(promptGuide, /## 效果图确认后的 UI 拆分/);
  assert.match(promptGuide, /禁止直接从原参考图完成上述拆分/);
});

test("library keeps one reference-matched preview frame without stretching case media", () => {
  const markup = fs.readFileSync(path.join(repoRoot, "library.html"), "utf8");
  const stylesheet = fs.readFileSync(path.join(repoRoot, "library.css"), "utf8");
  const script = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");
  const previewConfig = fs.readFileSync(path.join(repoRoot, "library-preview-config.mjs"), "utf8");

  assert.match(markup, /class="preview-media-frame"/);
  assert.match(markup, /id="previewDialogImage"/);
  assert.match(markup, /id="previewDialogVideo" width="390" height="844" controls loop playsinline/);
  assert.match(markup, /id="previewDialogDemo" width="390" height="693"/);
  assert.match(markup, /id="previewCursor"/);
  assert.match(stylesheet, /--card-preview-ratio:\s*697\s*\/\s*1094/);
  assert.match(stylesheet, /\.demo-card-preview\s*\{[^}]*min-height:\s*0[^}]*aspect-ratio:\s*var\(--card-preview-ratio\)/s);
  assert.match(stylesheet, /--phone-preview-ratio:\s*9\s*\/\s*16/);
  assert.match(stylesheet, /\.phone-preview-media\s*\{[^}]*block-size:\s*82%[^}]*max-inline-size:\s*86%[^}]*aspect-ratio:\s*var\(--guide-phone-ratio,\s*var\(--phone-preview-ratio\)\)/s);
  assert.match(stylesheet, /\.phone-preview-media video,\s*\.phone-preview-media img\s*\{[^}]*object-fit:\s*contain/s);
  assert.match(script, /getPreviewDevice\(guide, guide\.video \? "video" : \(guide\.liveDemo \? "live" : "image"\)\)/);
  assert.match(script, /const cardDevice = getCardPreviewDevice\(guide\)/);
  assert.match(script, /--guide-phone-ratio:\s*\$\{cardDevice\.width\}\s*\/\s*\$\{cardDevice\.height\}/);
  assert.match(stylesheet, /\.preview-media-frame\s*\{[^}]*aspect-ratio:\s*var\(--preview-phone-ratio,\s*var\(--phone-preview-ratio\)\)/s);
  assert.match(stylesheet, /\.preview-media-frame\s*>\s*img,[^}]*object-fit:\s*contain/s);
  assert.match(stylesheet, /\.preview-media-frame\s*>\s*iframe\s*\{[^}]*inline-size:\s*var\(--preview-source-width\)[^}]*block-size:\s*var\(--preview-source-height\)[^}]*transform:\s*scale\(var\(--preview-embed-scale/s);
  assert.match(stylesheet, /\.preview-dialog-footer\s*\{[^}]*align-self:\s*start/s);
  assert.match(script, /previewDialogImage\.src = getPreviewPoster\(guide\)/);
  assert.match(script, /import \{ getLibraryPreviewDevice, libraryPreviewAssetVersion \} from "\.\/library-preview-config\.mjs"/);
  assert.match(previewConfig, /defaultPreviewDevice = Object\.freeze\(\{ width:\s*390,\s*height:\s*693 \}\)/);
  assert.match(previewConfig, /standardVideoPreviewDevice = Object\.freeze\(\{ width:\s*390,\s*height:\s*844 \}\)/);
  assert.match(previewConfig, /mode === "video" \? standardVideoPreviewDevice : defaultPreviewDevice/);
  assert.match(previewConfig, /museum: \{ image: \{ width: 360, height: 511 \}, video: standardVideoPreviewDevice \}/);
  assert.match(previewConfig, /fashion: \{ image: \{ width: 360, height: 721 \}, video: standardVideoPreviewDevice \}/);
  assert.match(previewConfig, /news: \{ image: \{ width: 360, height: 683 \}, video: standardVideoPreviewDevice \}/);
  assert.match(previewConfig, /moe: \{ image: \{ width: 390, height: 693 \}, video: standardVideoPreviewDevice, live:/);
  assert.match(previewConfig, /cleanbite:\s*\{ image:\s*\{ width:\s*390,\s*height:\s*844 \},\s*live:\s*\{ width:\s*390,\s*height:\s*844 \} \}/);
  assert.match(previewConfig, /"plate-play":\s*\{ image:\s*\{ width:\s*390,\s*height:\s*844 \},\s*live:\s*\{ width:\s*390,\s*height:\s*844 \} \}/);
  assert.match(previewConfig, /journal:\s*\{ image:\s*\{ width:\s*390,\s*height:\s*693 \},\s*live:\s*\{ width:\s*390,\s*height:\s*693 \} \}/);
  assert.match(previewConfig, /notebook:\s*\{ image:\s*\{ width:\s*390,\s*height:\s*693 \},\s*live:\s*\{ width:\s*390,\s*height:\s*693 \} \}/);
  assert.match(previewConfig, /"relay-music":\s*\{ image:\s*\{ width:\s*390,\s*height:\s*844 \},\s*live:\s*\{ width:\s*390,\s*height:\s*844 \} \}/);
  assert.match(script, /getPreviewDevice\(guide, nextMode\)/);
  assert.doesNotMatch(script, /cardPreviewDevice/);
  assert.match(script, /--guide-phone-ratio/);
  assert.doesNotMatch(script, /--guide-phone-width/);
  assert.doesNotMatch(script, /cardPhoneWidth/);
  assert.match(script, /--preview-phone-ratio/);
  assert.match(script, /--preview-source-width/);
  assert.match(script, /--preview-source-height/);
  assert.match(script, /updateEmbeddedPreviewScale/);
  assert.match(script, /ResizeObserver/);
  assert.match(script, /element\.height = phoneHeight/);
  assert.doesNotMatch(script, /normalizeEmbeddedDemoFrame/);
  assert.match(script, /url\.searchParams\.set\("embed", "1"\)/);
  assert.match(script, /library-preview-2x\.png/);
  assert.match(script, /\?v=\$\{libraryPreviewAssetVersion\}/);
  assert.doesNotMatch(script, /data-fallback-poster/);
  assert.doesNotMatch(script, /previewDialogImage\.dataset\.fallback/);
  assert.doesNotMatch(script, /class="video-badge"/);
  assert.match(script, /class="preview-open-button"[^>]*><span>\$\{openLabel\}<\/span><\/button>/);
  assert.match(script, /image:\s*"效果图"/);
  assert.match(script, /video:\s*"Demo 视频"/);
  assert.match(script, /live:\s*"可点击 Demo"/);
  assert.ok(fs.existsSync(path.join(repoRoot, "assets", "style-references", "today-showcase.png")));
});

test("library poster capture uses the same embed state as the live iframe", () => {
  const captureScript = fs.readFileSync(path.join(repoRoot, "scripts", "capture_library_posters.mjs"), "utf8");

  assert.match(captureScript, /const targetUrl = `file:\/\/\$\{demoPath\}\?embed=1`/);
  assert.doesNotMatch(captureScript, /capture=1/);
});

test("library audit keeps every video preview on the FitHub canvas", () => {
  const auditScript = fs.readFileSync(path.join(repoRoot, "scripts", "audit_library.mjs"), "utf8");

  assert.match(auditScript, /getLibraryPreviewDevice\(item\.id, "video"\)/);
  assert.match(auditScript, /videoDevice\.width === 390 && videoDevice\.height === 844/);
});

test("CleanBite and Plate Play use verified Youtoken-generated assets", () => {
  const cleanbiteMarkup = fs.readFileSync(path.join(repoRoot, "demo", "cleanbite-scanner", "index.html"), "utf8");
  const plateMarkup = fs.readFileSync(path.join(repoRoot, "demo", "plate-play", "index.html"), "utf8");
  const cleanbiteProvenance = JSON.parse(fs.readFileSync(path.join(repoRoot, "demo", "cleanbite-scanner", "assets", "apple-sorbet-youtoken-v2.png.provenance.json"), "utf8"));
  const plateProvenance = JSON.parse(fs.readFileSync(path.join(repoRoot, "demo", "plate-play", "assets", "chef-illustration-youtoken-v3.png.provenance.json"), "utf8"));

  assert.match(cleanbiteMarkup, /apple-sorbet-youtoken-v2\.png/);
  assert.match(plateMarkup, /chef-illustration-youtoken-v3\.png/);
  assert.equal(cleanbiteProvenance.channel, "youtoken-gpt-image-2");
  assert.equal(plateProvenance.channel, "youtoken-gpt-image-2");
  assert.equal(cleanbiteProvenance.model, "gpt-image-2");
  assert.equal(plateProvenance.model, "gpt-image-2");
});

test("live effect previews always use current snapshots without effect-board exceptions", () => {
  const script = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");
  const previewConfig = fs.readFileSync(path.join(repoRoot, "library-preview-config.mjs"), "utf8");

  assert.match(script, /id: "plate-play"[^\n]*effectImage: "\.\/demo\/plate-play\/assets\/reference-overview\.png"/);
  assert.match(previewConfig, /"plate-play":\s*\{ image:\s*\{ width:\s*390,\s*height:\s*844 \},\s*live:\s*\{ width:\s*390,\s*height:\s*844 \} \}/);
  assert.match(script, /function getCardPoster\(guide\)\s*\{\s*if \(guide\.liveDemo\) return `\$\{guide\.liveDemo\.replace[^`]+libraryPreviewAssetVersion[^`]+`;/s);
  assert.match(script, /function getPreviewPoster\(guide\)\s*\{\s*return getCardPoster\(guide\);/s);
  assert.match(script, /const poster = getCardPoster\(guide\)/);
  assert.doesNotMatch(script, /guide\.effectImage \|\| getCardPoster/);
});

test("library opens the UI vocabulary in a rendered document page", () => {
  const libraryMarkup = fs.readFileSync(path.join(repoRoot, "library.html"), "utf8");
  const readerMarkup = fs.readFileSync(path.join(repoRoot, "reference.html"), "utf8");
  const readerScript = fs.readFileSync(path.join(repoRoot, "reference.js"), "utf8");
  const markdownScript = fs.readFileSync(path.join(repoRoot, "markdown.js"), "utf8");

  assert.match(libraryMarkup, /href="\.\/reference\.html\?doc=ui-section-vocabulary"[^>]*>UI 词典<\/a>/);
  assert.doesNotMatch(libraryMarkup, /href="[^"]*ui-section-vocabulary\.md"/);
  assert.match(readerMarkup, /id="documentContent"/);
  assert.match(readerMarkup, /id="documentNavigation"/);
  assert.match(readerMarkup, /id="languageSwitch"/);
  assert.match(readerMarkup, /"ui-section-vocabulary":\s*\{/);
  assert.match(readerMarkup, /locales:\s*\{/);
  assert.match(readerMarkup, /source:\s*"\.\/references\/ui-section-vocabulary\.zh\.md"/);
  assert.match(readerMarkup, /source:\s*"\.\/references\/ui-section-vocabulary\.md"/);
  assert.ok(fs.existsSync(path.join(repoRoot, "references", "ui-section-vocabulary.zh.md")));
  assert.match(readerMarkup, /<script src="\.\/markdown\.js" defer><\/script>/);
  assert.match(readerScript, /requestedLanguage/);
  assert.match(readerScript, /languageSwitch/);
  assert.match(readerScript, /document\.documentElement\.lang/);
  assert.match(markdownScript, /safeDocumentPath/);
  assert.match(markdownScript, /escapeHtml/);
  assert.match(markdownScript, /markdownLocaleStrings/);
});

test("library case metadata and live actions stay complete", () => {
  const markup = fs.readFileSync(path.join(repoRoot, "library.html"), "utf8");
  const script = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");
  const guides = [...script.matchAll(/\bid:\s*"[^"]+",\s*category:\s*"([^"]+)"/g)];
  const counts = guides.reduce((result, match) => {
    result[match[1]] = (result[match[1]] || 0) + 1;
    return result;
  }, {});

  assert.equal(guides.length, 23);
  assert.deepEqual(counts, {
    culture: 1,
    commerce: 6,
    editorial: 1,
    travel: 3,
    creative: 4,
    wellness: 8,
  });
  assert.match(markup, /data-filter="all"[^>]*><span>全部案例<\/span><b>23<\/b>/);
  assert.equal((script.match(/liveDemo:\s*"/g) || []).length, 20);
  assert.match(script, /guide\.liveDemo \? `<button class="style-details-button"[^`]*data-preview-mode="live">可点击<\/button>`/);
});

test("RELAY case keeps effect generation before UI decomposition", () => {
  const script = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");
  const demoRoot = path.join(repoRoot, "demo", "relay-music");
  const decomposition = fs.readFileSync(path.join(demoRoot, "artifacts", "ui-deconstruction.md"), "utf8");
  const manifest = JSON.parse(fs.readFileSync(path.join(demoRoot, "artifacts", "asset-manifest.json"), "utf8"));

  assert.match(script, /id: "relay-music"[^}]*poster: "\.\/demo\/relay-music\/assets\/relay-effect-board\.png"/s);
  assert.match(script, /id: "relay-music"[^}]*referenceImage: "\.\/demo\/relay-music\/assets\/reference-overview\.png"/s);
  assert.match(script, /id: "relay-music"[^}]*liveDemo: "\.\/demo\/relay-music\/index\.html"/s);
  assert.ok(fs.existsSync(path.join(demoRoot, "assets", "relay-effect-board.png")));
  assert.ok(fs.existsSync(path.join(demoRoot, "index.html")));
  assert.equal(manifest.workflow.effectImageReviewed, true);
  assert.equal(manifest.workflow.decompositionSource, "assets/relay-effect-board.png");
  assert.match(decomposition, /Decomposition source: `relay-effect-board\.png` only/);
  assert.match(decomposition, /original reference is retained as a fidelity check/i);
});

test("SOFTLY case uses its generated effect image as the decomposition source", () => {
  const script = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");
  const demoRoot = path.join(repoRoot, "demo", "softly-reflections");
  const decomposition = fs.readFileSync(path.join(demoRoot, "artifacts", "ui-deconstruction.md"), "utf8");
  const manifest = JSON.parse(fs.readFileSync(path.join(demoRoot, "artifacts", "asset-manifest.json"), "utf8"));

  assert.match(script, /id: "softly-reflections"[^}]*poster: "\.\/demo\/softly-reflections\/assets\/softly-effect-board\.png"/s);
  assert.match(script, /id: "softly-reflections"[^}]*referenceImage: "\.\/demo\/softly-reflections\/assets\/reference-overview\.png"/s);
  assert.match(script, /id: "softly-reflections"[^}]*liveDemo: "\.\/demo\/softly-reflections\/index\.html"/s);
  assert.ok(fs.existsSync(path.join(demoRoot, "assets", "softly-effect-board.png")));
  assert.ok(fs.existsSync(path.join(demoRoot, "assets", "softly-mascot.png")));
  assert.ok(fs.existsSync(path.join(demoRoot, "index.html")));
  assert.equal(manifest.workflow.effectImageReviewed, true);
  assert.equal(manifest.workflow.decompositionSource, "assets/softly-effect-board.png");
  assert.match(decomposition, /Decomposition source: `softly-effect-board\.png` only/);
  assert.match(decomposition, /original reference is used only to check/i);
});

test("library opens live demos from the primary preview action", () => {
  const script = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");

  assert.match(script, /const openMode = guide\.defaultPreviewMode \|\| \(guide\.liveDemo \? "live" : mediaMode\)/);
  assert.match(script, /data-preview-mode="\$\{openMode\}"/);
  assert.match(script, /mode === "auto" \? \(guide\.defaultPreviewMode \|\| \(guide\.liveDemo \? "live" : \(guide\.video \? "video" : "image"\)\)\)/);
});

test("Loy opens its current live snapshot before optional demo modes", () => {
  const script = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");
  const previewConfig = fs.readFileSync(path.join(repoRoot, "library-preview-config.mjs"), "utf8");
  const imagePath = path.join(repoRoot, "demo", "loy-wellness", "screenshots", "03-welcome.png");

  assert.match(script, /id: "loy"[^\n]*previewImage: "\.\/demo\/loy-wellness\/screenshots\/03-welcome\.png"[^\n]*defaultPreviewMode: "image"/);
  assert.match(script, /const openMode = guide\.defaultPreviewMode \|\| \(guide\.liveDemo \? "live" : mediaMode\)/);
  assert.match(script, /function getCardPoster\(guide\)\s*\{\s*if \(guide\.liveDemo\) return/s);
  assert.match(previewConfig, /loy:\s*\{ image:\s*\{ width:\s*390,\s*height:\s*693 \},\s*live:\s*\{ width:\s*390,\s*height:\s*693 \} \}/);
  assert.ok(fs.existsSync(imagePath));
});

test("library cards contain their content and cursor path", () => {
  const stylesheet = fs.readFileSync(path.join(repoRoot, "library.css"), "utf8");
  const cursorRule = stylesheet.match(/@keyframes card-cursor-path\s*\{([\s\S]*?)\}\s*@keyframes preview-cursor-path/);

  assert.match(stylesheet, /\.demo-card\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(stylesheet, /\.demo-card-body\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0[^}]*box-sizing:\s*border-box/s);
  assert.match(stylesheet, /\.demo-card-footer\s*\{[^}]*flex-direction:\s*column/s);
  assert.match(stylesheet, /\.demo-card-actions\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.ok(cursorRule);
  const points = [...cursorRule[1].matchAll(/translate\((\d+)px,\s*(\d+)px\)/g)];
  assert.ok(points.length >= 7);
  assert.ok(Math.max(...points.map((point) => Number(point[1]))) <= 145);
  assert.ok(Math.max(...points.map((point) => Number(point[2]))) <= 290);
});

test("Still Form keeps hidden and active view state synchronized", () => {
  const script = fs.readFileSync(path.join(repoRoot, "demo", "still-form", "script.js"), "utf8");

  assert.match(script, /const active = v\.dataset\.view === n/);
  assert.match(script, /v\.hidden = !active/);
  assert.match(script, /v\.classList\.toggle\("active", active\)/);
});

test("repository demo validation covers every bundled demo", () => {
  const result = execFileSync(node, ["scripts/validate_demos.mjs", "--no-browser", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const parsed = JSON.parse(result);
  assert.equal(parsed.status, "pass");
  assert.ok(parsed.demos.length >= 4);
  assert.equal(parsed.summary.fail, 0);
  assert.ok(Object.keys(parsed.baseline).length > 0);
});

test("multi-agent orchestrator exposes the production DAG in dry-run mode", () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-orchestrate-"));
  const result = execFileSync(node, [
    "scripts/image2-ui",
    "orchestrate",
    target,
    "--task",
    "Build a production-shaped UI",
    "--dry-run",
    "--json",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  const parsed = JSON.parse(result);
  assert.equal(parsed.manifest.executionMode, "multi-agent");
  assert.deepEqual(parsed.plan.map((phase) => phase.name), [
    "discovery",
    "architecture",
    "implementation",
    "review",
    "verification",
    "release",
  ]);
  assert.deepEqual(parsed.plan[0].roles, ["visual-analyst", "asset-engineer"]);
  assert.deepEqual(parsed.plan[3].roles, ["code-reviewer"]);
  assert.deepEqual(parsed.plan[4].roles, ["accessibility", "qa-auditor"]);
  assert.deepEqual(parsed.plan[4].batches, [["accessibility"], ["qa-auditor"]]);
  assert.match(parsed.manifest.artifactsDir, /\.image2-ui[\\/]agents/);
});

function createFakeAgent() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-fake-agent-"));
  const executable = path.join(dir, "fake-agent.mjs");
  fs.writeFileSync(executable, `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const outputIndex = args.indexOf("-o");
const output = args[outputIndex + 1];
const prompt = args.at(-1) || "";
const role = prompt.match(/You are the ([a-z-]+)/)?.[1] || "unknown";
if (process.env.FAKE_AGENT_FAIL_ROLE === role) process.exit(17);
const requiredSection = prompt.split("Write your required role outputs under the run artifacts directory using these exact filenames:\\n")[1]?.split("\\n\\nEnd your final response")[0] || "";
if (process.env.FAKE_AGENT_SKIP_ROLE !== role) {
  for (const match of requiredSection.matchAll(/^- (\\/[^\\n]+)$/gm)) {
    fs.mkdirSync(path.dirname(match[1]), { recursive: true });
    fs.writeFileSync(match[1], "fake artifact for " + role + "\\n");
  }
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, "## Agent Handoff\\n- Role: " + role + "\\n- Status: complete\\n- Scope: fake integration test\\n- Files created: fake\\n- Files changed: none\\n- Decisions: none\\n- Open questions: none\\n- Validation run: fake\\n- Next agent: next\\n");
`);
  fs.chmodSync(executable, 0o755);
  return executable;
}

function latestRunManifest(target) {
  const runs = fs.readdirSync(path.join(target, ".image2-ui", "agents"));
  const latest = runs.sort().at(-1);
  return JSON.parse(fs.readFileSync(path.join(target, ".image2-ui", "agents", latest, "run.json"), "utf8"));
}

test("multi-agent orchestrator runs the full DAG with a fake agent adapter", () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-agent-run-"));
  const fakeAgent = createFakeAgent();
  const result = spawnSync(node, [
    "scripts/image2-ui", "orchestrate", "--task", "Build a production UI",
    "--agent-command", fakeAgent, target, "--max-parallel", "3", "--json",
  ], { cwd: repoRoot, encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(result.stdout);
  assert.equal(manifest.status, "complete");
  assert.equal(Object.values(manifest.roles).filter((role) => role.status === "complete").length, 10);
  assert.ok(fs.existsSync(path.join(manifest.artifactsDir, "code-review-report.md")));
  assert.ok(fs.existsSync(path.join(manifest.artifactsDir, "release-report.md")));
});

test("multi-agent orchestrator blocks when an agent exits or breaks its handoff contract", () => {
  const fakeAgent = createFakeAgent();
  for (const envKey of ["FAKE_AGENT_FAIL_ROLE", "FAKE_AGENT_SKIP_ROLE"]) {
    const target = fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-agent-failure-"));
    const result = spawnSync(node, [
      "scripts/image2-ui", "orchestrate", target, "--task", "Build a production UI",
      "--agent-command", fakeAgent, "--json",
    ], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, [envKey]: envKey === "FAKE_AGENT_FAIL_ROLE" ? "asset-engineer" : "visual-analyst" },
    });
    assert.equal(result.status, 2);
    const manifest = latestRunManifest(target);
    const failedRole = envKey === "FAKE_AGENT_FAIL_ROLE" ? "asset-engineer" : "visual-analyst";
    assert.equal(manifest.status, "blocked");
    assert.equal(manifest.roles[failedRole].status, "failed");
    if (envKey === "FAKE_AGENT_SKIP_ROLE") assert.match(manifest.roles[failedRole].error, /Handoff contract failed/);
  }
});

test("all bundled demos expose shared motion tokens and reduced-motion rules", () => {
  for (const name of ["artmuse-ios", "generated-home-ui", "marble-note", "smart-home-ui-v2"]) {
    const stylesheet = name === "smart-home-ui-v2"
      ? fs.readFileSync(path.join(repoRoot, "demo", name, "src", "styles.css"), "utf8")
      : fs.readFileSync(path.join(repoRoot, "demo", name, "styles.css"), "utf8");
    assert.match(stylesheet, /--motion-duration-fast/);
    assert.match(stylesheet, /--motion-ease-standard/);
    assert.match(stylesheet, /prefers-reduced-motion/);
    assert.match(stylesheet, /motion-fade-up|motion-view-enter/);
  }
});

test("bundled demos use semantic motion instead of a uniform hover template", () => {
  const motionGuide = fs.readFileSync(path.join(repoRoot, "references", "motion-system.md"), "utf8");
  const artmuseScript = fs.readFileSync(path.join(repoRoot, "demo", "artmuse-ios", "script.js"), "utf8");
  const marbleScript = fs.readFileSync(path.join(repoRoot, "demo", "marble-note", "script.js"), "utf8");
  const homeScript = fs.readFileSync(path.join(repoRoot, "demo", "generated-home-ui", "script.js"), "utf8");
  const smartHomeSource = fs.readFileSync(path.join(repoRoot, "demo", "smart-home-ui-v2", "src", "main.jsx"), "utf8");
  const smartHomeStyles = fs.readFileSync(path.join(repoRoot, "demo", "smart-home-ui-v2", "src", "styles.css"), "utf8");

  assert.match(motionGuide, /Semantic Motion Families/);
  assert.match(motionGuide, /Forward and backward navigation use opposite directions/);
  assert.match(artmuseScript, /navDirection/);
  assert.match(artmuseScript, /aria-pressed/);
  assert.match(marbleScript, /\.inert =/);
  assert.match(marbleScript, /motion-back/);
  assert.match(homeScript, /--nav-index/);
  assert.match(homeScript, /navigateToPhone/);
  assert.match(smartHomeSource, /onPointerDown/);
  assert.match(smartHomeSource, /--dial-angle/);
  assert.match(smartHomeSource, /playerState/);
  assert.match(smartHomeStyles, /\.segmented-indicator/);
  assert.doesNotMatch(smartHomeStyles, /\.device-card:hover[\s\S]{0,120}translateY/);
});

test("beginner guide teaches through real case studies", () => {
  const markup = fs.readFileSync(path.join(repoRoot, "learn.html"), "utf8");
  const script = fs.readFileSync(path.join(repoRoot, "learn.js"), "utf8");
  const stylesheet = fs.readFileSync(path.join(repoRoot, "learn.css"), "utf8");

  assert.match(markup, /id="case-study"/);
  assert.match(markup, /data-case="buddy"/);
  assert.match(markup, /data-case="plate"/);
  assert.match(markup, /data-case="relay"/);
  assert.match(markup, /class="learning-map"/);
  assert.match(markup, /data-learn-section="learning-path"/);
  assert.match(markup, /data-learn-section="case-study"/);
  assert.match(markup, /data-learn-section="playground"/);
  assert.match(markup, /class="hero-line hero-line-accent"/);
  assert.match(markup, /新手最常问的 4 个问题/);
  assert.match(markup, /前端到底是什么/);
  assert.match(markup, /UI 和 UX 听起来很像，有什么区别/);
  assert.match(markup, /class="screen-anatomy"/);
  assert.match(markup, /Buddy 旅行计划完整页面/);
  assert.match(markup, /data-vocab="主视觉"/);
  assert.match(markup, /data-vocab="底部导航"/);
  assert.match(markup, /developer\.mozilla\.org\/en-US\/docs\/Learn_web_development\/Getting_started\/Your_first_website/);
  assert.match(markup, /web\.dev\/learn/);
  assert.match(markup, /nngroup\.com\/articles\/what-is-user-experience/);
  assert.match(markup, /reddit\.com\/r\/learnprogramming/);
  assert.match(script, /caseStudies = \{/);
  assert.match(script, /buddy-travel\/mobile-preview\.png/);
  assert.match(script, /plate-play\/mobile-preview\.png/);
  assert.match(script, /relay-music\/assets\/relay-effect-board\.png/);
  assert.match(script, /caseTask\.textContent = item\.task/);
  assert.match(script, /caseTags\.innerHTML/);
  assert.match(script, /vocabName\.textContent = button\.dataset\.vocab/);
  assert.match(script, /item\.dataset\.vocab === button\.dataset\.vocab/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /aria-current/);
  assert.match(stylesheet, /\.case-board\s*\{/);
  assert.match(stylesheet, /\.case-tab\.is-selected/);
  assert.match(stylesheet, /\.learning-map\s*\{/);
  assert.match(stylesheet, /\.answer-row\s*\{/);
  assert.match(stylesheet, /\.research-note\s*\{/);
  assert.match(stylesheet, /\.anatomy-marker\s*\{/);
});
