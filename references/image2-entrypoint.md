# image2 入口发现与验真

这份文档用于回答一个关键问题：当前项目里“image2”到底怎么调用。默认答案是先尝试项目显式配置的 `image2` 命令；如果项目命令不可用，再进入本地 `imagegen` CLI fallback。当前 Codex 会话如果暴露内置 `image_gen` 工具，也可以作为 native image2 来源，但它不能由 shell doctor 直接检测。

## 1. 先确认项目约束

优先读取这些位置：

1. 当前会话或项目根目录的 `AGENTS.md`
2. 用户在消息里明确写出的 image2 调用方式
3. 项目 README、scripts、package scripts、CLI 文档或已有 demo 记录
4. 环境变量、命令行工具或本地脚本中明确命名为 image2 或 imagegen 的入口

推荐搜索关键词：

```powershell
rg -n "image2|IMAGE2|generate.*image|image.*generate|生图|出图|绘图|assets.*generated" .
```

如果项目有多层目录，先从用户指定的工作目录开始搜索，再扩大到仓库根目录。

## 2. 什么可以算 image2 入口

只有满足以下条件之一，才可以把它视为项目指定 image2：

- 当前 Codex 工具面暴露内置 `image_gen`，并且任务适合系统生图
- `IMAGE2_COMMAND` 指向一个可执行的项目生图命令
- `image2` 命令存在于 `PATH`
- 用户明确说“用这个命令/脚本/API 调 image2”
- 项目文档明确把某个命令、脚本、MCP 工具或服务命名为 image2
- 当前 Codex 环境的 AGENTS.md 明确规定了 image2 调用方式
- 既有代码中存在稳定的 image2 封装，并且命名、参数、输出路径都能确认
- 本仓库的 `scripts/image2_asset.py` 成功执行；它会优先走项目 image2，再按需走本地 imagegen CLI fallback

确认后，在执行前记录：

- 调用命令或工具名
- 输入图片或提示词来源
- 输出目录
- 期望尺寸和文件格式
- 是否支持透明背景、参考图、局部编辑或批量生成

## 3. 什么不能冒充 image2 或 fallback 通道

以下都不能当作 image2 或本仓库 fallback 通道，除非用户明确允许作为替代方案：

- 未经 `scripts/image2_asset.py` 统一入口调用的 gpt-image 系列 CLI/API
- 未经本仓库 fallback 规则确认的其它中转图片 API
- OpenAI SDK 自写生图脚本
- 只检查 `OPENAI_API_KEY` 后自行调用图片模型
- 用 CSS、SVG、渐变、噪点或截图近似复杂视觉
- 从网络下载图片后声称已经生图

如果使用了这些替代方案，最终必须明确写成“替代方案”，不能写成“已调用 image2”。如果使用项目命令，最终写成 `native-image2 source=project-image2`；如果使用本地 imagegen CLI，最终写成 `native-image2 source=openai-imagegen-cli`；如果使用当前会话内置生图工具，最终写成 `native-image2 source=system-imagegen`。

## 4. 找不到入口时怎么办

如果无法确认其它项目指定 image2 入口：

1. 运行 `image2-ui doctor` 或 `python3 scripts/image2_asset.py doctor`。
2. 如果 `IMAGE2_COMMAND` 或 `image2` on PATH 可用，使用 `native-image2 source=project-image2`。
3. 如果项目 image2 不可用，但本地 imagegen CLI 和凭据可用，使用 `native-image2 source=openai-imagegen-cli`。
4. 如果当前会话暴露内置 `image_gen` 工具，且任务不要求可复跑 shell wrapper，也可以使用 `native-image2 source=system-imagegen`。
5. 如果所有 image2 通道都不可用，继续完成 UI 拆解、资产清单、提示词和代码骨架。
6. 明确标注“尚未完成真实位图资产生成”。
7. 不要生成或接入其它模型图片来冒充 image2。
8. 最终列出待执行的 image2 资产和提示词，方便用户补充入口后继续。

可使用这段说明：

```text
当前环境无法完成本地 imagegen 生图，且本地 API fallback 路径也不可用。我已经完成 UI 拆解、资产清单和提示词准备，但尚未完成真实位图资产生成。为了避免误报，我没有使用未登记的在线生图服务、未登记的图片 API 调用或自写 OpenAI SDK 脚本替代 image2。
```

## 5. 生图后的验真记录

真实调用 image2 后，最终回复至少列出：

| 项目 | 内容 |
| --- | --- |
| image2 入口 | 实际命令、脚本或工具名 |
| 实际通道 | `native-image2 source=project-image2`、`native-image2 source=openai-imagegen-cli`、`native-image2 source=system-imagegen`，或明确标注的其它已授权替代通道 |
| 生成资产 | 文件路径和用途 |
| 来源记录 | wrapper 生成的 provenance JSON 路径，或系统 imagegen 的会话记录 |
| 接入位置 | 哪个页面、组件或 CSS 槽位 |
| 截图验证 | 截图路径、视口尺寸、检查结果 |
| 剩余代码近似 | 哪些区域仍由 CSS/SVG/代码实现 |

如果图片只生成但没有接回页面，只能说“已生成资产”，不能说“已完成 image2 UI 复刻”。
