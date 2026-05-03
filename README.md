# Image to UI Skill

把 UI 截图、设计稿和页面参考图转换成：

- 可用代码实现的结构化 UI
- 需要真实生成的 `image2` 位图资产

## 实现什么功能

这个 skill 主要用来做 4 件事：

1. 分析 UI 图，判断哪些部分适合用代码实现
2. 识别哪些区域必须真实调用 `image2` 生图
3. 规划图片资产清单、尺寸、提示词和后处理方式
4. 把生成结果接回页面，并做截图和交互检查

适合处理的内容包括：

- 首屏主视觉
- 缩略图和卡片图
- 插画、地图、路线图
- 背景纹理
- 透明抠图

默认不交给 `image2` 的内容包括：

- 标题、正文、价格、按钮文案
- 导航、表单、列表、标签
- 需要保持可访问和可交互的真实 UI

## 如何安装

把仓库放到 Codex 的 skills 目录，并保持文件夹名与 `SKILL.md` 里的 `name` 一致。

Windows:

```powershell
git clone https://github.com/zhu-guli326/image2_UI_skill.git "$env:USERPROFILE\.codex\skills\image-to-ui-skill"
```

macOS / Linux:

```bash
git clone https://github.com/zhu-guli326/image2_UI_skill.git "${CODEX_HOME:-$HOME/.codex}/skills/image-to-ui-skill"
```

安装后重新打开 Codex，或新开一个会话再使用。

## 如何使用

上传 UI 图之后，直接点名这个 skill，再把目标说清楚。

最通用的说法：

```text
使用 image-to-ui-skill，参考我上传的图，按参考图高度匹配还原，完成一个可点击预览的 demo。
需要真实调用 image2 生图，并自动判断哪些区域应该生成位图、哪些区域应该保留为代码实现。
输出[HTML/CSS/JS / React / Vue / 其他技术栈]。
直接开始，不用先问我。
```

如果你想先分析，不立刻写代码：

```text
使用 image-to-ui-skill，先不要写代码。
先分析我上传的这张 UI 图，并输出：
1. 哪些部分适合代码实现
2. 哪些部分必须真实调用 image2 生图
3. 资产清单、尺寸建议和提示词
```

如果你不希望模型退回成“只做代码近似”，加这一句最有效：

```text
如果没有真实生成位图并接入页面，不要告诉我已经用了 image2。
```
