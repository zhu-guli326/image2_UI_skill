---
name: image-to-ui-skill
description: Use when the user asks to recreate a UI from a screenshot or design reference, redesign a UI from a visual reference, or create a new clickable UI from a description. Use real code for interface chrome and project-designated image2 for complex bitmap assets. Do not use for standalone image generation, design critique only, or ordinary frontend work with no UI-design intent.
---

# Image To UI Skill

把 UI 任务做成可打开、可点击、可继续修改的真实界面。少解释，多落地。

## 三种正式工作流 / Three Workflow Modes

Every implementation task must resolve to exactly one primary mode before decomposition or coding:

1. `recreate` — 截图 / 设计稿 → UI
2. `redesign` — 参考图 → 新设计 → UI
3. `create` — 描述 → 新设计 → UI

Do not treat Effect Image as a universal mandatory step. It is a workflow strategy used by `redesign` and `create`, not by `recreate`.

### 1. Recreate

Use when the user wants faithful restoration, replication, screenshot-to-code, or explicitly says not to redesign.

```text
reference
  ↓
analyze + decompose
  ↓
implement
  ↓
render + compare against original reference
  ↓
fix ↺
```

Rules:

- The **original reference is the source of truth** for decomposition, implementation, and visual verification.
- Do not generate a complete Effect Image before implementation unless the user explicitly asks for one as an optional artifact.
- Preserve composition, hierarchy, spacing, typography, component geometry, imagery, states, and interaction structure as faithfully as practical.
- Do not introduce a redesign while trying to improve code quality.

### 2. Redesign

Use when the user provides a reference but wants a new design, optimization, adaptation, or the same visual language applied to different content/product requirements.

```text
reference
  ↓
understand visual language + constraints
  ↓
generate complete Effect Image
  ↓
review / approve
  ↓
decompose
  ↓
implement
  ↓
verify against Effect Image
```

Rules:

- The reference is an inspiration and constraint source, not the final layout source of truth.
- The inspected or approved **Effect Image becomes the implementation source of truth**.
- Use the original reference as a secondary style/fidelity check.

### 3. Create

Use when the user wants a new UI from a description and no reference is required.

```text
description
  ↓
generate complete Effect Image
  ↓
review / approve when requested
  ↓
decompose
  ↓
implement
  ↓
verify against Effect Image
```

Rules:

- Convert product requirements and desired visual direction into a complete Effect Image before implementation.
- The inspected or approved Effect Image becomes the implementation source of truth.

### Routing defaults

- Has a reference and asks to restore / replicate / match → `recreate`.
- Has a reference and asks to improve / adapt / redesign → `redesign`.
- No reference and asks to design/build a new UI → `create`.
- If the user's wording is genuinely ambiguous and the choice materially changes the result, ask whether they want faithful restoration or a new design. Otherwise infer the most conservative mode from the request.

The Runtime CLI exposes the same model:

```bash
image2-ui run <project-dir> --mode recreate --task "..." --reference reference.png
image2-ui run <project-dir> --mode redesign --task "..." --reference reference.png
image2-ui run <project-dir> --mode create --task "..."
```

With `--reference` and no explicit mode, Runtime defaults to `recreate`. Without `--reference`, Runtime defaults to `create`. `redesign` must be selected explicitly.

## 首轮入口 / First-turn entry

When a new UI generation request starts, resolve the task toward the three modes above. If the host exposes a native structured choice UI, prefer these primary choices:

- `截图还原 / Recreate`
- `参考重设计 / Redesign`
- `从零创建 / Create`

Utility actions such as exploring an existing project, switching a design system, or browsing examples are supporting choices, not separate implementation modes.

If a visual launcher is useful, use:

`https://zhu-guli326.github.io/ui_case/launcher.html?intent=explore`

Treat the launcher's generated prompt as structured user intent. Preserve target, scope, permission boundary, output depth, reference source, design-system choice, and verification requirements unless the user overrides them. When the launcher says a local reference file will be attached, use the image attached in the conversation; the browser preview itself never uploads that file.

Use `https://zhu-guli326.github.io/ui_case/` when the user wants more cases. The gallery is maintained separately from the installable Skill.

## 对外表达 / User-facing language

Keep user-facing replies focused on the desired result. Do not expose internal tool names, skill loading, repository inspection, agent roles, execution statuses, or implementation prerequisites as narration unless the user is explicitly asking about the architecture.

- Do not say: `我会使用 image-to-ui-skill，并先检查仓库是否可用。`
  Say: `我会按你选的方向制作可点击预览，并保留后续可修改的结构。`
- For Recreate, say the original screenshot is the fidelity target.
- For Redesign/Create, say the design direction will be resolved before implementation.
- When a required input is missing, state the practical next choice rather than exposing internal setup details.

## 必守原则 / Non-Negotiables

- Resolve `recreate | redesign | create` before implementation.
- When image generation is needed, call the project-designated `image2`. If no channel is available, state the gap instead of presenting CSS/SVG/placeholders as generated images.
- Code owns UI: text, buttons, status bars, navigation, forms, toggles, prices, labels, common icons, and player controls.
- `image2` owns complex bitmap work: photos, products, people, illustrations, textures, backgrounds, maps, thumbnails, and object cutouts.
- Generated implementation assets must not contain readable UI text, logos, watermarks, status bars, buttons, or small UI icons.
- A complete Effect Image is a temporary visual specification. It must never be shipped as the interactive UI or used as a substitute for real text and controls.
- The final demo must be openable, clickable, and editable.
- Brand profiles constrain color, typography, spacing, radius, components, motion, photography, illustration, and content voice. They never authorize generating a brand logo, trademark, branded text, commercial font, or proprietary asset.

## Effect Image Policy

Effect Image is **conditional**:

| Mode | Effect Image | Implementation source of truth | Verification target |
| --- | --- | --- | --- |
| Recreate | Skip by default | Original reference | Original reference |
| Redesign | Required by default | Approved/inspected Effect Image | Effect Image; original reference is secondary |
| Create | Required by default | Approved/inspected Effect Image | Effect Image |

For Redesign/Create:

1. Analyze enough context to define the target composition, visual language, device format, hierarchy, and constraints.
2. Generate and save a complete full-frame Effect Image.
3. Inspect it for framing, hierarchy, legibility, and task fidelity. If the user requested a checkpoint, wait for approval.
4. Decompose `code-ui` and `image2-assets` from the inspected/approved Effect Image.
5. Implement real text, controls, icons, states, image assets, and interactions.
6. Render and validate against the Effect Image.

For Recreate:

1. Analyze the original reference directly.
2. Decompose it into code-rendered UI and bitmap assets.
3. Implement the clickable interface.
4. Render and compare directly against the original reference.
5. Fix visual or interaction differences in a bounded loop.

A missing image-generation channel blocks Redesign/Create when an Effect Image or implementation bitmap asset is required. It does **not** block Recreate when the page can be faithfully implemented without newly generated bitmap assets.

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

## 组件与品牌工作流 / Component and Brand-Aware Workflow

Resolve the workflow mode first, then apply component/design-system constraints.

### Recreate

`reference -> component/design-system identification -> direct decomposition -> assets -> implementation -> reference comparison`

Use public component/design-system references to improve implementation accuracy, but never let them override visible evidence in the target screenshot unless the user asks for modernization.

### Redesign / Create

`component selection -> brand/design-system resolution -> Effect Image -> review -> decomposition -> assets -> token implementation -> compliance verification`

1. Resolve the selected case, optional style profile, and Component References. Record owning Brand Profile, public source, source status, review date, and authorization boundary.
2. Generate the complete Effect Image under those constraints.
3. Use the inspected Effect Image to produce `code-ui` and `image2-assets` inventories.
4. Generate real bitmap assets and record purpose, dimensions, crop strategy, negative constraints, path, channel, and provenance.
5. Implement tokens and behavior from the selected Component References in the existing stack.
6. Verify interactions and visual fidelity against the workflow's source of truth.

When public design-system components or a Brand Profile are applied, produce:

```text
artifacts/brand-profile.json
artifacts/brand-tokens.json
artifacts/brand-compliance.md
```

`brand-profile.json` must include selected `componentReferenceIds`. `brand-compliance.md` must cover component anatomy, states, behavior, tokens, accessibility, source provenance, and logo/trademark/font authorization boundaries. Public guidelines never imply affiliation or endorsement.

## Multi-Agent Orchestration

Do not invoke the full role graph by default. Choose the smallest tier that matches the work and use `references/multi-agent-orchestration.md` only when delegation is actually needed.

This repository exposes `image2-ui orchestrate`, which invokes a compatible non-interactive agent CLI and persists role handoffs, logs, and run manifests under `.image2-ui/agents/<run-id>/`.

The **Runtime is the authoritative top-level control plane**. The Agent DAG is a scheduler/dependency graph underneath it; it must not become a second competing lifecycle.

Use `image2-ui run`, `resume`, and `inspect` for durable top-level execution and the bounded Verify/Fix loop. Runtime state lives under `.image2-ui/runs/`.

The lead agent owns the user request, repository architecture, task decomposition, merge decisions, and final report. Specialist agents return structured artifacts and must not silently redefine product scope.

- Simple demo: visual decomposition, implementation, QA.
- Medium demo: add asset engineering and accessibility.
- Complex product: add architecture, backend contract, state machine, code review, and release only when those concerns are present.

Single-agent execution is valid for simple and medium work. Do not simulate many roles sequentially just to satisfy a process checklist.

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

- Before building, name visible UI regions when the screen has multiple sections, controls, states, or repeated content blocks.
- Prefer precise pattern names: top app bar, sidebar, rail navigation, bottom tab bar, search field, filter chips, segmented control, card grid, masonry grid, bento grid, detail drawer, bottom sheet, modal, loading skeleton, empty state, no-results state, inline error, and toast.
- In the `code-ui` inventory, list section names and state names, not only individual components.
- Use one code-rendered icon system.
- Back, close, menu, search, settings, status bar, battery/Wi-Fi/signal, playback, bottom tabs, toggles, plus, and minus are code-rendered.
- Device appearances, product-cutout assets, and product images can use `image2`.
- Classify by role, not name: `camera`, `lamp`, and `speaker` are `code-icon` in controls, but can be bitmap assets in product/device visuals.
- Text must be real text, not baked into images.
- Visible controls must be clickable or provide clear feedback.
- Mobile layouts must avoid horizontal scrolling, and text must not overflow buttons or cards.
- Avoid repeated `icon + heading + paragraph` card grids unless the reference or approved design clearly uses that pattern.
- Touch targets should be at least `44x44px`.
- Headings can use `text-wrap: balance` for better wrapping.

Approved icon libraries:

- `@phosphor-icons/react`
- `hugeicons-react`
- `@radix-ui/react-icons`
- `@tabler/icons-react`

Application code should use a single icon entry such as `UiIcon`, `IconRegistry`, or an SVG sprite. Keep an icon coverage table before delivery when icon fidelity matters.

## UI Glyph Lock Rule

`image2` prompts for implementation bitmap assets must explicitly exclude UI glyphs:

```text
no icons, no UI symbols, no readable text, no logo, no watermark,
no status bar, no battery/Wi-Fi/signal glyphs, no arrows, no gear,
no menu dots, no plus/minus, no power symbol, no playback controls,
no tab icons, no toggles, no status dots
```

## Page Output Audit Loop

After implementation, validate against the workflow source of truth.

For Recreate:

```bash
image2-ui validate <demo-dir> --reference <original-reference>
image2-ui loop <demo-dir> --reference <original-reference> --build "<build-command>"
```

For Redesign/Create, the Runtime passes the approved Effect Image to validation while preserving the original reference as secondary context when one exists.

The audit tooling catches broken assets, remote assets, low contrast, text overflow, mixed icon libraries, generated UI glyph assets, image icons used as controls, missing alt text, and related issues.

## 最终汇报 / Final Report

- Workflow mode: `recreate | redesign | create`.
- Preview entry or local URL.
- Source of truth used for implementation and verification.
- Paths to generated `image2` assets, if any.
- Actual image channel used, if any.
- Which UI surfaces are code-rendered.
- Which checks were run.
- Which Component References and owning Brand Profile source status were applied, plus paths to brand artifacts and compliance exceptions.
