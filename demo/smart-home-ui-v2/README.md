# Smart Home UI v2

新版 image2-to-UI 复刻 demo。

- 图标库：`@phosphor-icons/react`
- 统一入口：`src/UiIcon.jsx`
- 位图资产：`public/generated/living-room-hero.png`
- UI glyph：状态栏、返回、菜单、播放器、底部 tab、quick action、开关、设备小图标均为代码渲染

验证命令：

```bash
npm install
npm run build
node /Users/zzhu/.codex/skills/image-to-ui-skill/scripts/image2-ui validate . --no-browser
```
