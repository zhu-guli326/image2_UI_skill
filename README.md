# image2_UI_skill

<p align="center">
  <img src="./assets/readme/hero.png" width="100%" alt="image2_UI_skill turns UI references into code-rendered interfaces, generated image assets, and clickable demos">
</p>

把 UI 截图、设计稿或 App 参考图交给 Codex，让它先生成完整效果图，再拆分代码界面与 `image2` 位图资产，最终交付可打开、可点击、可继续修改的 demo。

Give Codex a UI screenshot, design mockup, or app reference. This Skill generates and reviews a complete effect image first, then separates code-rendered UI from real `image2` bitmap assets and delivers an editable, clickable demo.

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

## Usage

把参考图发给 Codex，然后说：

```text
使用 image-to-ui-skill，参考我上传的图，做一个可点击 demo。
需要真实调用 image2 生成必要图片资产，并接回页面。
```

没有明确方向时，先打开独立的可视化启动器：

<https://zhu-guli326.github.io/ui_case/launcher.html?intent=explore>

## UI Case Gallery

网页、案例数据、设计系统实验室、截图、GIF、视频和可点击 demo 已迁移到独立仓库：

- Gallery: <https://zhu-guli326.github.io/ui_case/library.html?lang=zh>
- Repository: <https://github.com/zhu-guli326/ui_case>
- UI vocabulary: <https://zhu-guli326.github.io/ui_case/vocabulary.html?lang=zh>
- Design systems: <https://zhu-guli326.github.io/ui_case/brands.html?lang=zh>
- Design skills: <https://zhu-guli326.github.io/ui_case/skills.html?lang=zh>

安装本 Skill 不再下载案例站点的大型媒体资源。

## CLI

```bash
image2-ui doctor
image2-ui validate <demo-dir> --reference <reference-image>
image2-ui compare --reference <reference-image> --actual <output-image>
image2-ui loop <demo-dir> --reference <reference-image>
image2-ui orchestrate <project-dir> --task "Build a clickable UI"
```

开发检查：

```bash
npm test
npm run doctor
npm run pack:check
```

Windows PowerShell 可运行完整的 Skill 仓库自检：

```powershell
.\validate.ps1
```

## Key Rules

- 需要生图时必须调用项目指定的 `image2`；没有可用通道时明确说明缺口。
- 工作顺序是 `reference image -> complete effect image -> review -> UI decomposition -> clickable implementation`。
- 文案、按钮、导航、表单、状态栏和常用图标由代码渲染。
- 照片、商品、人物、插画、纹理、背景和对象抠图使用真实位图资产。
- 生成资产不得包含可读 UI 文案、logo、水印、状态栏、按钮或小型 UI glyph。
- 最终 demo 必须可打开、可点击、可编辑，并通过与风险相称的验证。

## Repository Split

```text
image2_UI_skill
|-- SKILL.md
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
