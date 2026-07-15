# image2_UI_skill

<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="image2_UI_skill turns UI references into code-rendered interfaces, generated image assets, and clickable demos">
</p>

把 UI 截图、设计稿、App 参考图交给 Codex，让它先拆清楚哪些应该用代码实现、哪些必须真实调用 `image2` 生成图片资产，再把资产接回一个可打开、可点击、可继续修改的 demo。

## 适合什么场景

- 你有一张 App、网页、海报式界面或产品 UI 参考图，想快速变成可交互原型。
- 画面里有复杂照片、商品图、插画、纹理、背景或抠图，不能只靠 CSS/SVG 占位。
- 你希望最终结果能本地预览、能点击、能继续改，而不是停在“生成了一张图”。

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

把参考图发给 Codex，然后这样说：

```text
使用 image-to-ui-skill，参考我上传的图，做一个可点击 demo。
需要真实调用 image2 生成必要图片资产，并接回页面。
```

如果你已经知道目标平台，也可以补一句：

```text
做成手机 App 外框，包含 3 个可点击页面，并验证本地预览。
```

## 它会怎么做

| 阶段 | 产出 | 判断标准 |
| --- | --- | --- |
| 拆图 | `code-ui` 与 `image2-assets` 两张清单 | 文案、按钮、状态栏、导航、表单、普通 icon 进入代码；照片、产品、插画、纹理、背景进入 image2 |
| 生图 | 本地图片资产与提示词记录 | 资产有用途、尺寸、裁切方式和负面约束，不把可读 UI 文案烘焙进图片 |
| 实现 | HTML/CSS/JS 或项目现有技术栈 | 页面能打开，控件能点击，移动端不横向滚动 |
| 校验 | 截图、交互检查、图片加载检查 | 本地资源可用，关键流程可走通，输出能继续修改 |

## 案例

点击参考图可以查看原图；点击预览图可以查看视频或更大的输出。

### Museum App

iOS 风格博物馆导览 demo，把参考图里的展览、藏品和层级关系拆成可点击的 Home、Exhibitions、Detail 流程。

<table align="center">
  <tr>
    <th align="center">参考图</th>
    <th align="center">可点击 demo 预览</th>
  </tr>
  <tr>
    <td align="center">
      <a href="./assets/cases/museum-app/reference-overview.png"><img src="./assets/cases/museum-app/reference-overview.png" alt="Museum app reference overview" width="430"></a>
    </td>
    <td align="center">
      <a href="./assets/cases/museum-app/museum-app-demo.mp4"><img src="./assets/cases/museum-app/museum-app-preview.gif" alt="Museum app clickable demo preview" width="220"></a>
      <br>
      <a href="./assets/cases/museum-app/museum-app-demo.mp4">查看视频</a>
    </td>
  </tr>
</table>

### Fashion Shopping App

时尚购物 App 原型，把商品视觉留给图片资产，把 tab、筛选、收藏、卡片状态交给代码实现。

<table align="center">
  <tr>
    <th align="center">参考图</th>
    <th align="center">可点击 demo 预览</th>
  </tr>
  <tr>
    <td align="center">
      <a href="./assets/cases/fashion-shopping-app/reference-overview.png"><img src="./assets/cases/fashion-shopping-app/reference-overview.png" alt="Fashion shopping app reference overview" width="430"></a>
    </td>
    <td align="center">
      <a href="./assets/cases/fashion-shopping-app/fashion-app-demo.mp4"><img src="./assets/cases/fashion-shopping-app/fashion-app-preview.gif" alt="Fashion shopping app clickable demo preview" width="220"></a>
      <br>
      <a href="./assets/cases/fashion-shopping-app/fashion-app-demo.mp4">查看视频</a>
    </td>
  </tr>
</table>

### News App

新闻阅读与发现页 demo，用代码处理列表、标签、底部导航和状态切换，用资产承载新闻封面与视觉氛围。

<table align="center">
  <tr>
    <th align="center">参考图</th>
    <th align="center">可点击 demo 预览</th>
  </tr>
  <tr>
    <td align="center">
      <a href="./assets/cases/news-app/reference-overview.png"><img src="./assets/cases/news-app/reference-overview.png" alt="News app reference overview" width="430"></a>
    </td>
    <td align="center">
      <a href="./assets/cases/news-app/news-app-demo.mp4"><img src="./assets/cases/news-app/news-app-preview.gif" alt="News app clickable demo preview" width="220"></a>
      <br>
      <a href="./assets/cases/news-app/news-app-demo.mp4">查看视频</a>
    </td>
  </tr>
</table>

### hicolor

内容增长与图文案例展示，适合检验“参考素材 + 结构化页面 + 真实图文资产”的组合输出。

<table align="center">
  <tr>
    <th align="center">素材</th>
    <th align="center">输出</th>
  </tr>
  <tr>
    <td align="center">
      <a href="./assets/cases/hicolor/traffic-3-days.png"><img src="./assets/cases/hicolor/traffic-3-days.png" alt="hicolor traffic reference" width="380"></a>
    </td>
    <td align="center">
      <a href="./assets/cases/hicolor/threads-recommendation.png"><img src="./assets/cases/hicolor/threads-recommendation.png" alt="hicolor Threads recommendation output" width="245"></a>
      <br>
      <a href="./assets/cases/hicolor/xiaohongshu-pinned.jpg">查看补充图</a>
    </td>
  </tr>
</table>

## 关键约束

- 需要生图时必须调用项目指定的 `image2`。如果当前环境没有可用入口，应该说明缺口，不能把 CSS/SVG/占位图说成已生图。
- 生成图片里不要包含可读 UI 文案、logo、水印、状态栏、按钮或小图标。
- 返回、关闭、菜单、搜索、设置、电量、Wi-Fi、播放、底部 tab、开关、加减号都应该由代码渲染。
- 最终 demo 必须可打开、可点击、可继续修改。

## 仓库结构

```text
.
├── SKILL.md                  # Codex skill 入口与执行规则
├── references/               # image2 拆图、案例和工程循环参考
├── scripts/                  # image2-ui 辅助脚本
├── assets/                   # README 与案例素材
└── demo/                     # 已实现的可点击 demo
```
