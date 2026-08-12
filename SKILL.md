---
name: image-to-ui-skill
description: Use when the user asks for image2, image generation, image-to-UI, UI screenshot to code, design to code, clickable app demo, mobile prototype, iOS preview, high-fidelity UI recreation, production-ready UI architecture, multi-agent UI implementation, or generating bitmap assets for a UI. Generate and inspect a complete effect image from the reference before decomposing that effect image into code-rendered UI and image2 assets, then build a clickable preview and verify the output.
---

# Image To UI Skill

&#25226; UI &#21442;&#32771;&#22270;&#20570;&#25104;&#21487;&#28857;&#20987; demo&#12290;&#23569;&#35299;&#37322;&#65292;&#22810;&#33853;&#22320;&#12290;

Turn UI references into clickable demos. Keep the explanation lean and make the output real.

## 首轮入口 / First-turn entry

When a new image-to-UI or visual-style request starts, the first user-facing
reply must invite the user to open the local visual library and choose a
concrete direction before implementation:

`file:///Users/zzhu/Documents/image2%20ui/library.html`

Use this concise first-turn wording: `先从案例库选一个接近的风格，我会基于它的参考图、提示词和布局规则继续制作。`

Use the library's filters, real demo videos, local reference images, and copy
buttons as the first-round style selection surface. After the user chooses a
case, carry its local reference image path and prompt into the asset plan and
implementation. If the local file is unavailable in the current workspace,
provide the repository-relative `library.html` path instead.

## 对外表达 / User-facing language

Keep user-facing replies focused on the desired result. Do not expose internal
tool names, skill loading, repository inspection, agent roles, execution
statuses, or implementation prerequisites as narration.

- Do not say: `我会使用 image-to-ui-skill，并先检查仓库是否可用。`
  Say: `我会根据你的参考方向制作可点击预览，并保留后续可修改的结构。`
- Do not say: `它需要一张参考图片才能生成贴近原图的 UI。`
  Say: `有参考图时可以更准确还原；没有参考图，也可以先从案例库选择一个风格方向。`
- Do not emit English-only progress labels such as `Inspecting repository` to
  the user. Report only a short, outcome-oriented update when useful.
- When a required input is missing, state the practical next choice and keep
  moving with an available local style reference when that is appropriate.

## &#24517;&#23432;&#21407;&#21017; / Non-Negotiables

- &#38656;&#35201;&#29983;&#22270;&#26102;&#65292;&#35843;&#29992;&#39033;&#30446;&#25351;&#23450;&#30340; `image2`&#12290;&#22914;&#26524;&#24403;&#21069;&#29615;&#22659;&#27809;&#26377;&#21487;&#29992;&#20837;&#21475;&#65292;&#35201;&#35828;&#26126;&#32570;&#21475;&#65292;&#19981;&#33021;&#25226; CSS/SVG/&#21344;&#20301;&#22270;&#35828;&#25104;&#24050;&#29983;&#22270;&#12290;
- When image generation is needed, call the project-designated `image2`. If no channel is available, state the gap instead of presenting CSS/SVG/placeholders as generated images.
- `image2` &#21482;&#36127;&#36131;&#22797;&#26434;&#20301;&#22270;&#65306;&#29031;&#29255;&#12289;&#20135;&#21697;&#22270;&#12289;&#20154;&#29289;&#12289;&#25554;&#30011;&#12289;&#32441;&#29702;&#12289;&#32972;&#26223;&#12289;&#22320;&#22270;&#12289;&#21345;&#29255;&#32553;&#30053;&#22270;&#12289;&#29289;&#20307;&#25248;&#22270;&#12290;
- For implementation assets, `image2` is for complex bitmap work: photos, products, people, illustrations, textures, backgrounds, maps, thumbnails, and object cutouts. The complete effect image is a temporary planning artifact generated before this asset split.
- &#20195;&#30721;&#36127;&#36131; UI&#65306;&#25991;&#23383;&#12289;&#25353;&#38062;&#12289;&#29366;&#24577;&#26639;&#12289;&#23548;&#33322;&#12289;&#34920;&#21333;&#12289;&#24320;&#20851;&#12289;&#20215;&#26684;&#12289;&#26631;&#31614;&#12289;&#26222;&#36890; icon&#12289;&#25773;&#25918;&#22120;&#25511;&#20214;&#12290;
- Code owns UI: text, buttons, status bars, navigation, forms, toggles, prices, labels, common icons, and player controls.
- &#29983;&#25104;&#22270;&#29255;&#37324;&#19981;&#35201;&#21253;&#21547;&#21487;&#35835; UI &#25991;&#26696;&#12289;logo&#12289;&#27700;&#21360;&#12289;&#29366;&#24577;&#26639;&#12289;&#25353;&#38062;&#25110;&#23567;&#22270;&#26631;&#12290;
- Generated implementation assets must not contain readable UI text, logos, watermarks, status bars, buttons, or small UI icons. A full effect image is a temporary visual specification and may show the complete composition, but it must never be shipped as the interactive UI or used as a substitute for real text and controls.
- &#26368;&#32456; demo &#24517;&#39035;&#21487;&#25171;&#24320;&#12289;&#21487;&#28857;&#20987;&#12289;&#21487;&#32487;&#32493;&#20462;&#25913;&#12290;
- The final demo must be openable, clickable, and editable.

## 效果图门禁 / Effect-image gate

For image-to-UI implementation, use this mandatory order:

`reference image -> complete effect image -> effect-image review -> UI decomposition -> clickable implementation`

The effect image is a saved, full-frame visual mockup of the target screen or screen set. It is the visual source of truth for decomposition; it is not an isolated hero asset, an asset manifest, or a screenshot of code that was already implemented.

1. Analyze the reference only far enough to capture composition, visual language, device format, content hierarchy, and the prompt needed to generate the effect image. Do not produce the implementation-level `code-ui` / `image2-assets` split yet.
2. Actually generate and save the complete effect image. Record its path and generation channel.
3. Inspect the saved effect image for framing, hierarchy, legibility, and reference fidelity. If the user requested an approval checkpoint, wait for approval; otherwise perform and record the review internally.
4. Decompose the UI from the approved or inspected effect image. Treat the original reference as a fidelity check, not as the implementation decomposition source.
5. Implement real text, controls, icons, states, image assets, and interactions, then validate the rendered demo against the effect image.

Do not:

- decompose the original reference directly into implementation tasks before a complete effect image exists;
- claim UI decomposition is complete when only the original reference was analyzed;
- start frontend implementation before the effect image has been saved and inspected;
- use the flattened effect image itself as the final clickable screen.

Skip this gate only when the user explicitly asks for analysis/a static audit only, or explicitly asks to skip effect-image generation. A missing image-generation channel is a blocker for the normal implementation workflow, not permission to silently bypass the gate.

## Image2 &#36890;&#36947; / Image2 Channels

&#20248;&#20808;&#25353;&#24403;&#21069;&#39033;&#30446;&#25110;&#20250;&#35805;&#30340; `AGENTS.md` &#25191;&#34892;&#65307;&#26412;&#20179;&#24211;&#40664;&#35748;&#25226;&#31995;&#32479; `imagegen` &#35270;&#20026;&#21407;&#29983; image2 &#20837;&#21475;&#12290;&#33509;&#31995;&#32479;&#20837;&#21475;&#19981;&#21487;&#29992;&#65292;&#20877;&#20351;&#29992;&#26412;&#20179;&#24211;&#33050;&#26412; fallback&#12290;

Follow the current project or session `AGENTS.md` first. In this repo, system `imagegen` counts as the native image2 path. If it is unavailable, use the local fallback wrapper.

- Native image2 sources:
  - `source=system-imagegen`
  - `source=project-image2` through `IMAGE2_COMMAND` or `image2` on `PATH`
  - `source=openai-imagegen-cli` through the bundled imagegen CLI fallback
- Repeatable wrapper:
  - `scripts/image2_asset.py`
  - successful non-dry runs write a provenance JSON file next to the output image
- Other supported fallback labels:
  - `youtoken-gpt-image-2`
  - `openrouter-icu-gpt-image-2`

&#19981;&#35201;&#22312;&#22238;&#22797;&#25110;&#26085;&#24535;&#20013;&#36755;&#20986;&#23436;&#25972;&#23494;&#38053;&#12290;&#33509;&#20351;&#29992; `OPENAI_API_KEY` &#25110;&#20854;&#23427;&#20973;&#35777;&#65292;&#21482;&#35828;&#26126;&#21464;&#37327;&#21517;&#21644;&#36890;&#36947;&#65292;&#19981;&#27844;&#38706;&#20540;&#12290;

Never print full credentials in replies or logs. If `OPENAI_API_KEY` or another credential is used, report the variable/channel only, not the value.

Diagnostic command:

```bash
image2-ui doctor
```

## &#24037;&#20316;&#27969; / Workflow

1. Analyze the reference for effect-image composition and write the full-screen generation prompt. Do not create the implementation inventory yet.
2. Generate, save, and inspect the complete effect image.
3. Use that effect image to produce the `code-ui` and `image2-assets` inventories.
4. For each `image2-assets` item, record purpose, size, style, crop strategy, negative constraints, and target path; then generate the real implementation assets.
5. Build with the existing project stack and wire the generated assets into real UI. For app/mobile work, include device chrome, safe areas, and clickable screen changes by default.
6. Open the local preview, verify interactions, and compare the rendered result against the effect image. Use the original reference as a secondary fidelity check.

## Multi-Agent Orchestration

When subagents or multi-agent tools are available, use the orchestration contract in `references/multi-agent-orchestration.md`.

This repository also exposes `image2-ui orchestrate`, which invokes a compatible
non-interactive agent CLI (Codex by default) and persists each role's handoff,
logs, and run manifest under `.image2-ui/agents/<run-id>/`.

The lead agent owns the user request, repository architecture, task decomposition, merge decisions, and final report. Specialist agents must return structured artifacts and must not silently redefine the product scope.

Recommended roles:

- `visual-analyst`: inspect references to define the complete effect-image prompt; only after that effect image exists, identify visual hierarchy and split `code-ui` from `image2-assets`.
- `asset-engineer`: create or verify the asset manifest, prompt records, formats, paths, alt text, and provenance.
- `ui-architect`: define routes, feature boundaries, component APIs, design tokens, state models, and i18n structure.
- `backend-contract`: define API contracts, request/response schemas, error envelopes, permissions, and mock data boundaries.
- `state-machine`: define async, device, form, retry, offline, optimistic-update, and rollback states before implementation.
- `ui-implementer`: implement the UI in the existing project conventions.
- `code-reviewer`: review correctness, regressions, security, maintainability, scope, standards, and missing tests; report findings without editing source.
- `accessibility`: audit keyboard flow, focus management, accessible names, ARIA, contrast, reduced motion, and screen-reader semantics.
- `qa-auditor`: run build, typecheck, lint, browser, visual regression, and production-readiness checks.
- `release`: run the final checks, summarize changes, confirm artifacts, record execution mode, and prepare the commit or PR handoff.

Run `visual-analyst` and `asset-engineer` in parallel when their outputs are independent. Run `ui-architect`, `backend-contract`, and `state-machine` after repository discovery and before implementation. Run `code-reviewer` and `accessibility` after implementation, then run `qa-auditor`, and run `release` last. Keep implementation and integration under the lead agent unless a specialist has an explicit, non-overlapping write scope.

If multi-agent execution is unavailable, execute the same roles sequentially in one context and preserve the same artifact names and handoff format.

## Reference Files

Read only the relevant reference files for the current task:

- `references/image2-entrypoint.md`: image2 entrypoint discovery and reporting.
- `references/asset-manifest-and-prompts.md`: asset inventory, prompt templates, and page output audit loop.
- `references/icon-system.md`: icon system, UI Glyph lock rule, and approved icon libraries.
- `references/loop-engineering.md`: iterative verification loop.
- `references/ui-section-vocabulary.md`: names for app sections, controls, states, overlays, card layouts, and asset split labels.
- `references/museum-app-case-study.md`: museum/mobile multi-screen case.
- `references/fashion-shopping-app-case-study.md`: fashion shopping visual asset case.
- `references/hicolor-case-study.md`: content graphic case.
- `references/multi-agent-orchestration.md`: reusable multi-agent roles, handoff contracts, and fallback behavior.

## Design, Icons, And Layout

- Before building, name the visible UI regions with `references/ui-section-vocabulary.md` when the screen has multiple sections, controls, states, or repeated content blocks.
- Prefer precise pattern names: top app bar, sidebar, rail navigation, bottom tab bar, search field, filter chips, segmented control, card grid, masonry grid, bento grid, detail drawer, bottom sheet, modal, loading skeleton, empty state, no-results state, inline error, and toast.
- In the `code-ui` inventory, list section names and state names, not only individual components. Example: `library screen -> top app bar, category rail, search field, filter chips, masonry card grid, detail drawer, empty state`.
- &#22270;&#26631;&#32479;&#19968;&#29992;&#19968;&#22871;&#20195;&#30721;&#22270;&#26631;&#31995;&#32479;&#12290;
- Use one code-rendered icon system.
- &#36820;&#22238;&#12289;&#20851;&#38381;&#12289;&#33756;&#21333;&#12289;&#25628;&#32034;&#12289;&#35774;&#32622;&#12289;&#29366;&#24577;&#26639;&#12289;&#30005;&#37327;/Wi-Fi/&#20449;&#21495;&#12289;&#25773;&#25918;&#12289;&#24213;&#37096; tab&#12289;&#24320;&#20851;&#12289;&#21152;&#20943;&#21495;&#37117;&#29992;&#20195;&#30721;&#12290;
- Back, close, menu, search, settings, status bar, battery/Wi-Fi/signal, playback, bottom tabs, toggles, plus, and minus are code-rendered.
- &#35774;&#22791;&#22806;&#35266;&#12289;&#20135;&#21697;&#25248;&#22270;&#12289;&#21830;&#21697;&#22270;&#21487;&#20197;&#29992; `image2`&#12290;
- Device appearances, product-cutout assets, and product images can use `image2`.
- &#25353;&#35282;&#33394;&#32780;&#19981;&#26159;&#21517;&#31216;&#20998;&#31867;&#65306;`camera`&#12289;`lamp`&#12289;`speaker` &#31561;&#22312;&#25353;&#38062;&#37324;&#26159; `code-icon`&#65292;&#22312;&#21830;&#21697;&#26684;&#25110;&#35774;&#22791;&#21345;&#20027;&#35270;&#35273;&#37324;&#21487;&#20197;&#26159; `product-cutout`&#12289;`object-thumbnail` &#25110; `device-product-image`&#12290;
- Classify by role, not name: `camera`, `lamp`, and `speaker` are `code-icon` in controls, but can be `product-cutout`, `object-thumbnail`, or `device-product-image` in product/device visuals.
- &#25991;&#23383;&#24517;&#39035;&#26159;&#30495;&#23454;&#25991;&#26412;&#65292;&#19981;&#33021;&#28911;&#28953;&#36827;&#22270;&#29255;&#37324;&#12290;
- Text must be real text, not baked into images.
- &#26126;&#26174;&#25511;&#20214;&#24517;&#39035;&#33021;&#28857;&#20987;&#25110;&#26377;&#26126;&#30830;&#21453;&#39304;&#12290;
- Visible controls must be clickable or provide clear feedback.
- &#31227;&#21160;&#31471;&#19981;&#33021;&#27178;&#21521;&#28378;&#21160;&#65292;&#25991;&#23383;&#19981;&#33021;&#28322;&#20986;&#25353;&#38062;&#25110;&#21345;&#29255;&#12290;
- Mobile layouts must avoid horizontal scrolling, and text must not overflow buttons or cards.
- Avoid repeated `icon + heading + paragraph` card grids unless the reference clearly uses that pattern.
- Touch targets should be at least `44x44px`.
- Headings can use `text-wrap: balance` for better wrapping.

Approved icon libraries:

- `@phosphor-icons/react`
- `hugeicons-react`
- `@radix-ui/react-icons`
- `@tabler/icons-react`

Application code should use a single icon entry such as `UiIcon`, `IconRegistry`, or an SVG sprite. Keep an icon coverage table before delivery.

## UI Glyph Lock Rule

`image2` prompts must explicitly exclude UI glyphs:

```text
no icons, no UI symbols, no readable text, no logo, no watermark,
no status bar, no battery/Wi-Fi/signal glyphs, no arrows, no gear,
no menu dots, no plus/minus, no power symbol, no playback controls,
no tab icons, no toggles, no status dots
```

## Page Output Audit Loop

After generation and integration, prefer:

```bash
image2-ui validate <demo-dir> --reference <reference-image>
```

For iterative checks:

```bash
image2-ui loop <demo-dir> --reference <reference-image> --build "<build-command>"
```

This repo also includes `ui_output_audit.mjs` to catch broken assets, remote assets, low contrast, text overflow, mixed icon libraries, `generated-ui-glyph-asset`, `image-icon-in-control`, `cutout-asset-missing-alt`, and related issues.

## &#26368;&#32456;&#27719;&#25253; / Final Report

- &#39044;&#35272;&#20837;&#21475;&#25110;&#26412;&#22320; URL&#12290;
- Preview entry or local URL.
- `image2` &#29983;&#25104;&#36164;&#20135;&#36335;&#24452;&#12290;
- Paths to generated `image2` assets.
- &#23454;&#38469;&#36890;&#36947;&#65292;&#20363;&#22914; `native-image2 source=system-imagegen`&#12289;`source=project-image2`&#12289;`youtoken-gpt-image-2` &#25110; `openrouter-icu-gpt-image-2`&#12290;
- Actual channel, such as `native-image2 source=system-imagegen`, `source=project-image2`, `youtoken-gpt-image-2`, or `openrouter-icu-gpt-image-2`.
- &#21738;&#20123; UI &#26159;&#20195;&#30721;&#23454;&#29616;&#12290;
- Which UI surfaces are code-rendered.
- &#20570;&#36807;&#21738;&#20123;&#26816;&#26597;&#12290;
- Which checks were run.
