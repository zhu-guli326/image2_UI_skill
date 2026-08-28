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

When a new UI generation request starts and the workflow mode is not already clear, first navigate the user to the Chinese visual launcher:

`https://www.ondesign.tech/launcher.html?lang=zh`

Use the host's in-app browser or navigation capability when available. If automatic navigation is unavailable, provide the URL as a clickable link and continue with the structured workflow choice; do not block the task on navigation.

Then ask **one structured follow-up question with exactly three mutually exclusive choices**. If the host exposes a native structured choice UI such as `request_user_input`, use it instead of rendering the choices as a Markdown list. Use this contract:

```json
{
  "questions": [
    {
      "header": "制作方式",
      "id": "workflow_mode",
      "question": "你希望用哪种方式制作这个界面？",
      "options": [
        {
          "label": "截图还原 (Recommended)",
          "description": "以你提供的截图或设计稿为准，尽量忠实还原成可点击界面。"
        },
        {
          "label": "参考重设计",
          "description": "保留参考图的视觉语言，但重新优化布局、内容或体验。"
        },
        {
          "label": "从零创建",
          "description": "根据产品描述和风格要求设计并实现一个全新界面。"
        }
      ]
    }
  ]
}
```

The recommended option may change when the available context clearly favors another mode, but there must still be exactly one recommended option. Do not ask this question when the user has already explicitly selected `recreate`, `redesign`, or `create`; proceed with that mode.

Utility actions such as exploring an existing project, switching a design system, or browsing examples are supporting choices, not separate implementation modes.

The canonical first-turn visual launcher is:

`https://www.ondesign.tech/launcher.html?lang=zh`

Treat the launcher's generated prompt as structured user intent. Preserve target, scope, permission boundary, output depth, reference source, design-system choice, and verification requirements unless the user overrides them. When the launcher says a local reference file will be attached, use the image attached in the conversation; the browser preview itself never uploads that file.

Use `https://www.ondesign.tech/library.html?lang=zh` when the user wants more cases. The gallery is maintained separately from the installable Skill.

## 可见工作台与渐进式确认 / Visible Workbench And Progressive Alignment

Use a ChatCut-inspired interaction model adapted for UI work:

1. **Surface the workbench early.** When the mode is unresolved, open the localized launcher before asking the workflow question. Once a runnable preview exists, surface its exact local URL or entry file early so the user can review progress without waiting for final delivery.
2. **Ask only load-bearing questions.** Do not run a fixed questionnaire. Infer device format, stack, existing assets, and project structure from available context when safe. Ask only about choices that materially change scope, source of truth, creative direction, or delivery.
3. **Group related choices.** Prefer one localized structured form over a long paragraph of questions. Use stable field ids and mutually exclusive values. After submission, verify that every required answer is present before continuing; never infer consent or a missing required choice from another field.
4. **Avoid repeated alignment.** Do not ask the workflow question again after the user has chosen a mode, supplied a complete launcher prompt, asked to continue, or provided a narrow correction. Re-align only when a new request introduces a material fork.
5. **Stage creative commitments.** For Redesign/Create, settle the load-bearing direction before spending an image-generation call. When consistency matters across several screens or assets, establish one inspected sample or Effect Image before batching related outputs.
6. **Keep the deliverable editable.** The live code project is the primary artifact. A screenshot, Effect Image, or flattened mockup is review evidence, never a substitute for editable code UI.

### Progressive workflow

```text
localized launcher / existing project context
  ↓
one structured mode choice when needed
  ↓
targeted discovery (do not rediscover known state)
  ↓
direction checkpoint only for Redesign/Create or a material creative fork
  ↓
implement in dependency order: structure → layout → assets → polish
  ↓
structural verification + rendered visual verification
  ↓
bounded fix of the failed scope only → re-verify
  ↓
editable preview handoff
```

### Verification and recovery contract

- A successful file write, build, image-generation response, or validator exit is not by itself visual proof. Inspect the latest rendered UI pixels before claiming visual success.
- Re-read only the affected project scope before a meaningful mutation when local state may have changed; do not rely on stale paths, ids, assets, or preview state.
- For visible changes, require both structural evidence (files, routes, components, assets, interactions) and visual evidence (current rendered screenshot compared with the workflow source of truth).
- If verification is blocked, report the exact blocked stage and preserve the editable preview. Do not claim completion from metadata alone.
- On a structured failure, change only the rejected or failing scope and preserve unrelated user state. Do not repeat an identical paid or time-consuming image generation after a provider, policy, or validation failure; revise the request or ask for the missing decision.
- Execute only the requested UI scope. Suggest optional additions separately instead of silently adding screens, features, branding, or content.

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

## Runtime-Owned Multi-Agent Orchestration

Do not invoke the full role graph by default. Single-agent Runtime is the default. Use Multi-Agent only when specialist decomposition materially improves the result.

Activate it through the canonical Runtime:

```bash
image2-ui run <project-dir> \
  --mode recreate \
  --task "..." \
  --reference reference.png \
  --execution multi-agent \
  --max-parallel 2
```

The **Runtime is the only top-level control plane**. Multi-Agent is an execution strategy inside the same durable run:

```text
Runtime
├── State Machine
├── Runner
├── Policies
├── Event Log / Resume
├── Verify -> Fix -> Verify
└── DAG Scheduler
    ├── Role Catalog
    ├── Dependency Planner
    └── Specialist Agents
```

Canonical Runtime state lives under:

```text
.image2-ui/runs/<run-id>/state.json
.image2-ui/runs/<run-id>/events.jsonl
```

Scheduler node progress and handoffs live under the **same run**:

```text
.image2-ui/runs/<run-id>/scheduler/scheduler.json
.image2-ui/runs/<run-id>/scheduler/artifacts/
.image2-ui/runs/<run-id>/scheduler/roles/
```

`image2-ui orchestrate` is retained only as a compatibility command. It translates its arguments into `image2-ui run --execution multi-agent`; new runs must not create a separate `.image2-ui/agents/<run-id>` lifecycle. `image2-ui state` is only for inspecting historical standalone orchestrator manifests created before Runtime-owned scheduling.

Runtime owns when DAG roles run:

- `implement`: run required discovery / architecture / implementation nodes.
- `verify`: run code review / accessibility / QA nodes, then merge machine-readable `qa-findings.json` into Runtime Must Fix / Should Fix before the normal validator result is finalized.
- `fix`: mutate the workspace through the bounded Runtime loop, then invalidate downstream review / QA / release nodes so they run again.
- `finalize`: run the release handoff node.

The scheduler owns only dependency readiness, phase ordering, bounded parallelism, node attempts, and handoff artifacts. It must never redefine workflow mode, Runtime status, iteration budget, or source-of-truth policy.

The lead Runtime owns the user request, repository architecture, task decomposition, merge decisions, and final report. Specialist agents return structured artifacts and must not silently redefine product scope.

- Simple work: stay single-agent unless delegation has a clear benefit.
- Medium multi-agent work: visual analysis, asset engineering, UI architecture, implementation, code review, accessibility, QA, release.
- Complex role graphs should be enabled only when backend/state-machine concerns actually exist; do not invoke extra roles just to make the graph look sophisticated.

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
- `references/multi-agent-orchestration.md`: Runtime-owned DAG roles, handoff contracts, and fallback behavior.

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
- Execution mode: `single-agent | multi-agent`.
- Preview entry or local URL.
- Source of truth used for implementation and verification.
- Paths to generated `image2` assets, if any.
- Actual image channel used, if any.
- Which UI surfaces are code-rendered.
- Which checks were run.
- For multi-agent runs, summarize active scheduler roles and unresolved QA findings without exposing internal chain-of-thought.
- Which Component References and owning Brand Profile source status were applied, plus paths to brand artifacts and compliance exceptions.
