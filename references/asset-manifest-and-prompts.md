# 资产清单与提示词参考

这份文档只提供 4 类内容：

- 前期审查模板
- 资产清单模板
- `image2` 提示词模板
- 页面级检查清单
- 页面输出巡检模板

## 1. 前期审查模板

在真正开始生图或改代码之前，先输出一版简洁审查：

```markdown
## UI 还原前期审查

### 整体判断
- 页面类型：
- 视觉风格：
- 核心布局：
- 首屏重点：
- 主要风险：

### 元素拆分

| 区域 | 建议实现方式 | 难度 | 原因 | 是否需要确认 |
| --- | --- | --- | --- | --- |
| 顶部导航 | 代码 | 容易 | 结构清晰，文本可编辑 | 否 |
| 首屏主视觉 | image2 | 困难 | 依赖摄影/插画质感 | 是 |
| logo | 原素材 | 不建议直接生成 | 需要品牌一致性 | 是 |
| 状态栏 / 返回 / 菜单 / 底部导航图标 | 代码图标 | 容易 | 小 glyph 用生图容易错位或变伪文字，必须由代码层渲染 | 否 |
| 设备卡片产品图 / 物体抠图 | image2 图片资产 | 中等 | 是展示真实物体外观的图片槽位，不是 UI glyph | 否 |

### 图片资产候选

| id | UI 位置 | 用途 | 槽位尺寸 | 建议导出尺寸 | 是否透明 | 优先级 |
| --- | --- | --- | --- | --- | --- | --- |
| hero-main | 首屏 | 主视觉 | 100vw x 60vh | 2880x1600 | 否 | 必须生图 |

### 需要确认
- 是否要求像素级复刻，还是允许风格近似？
- 是否有 logo、人物、产品图等原始素材？
- 是否有指定字体或授权字体文件？
- 是否需要移动端和桌面端双适配？
```

难度建议：

- `容易`：代码或现有图标库即可完成
- `中等`：需要精细 CSS、裁剪或少量图片辅助
- `困难`：依赖 `image2`、抠图或复杂质感
- `不建议直接生成`：logo、商标、用户专属照片、精确产品截图

## 2. 资产清单模板

生成前先列资产清单，保持每个资产可追踪：

| id | UI 位置 | 类型 | 代码或 image2 | CSS 槽位尺寸 | 导出尺寸 | 比例 | 后处理 | 目标路径 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hero-main | 首屏主视觉 | hero-image | image2 | 100vw x 60vh | 2880x1600 | 1.8:1 | crop, compress-webp | src/assets/generated/hero-main.webp |

常用类型：

- `hero-image`
- `thumbnail`
- `illustration`
- `texture`
- `cutout`
- `background-plate`
- `photo-slot`
- `object-cutout`
- `product-cutout`
- `foreground-cutout`
- `object-thumbnail`
- `device-product-image`
- `background-visual`
- `code-icon`
- `code-ui-chrome`
- `custom-icon`（仅限装饰性品牌符号或插画式徽章，不用于返回、设置、导航、播放等功能图标）

类型判定：

- `photo-slot`、`object-cutout`、`product-cutout`、`foreground-cutout`、`object-thumbnail`、`device-product-image`、`background-visual` 通常可以进入 image2。
- `code-icon` 和 `code-ui-chrome` 必须用代码、图标库、内联 SVG 几何形或 CSS 实现。
- App / 智能家居 / 设备控制参考图中，状态栏、电量/Wi-Fi/信号、返回、关闭、菜单、加减号、电源、播放器、bottom tab、quick action、设备小 glyph、开关和状态点都归类为 `code-icon` 或 `code-ui-chrome`。
- 设备卡片里较大的台灯、摄像头、音箱、电视、空调等真实设备外观，不属于 `code-icon`；它们应归类为 `device-product-image` 或 `object-cutout`，可以进入 image2 资产清单。
- `camera`、`lamp`、`speaker`、`tv` 等名称本身不决定类型：在按钮、tab、状态栏、quick action 里是 `code-icon`；在设备卡片主视觉、商品格、场景缩略图里是 `device-product-image`、`product-cutout` 或 `object-thumbnail`。

图标 coverage 表建议：

| glyph | 语义 | 来源 | 尺寸 | stroke/fill | 容器 | 状态 | aria-label |
| --- | --- | --- | --- | --- | --- | --- | --- |
| back | 返回上一屏 | project icon set / svg sprite | 20px | stroke 2 | 44x44 button | default/active | Back |
| power | 电源开关 | project icon set / svg sprite | 22px | stroke 2 | 44x44 button | on/off/disabled | Toggle power |

来源只能是项目已有主图标库，或统一新增的 `@phosphor-icons/react`、`hugeicons-react`、`@radix-ui/react-icons`、`@tabler/icons-react` 四者之一；纯 HTML demo 可用统一 SVG sprite。不要把 `code-icon` 拆成多张 image2 小图，也不要混用 emoji、位图 icon、多个 icon 库和不同线宽。

常用后处理：

- `none`
- `crop`
- `resize`
- `remove-background`
- `transparent-png`
- `compress-webp`
- `mobile-crop`

## 3. image2 提示词模板

每个资产单独写提示词，不要把整个页面一起描述进一张图里。

```text
为一个 [产品/网站/App] UI 生成 [资产类型]。

用途和位置：
- 用于 [UI 槽位]
- 目标宽高比：[比例]
- 目标导出尺寸：[宽]x[高]

主体和构图：
- [主体]
- [视角/镜头]
- [前景与背景关系]
- [文案留白要求]

风格：
- [真实摄影 / 插画 / 3D / 半色调 / 颗粒感]
- 色彩：[主色]
- 光照：[光照方式]
- 质感：[材质或风格细节]

集成约束：
- 不要出现可读文字、logo、水印、按钮、系统状态栏、UI chrome、图标或 UI symbols
- 不要出现 battery/Wi-Fi/signal glyphs、arrows、gear、menu dots、plus/minus、power symbol、playback controls、tab icons、toggles、status dots
- 保持边缘干净，方便裁剪
- [如果需要抠图：透明背景 / 独立主体 / 简单背景]

避免：
- [会破坏 UI 集成的内容]
```

如果是同一页面的一组小图，先统一这些风格 token：

- 色板
- 光照方向
- 颗粒密度
- 材质风格
- 镜头角度

## 4. 页面级检查清单

生成并接回页面后，至少检查这些内容：

- 页面真实文字没有乱码、截断或被遮挡
- 小设备卡片、播放器、quick action 和 tile 内没有 8px 以下可见文本；如果必须保留位置、房间名、说明等元信息，优先放入 `aria-label`、title、详情页或 hover/focus 文案，不在卡片正面堆多行小字
- 生成图片内部没有伪文字、logo、水印、额外 UI、状态栏、图标、按钮、tab、播放器、开关或状态点
- 状态栏、电量/Wi-Fi/信号、返回、菜单、加减号、电源、播放器、bottom tab、quick action、小型设备语义标识都由代码层真实渲染，并在截图中视觉居中；设备产品图/物体缩略图使用真实图片资产，不用 glyph 冒充
- 图片没有被拉伸、压扁、模糊或错误裁切
- 主体位置和文案留白符合参考图意图
- 抠图边缘没有白边、硬边或脏边
- 图片没有遮挡按钮、链接或表单
- 移动端和桌面端都能正常显示
- 主要 CTA、返回、导航、卡片点击路径可用
- 截图里能明确看到真实生图资产已经渲染进页面
- 自动巡检没有 `fail`；如果有 `warn`，已记录是否修复或接受

## 5. 页面输出巡检模板

可点击 demo 交付前，优先运行 loop 闭环：

```bash
image2-ui loop <demo-dir> --reference <reference-image> --build "<build-command>"
```

`loop` 会自动构建、截图、巡检、生成参考图对照和修复队列。默认产物在 `<demo-dir>/.image2-ui/`：

- `loop-actual.png`
- `loop-reference-compare.png`
- `loop-report.md`
- `loop-report.json`

只需要单独巡检时，运行：

```bash
image2-ui validate <demo-dir> --reference <reference-image>
```

如果已经有当前页面截图，单独生成参考图/输出图对照板：

```bash
image2-ui compare --reference <reference-image> --actual <output-screenshot> --out <compare-output.png>
```

`compare` 输出左右对照和半透明 overlay，用于快速确认整体比例、手机位置、按钮/图标、开关、产品图槽位和微型文字是否接近原图。它用于复刻差距核对，不代替 `validate` 的破图、对比度、溢出和 icon 系统检测。

巡检项按三类处理：

| 等级 | 含义 | 处理 |
| --- | --- | --- |
| `fail` | 页面可能坏了、不可读、不可点或无法验收 | 必须先修 |
| `warn` | 影响质感、还原度或稳定性 | 评估后修复或记录取舍 |
| `info` | 作为交付证据或后续建议 | 简短记录即可 |

重点看这些信号：

- `missing-entry`：没有可打开的 HTML 入口。
- `broken-local-asset`：HTML/CSS 引用了不存在的本地资源。
- `remote-asset`：交付 demo 仍依赖远程图片、字体或脚本。
- `empty-asset`：本地图片或脚本为空文件。
- `gradient-text`：大面积使用渐变文字，容易显得模板化；只有参考图明确需要时保留。
- `single-family-palette`：CSS 色彩集中在紫蓝、灰蓝、奶油、沙色等单一 AI 常见色系。
- `nested-panel`：卡片/面板套卡片，导致层级臃肿。
- `low-contrast`：关键文本和背景对比不足。
- `dense-micro-text`：卡片、设备 tile、播放器或 quick action 内有过小可见文本，容易在截图里变成乱码/伪字。优先删减可见元信息、提高字号、扩大卡片，或把位置/说明移动到辅助语义和详情层。
- `generated-ui-glyph-asset`：图片文件名和上下文像状态栏、导航、菜单、按钮、播放器或普通 UI 图标，通常说明把 code-icon 误交给了 image2；不适用于 `device-product-image`、`product-cutout`、`object-cutout`、`object-thumbnail` 这类展示图片。
- `image-icon-in-control`：按钮、导航、工具栏或 tab 中使用位图 `<img>` 做小图标，优先改成图标库或 SVG/CSS 几何；如果 `<img>` 是商品/设备/人物抠图的展示内容，不按这个规则处理。
- `cutout-asset-missing-alt`：产品图、物体抠图或设备外观图缺少 alt。若图片有信息意义，补有用 alt；若纯装饰，显式写 `alt=""`。
- `off-center-icon`：真实浏览器中按钮、状态栏、播放器、quick action、开关等容器里的 SVG 偏离视觉中心，常见于只按几何盒居中、图标 baseline 参与布局、播放三角/箭头没有光学校正。优先统一 `.ui-icon { display:block; line-height:0; }`，让 icon button 用 `display:grid; place-items:center; padding:0; line-height:0;`，再对 play/arrow/Wi-Fi/battery 这类非对称 glyph 做 0.3-1px 的局部 transform。
- `icon-tile-stack`：圆角方块 icon 堆在标题上，是常见 AI feature-card 模板；除非参考图明确如此，否则改成侧向图标、真实图片或无图标信息层级。
- `mixed-icon-tech`：同一页面混用多套图标技术，通常会导致线宽、对齐和语义不一致。
- `text-overflow`：文本超出按钮、卡片、导航或窄屏容器。
- `horizontal-scroll`：移动端或窄容器出现横向滚动。
- `dead-click-target`：明显可点击控件没有反馈、状态变化或跳转。
- `console-error`：浏览器渲染时报错。

最终汇报建议格式：

```markdown
### 页面巡检
- 命令：
- 结果：pass / pass-with-warnings / fail
- 已修复：
- 保留风险：
```

## 6. 差距核对表

最后一轮建议用这张表记录对照结果：

| 轮次 | 区域 | 当前差距 | 等级 | 修正动作 | 结果 |
| --- | --- | --- | --- | --- | --- |
| 1 | 首屏主视觉 | 主体偏中，标题留白不足 | 必须修 | 调整裁剪或重生成 | 待复查 |
| 1 | 标题字体 | 字重偏轻 | 建议修 | 更换近似字体 | 待复查 |

等级建议：

- `必须修`：明显影响还原度或用户明确点名的问题
- `建议修`：影响质感，但不阻碍交付
- `可接受差异`：受素材、授权或模型质量限制，可记录保留
