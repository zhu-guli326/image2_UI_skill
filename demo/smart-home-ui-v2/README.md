# Smart Home UI v2

新版 image2-to-UI 复刻 demo。

- 图标库：`@phosphor-icons/react`
- 统一入口：`src/UiIcon.jsx`
- 位图资产：`public/generated/living-room-hero.png`、`device-sheet.png`、`device-camera-cutout.png`、`device-lamp-cutout.png`
- UI glyph：状态栏、返回、菜单、播放器、底部 tab、quick action、开关、设备小图标均为代码渲染
- 设备卡片：产品外观用 `data-asset-role="device-product-image"` 标记为图片资产；房间位置不作为卡片正面小字显示，避免微型文本变成伪字或乱码
- 图标对齐：`.ui-icon` 统一为 block/line-height 0，icon button 使用 grid 居中；播放三角和方向箭头用语义 class 做轻微光学偏移

验证命令：

```bash
npm install
npm run build
node /Users/zzhu/.codex/skills/image-to-ui-skill/scripts/image2-ui loop . --reference /Users/zzhu/Downloads/2.jpeg --build "npm run build" --capture-class capture-wide
node /Users/zzhu/.codex/skills/image-to-ui-skill/scripts/image2-ui validate . --reference /Users/zzhu/Downloads/2.jpeg
node /Users/zzhu/.codex/skills/image-to-ui-skill/scripts/image2-ui compare --reference /Users/zzhu/Downloads/2.jpeg --actual screenshots/recreated-three-screen-chrome.png --out screenshots/reference-output-compare.png
```
