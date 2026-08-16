# Harness Hard Guards: UI Glyphs and Visual Assets

These rules are executable Harness constraints, not aesthetic suggestions.

## 1. Functional UI icons must be real icons

Status bar, navigation, tabs, toolbars, buttons, quick actions, toggles and other semantic controls must use one coherent code icon system:

- the project's existing primary icon library;
- one approved icon library;
- or one shared SVG sprite / IconRegistry for plain HTML demos.

Do **not** use Unicode, emoji, circles, diamonds, chess pieces, bullets or other placeholder characters such as `●`, `◆`, `⌂`, `♟`, `☰`, `♡`, `▣`, `⌁` as functional UI glyphs.

`ui.validate` reports this as `placeholder-ui-glyph` and treats it as a failure.

Textual punctuation that is genuinely copy is different from a functional icon; the rule targets icon/status/control contexts.

## 2. Semantic visual assets must come from image2

New backgrounds, people, products, editorial photos, illustrations, scenes, object cutouts and other semantic raster content must be created through the configured `image2` / `image.generate` channel.

Local Python/Pillow, Canvas, SVG drawing code or CSS must not be used to invent a replacement semantic image.

Local code is allowed for **post-processing only**, such as:

- crop;
- resize;
- compression;
- format conversion;
- remove background;
- safe masking that does not invent new semantic content.

The image2 wrapper already writes `<asset>.<ext>.provenance.json`. Assets intentionally stored under `generated/`, `generated-assets/`, `ai-assets/` or `image2-assets/` must keep that sidecar.

`ui.validate` fails generated visual assets with missing, invalid or unapproved provenance.

## 3. Recreate source-of-truth rule

For Recreate, the original reference remains the visual source of truth.

- Reuse user/project assets when they are available.
- Do not silently invent a new hero/background to make implementation easier.
- If a missing complex visual must be rebuilt, use image2 and preserve provenance.
- Do not flatten the whole reference into a background image.
- Code-render text, controls, navigation, status chrome and functional icons.

## 4. Why the guard exists

A UI may look approximately correct while still being structurally wrong. Placeholder icons and ad-hoc generated backgrounds hide those mistakes.

The Harness therefore treats icon provenance and semantic-image provenance as implementation correctness, not polish.
