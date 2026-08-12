# RELAY Music UI Deconstruction

## Workflow Record

- Original reference: `../assets/reference-overview.png`.
- Generated complete effect image: `../assets/relay-effect-board.png` (`1448 x 1086`).
- Effect-image review: passed. The board contains three complete, coherent screens with a clear center-player hierarchy, reusable charcoal/cobalt/coral visual language, and enough readable structure for implementation.
- Decomposition source: `relay-effect-board.png` only. The original reference is retained as a fidelity check for device staging, density, and editorial music tone; it is not the implementation decomposition source.
- Generation channel: `native-image2`, `source=system-imagegen`.

## Visual System

- Product: RELAY, a fictional editorial music streaming and discovery App.
- Screen canvas: fixed `390 x 844`, including iOS safe areas.
- Presentation: three staggered phones on a cool-gray board; the cobalt player is the visual anchor.
- Core contrast: graphite content surfaces, white type, cobalt playback context, and muted coral as a secondary accent.
- Shape language: square media, low-radius sheets, circular transport controls, compact pills, and restrained translucency.

## Effect-Image-Based Screen Breakdown

### Screen A: Artist Profile

1. Status bar over an edge-to-edge Nova Ray portrait.
2. Back and overflow actions over the image.
3. Large `NOVA RAY` display name at the lower portrait edge.
4. Dark content sheet with `Popular tracks`, three rows, and `View all`.
5. Two editorial playlist tiles.
6. Persistent bottom navigation.

Image assets: `artist-nova-ray-hero.png` and four independent album covers.

Code UI: status bar, display name, metadata, sheet, headings, rows, buttons, playlist tiles, icons, and navigation.

### Screen B: Now Playing

1. Deep cobalt full-screen playback context.
2. Back, context label, and favorite actions.
3. Dominant square `Afterimage` artwork.
4. Track title and artist metadata.
5. Translucent transport dock with shuffle, previous, pause/play, next, and repeat.
6. Keyboard- and pointer-operable progress slider with elapsed and duration labels.

Image asset: `album-afterimage.png`.

Code UI: cobalt background, all labels, icons, playback state, controls, slider, timing, and favorite state.

### Screen C: Discover

1. Compact `Discover` heading and utility action.
2. Five-person fictional artist rail.
3. `Live sessions` feature using a generated performance still.
4. Ranked `Top tracks` list.
5. Persistent mini-player above bottom navigation.

Image assets: five cropped fictional portraits, `live-session-poster.png`, and album covers.

Code UI: artist names, headings, live metadata, play overlay, rankings, mini-player, navigation, and playback overlay.

## Shared States Added for a Complete Demo

- Track selection opens Now Playing and updates artwork, title, duration, accent, and favorite state.
- Play/pause, previous, next, shuffle, repeat, and progress seeking are functional local states.
- Artist avatar selection updates the active artist label and opens the artist phone on compact layouts.
- Live-session play opens a code-rendered full-screen playback layer with working close and play/pause controls.
- Mini-player expands to Now Playing.
- Bottom navigation switches Artist, Discover, Favorites, and Library views without dead controls.
- `?embed=1` renders a stable `390 x 844` player view for the case-library iframe.

## Design Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--board` | `#aeb4b8` | Showcase background |
| `--surface` | `#20252b` | Artist content sheet |
| `--surface-strong` | `#11151a` | Discover background |
| `--ink` | `#ffffff` | Primary text and active icons |
| `--muted` | `#a8adb3` | Secondary metadata |
| `--cobalt` | `#143fca` | Active player context |
| `--coral` | `#df705f` | Secondary editorial accent |
| `--line` | `rgba(255,255,255,.16)` | Dividers and progress rails |

## Stable Measurements

- Screen: `390 x 844`.
- Horizontal inset: `24px`.
- Artist hero: `390 x 370px` visible area.
- Track row: `66px`.
- Player artwork: `326 x 326px`.
- Tap target: minimum `44 x 44px`.
- Bottom navigation: `72px` plus safe-area indicator.
- Mini-player: `64px`, positioned above navigation with reserved content padding.

## Code Versus Image Assets

### Code-rendered

- Every readable artist, track, album, rank, timestamp, and navigation label.
- Status bars, Dynamic Islands, home indicators, phone frames, and presentation board.
- Back, heart, overflow, play, pause, previous, next, shuffle, repeat, search, library, and profile icons from one local SVG sprite.
- Progress rails, buttons, selected states, content sheets, playlist color fields, mini-player, overlays, and feedback messages.

### Image-generated

- One Nova Ray hero portrait.
- Five fictional artist avatars.
- Four abstract album covers.
- One fictional live-session poster.
- One complete three-screen effect image used by the case library.

Generated media contains no readable text, logos, watermarks, phones, status bars, navigation, or interactive controls.

## Accessibility and Motion

- Icon-only buttons have explicit accessible names and visible focus states.
- Favorite, shuffle, repeat, and playback buttons expose pressed state.
- Progress uses a native range input with an accessible label.
- Transitions are disabled under `prefers-reduced-motion: reduce`.
- Text truncates predictably; phone and control dimensions do not shift with state changes.
