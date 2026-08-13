---
name: image-to-ui-skill
description: Use when the user provides a UI screenshot or visual design reference and asks to recreate it as a clickable code demo that needs generated or integrated bitmap assets. Do not use for standalone image generation, text-only website creation, ordinary frontend implementation without a visual reference, or design critique only.
---

# Image To UI Skill

把 UI 参考图做成可点击 demo。少解释，多落地。

## 首轮入口 / First-turn entry

When a new image-to-UI or visual-style request starts, the first user-facing
reply must first collect the task direction. If the host exposes a native
structured choice UI, ask these exact four choices: `探索并理解代码`, `构建新功能、应用或工具`,
`审查代码并提出修改建议`, and `修复问题和失败`. Do not claim that the skill
controls the host UI. If that native UI is unavailable, open the launcher:

`https://zhu-guli326.github.io/ui_case/launcher.html?start=1`

Use this concise fallback wording: `先选择这次的任务方向，再配置交付形式、风格和制作深度；复制生成的调用指令给我。`

Treat the launcher's generated prompt as structured user intent. Preserve its
selected format, local style case, effect-image workflow choice, interaction
depth, device-frame choice, image2 channel preference, and verification
requirements unless the user overrides them. When the launcher says a local
reference file will be attached, use the image attached in the conversation;
the browser preview itself never uploads that file. Use
`https://zhu-guli326.github.io/ui_case/` when the user wants more cases. The
gallery is maintained separately from the installable Skill so users do not
need to clone its demos, screenshots, GIFs, or videos.

## 对外表达 / User-facing language

Keep user-facing replies focused on the desired result. Do not expose internal
tool names, skill loading, repository inspection, agent roles, execution
statuses, or implementation prerequisites as narration.

- Do not say: `我会使用 image-to-ui-skill，并先检查仓库是否可用。`
  Say: `我会根据你选好的配置制作可点击预览，并保留后续可修改的结构。`
- Do not say: `它需要一张参考图片才能生成贴近原图的 UI。`
  Say: `有参考图时可以更准确还原；没有参考图，也可以先从可视化启动器选择一个风格方向。`
- Do not emit English-only progress labels such as `Inspecting repository` to
  the user. Report only a short, outcome-oriented update when useful.
- When a required input is missing, state the practical next choice and keep
  moving with an available local style reference when that is appropriate.

## 必守原则 / Non-Negotiables

- When image generation is needed, call the project-designated `image2`. If no channel is available, state the gap instead of presenting CSS/SVG/placeholders as generated images.
- For implementation assets, `image2` is for complex bitmap work: photos, products, people, illustrations, textures, backgrounds, maps, thumbnails, and object cutouts. The complete effect image is a temporary planning artifact generated before this asset split.
- Code owns UI: text, buttons, status bars, navigation, forms, toggles, prices, labels, common icons, and player controls.
- Generated implementation assets must not contain readable UI text, logos, watermarks, status bars, buttons, or small UI icons. A full effect image is a temporary visual specification and may show the complete composition, but it must never be shipped as the interactive UI or used as a substitute for real text and controls.
- The final demo must be openable, clickable, and editable.
- Brand profiles constrain color, typography, spacing, radius, components, motion, photography, illustration, and content voice. They never authorize generating a brand logo, trademark, branded text, commercial font, or proprietary asset.

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

## Image2 通道 / Image2 Channels

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

Never print full credentials in replies or logs. If `OPENAI_API_KEY` or another credential is used, report the variable/channel only, not the value.

Diagnostic command:

```bash
image2-ui doctor
```

## 品牌工作流 / Brand-Aware Workflow

Use this order:

`brand parsing -> UI decomposition -> asset generation -> token implementation -> brand compliance verification`

1. Resolve the selected case and optional brand profile. Record the profile source status and authorization boundary. When no brand is selected, use the project's existing tokens and say that no external brand profile was applied.
2. Analyze the reference for effect-image composition, apply only the permitted visual-language constraints, then generate, save, and inspect the complete effect image.
3. Use the inspected effect image to produce the `code-ui` and `image2-assets` inventories. Keep all readable text, UI chrome, logos, and trademarks out of generated implementation assets.
4. Generate real bitmap assets and record purpose, dimensions, crop strategy, negative constraints, path, channel, and provenance.
5. Implement the selected brand tokens in the existing stack, then build the clickable UI with real states and responsive behavior.
6. Verify interactions and compare the rendered result against the effect image, original reference, and selected brand profile.

When a brand profile is applied, always produce:

```text
artifacts/brand-profile.json
artifacts/brand-tokens.json
artifacts/brand-compliance.md
```

`brand-compliance.md` must cover color, typography, spacing, radius, components, motion, visual language, content voice, accessibility, asset provenance, and the logo/trademark/font authorization boundary.

## Multi-Agent Orchestration

Do not invoke the full role graph by default. Choose the smallest tier that matches the work and use `references/multi-agent-orchestration.md` only when delegation is actually needed.

This repository also exposes `image2-ui orchestrate`, which invokes a compatible
non-interactive agent CLI (Codex by default) and persists each role's handoff,
logs, and run manifest under `.image2-ui/agents/<run-id>/`.

The lead agent owns the user request, repository architecture, task decomposition, merge decisions, and final report. Specialist agents must return structured artifacts and must not silently redefine the product scope.

- Simple demo: visual decomposition, implementation, and QA.
- Medium demo: add asset engineering and accessibility.
- Complex product: add architecture, backend contract, state machine, code review, and release only when those concerns are present.

Single-agent execution is valid for simple and medium work. Do not simulate nine roles sequentially just to satisfy a process checklist.

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
- Use one code-rendered icon system.
- Back, close, menu, search, settings, status bar, battery/Wi-Fi/signal, playback, bottom tabs, toggles, plus, and minus are code-rendered.
- Device appearances, product-cutout assets, and product images can use `image2`.
- Classify by role, not name: `camera`, `lamp`, and `speaker` are `code-icon` in controls, but can be `product-cutout`, `object-thumbnail`, or `device-product-image` in product/device visuals.
- Text must be real text, not baked into images.
- Visible controls must be clickable or provide clear feedback.
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

## 最终汇报 / Final Report

- Preview entry or local URL.
- Paths to generated `image2` assets.
- Actual channel, such as `native-image2 source=system-imagegen`, `source=project-image2`, `youtoken-gpt-image-2`, or `openrouter-icu-gpt-image-2`.
- Which UI surfaces are code-rendered.
- Which checks were run.
- Which brand profile and source status were applied, plus paths to brand artifacts and any compliance exceptions.
