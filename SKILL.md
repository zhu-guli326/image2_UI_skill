---
name: image-to-ui-skill
description: Use when the user asks for image2 生图, 调用 image2, image-to-UI, UI screenshot to code, design to code, clickable app demo, mobile prototype, iOS preview, high-fidelity UI recreation, or generating bitmap assets for a UI. Split the reference into code-rendered UI and image2-generated assets, build a clickable preview, and verify the output.
---

# Image To UI Skill

把 UI 参考图做成可点击 demo。少解释，多落地。

## 必守原则

- 需要生图时，调用项目指定的 `image2`。如果当前环境没有可用入口，要说明缺口，不能把 CSS/SVG/占位图说成已生图。
- `image2` 只负责复杂位图：照片、产品图、人物、插画、纹理、背景、地图、卡片缩略图、物体抠图。
- 代码负责 UI：文字、按钮、状态栏、导航、表单、开关、价格、标签、普通 icon、播放器控件。
- 生成图片里不要包含可读 UI 文案、logo、水印、状态栏、按钮或小图标。
- 最终 demo 必须可打开、可点击、可继续修改。

## 工作流

1. 拆出两张清单：`code-ui` 与 `image2-assets`。
2. 为每个 `image2-assets` 写清楚用途、尺寸、风格、裁切方式和负面约束。
3. 调用 `image2` 生成真实图片文件，并放进项目资源目录。
4. 用项目现有技术实现页面，把生成资产接回界面。
5. 如果是 App 或手机参考图，默认做手机外框、状态栏安全区和可点击页面切换。
6. 打开本地预览检查渲染和交互。

## UI 规则

- 图标统一用一套代码图标系统。
- 返回、关闭、菜单、搜索、设置、电量、Wi-Fi、播放、底部 tab、开关、加减号都用代码。
- 设备外观、产品抠图、商品图可以用 `image2`。
- 文字必须是真实文本，不能烘焙进图片里。
- 显眼控件必须能点击或有明确反馈。
- 移动端不能横向滚动，文字不能溢出按钮或卡片。

## 最终汇报

- 预览入口或本地 URL。
- `image2` 生成资产路径。
- 哪些 UI 是代码实现。
- 做过哪些检查。
