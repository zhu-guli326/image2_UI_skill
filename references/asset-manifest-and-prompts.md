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
- `device-product-image`
- `background-visual`
- `code-icon`
- `code-ui-chrome`
- `custom-icon`（仅限装饰性品牌符号或插画式徽章，不用于返回、设置、导航、播放等功能图标）

类型判定：

- `photo-slot`、`object-cutout`、`device-product-image`、`background-visual` 通常可以进入 image2。
- `code-icon` 和 `code-ui-chrome` 必须用代码、图标库、内联 SVG 几何形或 CSS 实现。
- App / 智能家居 / 设备控制参考图中，状态栏、电量/Wi-Fi/信号、返回、关闭、菜单、加减号、电源、播放器、bottom tab、quick action、设备小 glyph、开关和状态点都归类为 `code-icon` 或 `code-ui-chrome`。

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
- 生成图片内部没有伪文字、logo、水印、额外 UI、状态栏、图标、按钮、tab、播放器、开关或状态点
- 状态栏、电量/Wi-Fi/信号、返回、菜单、加减号、电源、播放器、bottom tab、quick action 和设备小图标都由代码层真实渲染，并在截图中视觉居中
- 图片没有被拉伸、压扁、模糊或错误裁切
- 主体位置和文案留白符合参考图意图
- 抠图边缘没有白边、硬边或脏边
- 图片没有遮挡按钮、链接或表单
- 移动端和桌面端都能正常显示
- 主要 CTA、返回、导航、卡片点击路径可用
- 截图里能明确看到真实生图资产已经渲染进页面
- 自动巡检没有 `fail`；如果有 `warn`，已记录是否修复或接受

## 5. 页面输出巡检模板

可点击 demo 交付前，优先运行：

```bash
image2-ui validate <demo-dir> --reference <reference-image>
```

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
- `generated-ui-glyph-asset`：图片文件名像状态栏、导航、菜单、按钮、播放器或普通 UI 图标，通常说明把 code-icon 误交给了 image2。
- `image-icon-in-control`：按钮、导航、工具栏或 tab 中使用位图 `<img>` 做小图标，优先改成图标库或 SVG/CSS 几何。
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
