<h1 align="center">Image2 UI</h1>
<p align="center"><strong>The open-source UI generation toolkit for OpenAI Codex.</strong><br>From a screenshot or an idea to editable, interactive frontend code.<br>把截图或想法，变成可编辑、可交互的前端界面。</p>
<p align="center"><strong>By ONDesign</strong> · <a href="https://www.ondesign.tech/learn.html?lang=zh">产品官网 / Website</a> · <a href="https://www.ondesign.tech/library.html?lang=zh">Live examples</a> · <a href="#quick-start">Quick start</a> · <a href="./PRODUCTION.md">Runtime guide</a></p>
<p align="center"><a href="./LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-185942"></a> <img alt="For OpenAI Codex" src="https://img.shields.io/badge/OpenAI_Codex-UI_generation-185942"> <img alt="Node.js 20+" src="https://img.shields.io/badge/Node.js-20%2B-339933"> <img alt="Python 3.10+" src="https://img.shields.io/badge/Python-3.10%2B-3776AB"></p>

Image2 UI helps designers and developers turn visual references into working frontend prototypes with OpenAI Codex. It combines a command-line interface, a resumable execution runtime, image-asset tooling and visual quality checks in one open-source project.

[ONDesign](https://www.ondesign.tech/learn.html?lang=zh) is the product home, with design references, Design DNA and interactive examples. This repository contains the local generation and verification toolkit. Actual generation runs in a configured Codex environment.

## See what you can build

Four examples from the ONDesign case gallery: generated artwork combined with code-rendered controls, navigation and state changes.

<div align="center">
  <table>
    <tr>
      <td align="center" width="25%">
        <strong>FuFu Bakery</strong><br>
        <sub>Hand-drawn character art, welcome flow, and bakery menu screens</sub><br>
        <img src="./assets/readme/video-previews/fufu-bakery-demo.gif" width="100%" alt="Interactive AI-generated hand-drawn bakery mobile app">
      </td>
      <td align="center" width="25%">
        <strong>Plate Play</strong><br>
        <sub>High-color illustrated recipes, craving filters, and saved states</sub><br>
        <img src="./assets/readme/video-previews/plate-play-demo.gif" width="100%" alt="Interactive illustrated recipe app with high-color blocks and food imagery">
      </td>
      <td align="center" width="25%">
        <strong>Today</strong><br>
        <sub>Newspaper-inspired reading, headline carousel, and article feed</sub><br>
        <img src="./assets/readme/video-previews/today-news-demo.gif" width="100%" alt="Interactive editorial news reader with generated photography">
      </td>
      <td align="center" width="25%">
        <strong>FitHub</strong><br>
        <sub>Minimal fitness planning with workout photography and weekly goals</sub><br>
        <img src="./assets/readme/video-previews/fithub-demo.gif" width="100%" alt="Interactive fitness planner app with workout photography and stat cards">
      </td>
    </tr>
  </table>
</div>

<p align="center">
  <strong><a href="https://www.ondesign.tech/library.html?lang=zh">Explore the complete UI Case Gallery →</a></strong>
</p>

<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="Image2 UI workflow: screenshot reference to editable code, reusable assets, and an interactive frontend">
</p>

## Three ways to create

| Workflow | Start with | What happens |
| --- | --- | --- |
| **Recreate** | A screenshot or reference image | Rebuild its layout, typography and visual details; verify against the original reference. |
| **Redesign** | A reference and a new product direction | Establish a new visual direction before implementing and checking the interface. |
| **Create** | A written product brief | Develop a visual direction, then build an editable frontend. |

The output keeps text, buttons, forms and navigation in code. Photos, product images and illustrations remain separate assets.

## Built around OpenAI Codex

- **Codex executes implementation work.** The runtime defaults to the `codex` CLI and invokes its execution interface through the [agent tool adapter](./runtime/tools/legacy-cli.mjs).
- **Runs can be inspected and resumed.** The [runtime](./runtime/) stores state and an event history so interrupted work can be reconciled and continued.
- **Verification is part of the workflow.** Audit, comparison and bounded fix loops check generated output against the active reference.
- **Multi-agent execution is available.** The runtime's [scheduler](./runtime/scheduler/) coordinates specialist implementation, review and QA work within the same run lifecycle.
- **Image generation is configurable.** The [asset wrapper](./scripts/image2_asset.py) supports the project's image-generation channels and writes asset provenance records. See the [channel configuration](./PRODUCTION.md#image2-channel-policy).

## Quick start

You need Node.js 20+, Python 3.10+, an authenticated Codex CLI for actual agent execution, and a configured image-generation channel when your workflow needs generated images. Browser render checks use Playwright. See the [runtime guide](./PRODUCTION.md) for environment setup.

Clone the source and inspect the available commands:

```bash
git clone https://github.com/zhu-guli326/image2_UI.git image2-ui
cd image2-ui
node scripts/image2-ui --help
node scripts/image2-ui doctor
```

Check a workflow plan without generating a UI:

```bash
mkdir my-ui
node scripts/image2-ui run ./my-ui --mode create --task "A mobile coffee ordering interface with a menu and cart" --dry-run --json
```

Once the required channels are configured, start a real run:

```bash
node scripts/image2-ui run ./my-ui --mode recreate --reference ./reference.png --task "Recreate this screen with working navigation"
node scripts/image2-ui inspect ./my-ui --latest --json
node scripts/image2-ui resume ./my-ui --latest
```

Replace `./reference.png` with your own image. An inspection reports the run's actual status; a paused or blocked run is not a finished interface. For using the workflow inside an existing Codex session, see the [workflow specification](./SKILL.md).

## What is in this repository?

| Component | Responsibility |
| --- | --- |
| [CLI](./scripts/image2-ui) | Start, resume, inspect, validate and compare UI work. |
| [Runtime](./runtime/) | Mode-aware lifecycle, saved state, recovery and verification loops. |
| [Scheduler](./runtime/scheduler/) | Dependency-aware specialist execution inside a runtime run. |
| [Schemas](./schemas/) | Contracts for workflow state and output requirements. |
| [Asset tools](./scripts/image2_asset.py) | Repeatable image generation and provenance. |
| [Tests](./tests/) | Regression coverage for the CLI, runtime, policies and validation. |

The website and case gallery are maintained in [ui_case](https://github.com/zhu-guli326/ui_case). This repository includes a Codex-compatible instruction entry alongside its executable runtime and tools.

## Open-source development

Image2 UI is MIT-licensed. Contributions can improve reference fidelity, accessibility checks, asset handling, workflow recovery and documentation. See [Contributing](./CONTRIBUTING.md) for the local gates and [Changelog](./CHANGELOG.md) for development history.

```bash
npm test
npm run doctor
npm run pack:check
```

Diagnostics depend on your local tools and image channels; resolve missing capabilities before attempting a real generation run.

## Resources

- [ONDesign product website](https://www.ondesign.tech/learn.html?lang=zh)
- [Interactive case gallery](https://www.ondesign.tech/library.html?lang=zh)
- [Design DNA](https://www.ondesign.tech/launcher.html?lang=zh) · [UI vocabulary](https://www.ondesign.tech/vocabulary.html?lang=zh)
- [Runtime guide](./PRODUCTION.md) · [Workflow specification](./SKILL.md) · [Video examples](./references/video-case-previews.md)

## Contact and license

Maintained by [zhu-guli326](https://github.com/zhu-guli326). Email: [juguli326@gmail.com](mailto:juguli326@gmail.com).

[MIT License](./LICENSE). Image2 UI is an independent open-source project by ONDesign, not an official OpenAI product.
