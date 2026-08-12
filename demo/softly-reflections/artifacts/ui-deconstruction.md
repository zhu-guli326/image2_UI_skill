# SOFTLY UI Deconstruction

## Workflow Record

- Original reference: `../assets/reference-overview.png` (`2048 x 1536`).
- Generated complete effect image: `../assets/softly-effect-board.png` (`1448 x 1086`).
- Effect-image review: passed. The effect image has three complete devices, a clear dominant center composition, coherent paper/character styling, readable hierarchy, and sufficient state detail for implementation.
- Decomposition source: `softly-effect-board.png` only.
- The original reference is used only to check device staging, softness, and information density. It is not the implementation decomposition source.
- Generation channel: `native-image2`, `source=system-imagegen`.

## Visual System

- Product: SOFTLY, a fictional emotional reflection App.
- Screen canvas: fixed `390 x 844` with iOS safe areas.
- Board: charcoal-indigo with a subtle code-rendered dashed grid.
- Surfaces: pearl white, warm ivory, pale lavender, butter yellow, muted mint, graphite.
- Typography: editorial serif headings with stable system sans-serif controls and metadata.
- Shape language: low-radius paper cards, circular icon controls, one compact bottom navigation, and a soft organic character silhouette.

## Effect-Image-Based Breakdown

### Screen A: Welcome

1. Status bar and Dynamic Island.
2. Luminous pearl background.
3. Three floating question cards with decorative orbit line and spheres.
4. Small mascot medallion using the generated transparent character.
5. Serif headline and concise supporting copy.
6. Full-width primary action and small secondary action.

Code UI: phone chrome, cards, all questions, orbit decoration, heading, body copy, and actions.

Image asset: `softly-mascot.png`, reused as the small medallion.

### Screen B: Reflections

1. Search and notification actions.
2. Centered heading and subtitle.
3. One slightly tilted paper card with Mara avatar, topic prompt, metadata, and topic chips.
4. Previous/next carousel controls.
5. Four-item bottom navigation.

Code UI: all text, paper card, arrows, statistics, topic chips, navigation, selected state, and card transition.

Image asset: `mara-avatar.png`.

### Screen C: Mood Check-In

1. Back action and completion ring.
2. Large generated character occupying the upper half.
3. Serif mood question and instruction.
4. Code-rendered vertical waveform selector.
5. Four emotion choices with one selected state.
6. Completion state after confirmation.

Code UI: navigation, progress ring, heading, waveform, labels, selection, confirmation, and feedback.

Image asset: `softly-mascot.png`.

## Interaction Map

- `Begin` opens Reflections.
- `Explore first` opens Reflections without onboarding completion.
- Reflection arrows rotate through three real prompts.
- Reflection card opens Mood Check-In.
- Heart toggles saved state.
- Search opens a local search state; notification toggles the unread dot.
- Bottom navigation switches Today, Reflect, Journey, and You states.
- Mood options update the waveform, character position, selected state, and accessible pressed state.
- Completion ring saves the selected mood and opens a local completion screen.
- Back returns to Reflections.
- `?embed=1` renders a stable `390 x 844` Reflections view for the case library.

## Code Versus Image Assets

### Code-rendered

- Every readable word, label, question, tag, count, and button.
- Phone frames, status bars, Dynamic Islands, home indicators, board grid, paper cards, orbit lines, waveform, chips, navigation, and completion ring.
- All UI glyphs from one local SVG sprite: search, bell, back, arrow, heart, comment, today, reflect, journey, profile, check, and status icons.

### Image-generated

- Complete effect image: `softly-effect-board.png`.
- Transparent original lavender character: `softly-mascot.png`.
- Original fictional Mara avatar: `mara-avatar.png`.

Generated implementation assets contain no UI text, logo, watermark, status bar, button, or navigation glyph.

## Icon Coverage

| Glyph | SVG id | Size | Container | State | Accessible name |
| --- | --- | --- | --- | --- | --- |
| search | `i-search` | 21px | 48x48 | default/open | Search reflections |
| notification | `i-bell` | 20px | 48x48 | unread/read | Notifications |
| back | `i-back` | 21px | 48x48 | default/pressed | Back |
| next/previous | `i-arrow` | 21px | 50x50 | enabled | Previous/next reflection |
| favorite | `i-heart` | 20px | 44x44 | off/on | Save reflection |
| bottom tabs | sprite ids | 21px | 64x48+ | selected/default | Tab label |
| completion | `i-check` | 20px | 48x48 | ready/saved | Save mood |

## Main Risks

- Keep generated character edges clean on both white and lavender surfaces.
- Avoid making every surface a pill; only emotion choices and icon controls are circular/compact.
- Preserve 44px touch targets even when the icon itself is small.
- Do not let the welcome card stack or mood waveform overlap content at `390 x 844`.
- Use system serif and sans-serif fallback stacks; no unlicensed brand font is required.
