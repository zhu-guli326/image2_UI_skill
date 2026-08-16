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

Local code is allowed for **post-processing of an image2 output or legitimate project asset only**, such as:

- resize;
- compression;
- format conversion;
- remove background;
- crop after generation to the required aspect ratio;
- safe masking that does not invent new semantic content.

Local post-processing does **not** authorize turning screenshot/reference pixels into a final implementation asset.

The image2 wrapper writes `<asset>.<ext>.provenance.json`. Image2-created semantic assets must keep that sidecar so the Harness can verify the channel, action and prompt.

`ui.validate` fails generated visual assets with missing, invalid or unapproved provenance.

## 3. Recreate source-of-truth and asset-source rule

For Recreate, the original reference remains the visual source of truth, but **not a source of shippable raster pixels**.

- Reuse legitimate user/project assets when they already exist.
- If a required photographic/product/person/animal/background/illustration/cutout visual exists only inside the screenshot, identify/select its reference region and call image2 to recreate a clean standalone asset.
- The screenshot or selected region may guide an image2 `edit`, but the frontend must use the image2 output, never the crop itself.
- `source: "reference"` is forbidden for final Recreate raster assets.
- Do not ship raw crops, cleaned crops, masked crops or background-removed screenshot crops.
- If image2 is unavailable and the visual cannot be implemented from legitimate project assets, block instead of degrading to screenshot reuse.
- Do not flatten the whole reference into a background image.
- Code-render text, controls, navigation, status chrome and functional icons.

`ui.validate` reports direct reference-pixel reuse as `recreate-reference-raster-forbidden`.

## 4. Why the guard exists

A UI may look approximately correct while still being structurally wrong. Placeholder icons, ad-hoc visuals and screenshot crops can hide those mistakes.

The Harness therefore treats icon provenance and semantic-image provenance as implementation correctness, not polish.
