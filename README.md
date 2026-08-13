# image2_UI_skill

<p align="center">
  <img src="./assets/readme/hero.png" width="100%" alt="image2_UI_skill turns UI references into code-rendered interfaces, generated image assets, and clickable demos">
</p>

&#25226; UI &#25130;&#22270;&#12289;&#35774;&#35745;&#31295;&#12289;App &#21442;&#32771;&#22270;&#20132;&#32473; Codex&#65292;&#35753;&#23427;&#20808;&#25286;&#28165;&#26970;&#21738;&#20123;&#24212;&#35813;&#29992;&#20195;&#30721;&#23454;&#29616;&#65292;&#21738;&#20123;&#24517;&#39035;&#30495;&#23454;&#35843;&#29992; `image2` &#29983;&#25104;&#20301;&#22270;&#36164;&#20135;&#65292;&#20877;&#25226;&#36164;&#20135;&#25509;&#22238;&#19968;&#20010;&#21487;&#25171;&#24320;&#12289;&#21487;&#28857;&#20987;&#12289;&#21487;&#32487;&#32493;&#20462;&#25913;&#30340; demo&#12290;

Give Codex a UI screenshot, design mockup, or app reference. This skill helps Codex split the work into code-rendered UI and real `image2` bitmap assets, then wire everything back into an openable, clickable, editable demo.

## &#36866;&#21512;&#20160;&#20040;&#22330;&#26223; / When To Use

- &#20320;&#26377; App&#12289;&#32593;&#39029;&#12289;&#28023;&#25253;&#24335;&#30028;&#38754;&#25110;&#20135;&#21697; UI &#21442;&#32771;&#22270;&#65292;&#24819;&#24555;&#36895;&#21464;&#25104;&#21487;&#20132;&#20114;&#21407;&#22411;&#12290;
- You have an app, website, poster-like interface, or product UI reference and want a clickable prototype quickly.
- &#30011;&#38754;&#37324;&#26377;&#22797;&#26434;&#29031;&#29255;&#12289;&#21830;&#21697;&#22270;&#12289;&#25554;&#30011;&#12289;&#32441;&#29702;&#12289;&#32972;&#26223;&#25110;&#25248;&#22270;&#65292;&#19981;&#33021;&#21482;&#38752; CSS/SVG &#21344;&#20301;&#12290;
- The reference includes photos, product imagery, illustration, textures, backgrounds, or cutouts that need real bitmap assets.
- &#20320;&#24076;&#26395;&#26368;&#32456;&#32467;&#26524;&#33021;&#26412;&#22320;&#39044;&#35272;&#12289;&#33021;&#28857;&#20987;&#12289;&#33021;&#32487;&#32493;&#25913;&#65292;&#32780;&#19981;&#26159;&#20572;&#22312;&#8220;&#29983;&#25104;&#20102;&#19968;&#24352;&#22270;&#8221;&#12290;
- You want a local preview that can be clicked and iterated on, not just a single generated image.

## &#23433;&#35013; / Install

Windows PowerShell:

```powershell
git clone https://github.com/zhu-guli326/image2_UI_skill.git "$env:USERPROFILE\.codex\skills\image2_UI_skill"
```

macOS / Linux:

```bash
git clone https://github.com/zhu-guli326/image2_UI_skill.git "${CODEX_HOME:-$HOME/.codex}/skills/image2_UI_skill"
```

&#23433;&#35013;&#21518;&#37325;&#21551; Codex&#65292;&#25110;&#26032;&#24320;&#19968;&#20010;&#20250;&#35805;&#12290;

Restart Codex after installation, or open a new session.

## &#29992;&#27861; / Usage

&#25226;&#21442;&#32771;&#22270;&#21457;&#32473; Codex&#65292;&#28982;&#21518;&#36825;&#26679;&#35828;&#65306;

Send Codex the reference image and say:

```text
使用 image-to-ui-skill，参考我上传的图，做一个可点击 demo。
需要真实调用 image2 生成必要图片资产，并接回页面。
```

English prompt:

```text
Use image-to-ui-skill with my uploaded reference image to build a clickable demo.
Call image2 for the required bitmap assets and wire them back into the page.
```

&#22914;&#26524;&#20320;&#24050;&#32463;&#30693;&#36947;&#30446;&#26631;&#24179;&#21488;&#65292;&#20063;&#21487;&#20197;&#34917;&#19968;&#21477;&#65306;

If you already know the target platform, add:

```text
做成手机 App 外框，包含 3 个可点击页面，并验证本地预览。
Build it as a mobile app frame with 3 clickable screens and verify the local preview.
```

## Production Quality Gates

This repository now includes a repeatable test and audit baseline:

```bash
npm test
npm run validate:demo
npm run validate:all:static
npm run doctor
```

Use `scripts/image2_asset.py` for repeatable image generation. It first tries a
project `image2` command from `IMAGE2_COMMAND` or `PATH`, then falls back to the
local imagegen CLI when credentials are available. Successful non-dry runs write
a provenance JSON file next to the generated asset.

`validate:all:static` checks every bundled demo under `demo/`; use `validate:all`
when Playwright browser checks are available. Warnings are preserved in the
report and documented per demo in `quality-baseline.json`; an unlisted warning
fails the repository-wide audit.

See [PRODUCTION.md](./PRODUCTION.md) for installation, validation, channel
policy, and release checklist details.

For actual multi-agent execution, run `image2-ui orchestrate`. It uses the
bundled role graph, runs independent specialists concurrently, and stores
structured handoffs and JSONL logs under the target project's `.image2-ui/`
directory. Use `--dry-run --json` to inspect the graph first.

The bundled demos share a CSS-first Motion System for durations, easing,
entrances, Toasts, hover/press feedback, and reduced-motion behavior. See
[`references/motion-system.md`](./references/motion-system.md).

## UI Knowledge Library

Inspired by the browsable recipe-library format in
[video-shotcraft](https://vincentwei1021.github.io/video-shotcraft/library.html),
this project now treats UI patterns as named things you can recognize, request,
and rebuild. The goal is simple: when Codex looks at a screen, it should not say
"some cards here." It should say "top app bar, filter rail, content cards,
detail sheet, empty state, and bottom tab bar."

Start here:

- [`launcher.html`](./launcher.html) is the visual skill launcher: choose the
  target format, style case, workflow depth, interaction scope, image2 channel,
  and verification options, then copy the generated `$image-to-ui-skill`
  instruction into Codex.
- [`library.html`](./library.html) is a visual, browser-openable version of the
  UI knowledge library with filters, cards, screenshots, and an asset-split
  board.
- [`vocabulary.html`](./vocabulary.html) is the illustrated UI vocabulary with
  search, role filters, anatomy, variants, implementation boundaries, and
  copyable Agent prompts.
- [`skills.html`](./skills.html) is a separate design-skill radar page for
  browsing design methods, visual directions, and copyable first-turn prompts.
- `analytics.config.js` configures the anonymous library event endpoint. Set
  `endpoint` to your deployed collector URL; the included default is
  `/api/analytics/events`. The page records views, category filters, searches,
  first video plays, style copies, and GitHub clicks without user identity data.
- [`references/ui-section-vocabulary.md`](./references/ui-section-vocabulary.md)
  names the common sections, controls, states, and layout patterns used in app
  and web UI.
- The case studies below now double as learning cards: each demo shows what
  should be code-rendered, what should become an `image2` asset, and which UI
  pattern names are useful when you ask for changes.

### What Each Block Is Called

| Screen area | Common names | Code or image2? |
| --- | --- | --- |
| Top strip with title and actions | Top app bar, navigation bar, header, toolbar | Code UI |
| Left or bottom destination list | Sidebar, rail navigation, bottom tab bar | Code UI |
| Search and category controls | Search field, segmented control, filter chips, tabs | Code UI |
| Repeated content previews | Card grid, feed row, media tile, product card | Code UI plus image2 thumbnails |
| Large visual surface | Hero media, cover image, product cutout, background plate | Usually image2 |
| Extra details over the current page | Drawer, bottom sheet, popover, modal, inspector panel | Code UI |
| Before data arrives | Loading skeleton, shimmer placeholder, progress state | Code UI |
| When nothing matches | Empty state, zero state, no-results panel | Code UI |
| When something fails | Inline error, toast, retry banner, validation message | Code UI |

### More Interesting Prompts

Instead of asking:

```text
Make this screen prettier.
```

Try:

```text
Turn the home screen into a library-style interface: top app bar, search field,
filter chips, masonry card grid, preview drawer, loading skeleton, empty state,
and one selected-card detail view.
```

Or:

```text
Name every visible UI block first, then rebuild it. Keep text, buttons, tabs,
icons, filters, and states in code. Use image2 only for covers, product photos,
textures, and object cutouts.
```

The npm package keeps only the core skill, scripts, references, and README hero.
Clone the GitHub repository when you need the full demo media archive and
case-study videos.

## &#23427;&#20250;&#24590;&#20040;&#20570; / Workflow

| &#38454;&#27573; / Stage | &#20135;&#20986; / Output | &#21028;&#26029;&#26631;&#20934; / Decision rule |
| --- | --- | --- |
| &#25286;&#22270; / Split | `code-ui` &#21644; `image2-assets` &#20004;&#24352;&#28165;&#21333; / two inventories | &#25991;&#26696;&#12289;&#25353;&#38062;&#12289;&#29366;&#24577;&#26639;&#12289;&#23548;&#33322;&#12289;&#34920;&#21333;&#12289;&#26222;&#36890; icon &#36827;&#20837;&#20195;&#30721;&#65307;&#29031;&#29255;&#12289;&#20135;&#21697;&#12289;&#25554;&#30011;&#12289;&#32441;&#29702;&#12289;&#32972;&#26223;&#36827;&#20837; image2 / Text, controls, status bars, navigation, forms, and common icons are code; photos, products, illustrations, textures, and backgrounds are image2 assets. |
| &#29983;&#22270; / Generate | &#26412;&#22320;&#22270;&#29255;&#36164;&#20135;&#19982;&#25552;&#31034;&#35789;&#35760;&#24405; / local assets and prompt records | &#36164;&#20135;&#26377;&#29992;&#36884;&#12289;&#23610;&#23544;&#12289;&#35009;&#20999;&#26041;&#24335;&#21644;&#36127;&#38754;&#32422;&#26463;&#65292;&#19981;&#25226;&#21487;&#35835; UI &#25991;&#26696;&#28911;&#28953;&#36827;&#22270;&#29255; / Assets include purpose, size, crop rules, and negative constraints; readable UI text is not baked into images. |
| &#23454;&#29616; / Build | HTML/CSS/JS &#25110;&#39033;&#30446;&#29616;&#26377;&#25216;&#26415;&#26632; / existing project stack | &#39029;&#38754;&#33021;&#25171;&#24320;&#65292;&#25511;&#20214;&#33021;&#28857;&#20987;&#65292;&#31227;&#21160;&#31471;&#19981;&#27178;&#21521;&#28378;&#21160; / The page opens, controls are clickable, and mobile layouts avoid horizontal scroll. |
| &#26657;&#39564; / Verify | &#25130;&#22270;&#12289;&#20132;&#20114;&#26816;&#26597;&#12289;&#22270;&#29255;&#21152;&#36733;&#26816;&#26597; / screenshots and audits | &#26412;&#22320;&#36164;&#28304;&#21487;&#29992;&#65292;&#20851;&#38190;&#27969;&#31243;&#21487;&#36208;&#36890;&#65292;&#36755;&#20986;&#33021;&#32487;&#32493;&#20462;&#25913; / Local assets load, key flows work, and the output remains editable. |

## &#26696;&#20363; / Examples

&#28857;&#20987;&#21442;&#32771;&#22270;&#21487;&#20197;&#26597;&#30475;&#21407;&#22270;&#65307;&#28857;&#20987;&#39044;&#35272;&#22270;&#21487;&#20197;&#26597;&#30475;&#35270;&#39057;&#25110;&#26356;&#22823;&#30340;&#36755;&#20986;&#12290;

Click a reference image to inspect it; click a preview to open the demo video or larger output.

### Museum App

&#21338;&#29289;&#39302;&#23548;&#35272; demo&#65292;&#25226;&#21442;&#32771;&#22270;&#37324;&#30340;&#23637;&#35272;&#12289;&#34255;&#21697;&#21644;&#23618;&#32423;&#20851;&#31995;&#25286;&#25104;&#21487;&#28857;&#20987;&#30340; Home&#12289;Exhibitions&#12289;Detail &#27969;&#31243;&#12290;

An iOS-style museum guide demo that turns exhibitions, artworks, and hierarchy into clickable Home, Exhibitions, and Detail flows.

<table align="center">
  <tr>
    <th align="center">&#21442;&#32771;&#22270; / Reference</th>
    <th align="center">&#21487;&#28857;&#20987; demo &#39044;&#35272; / Clickable demo preview</th>
  </tr>
  <tr>
    <td align="center">
      <a href="./assets/cases/museum-app/reference-overview.png"><img src="./assets/cases/museum-app/reference-overview.png" alt="Museum app reference overview" width="430"></a>
    </td>
    <td align="center">
      <a href="./assets/cases/museum-app/museum-app-demo.mp4"><img src="./assets/cases/museum-app/museum-app-preview.gif" alt="Museum app clickable demo preview" width="220"></a>
      <br>
      <a href="./assets/cases/museum-app/museum-app-demo.mp4">&#26597;&#30475;&#35270;&#39057; / Watch video</a>
    </td>
  </tr>
</table>

### Fashion Shopping App

&#26102;&#23578;&#36141;&#29289; App &#21407;&#22411;&#65292;&#25226;&#21830;&#21697;&#35270;&#35273;&#30041;&#32473;&#22270;&#29255;&#36164;&#20135;&#65292;&#25226; tab&#12289;&#31579;&#36873;&#12289;&#25910;&#34255;&#12289;&#21345;&#29255;&#29366;&#24577;&#20132;&#32473;&#20195;&#30721;&#23454;&#29616;&#12290;

A fashion shopping app prototype where product visuals are bitmap assets and tabs, filters, favorites, and card states stay code-rendered.

<table align="center">
  <tr>
    <th align="center">&#21442;&#32771;&#22270; / Reference</th>
    <th align="center">&#21487;&#28857;&#20987; demo &#39044;&#35272; / Clickable demo preview</th>
  </tr>
  <tr>
    <td align="center">
      <a href="./assets/cases/fashion-shopping-app/reference-overview.png"><img src="./assets/cases/fashion-shopping-app/reference-overview.png" alt="Fashion shopping app reference overview" width="430"></a>
    </td>
    <td align="center">
      <a href="./assets/cases/fashion-shopping-app/fashion-app-demo.mp4"><img src="./assets/cases/fashion-shopping-app/fashion-app-preview.gif" alt="Fashion shopping app clickable demo preview" width="220"></a>
      <br>
      <a href="./assets/cases/fashion-shopping-app/fashion-app-demo.mp4">&#26597;&#30475;&#35270;&#39057; / Watch video</a>
    </td>
  </tr>
</table>

### News App

&#26032;&#38395;&#38405;&#35835;&#19982;&#21457;&#29616;&#39029; demo&#65292;&#29992;&#20195;&#30721;&#22788;&#29702;&#21015;&#34920;&#12289;&#26631;&#31614;&#12289;&#24213;&#37096;&#23548;&#33322;&#21644;&#29366;&#24577;&#20999;&#25442;&#65292;&#29992;&#36164;&#20135;&#25215;&#36733;&#26032;&#38395;&#23553;&#38754;&#19982;&#35270;&#35273;&#27675;&#22260;&#12290;

A news reading and discovery demo where lists, chips, bottom navigation, and state changes are code-rendered while covers and atmosphere are asset-backed.

<table align="center">
  <tr>
    <th align="center">&#21442;&#32771;&#22270; / Reference</th>
    <th align="center">&#21487;&#28857;&#20987; demo &#39044;&#35272; / Clickable demo preview</th>
  </tr>
  <tr>
    <td align="center">
      <a href="./assets/cases/news-app/reference-overview.png"><img src="./assets/cases/news-app/reference-overview.png" alt="News app reference overview" width="430"></a>
    </td>
    <td align="center">
      <a href="./assets/cases/news-app/news-app-demo.mp4"><img src="./assets/cases/news-app/news-app-preview.gif" alt="News app clickable demo preview" width="220"></a>
      <br>
      <a href="./assets/cases/news-app/news-app-demo.mp4">&#26597;&#30475;&#35270;&#39057; / Watch video</a>
    </td>
  </tr>
</table>

### hicolor

&#20869;&#23481;&#22686;&#38271;&#19982;&#22270;&#25991;&#26696;&#20363;&#23637;&#31034;&#65292;&#36866;&#21512;&#26816;&#39564;&#8220;&#21442;&#32771;&#32032;&#26448; + &#32467;&#26500;&#21270;&#39029;&#38754; + &#30495;&#23454;&#22270;&#25991;&#36164;&#20135;&#8221;&#30340;&#32452;&#21512;&#36755;&#20986;&#12290;

A content-growth case for checking mixed outputs: source material, structured pages, and real visual assets.

<table align="center">
  <tr>
    <th align="center">&#32032;&#26448; / Material</th>
    <th align="center">&#36755;&#20986; / Output</th>
  </tr>
  <tr>
    <td align="center">
      <a href="./assets/cases/hicolor/traffic-3-days.png"><img src="./assets/cases/hicolor/traffic-3-days.png" alt="hicolor traffic reference" width="380"></a>
    </td>
    <td align="center">
      <a href="./assets/cases/hicolor/threads-recommendation.png"><img src="./assets/cases/hicolor/threads-recommendation.png" alt="hicolor Threads recommendation output" width="245"></a>
      <br>
      <a href="./assets/cases/hicolor/xiaohongshu-pinned.jpg">&#26597;&#30475;&#34917;&#20805;&#22270; / View extra image</a>
    </td>
  </tr>
</table>

## &#20851;&#38190;&#32422;&#26463; / Key Rules

- &#38656;&#35201;&#29983;&#22270;&#26102;&#24517;&#39035;&#35843;&#29992;&#39033;&#30446;&#25351;&#23450;&#30340; `image2`&#12290;&#22914;&#26524;&#24403;&#21069;&#29615;&#22659;&#27809;&#26377;&#21487;&#29992;&#20837;&#21475;&#65292;&#24212;&#35813;&#35828;&#26126;&#32570;&#21475;&#65292;&#19981;&#33021;&#25226; CSS/SVG/&#21344;&#20301;&#22270;&#35828;&#25104;&#24050;&#29983;&#22270;&#12290;
- When image generation is required, use the project-designated `image2`. If no channel is available, state the gap instead of presenting CSS/SVG/placeholders as generated assets.
- &#29983;&#25104;&#22270;&#29255;&#37324;&#19981;&#35201;&#21253;&#21547;&#21487;&#35835; UI &#25991;&#26696;&#12289;logo&#12289;&#27700;&#21360;&#12289;&#29366;&#24577;&#26639;&#12289;&#25353;&#38062;&#25110;&#23567;&#22270;&#26631;&#12290;
- Generated images must not contain readable UI text, logos, watermarks, status bars, buttons, or small UI icons.
- &#36820;&#22238;&#12289;&#20851;&#38381;&#12289;&#33756;&#21333;&#12289;&#25628;&#32034;&#12289;&#35774;&#32622;&#12289;&#30005;&#37327;&#12289;Wi-Fi&#12289;&#25773;&#25918;&#12289;&#24213;&#37096; tab&#12289;&#24320;&#20851;&#12289;&#21152;&#20943;&#21495;&#37117;&#24212;&#35813;&#30001;&#20195;&#30721;&#28210;&#26579;&#12290;
- Back, close, menu, search, settings, battery, Wi-Fi, playback, bottom tabs, toggles, plus, and minus controls should be code-rendered.
- &#26368;&#32456; demo &#24517;&#39035;&#21487;&#25171;&#24320;&#12289;&#21487;&#28857;&#20987;&#12289;&#21487;&#32487;&#32493;&#20462;&#25913;&#12290;
- The final demo must be openable, clickable, and editable.

## &#20179;&#24211;&#32467;&#26500; / Repository Structure

```text
.
|-- SKILL.md                  # Codex skill entry and execution rules
|-- references/               # image2 splitting, cases, and engineering loop references
|-- scripts/                  # image2-ui helper scripts
|-- assets/                   # README and case media
`-- demo/                     # Clickable demos
```

## Multi-Agent Production Flow

When the host supports subagents, the skill can orchestrate these specialist roles:

```text
Visual + Asset
      |
Architecture + Backend Contract + State Machine
      |
UI Implementation
      |
Accessibility + QA
      |
Release
```

If subagent tools are unavailable, the same roles run sequentially in one agent. See `references/multi-agent-orchestration.md` for inputs, outputs, handoff artifacts, and reusable prompts.

## &#32852;&#31995;&#20316;&#32773; / Contact

- Email: [juguli326@gmail.com](mailto:juguli326@gmail.com)
- WeChat: `13434361868`

&#22914;&#26524;&#20320;&#23545;&#36825;&#20010;&#39033;&#30446;&#26377;&#24314;&#35758;&#12289;&#38382;&#39064;&#25110;&#21512;&#20316;&#24819;&#27861;&#65292;&#27426;&#36814;&#36890;&#36807;&#37038;&#20214;&#25110;&#24494;&#20449;&#32852;&#31995;&#12290;

For suggestions, issues, or collaboration ideas, contact the author by email or WeChat.
