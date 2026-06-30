# 图标系统参考

用于 App、产品 UI、智能家居、播放器、设备控制、Dashboard 的 code icon / UI glyph 规划。目标是让状态栏、返回箭头、菜单、播放器、底部 tab、quick action、开关、小型语义状态符号都来自一套统一代码图标系统，而不是 image2 小图或零散 SVG。

重要边界：设备卡片里的较大台灯、摄像头、音箱、电视、空调等 **设备产品图 / 物体缩略图 / 产品抠图** 不是 UI glyph，应作为 `device-product-image`、`product-cutout`、`object-cutout` 或 `object-thumbnail` 图片资产处理，可以用 image2 生成。不要用图标库的大 glyph 冒充真实设备图。

判断顺序：

1. 如果元素位于状态栏、导航栏、工具栏、按钮、tab、播放器、quick action、开关或小尺寸状态标识中，并承担交互或语义提示职责，它是 code icon / UI glyph。
2. 如果元素是卡片主图、商品/设备外观、人物/物体前景、照片缩略图、场景图或需要透明背景的展示图，它是 image asset / cutout，即使文件名或语义里有 `lamp`、`camera`、`speaker`、`tv`。
3. 如果元素是品牌标记、插画徽章或地图标记，先判断是否为品牌/装饰资产；只有在它承担返回、设置、播放、导航等控件职责时，才按 UI glyph 处理。

## 1. 允许的统一外部图标库

新项目或新 demo 只从这四套里选一套：

1. `@phosphor-icons/react`：覆盖面广，线性/填充风格齐全，适合智能家居和产品 UI。
2. `hugeicons-react`：设备、物件和现代 App glyph 覆盖较多，适合移动 App 视觉复刻。
3. `@radix-ui/react-icons`：极简、稳定、轻量，适合基础控件和设置页；复杂设备图标可能不足。
4. `@tabler/icons-react`：覆盖广、stroke 风格统一，适合 dashboard、工具和设备面板。

选择规则：

- 项目已经稳定使用其中一套时，沿用它。
- 项目已有其它主图标库时，沿用已有主库，但不要再混入第二套；最终记录取舍。
- 绿色地新建 React/Next demo 时，优先 `@phosphor-icons/react` 或 `@tabler/icons-react`；设备/智能家居图标缺口多时考虑 `hugeicons-react`。
- 不要把 Lucide、Iconify、emoji、位图 icon、手写 SVG path 和上述四套混在同一界面。

## 2. 统一调用入口

React/Next 项目建立单一入口，例如 `UiIcon` 或 `IconRegistry`。业务组件只调用语义名，不直接 import 多处图标：

```tsx
import {
  ArrowLeft,
  DotsThreeVertical,
  GearSix,
  Plus,
  Minus,
  Power,
  Play,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  Thermometer,
  Lightning,
  Snowflake,
  Flame,
  Fan,
  Drop,
  House,
  Lamp,
  Camera,
  Television,
  WifiHigh,
  BatteryHigh,
  CellSignalHigh,
} from "@phosphor-icons/react";

const icons = {
  back: ArrowLeft,
  more: DotsThreeVertical,
  settings: GearSix,
  plus: Plus,
  minus: Minus,
  power: Power,
  play: Play,
  previous: SkipBack,
  next: SkipForward,
  volume: SpeakerHigh,
  thermometer: Thermometer,
  zap: Lightning,
  snowflake: Snowflake,
  flame: Flame,
  fan: Fan,
  droplet: Drop,
  home: House,
  lamp: Lamp,
  camera: Camera,
  tv: Television,
  wifi: WifiHigh,
  battery: BatteryHigh,
  signal: CellSignalHigh,
} as const;

export function UiIcon({ name, size = 20, weight = "regular", ...props }) {
  const Icon = icons[name];
  return <Icon size={size} weight={weight} aria-hidden="true" {...props} />;
}
```

纯 HTML/CSS/JS demo 建立一个 SVG sprite 或 `icon(name)` helper。所有 glyph 由同一 helper 输出，并共享 `viewBox`、stroke、linecap、linejoin、尺寸 class。

## 3. 强制代码渲染范围

以下 UI glyph 一律代码渲染，不能交给 image2，不能用 raster `<img>` 当作按钮/nav 小图标：

- 系统状态栏：time、signal、wifi、battery、dynamic island / home indicator。
- 导航：back、close、more/menu、settings、search。
- 控制：plus、minus、power、play、pause、previous、next、volume、progress handle。
- 底部 tab：home、rooms/devices、analytics/energy、profile/settings。
- quick action：heat、cold/snowflake、fan/air、humid/droplet、schedule/timer。
- 小型设备语义标识：lamp、camera、speaker、tv、air-conditioner、thermostat、router、plug、lock。若它们在卡片中承担真实产品外观展示、产品抠图或物体缩略图职责，则改用图片资产而不是图标库 glyph。
- 状态：on/off dot、selected ring、disabled state、toggle knob。

## 4. Coverage 表模板

| glyph | 用途 | 图标库名称 / SVG id | size | stroke/fill | 容器 | 状态 | aria-label |
| --- | --- | --- | --- | --- | --- | --- | --- |
| back | 返回上一屏 | ArrowLeft / arrow-left | 20 | stroke 2 | 44x44 button | default/pressed | Back |
| more | 更多菜单 | DotsThreeVertical / dots-vertical | 20 | stroke 2 | 44x44 button | default/open | More options |
| power | 电源 | Power / power | 22 | stroke 2 | 44x44 button | on/off/disabled | Toggle power |
| play | 播放 | Play / play | 18 | fill or stroke | 44x44 button | playing/paused | Play |
| lamp | 灯 | Lamp / lamp | 22 | stroke 2 | card badge/button | on/off | Lamp |
| camera | 摄像头 | Camera / camera | 22 | stroke 2 | card badge/button | recording/off | Camera |
| signal | 蜂窝信号 | CellSignalHigh / signal | 14 | fill | statusbar | static | Signal |
| wifi | Wi-Fi | WifiHigh / wifi | 14 | stroke 2 | statusbar | static | Wi-Fi |
| battery | 电量 | BatteryHigh / battery | 18 | stroke/fill | statusbar | static | Battery |

交付前 coverage 表不能留空：如果一个 glyph 没有库内对应项，写明本地补位 SVG id，并保证它仍通过统一入口调用。

## 5. 验收

- 截图放大到 200% 检查状态栏、底部 tab、quick action、设备卡片小图标。
- 图标风格必须统一：同一 stroke、端点、圆角、填充策略和视觉重量。
- 图标容器和 hit area 分开：图标可 16-24px，点击区域仍至少 44x44px。
- icon-only button 必须有 `aria-label` 或等价可访问名称。
- 不允许同一页面出现多套外部图标库，除非旧代码已经存在且本次没有触碰；新增 UI 只走主库。
