# Image2 UI Skill

把 UI 截图、设计稿、App 参考图交给 Codex，生成可点击 demo；需要复杂视觉时，真实调用 `image2` 产出图片资产并接回页面。

## 核心原则

- 复杂视觉、照片、产品图、纹理、插画、抠图：调用 `image2` 生成资产。
- 文字、按钮、状态栏、导航、普通 icon、表单、交互控件：用代码实现。
- 图片资产落地到项目目录，并接回页面，不停留在“只生成了图片”。

## 安装

Windows PowerShell：

```powershell
git clone https://github.com/zhu-guli326/image2_UI_skill.git "$env:USERPROFILE\.codex\skills\image2_UI_skill"
```

macOS / Linux：

```bash
git clone https://github.com/zhu-guli326/image2_UI_skill.git "${CODEX_HOME:-$HOME/.codex}/skills/image2_UI_skill"
```

安装后重开 Codex，或新开一个会话。

## 用法

```text
使用 image-to-ui-skill，参考我上传的图，做一个可点击 demo。
需要真实调用 image2 生成必要图片资产，并接回页面。
```

## 案例展示

当前保留 `hicolor` 这一组案例，点击图片可查看原图。

<p align="center">
  <a href="./assets/cases/hicolor/traffic-3-days.png"><img src="./assets/cases/hicolor/traffic-3-days.png" alt="hicolor traffic" width="360"></a>
  <a href="./assets/cases/hicolor/threads-recommendation.png"><img src="./assets/cases/hicolor/threads-recommendation.png" alt="Threads recommendation" width="215"></a>
</p>

<p align="center">
  <a href="./assets/cases/hicolor/xiaohongshu-pinned.jpg"><img src="./assets/cases/hicolor/xiaohongshu-pinned.jpg" alt="Xiaohongshu pinned" width="215"></a>
</p>
