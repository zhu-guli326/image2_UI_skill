# Loop 工程闭环

当用户要求“自己优化”“loop 工程”“继续迭代直到更像参考图”时，把 image-to-UI 还原当成一个可复跑闭环，而不是一次性截图交付。

## 核心命令

```bash
image2-ui loop <demo-dir-or-html> \
  --reference <reference.png> \
  --build "npm run build" \
  --capture-class capture-wide
```

它会按顺序执行：

1. 可选 build：确保 React/Vite/Next 等 demo 先产出最新构建。
2. 浏览器截图：用 Playwright 打开真实页面，输出 `.image2-ui/loop-actual.png`。
3. 自动巡检：复用 `image2-ui validate` 的静态和浏览器检查。
4. 参考图对比：复用 `image2-ui compare` 输出 `.image2-ui/loop-reference-compare.png` 和 HTML。
5. 修复队列：写出 `.image2-ui/loop-report.md` 和 `.image2-ui/loop-report.json`。

## Agent 迭代协议

每一轮都按这个节奏做：

1. 先读 `loop-report.md` 的 Must Fix。
2. 修破图、空白渲染、横向滚动、文字溢出、位图 UI icon、图标错位和控制台错误。
3. 再处理 Should Fix 中影响还原度的低对比度、小触摸目标、密集微型文字、嵌套卡片、模板化渐变文字、单一 AI 配色和过重阴影。
4. 打开 `loop-reference-compare.png` 做人工核对：手机比例、垂直位置、状态栏、返回/菜单、播放器、quick action、开关、设备产品图和微型文字是否接近参考图。
5. 改完后复跑同一条 `image2-ui loop` 命令，直到没有 Must Fix，且剩余 Should Fix 都能解释为参考图有意保留或业务取舍。

## 输出目录

默认输出到目标 demo 的 `.image2-ui/`：

- `loop-actual.png`：当前真实浏览器截图
- `loop-reference-compare.png`：参考图、当前输出和 overlay 对照板
- `loop-reference-compare.html`：可放大查看的对照 HTML
- `loop-report.md`：给 agent 和人看的修复队列
- `loop-report.json`：给 CI 或后续脚本读取的结构化结果

`.image2-ui/` 是临时循环产物，默认不提交。需要沉淀案例证据时，用：

```bash
image2-ui loop <demo> --reference <reference.png> --out-dir <demo>/screenshots
```

## 判定规则

- `fail`：页面坏了、不可验收或自动检测明确失败，必须先修。
- Must Fix：即使部分来自 `warn`，也代表用户常反馈的问题，例如位图小图标、图标视觉错位、文字溢出、生成 UI glyph 残影。
- Should Fix：影响观感、还原度、可读性或工程稳定性，但可能因为参考图风格而保留。
- Reference Review：自动化看不懂的高保真差距，必须人工看对照图。

## 重要限制

`image2-ui loop` 不直接改代码。它负责把证据和修复队列稳定产出；真正的 UI 修正由 Codex 根据报告执行。这样能避免脚本盲目改布局，同时让每轮优化都有同一套验收标准。
