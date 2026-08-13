import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { searchGuides } from "../library-search.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/luzcswAAAABJRU5ErkJggg==",
  "base64",
);

test("library search understands that 女装 means fashion and clothing", () => {
  const guides = [
    {
      id: "fashion",
      category: "commerce",
      name: "Vestra",
      style: "编辑式时尚电商",
      reference: "时装画册的留白节奏",
      summary: "大幅人物视觉与轻量购物流程。",
      bestFor: "时装、美妆、生活方式、设计师品牌",
      palette: "雾粉 / 奶白 / 深巧克力",
      layout: "沉浸大图 + 轻量商品列表",
      tags: ["编辑画册", "人物主视觉", "轻量购物"],
    },
    {
      id: "still-form",
      category: "commerce",
      name: "Still Form",
      style: "可持续服饰电商",
      reference: "天然面料摄影",
      summary: "安静的成衣编辑体验。",
      bestFor: "服饰零售、生活方式品牌、可持续产品、编辑式电商",
      palette: "灰绿 / 象牙白 / 深巧克力 / 亚麻棕",
      layout: "品牌入口 + 分类商品页 + 单品详情",
      tags: ["天然面料", "编辑式商品", "深棕操作"],
    },
    {
      id: "fufu",
      category: "commerce",
      name: "FuFu Bakery",
      style: "手绘烘焙会员",
      reference: "狗狗烘焙师与纸白留白",
      summary: "店内手写菜单。",
      bestFor: "烘焙、咖啡、会员活动",
      palette: "纸白 / 浅天蓝 / 黄油黄 / 墨黑",
      layout: "欢迎页 + 门店首页 + 会员集点卡",
      tags: ["黑色线稿", "狗狗烘焙师", "纸白留白"],
    },
  ];

  assert.deepEqual(searchGuides(guides, "女装").map((guide) => guide.id), ["fashion", "still-form"]);
});

test("library search matches the real catalog across fields without broad fuzzy noise", async () => {
  const { styleGuides } = await import("../catalog/index.js");
  const expected = new Map([
    ["女装", ["fashion", "still-form"]],
    ["女装 app", ["fashion", "still-form"]],
    ["营养 扫描", ["cleanbite"]],
    ["营养扫描", ["cleanbite"]],
    ["情绪 手绘", ["loy"]],
    ["电商 背包", ["carry-bag"]],
    ["EV charging", ["volt-route"]],
    ["habit tracker", ["moe"]],
    ["music player", ["relay-music"]],
    ["Fit Hub", ["fithub"]],
    ["FuFu-Bakery", ["fufu"]],
    ["Now-Playing", ["relay-music"]],
    ["纸张白/鼠尾草绿", ["museum"]],
    ["volt-route", ["volt-route"]],
    ["ArtMuze", ["museum"]],
    ["CleanBte", ["cleanbite"]],
    ["Vestrra", ["fashion"]],
    ["伪手写", ["moe"]],
    ["吸附式轮播", ["mimo"]],
    ["Mara", ["softly-reflections"]],
  ]);

  for (const [query, ids] of expected) {
    assert.deepEqual(searchGuides(styleGuides, query).slice(0, ids.length).map((guide) => guide.id), ids, query);
  }
});

test("typing a library search clears browsing filters and ships its search module", () => {
  const script = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));

  assert.match(script, /searchInput\.addEventListener\("input", \(\) => \{[\s\S]*activeCategory = "all";[\s\S]*activeTag = "";/);
  assert.match(script, /window\.history\.replaceState\(\{ tag: "" \}, "", url\)/);
  assert.ok(packageJson.files.includes("library-search.mjs"));
});

test("catalog exposes brand profiles, source states, and case associations", async () => {
  const { styleGuides, brandProfiles } = await import("../catalog/index.js");
  assert.equal(styleGuides.length, 23);
  assert.equal(brandProfiles.length, 3);
  assert.deepEqual(new Set(brandProfiles.map((brand) => brand.sourceStatus)), new Set(["风格参考"]));
  for (const brand of brandProfiles) {
    for (const key of ["foundations", "components", "visualLanguage", "contentVoice", "accessibility", "dos", "donts"]) assert.ok(brand[key], `${brand.id} missing ${key}`);
    assert.ok(styleGuides.some((guide) => guide.brandProfileIds.includes(brand.id)), `${brand.id} has no related case`);
  }
  for (const guide of styleGuides) assert.ok(guide.brandProfileIds.length > 0, `${guide.id} has no brand association`);
});

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

test("catalog is the single source for cases and brand profiles", () => {
  const cases = fs.readdirSync(path.join(repoRoot, "catalog", "cases")).filter((file) => file.endsWith(".json")).map((file) => JSON.parse(fs.readFileSync(path.join(repoRoot, "catalog", "cases", file), "utf8")));
  const brands = fs.readdirSync(path.join(repoRoot, "catalog", "brands")).filter((file) => file.endsWith(".json")).map((file) => JSON.parse(fs.readFileSync(path.join(repoRoot, "catalog", "brands", file), "utf8")));
  const brandIds = new Set(brands.map((brand) => brand.id));
  const generated = fs.readFileSync(path.join(repoRoot, "catalog", "index.js"), "utf8");

  assert.equal(cases.length, 23);
  assert.equal(brands.length, 3);
  assert.ok(cases.every((item) => item.brandProfileIds.length > 0 && item.brandProfileIds.every((id) => brandIds.has(id))));
  assert.ok(brands.every((brand) => ["品牌提供", "基于公开设计规范", "风格参考", "自定义品牌"].includes(brand.sourceStatus)));
  assert.match(generated, /export const styleGuides/);
  assert.match(generated, /export const brandProfiles/);
  execFileSync(node, ["scripts/build_catalog.mjs", "--check"], { cwd: repoRoot, encoding: "utf8" });
});

test("brand library exposes filters, source status, and all export actions", () => {
  const markup = fs.readFileSync(path.join(repoRoot, "brands.html"), "utf8");
  const script = fs.readFileSync(path.join(repoRoot, "brands.js"), "utf8");
  const skill = fs.readFileSync(path.join(repoRoot, "SKILL.md"), "utf8");

  for (const filter of ["platform", "industry", "style", "completeness"]) assert.match(markup, new RegExp(`name="${filter}"`));
  assert.match(script, /应用到新项目/);
  assert.match(script, /复制品牌 Prompt/);
  assert.match(script, /生成 Design Tokens/);
  assert.match(script, /assetPolicy/);
  assert.match(script, /不得自动生成、仿制或添加品牌 Logo/);
  assert.match(skill, /artifacts\/brand-profile\.json/);
  assert.match(skill, /artifacts\/brand-tokens\.json/);
  assert.match(skill, /artifacts\/brand-compliance\.md/);
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
  assert.ok(files.has("launcher.html"));
  assert.ok(files.has("launcher.css"));
  assert.ok(files.has("launcher.js"));
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

test("visual launcher produces structured image-to-ui skill instructions", () => {
  const markup = fs.readFileSync(path.join(repoRoot, "launcher.html"), "utf8");
  const script = fs.readFileSync(path.join(repoRoot, "launcher.js"), "utf8");
  const stylesheet = fs.readFileSync(path.join(repoRoot, "launcher.css"), "utf8");
  const skill = fs.readFileSync(path.join(repoRoot, "SKILL.md"), "utf8");

  assert.match(markup, /id="launcherForm"/);
  assert.match(markup, /name="format" value="mobile"/);
  assert.match(markup, /name="style" value="plate"/);
  assert.match(markup, /name="workflow" value="full"/);
  assert.match(markup, /name="interaction" value="path"/);
  assert.match(markup, /id="referenceFile"[^>]*accept="image\/png,image\/jpeg,image\/webp,image\/gif"/);
  assert.match(markup, /id="copyPrompt"/);
  assert.match(script, /使用 \$image-to-ui-skill/);
  assert.match(script, /参考输入：/);
  assert.match(script, /localStorage\.setItem\("image2-ui-launcher"/);
  assert.match(script, /navigator\.clipboard\.writeText/);
  assert.match(script, /URL\.createObjectURL/);
  assert.match(markup, /id="intentDialog"[^>]*aria-labelledby="intentDialogTitle"/);
  assert.equal((markup.match(/data-intent=/g) || []).length, 4);
  assert.match(markup, /探索并理解代码/);
  assert.match(markup, /构建新功能、应用或工具/);
  assert.match(markup, /审查代码并提出修改建议/);
  assert.match(markup, /修复问题和失败/);
  assert.match(script, /searchParams\.get\("start"\) === "1"\) openIntentDialog\(\)/);
  assert.match(script, /localStorage\.setItem\("image2-ui-intent"/);
  assert.match(script, /任务方向：/);
  assert.match(stylesheet, /\.intent-choice-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,/s);
  assert.match(stylesheet, /\.launcher-grid\s*\{/);
  assert.match(stylesheet, /\.prompt-column\s*\{/);
  assert.match(stylesheet, /prefers-reduced-motion/);
  assert.match(skill, /file:\/\/\/Users\/zzhu\/Documents\/image2%20ui\/launcher\.html/);
  assert.match(skill, /Treat the launcher's generated prompt as structured user intent/);
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

test("library keeps one standard high-screen preview frame without stretching case media", () => {
  const markup = fs.readFileSync(path.join(repoRoot, "library.html"), "utf8");
  const stylesheet = fs.readFileSync(path.join(repoRoot, "library.css"), "utf8");
  const script = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");
  const previewConfig = fs.readFileSync(path.join(repoRoot, "library-preview-config.mjs"), "utf8");

  assert.match(markup, /class="preview-media-frame"/);
  assert.match(markup, /id="previewDialogImage"/);
  assert.match(markup, /id="previewImageNavigation"/);
  assert.match(markup, /id="previewImagePrevious"/);
  assert.match(markup, /id="previewImageNext"/);
  assert.match(markup, /id="previewDialogVideo" width="390" height="844" controls loop playsinline/);
  assert.match(markup, /id="previewDialogDemo" width="390" height="844"/);
  assert.match(markup, /id="previewCursor"/);
  assert.match(stylesheet, /--card-preview-ratio:\s*4\s*\/\s*5/);
  assert.match(stylesheet, /\.demo-card-preview\s*\{[^}]*min-height:\s*0[^}]*aspect-ratio:\s*var\(--card-preview-ratio\)/s);
  assert.match(stylesheet, /--device-ratio:\s*390\s*\/\s*844/);
  assert.match(stylesheet, /--card-device-height:\s*376px/);
  assert.match(stylesheet, /--modal-device-height:\s*649px/);
  assert.match(stylesheet, /\.phone-preview-media\s*\{[^}]*width:\s*min\(calc\(var\(--card-device-height\) \* 390 \/ 844\),\s*60%\)[^}]*height:\s*min\(var\(--card-device-height\),\s*calc\(100% - 48px\)\)[^}]*border:\s*0/s);
  assert.match(stylesheet, /\.phone-preview-media video,\s*\.phone-preview-media img\s*\{[^}]*object-fit:\s*contain/s);
  assert.match(script, /getLibraryPreviewDisplayDevice\(\)/);
  assert.doesNotMatch(script, /getCardPreviewDevice/);
  assert.doesNotMatch(script, /--guide-phone-ratio/);
  assert.match(stylesheet, /\.preview-dialog\s*\{[^}]*width:\s*min\(1040px,[^}]*height:\s*min\(760px,/s);
  assert.match(stylesheet, /\.preview-dialog-content\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*600px\) minmax\(0,\s*360px\)/s);
  assert.match(stylesheet, /\.preview-media-frame\s*\{[^}]*width:\s*min\(calc\(var\(--modal-device-height\) \* 390 \/ 844\),\s*100%\)[^}]*height:\s*min\(var\(--modal-device-height\),\s*calc\(100dvh - 96px\)\)/s);
  assert.match(stylesheet, /\.preview-media-frame\s*>\s*img,[^}]*object-fit:\s*contain/s);
  assert.match(stylesheet, /\.preview-image-navigation\s*\{[^}]*grid-template-columns:\s*44px minmax\(0,\s*1fr\) 44px/s);
  assert.match(stylesheet, /\.preview-media-frame\s*>\s*iframe\s*\{[^}]*inline-size:\s*var\(--preview-source-width\)[^}]*block-size:\s*var\(--preview-source-height\)[^}]*transform:\s*translate\(-50%,\s*-50%\)\s*scale\(var\(--preview-embed-scale/s);
  assert.match(stylesheet, /\.preview-dialog-footer\s*\{[^}]*align-self:\s*start/s);
  assert.match(script, /previewDialogImage\.src = image\.src/);
  assert.match(script, /const previewImageSets = Object\.freeze/);
  assert.match(script, /function getPreviewImages\(guide\)/);
  assert.match(script, /if \(guide\.previewImage\) return guide\.previewImage/);
  assert.match(script, /if \(guide\.liveDemo\) return getCardPoster\(guide\)/);
  assert.match(script, /function showPreviewImage\(index\)/);
  assert.match(script, /event\.key === "ArrowLeft"/);
  assert.match(script, /event\.key === "ArrowRight"/);
  assert.match(script, /import \{ getLibraryPreviewDevice, getLibraryPreviewDisplayDevice, libraryPreviewAssetVersion \} from "\.\/library-preview-config\.mjs"/);
  assert.match(previewConfig, /standardPreviewDevice = Object\.freeze\(\{ width:\s*390,\s*height:\s*844 \}\)/);
  assert.match(previewConfig, /defaultPreviewDevice = standardPreviewDevice/);
  assert.match(previewConfig, /standardVideoPreviewDevice = standardPreviewDevice/);
  assert.match(previewConfig, /standardPreviewDisplayDevice = standardPreviewDevice/);
  assert.match(previewConfig, /libraryPreviewCaseIds/);
  assert.match(previewConfig, /image:\s*standardPreviewDevice/);
  assert.match(previewConfig, /video:\s*standardPreviewDevice/);
  assert.match(previewConfig, /live:\s*standardPreviewDevice/);
  assert.match(previewConfig, /return libraryPreviewProfiles\[id\]\?\.\[mode\] \|\| standardPreviewDevice/);
  assert.match(script, /getPreviewDevice\(guide, nextMode\)/);
  assert.match(script, /getLibraryPreviewDisplayDevice/);
  assert.doesNotMatch(script, /cardPreviewDevice/);
  assert.doesNotMatch(script, /--guide-phone-ratio/);
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

test("library multi-screen preview images are explicit local assets", () => {
  const script = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");
  const imageSetSource = script.match(/const previewImageSets = Object\.freeze\(\{([\s\S]*?)\n\}\);/);

  assert.ok(imageSetSource, "preview image set should be declared");
  const sources = [...imageSetSource[1].matchAll(/src:\s*"(\.\/[^\"]+)"/g)].map((match) => match[1]);
  assert.ok(sources.length >= 40, "expected a useful multi-screen preview collection");
  sources.forEach((source) => assert.ok(fs.existsSync(path.join(repoRoot, source.slice(2))), source));
  sources.forEach((source) => {
    const header = fs.readFileSync(path.join(repoRoot, source.slice(2))).subarray(0, 24);
    assert.equal(header.toString("hex", 0, 8), "89504e470d0a1a0a", source);
    const width = header.readUInt32BE(16);
    const height = header.readUInt32BE(20);
    const density = 1 / Math.min(390 / width, 844 / height);
    assert.ok(density >= 1.99, `${source} only provides ${density.toFixed(2)}x in the preview frame`);
  });
  assert.match(imageSetSource[1], /fufu:[\s\S]*01-welcome\.png[\s\S]*02-home\.png[\s\S]*04-menu\.png[\s\S]*03-member\.png/);
  assert.match(script, /previewImageNavigation\.hidden = activePreviewImages\.length < 2 \|\| activePreviewMode !== "image"/);
});

test("library poster capture uses the same embed state as the live iframe", () => {
  const captureScript = fs.readFileSync(path.join(repoRoot, "scripts", "capture_library_posters.mjs"), "utf8");

  assert.match(captureScript, /const targetUrl = `file:\/\/\$\{demoPath\}\?embed=1`/);
  assert.doesNotMatch(captureScript, /capture=1/);
});

test("library effect capture regenerates low-resolution screens at 2x", () => {
  const captureScript = fs.readFileSync(path.join(repoRoot, "scripts", "capture_library_effect_images.mjs"), "utf8");
  const captureManifest = fs.readFileSync(path.join(repoRoot, "library-effect-captures.mjs"), "utf8");

  assert.match(captureScript, /deviceScaleFactor:\s*2/);
  assert.match(captureScript, /libraryEffectCaptures/);
  assert.match(captureScript, /page\.screenshot\(\{ path: temporary, fullPage: false \}\)/);
  assert.match(captureManifest, /signal-confirmation[\s\S]*action: "\[data-purchase\]"/);
  assert.match(captureManifest, /loy-welcome[\s\S]*action: '\[data-view-target="welcome"\]'/);
});

test("library browser audit verifies that every card is actually painted", () => {
  const auditScript = fs.readFileSync(path.join(repoRoot, "scripts", "audit_library_browser.mjs"), "utf8");

  assert.match(auditScript, /await image\.decode\(\)\.catch/);
  assert.match(auditScript, /scrollIntoView\(\{ block: "center" \}\)/);
  assert.match(auditScript, /const screenshot = await image\.screenshot\(\)/);
  assert.match(auditScript, /card image rendered as blank/);
  assert.match(auditScript, /cardImages: \{ total:/);
  assert.match(auditScript, /preview image rendered as blank/);
  assert.match(auditScript, /blank: imagePreviewResults\.filter/);
});

test("library audit keeps every video preview on the FitHub canvas", () => {
  const auditScript = fs.readFileSync(path.join(repoRoot, "scripts", "audit_library.mjs"), "utf8");

  assert.match(auditScript, /getLibraryPreviewDevice\(item\.id, "video"\)/);
  assert.match(auditScript, /videoDevice\.width === 390 && videoDevice\.height === 844/);
});

test("library card posters use the 2x 390x844 screen canvas", () => {
  const script = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");
  const guideArraySource = script.slice(script.indexOf("const styleGuides = ["), script.indexOf("\n];", script.indexOf("const styleGuides = [")) + 3);
  const guideStarts = [...guideArraySource.matchAll(/^\s*\{\s*\n?\s*id:\s*"([^"]+)"/gm)];
  const posterPaths = guideStarts.map((match, index) => {
    const source = guideArraySource.slice(match.index, guideStarts[index + 1]?.index ?? guideArraySource.length);
    const liveDemo = source.match(/liveDemo:\s*"([^"]+)"/)?.[1];
    const previewImage = source.match(/previewImage:\s*"([^"]+)"/)?.[1];
    const poster = source.match(/poster:\s*"([^"]+)"/)?.[1];
    return liveDemo
      ? path.join(path.dirname(liveDemo.replace(/^\.\//, "").split("?")[0]), "screenshots", "library-preview-2x.png")
      : (previewImage || poster).replace(/^\.\//, "").split("?")[0];
  });

  for (const posterPath of new Set(posterPaths)) {
    const file = path.join(repoRoot, posterPath);
    const header = fs.readFileSync(file).subarray(0, 24);
    assert.equal(header.toString("hex", 0, 8), "89504e470d0a1a0a", posterPath);
    assert.equal(header.readUInt32BE(16), 780, posterPath);
    assert.equal(header.readUInt32BE(20), 1688, posterPath);
  }
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

test("card snapshots stay current while effect dialogs prefer dedicated preview images", () => {
  const script = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");
  const previewConfig = fs.readFileSync(path.join(repoRoot, "library-preview-config.mjs"), "utf8");
  const plateCase = JSON.parse(fs.readFileSync(path.join(repoRoot, "catalog", "cases", "plate-play.json"), "utf8"));

  assert.equal(plateCase.id, "plate-play");
  assert.equal(plateCase.effectImage, "./demo/plate-play/assets/reference-overview.png");
  assert.match(previewConfig, /libraryPreviewCaseIds[\s\S]*"plate-play"/);
  assert.match(previewConfig, /Object\.freeze\(Object\.fromEntries\(/);
  assert.match(previewConfig, /image:\s*standardPreviewDevice/);
  assert.match(previewConfig, /video:\s*standardPreviewDevice/);
  assert.match(previewConfig, /live:\s*standardPreviewDevice/);
  assert.match(script, /function getCardPoster\(guide\)\s*\{\s*if \(guide\.liveDemo\) return `\$\{guide\.liveDemo\.replace[^`]+libraryPreviewAssetVersion[^`]+`;/s);
  assert.match(script, /function getPreviewPoster\(guide\)\s*\{\s*if \(guide\.previewImage\) return guide\.previewImage;[\s\S]*if \(guide\.liveDemo\) return getCardPoster\(guide\);/s);
  assert.match(script, /const poster = getCardPoster\(guide\)/);
  assert.match(script, /previewDialogVideo\.poster = getCardPoster\(guide\)/);
  assert.doesNotMatch(script, /previewDialogVideo\.poster = guide\.poster/);
  assert.doesNotMatch(script, /guide\.effectImage \|\| getCardPoster/);
});

test("library opens the visual UI vocabulary and keeps the rendered reference document", () => {
  const libraryMarkup = fs.readFileSync(path.join(repoRoot, "library.html"), "utf8");
  const vocabularyMarkup = fs.readFileSync(path.join(repoRoot, "vocabulary.html"), "utf8");
  const vocabularyScript = fs.readFileSync(path.join(repoRoot, "vocabulary.js"), "utf8");
  const vocabularyData = fs.readFileSync(path.join(repoRoot, "vocabulary-data.js"), "utf8");
  const readerMarkup = fs.readFileSync(path.join(repoRoot, "reference.html"), "utf8");
  const readerScript = fs.readFileSync(path.join(repoRoot, "reference.js"), "utf8");
  const markdownScript = fs.readFileSync(path.join(repoRoot, "markdown.js"), "utf8");

  assert.match(libraryMarkup, /href="\.\/vocabulary\.html"[^>]*>UI 词典<\/a>/);
  assert.doesNotMatch(libraryMarkup, /href="[^"]*ui-section-vocabulary\.md"/);
  assert.match(vocabularyMarkup, /id="vocabularySearch"/);
  assert.match(vocabularyMarkup, /id="categoryChips"/);
  assert.match(vocabularyMarkup, /id="termDialog"/);
  assert.match(vocabularyMarkup, /href="\.\/reference\.html\?doc=ui-section-vocabulary"/);
  assert.match(vocabularyScript, /function openTerm/);
  assert.match(vocabularyScript, /data-copy-prompt/);
  assert.match(vocabularyData, /export const vocabularyEntries/);
  assert.ok((vocabularyData.match(/\bid:\s*"[^"]+"/g) || []).length >= 24);
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
  const guides = fs.readdirSync(path.join(repoRoot, "catalog", "cases")).filter((file) => file.endsWith(".json")).map((file) => JSON.parse(fs.readFileSync(path.join(repoRoot, "catalog", "cases", file), "utf8")));
  const counts = guides.reduce((result, guide) => {
    result[guide.category] = (result[guide.category] || 0) + 1;
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
  assert.match(markup, /<section class="catalog-heading" id="catalogHeading" aria-labelledby="pageTitle">/);
  assert.match(script, /const catalogHeading = document\.querySelector\("#catalogHeading"\)/);
  assert.match(script, /catalogHeading\.hidden = activeCategory !== "all" \|\| Boolean\(activeTag\)/);
  assert.match(script, /function renderDemoGallery\(\) \{\s*updateCatalogHeadingVisibility\(\)/);
  assert.equal(guides.filter((guide) => guide.liveDemo).length, 20);
  assert.match(script, /guide\.liveDemo \? `<button class="style-details-button"[^`]*data-preview-mode="live">可点击<\/button>`/);
});

test("RELAY case keeps effect generation before UI decomposition", () => {
  const relayCase = JSON.parse(fs.readFileSync(path.join(repoRoot, "catalog", "cases", "relay-music.json"), "utf8"));
  const demoRoot = path.join(repoRoot, "demo", "relay-music");
  const decomposition = fs.readFileSync(path.join(demoRoot, "artifacts", "ui-deconstruction.md"), "utf8");
  const manifest = JSON.parse(fs.readFileSync(path.join(demoRoot, "artifacts", "asset-manifest.json"), "utf8"));

  assert.equal(relayCase.poster, "./demo/relay-music/assets/relay-effect-board.png");
  assert.equal(relayCase.referenceImage, "./demo/relay-music/assets/reference-overview.png");
  assert.equal(relayCase.liveDemo, "./demo/relay-music/index.html");
  assert.ok(fs.existsSync(path.join(demoRoot, "assets", "relay-effect-board.png")));
  assert.ok(fs.existsSync(path.join(demoRoot, "index.html")));
  assert.equal(manifest.workflow.effectImageReviewed, true);
  assert.equal(manifest.workflow.decompositionSource, "assets/relay-effect-board.png");
  assert.match(decomposition, /Decomposition source: `relay-effect-board\.png` only/);
  assert.match(decomposition, /original reference is retained as a fidelity check/i);
});

test("SOFTLY case uses its generated effect image as the decomposition source", () => {
  const softlyCase = JSON.parse(fs.readFileSync(path.join(repoRoot, "catalog", "cases", "softly-reflections.json"), "utf8"));
  const demoRoot = path.join(repoRoot, "demo", "softly-reflections");
  const decomposition = fs.readFileSync(path.join(demoRoot, "artifacts", "ui-deconstruction.md"), "utf8");
  const manifest = JSON.parse(fs.readFileSync(path.join(demoRoot, "artifacts", "asset-manifest.json"), "utf8"));

  assert.equal(softlyCase.poster, "./demo/softly-reflections/assets/softly-effect-board.png");
  assert.equal(softlyCase.referenceImage, "./demo/softly-reflections/assets/reference-overview.png");
  assert.equal(softlyCase.liveDemo, "./demo/softly-reflections/index.html");
  assert.ok(fs.existsSync(path.join(demoRoot, "assets", "softly-effect-board.png")));
  assert.ok(fs.existsSync(path.join(demoRoot, "assets", "softly-mascot.png")));
  assert.ok(fs.existsSync(path.join(demoRoot, "index.html")));
  assert.equal(manifest.workflow.effectImageReviewed, true);
  assert.equal(manifest.workflow.decompositionSource, "assets/softly-effect-board.png");
  assert.match(decomposition, /Decomposition source: `softly-effect-board\.png` only/);
  assert.match(decomposition, /original reference is used only to check/i);
});

test("library opens video demos from the primary preview action when available", () => {
  const script = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");

  assert.match(script, /const openMode = guide\.defaultPreviewMode \|\| mediaMode/);
  assert.match(script, /data-preview-mode="\$\{openMode\}"/);
  assert.match(script, /mode === "auto" \? \(guide\.defaultPreviewMode \|\| \(guide\.video \? "video" : \(guide\.liveDemo \? "live" : "image"\)\)\)/);
  assert.match(script, /guide\.video \? `<button class="style-details-button" type="button" data-preview-id="\$\{guide\.id\}" data-preview-mode="video">视频<\/button>` : ""/);
  assert.match(script, /guide\.liveDemo \? `<button class="style-details-button" type="button" data-preview-id="\$\{guide\.id\}" data-preview-mode="live">可点击<\/button>` : ""/);
});

test("every library case has a video preview as its primary mode", () => {
  const script = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");
  const caseBlocks = fs.readdirSync(path.join(repoRoot, "catalog", "cases")).filter((file) => file.endsWith(".json")).map((file) => JSON.parse(fs.readFileSync(path.join(repoRoot, "catalog", "cases", file), "utf8")));

  assert.equal(caseBlocks.length, 23);
  for (const block of caseBlocks) {
    const video = block.video;
    assert.ok(video, `${block.id} should have a video preview`);
    assert.ok(fs.existsSync(path.join(repoRoot, video.replace(/^\.\//, "").replace(/\?.*/, ""))), video);
  }
  assert.doesNotMatch(script, /defaultPreviewMode:\s*"image"/);
  assert.match(script, /const openMode = guide\.defaultPreviewMode \|\| mediaMode/);
  assert.match(script, /mode === "auto" \? \(guide\.defaultPreviewMode \|\| \(guide\.video \? "video" : \(guide\.liveDemo \? "live" : "image"\)\)\)/);
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

test("beginner guide onboards non-technical users into a first clickable demo", () => {
  const markup = fs.readFileSync(path.join(repoRoot, "learn.html"), "utf8");
  const script = fs.readFileSync(path.join(repoRoot, "learn.js"), "utf8");
  const stylesheet = fs.readFileSync(path.join(repoRoot, "learn.css"), "utf8");

  assert.match(markup, /id="case-study"/);
  assert.match(markup, /data-case="fufu"/);
  assert.match(markup, /data-case="plate"/);
  assert.match(markup, /data-case="relay"/);
  assert.match(markup, /class="learning-map"/);
  assert.match(markup, /data-learn-section="quick-start"/);
  assert.match(markup, /data-learn-section="input-output"/);
  assert.match(markup, /data-learn-section="case-study"/);
  assert.match(markup, /data-learn-section="playground"/);
  assert.match(markup, /class="hero-line hero-line-accent"/);
  assert.match(markup, /不会前端，也能把参考图/);
  assert.match(markup, /四步完成第一个界面/);
  assert.match(markup, /复制这段 Prompt/);
  assert.match(markup, /品牌 Design Token 实验室|BRAND DESIGN TOKEN LAB/);
  assert.match(markup, /完全不会写代码可以使用吗/);
  assert.match(markup, /每个页面都必须调用 Image2 吗/);
  assert.match(markup, /class="screen-anatomy"/);
  assert.match(markup, /Plate Play 食谱首页完整页面/);
  assert.match(markup, /demo\/plate-play\/mobile-preview\.png/);
  assert.doesNotMatch(markup, /标出 UI 部件名称的 Buddy 页面图/);
  assert.match(markup, /data-vocab="主视觉"/);
  assert.match(markup, /data-vocab="底部导航"/);
  assert.match(markup, /developer\.mozilla\.org\/en-US\/docs\/Learn_web_development\/Getting_started\/Your_first_website/);
  assert.match(markup, /web\.dev\/learn/);
  assert.match(markup, /nngroup\.com\/articles\/what-is-user-experience/);
  assert.doesNotMatch(markup, /reddit\.com\/r\/learnprogramming/);
  assert.match(script, /caseStudies = \{/);
  assert.match(script, /fufu-bakery\/mobile-preview\.png/);
  assert.match(script, /plate-play\/mobile-preview\.png/);
  assert.match(script, /relay-music\/assets\/relay-effect-board\.png/);
  assert.match(script, /caseStructure.*textContent = item\.structure/);
  assert.match(script, /caseControls.*innerHTML/);
  assert.match(script, /tokensAsCss/);
  assert.match(script, /localStorage\.setItem\("image2-custom-brand-tokens"/);
  assert.match(script, /vocabName\.textContent = button\.dataset\.vocab/);
  assert.match(script, /item\.dataset\.vocab === button\.dataset\.vocab/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /aria-current/);
  assert.match(stylesheet, /\.case-board\s*\{/);
  assert.match(stylesheet, /\.case-tab\.is-selected/);
  assert.match(stylesheet, /\.learning-map\s*\{/);
  assert.match(stylesheet, /\.prompt-tool\s*\{/);
  assert.match(stylesheet, /\.token-lab\s*\{/);
  assert.match(stylesheet, /\.faq-list\s*\{/);
  assert.match(stylesheet, /\.anatomy-marker\s*\{/);
  assert.match(markup, /https:\/\/x\.com\/JGuli49724/);
  assert.match(markup, /xiaohongshu\.com\/user\/profile\/57b3456c82ec3947f79496e9/);
});

test("primary pages link to the author's social profiles", () => {
  const libraryMarkup = fs.readFileSync(path.join(repoRoot, "library.html"), "utf8");
  const learnMarkup = fs.readFileSync(path.join(repoRoot, "learn.html"), "utf8");
  const skillsMarkup = fs.readFileSync(path.join(repoRoot, "skills.html"), "utf8");
  const referenceMarkup = fs.readFileSync(path.join(repoRoot, "reference.html"), "utf8");
  const markdownMarkup = fs.readFileSync(path.join(repoRoot, "markdown.html"), "utf8");
  for (const markup of [libraryMarkup, learnMarkup, skillsMarkup, referenceMarkup, markdownMarkup]) {
    assert.match(markup, /https:\/\/x\.com\/JGuli49724/);
    assert.match(markup, /xiaohongshu\.com\/user\/profile\/57b3456c82ec3947f79496e9/);
  }
  assert.match(libraryMarkup, /class="social-nav-link"[^>]*href="https:\/\/x\.com\/JGuli49724"/);
  assert.match(libraryMarkup, /class="social-nav-link"[^>]*href="https:\/\/www\.xiaohongshu\.com\/user\/profile\/57b3456c82ec3947f79496e9"/);
  assert.doesNotMatch(libraryMarkup, /class="hero-social"|作者主页/);
  assert.doesNotMatch(skillsMarkup, /x\.com\/search\?q=design/);
});
