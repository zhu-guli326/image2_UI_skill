# image2_UI_skill

<p align="center">
  <img src="./assets/readme/hero.png" width="100%" alt="image2_UI_skill turns UI references into code-rendered interfaces, generated image assets, and clickable demos">
</p>

一个面向 UI 生成与还原的 Agent Harness。它把任务分成三种正式工作流：

1. **Recreate**：截图 / 设计稿 → UI。原始参考图就是 source of truth，不先重画效果图。
2. **Redesign**：参考图 → 新设计 → UI。先生成并审核 Effect Image，再实现。
3. **Create**：文字描述 → 新设计 → UI。先生成 Effect Image，再实现。

最终交付都必须是可打开、可点击、可继续修改的真实界面；文字、按钮、导航、表单和常用图标由代码渲染，复杂照片、人物、产品、插画、背景等位图资产交给 `image2`。

## Install

Windows PowerShell:

```powershell
git clone https://github.com/zhu-guli326/image2_UI_skill.git "$env:USERPROFILE\.codex\skills\image2_UI_skill"
```

macOS / Linux:

```bash
git clone https://github.com/zhu-guli326/image2_UI_skill.git "${CODEX_HOME:-$HOME/.codex}/skills/image2_UI_skill"
```

安装后重启 Codex，或新开一个会话。

## Three Workflow Modes

### 1. Recreate

适合：

- “把这张截图 1:1 还原”
- “把这个 Figma / App 页面做成可点击 UI”
- “不要改设计，只做成代码”

流程：

```text
Reference
  ↓
Analyze / Decompose
  ↓
Implement
  ↓
Render + Compare against original reference
  ↓
Fix ↺
```

**不会强制生成 Effect Image。** 原图本身就是实现和视觉验证的基准，避免 `原图 → AI 重画 → 代码` 带来的二次误差。

### 2. Redesign

适合：

- “参考这个风格重新设计”
- “保留视觉语言，但换成我的产品”
- “优化这个页面，不要照抄”

流程：

```text
Reference
  ↓
Understand visual language
  ↓
Generate Effect Image
  ↓
Review / Approve
  ↓
Decompose
  ↓
Implement
  ↓
Verify against Effect Image
```

Effect Image 在这里相当于 AI 生成的设计稿，是实现 source of truth；原始参考图用于风格与方向校验。

### 3. Create

适合：

- “从零做一个 App 页面”
- “根据这段描述设计一个 Dashboard”
- 没有参考图的新产品 UI

流程：

```text
Description
  ↓
Generate Effect Image
  ↓
Review
  ↓
Decompose
  ↓
Implement
  ↓
Verify against Effect Image
```

## Usage

有截图、希望忠实还原：

```bash
image2-ui run <project-dir> \
  --mode recreate \
  --task "Recreate this UI faithfully" \
  --reference reference.png
```

有参考图、希望重新设计：

```bash
image2-ui run <project-dir> \
  --mode redesign \
  --task "Redesign this reference for my product" \
  --reference reference.png
```

没有参考图、从零创建：

```bash
image2-ui run <project-dir> \
  --mode create \
  --task "Create a premium mobile finance dashboard"
```

默认路由：**带 `--reference` 时默认 Recreate；没有 `--reference` 时默认 Create。Redesign 需要显式选择。**

如果 Redesign / Create 需要用户确认效果图，再加：

```bash
--require-effect-review
```

并通过：

```bash
image2-ui resume <project-dir> --latest --decision approved
```

继续执行。

没有明确方向时，也可以打开独立的可视化启动器：

<https://zhu-guli326.github.io/ui_case/launcher.html?intent=explore>

## Runtime-Owned Multi-Agent

简单任务默认用单 Agent。任务确实需要视觉分析、资产工程、架构、代码审查、可访问性和 QA 等专业角色时，直接让同一个 Runtime 开启 Multi-Agent：

```bash
image2-ui run <project-dir> \
  --mode recreate \
  --task "Recreate this production UI" \
  --reference reference.png \
  --execution multi-agent \
  --max-parallel 2
```

架构关系是：

```text
Runtime
├── State Machine
├── Runner / Resume / Event Log
├── Verify -> Fix -> Verify
└── DAG Scheduler
    ├── Role Catalog
    ├── Dependency Planner
    └── Specialist Agents
```

**Runtime 是唯一顶层控制面。** Canonical run 状态始终写在：

```text
<project>/.image2-ui/runs/<run-id>/state.json
<project>/.image2-ui/runs/<run-id>/events.jsonl
```

Scheduler 只是这个 run 内部的子系统，节点状态和 handoff 写在：

```text
<project>/.image2-ui/runs/<run-id>/scheduler/scheduler.json
<project>/.image2-ui/runs/<run-id>/scheduler/artifacts/
```

`image2-ui orchestrate` 继续保留，但现在只是兼容入口，会转交给 Runtime 的 `--execution multi-agent`；新任务不会再创建第二套 `.image2-ui/agents/<run-id>` 生命周期。旧 `.image2-ui/agents/.../run.json` 只用于历史 manifest 的兼容读取。

Multi-Agent 在 Runtime 中分阶段工作：

```text
Implement
  → discovery / architecture / ui-implementer

Verify
  → code review / accessibility / QA
  → qa-findings.json
  → merge into Runtime Must Fix / Should Fix

Fix
  → mutate workspace
  → invalidate downstream review / QA / release

Finalize
  → release handoff
```

## UI Case Gallery

网页、案例数据、设计系统实验室、截图、GIF、视频和可点击 demo 由独立仓库维护：

- Gallery: <https://zhu-guli326.github.io/ui_case/library.html?lang=zh>
- Repository: <https://github.com/zhu-guli326/ui_case>
- UI vocabulary: <https://zhu-guli326.github.io/ui_case/vocabulary.html?lang=zh>
- Design systems: <https://zhu-guli326.github.io/ui_case/brands.html?lang=zh>
- Design skills: <https://zhu-guli326.github.io/ui_case/skills.html?lang=zh>

安装本 Skill 不再下载案例站点的大型媒体资源。

### 精选视频预览

| 案例 | 适合观察的内容 | 预览 |
| --- | --- | --- |
| Mimo Activities | 活动流、卡片层级与移动端浏览节奏 | [播放视频](./assets/video-cases/mimo-activities-demo.mp4) |
| Softly Reflections | 日记记录、柔和过渡与空状态 | [播放视频](./assets/video-cases/softly-reflections-demo.mp4) |
| Cleanbite Scanner | 扫码识别流程、结果状态与操作反馈 | [播放视频](./assets/video-cases/cleanbite-scanner-demo.mp4) |
| Museum App | 多屏导航、作品缩略图与详情页串联 | [播放视频](./assets/video-cases/museum-app-demo.mp4) |
| Fashion Shopping App | 商品视觉资产、筛选流程与详情展示 | [播放视频](./assets/video-cases/fashion-shopping-app-demo.mp4) |

完整说明见[视频案例预览索引](./references/video-case-previews.md)。

## CLI

```bash
image2-ui doctor
image2-ui validate <demo-dir> --reference <reference-image>
image2-ui compare --reference <reference-image> --actual <output-image>
image2-ui loop <demo-dir> --reference <reference-image>
image2-ui run <project-dir> --mode recreate --task "Recreate UI" --reference reference.png
image2-ui run <project-dir> --mode redesign --task "Redesign UI" --reference reference.png
image2-ui run <project-dir> --mode create --task "Create UI"
image2-ui run <project-dir> --mode recreate --task "Recreate UI" --reference reference.png --execution multi-agent --max-parallel 2
image2-ui orchestrate <project-dir> --task "Build a clickable UI" --workflow recreate
image2-ui inspect <project-dir> --latest --json
image2-ui resume <project-dir> --latest
image2-ui state <legacy-run.json> --json
```

`run` 会在 `<project>/.image2-ui/runs/<run-id>/` 持久化 `state.json` 和 `events.jsonl`，并执行有界的 `verify -> fix -> verify` 闭环。`inspect` 查看快照，`resume` 恢复执行；写入型操作中断后会先验证当前工作区，不会盲目重复修改。

`orchestrate` 是 Multi-Agent 的兼容命令；实际生命周期仍由 Runtime 管理。`state` 只用于检查旧 standalone orchestrator 留下的历史 `run.json`。

开发检查：

```bash
npm test
npm run doctor
npm run pack:check
```

Windows PowerShell：

```powershell
.\validate.ps1
```

## Key Rules

- **先判断模式，再决定是否需要 Effect Image。**
- Recreate：`reference -> decompose -> implement -> compare -> fix`。
- Redesign：`reference -> effect image -> review -> decompose -> implement -> verify`。
- Create：`description -> effect image -> review -> decompose -> implement -> verify`。
- Multi-Agent 只是 Runtime 内部执行策略，不是第二套 Workflow 或第二套 Run 状态。
- 需要生图时必须调用项目指定的 `image2`；没有可用通道时明确说明缺口。
- 文案、按钮、导航、表单、状态栏和常用图标由代码渲染。
- 照片、商品、人物、插画、纹理、背景和对象抠图使用真实位图资产。
- 生成的 implementation assets 不得包含可读 UI 文案、logo、水印、状态栏、按钮或小型 UI glyph。
- Effect Image 只是设计规格，不得作为最终可点击 UI 的扁平图片替代品。
- 最终 demo 必须可打开、可点击、可编辑，并通过与当前 workflow source of truth 相对应的视觉验证。

## Repository Split

```text
image2_UI_skill
|-- SKILL.md
|-- runtime/
|   `-- scheduler/
|-- schemas/
|-- references/
|-- scripts/
|-- tests/
`-- assets/readme/hero.png

ui_case
|-- library.html and supporting pages
|-- catalog/ and design-system lab
|-- demo/
`-- screenshots, generated assets, GIFs, and videos
```

See [PRODUCTION.md](./PRODUCTION.md) for runtime requirements and release checks.

## Contact

- Email: [juguli326@gmail.com](mailto:juguli326@gmail.com)
- WeChat: `13434361868`
