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

点击图片可查看原图；App 案例保留一张参考图和一个视频预览，不展示分屏静态图。

### hicolor

内容增长与图文案例展示

<table align="center">
  <tr>
    <th align="center">图片</th>
    <th align="center">预览</th>
  </tr>
  <tr>
    <td align="center">
      <a href="./assets/cases/hicolor/traffic-3-days.png"><img src="./assets/cases/hicolor/traffic-3-days.png" alt="hicolor traffic" width="360"></a>
    </td>
    <td align="center">
      <a href="./assets/cases/hicolor/threads-recommendation.png"><img src="./assets/cases/hicolor/threads-recommendation.png" alt="Threads recommendation" width="215"></a>
      <br>
      <a href="./assets/cases/hicolor/xiaohongshu-pinned.jpg">查看补充图</a>
    </td>
  </tr>
</table>

### Museum App

iOS 风格博物馆导览 demo

<table align="center">
  <tr>
    <th align="center">图片</th>
    <th align="center">预览</th>
  </tr>
  <tr>
    <td align="center">
      <a href="./assets/cases/museum-app/reference-overview.png"><img src="./assets/cases/museum-app/reference-overview.png" alt="Museum reference" width="420"></a>
    </td>
    <td align="center">
      <a href="./assets/cases/museum-app/museum-app-demo.mp4"><img src="./assets/cases/museum-app/museum-app-preview.gif" alt="Museum preview" width="220"></a>
      <br>
      <a href="./assets/cases/museum-app/museum-app-demo.mp4">查看 Museum App 视频</a>
    </td>
  </tr>
</table>

### Fashion Shopping App

时尚购物 App 原型 demo

<table align="center">
  <tr>
    <th align="center">图片</th>
    <th align="center">预览</th>
  </tr>
  <tr>
    <td align="center">
      <a href="./assets/cases/fashion-shopping-app/reference-overview.png"><img src="./assets/cases/fashion-shopping-app/reference-overview.png" alt="Fashion reference" width="420"></a>
    </td>
    <td align="center">
      <a href="./assets/cases/fashion-shopping-app/fashion-app-demo.mp4"><img src="./assets/cases/fashion-shopping-app/fashion-app-preview.gif" alt="Fashion preview" width="220"></a>
      <br>
      <a href="./assets/cases/fashion-shopping-app/fashion-app-demo.mp4">查看 Fashion Shopping App 视频</a>
    </td>
  </tr>
</table>

### News App

新闻阅读与发现页 demo

<table align="center">
  <tr>
    <th align="center">图片</th>
    <th align="center">预览</th>
  </tr>
  <tr>
    <td align="center">
      <a href="./assets/cases/news-app/reference-overview.png"><img src="./assets/cases/news-app/reference-overview.png" alt="News reference" width="420"></a>
    </td>
    <td align="center">
      <a href="./assets/cases/news-app/news-app-demo.mp4"><img src="./assets/cases/news-app/news-app-preview.gif" alt="News preview" width="220"></a>
      <br>
      <a href="./assets/cases/news-app/news-app-demo.mp4">查看 News App 视频</a>
    </td>
  </tr>
</table>
