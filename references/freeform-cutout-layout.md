# Freeform Cutout Layout Contract

## Principle: cutout unlocks freeform layout

Background removal is not an end in itself. A cutout is required when the subject silhouette must participate in editorial composition so that nearby text and layers are no longer constrained by an artificial rectangular image box.

In other words:

> **Cutout is not just “remove the background”. It removes the rectangular media boundary so text can flow, overlap, interlock, or cross the subject silhouette naturally.**

## Contract fields

Every semantic image2 asset declares two layout-boundary fields in `assetRole`:

```json
{
  "compositionBoundary": "freeform-silhouette",
  "freeformLayoutIntent": "text-flow"
}
```

`compositionBoundary`:

- `rectangular-frame` — the complete image rectangle is a legitimate design boundary.
- `freeform-silhouette` — the final visible boundary is the extracted subject silhouette, not the generated image rectangle.
- `not-applicable` — code UI / primitives.

`freeformLayoutIntent`:

- `none` — no reason to remove the rectangular boundary.
- `text-flow` — nearby text should visually flow around the silhouette.
- `text-overlap` — text and subject intentionally overlap in layered editorial composition.
- `layer-interlock` — subject, typography, and/or graphic layers interleave in front/behind relationships.
- `cross-boundary` — the subject must escape a normal card/media rectangle.

## Hard rules

### `freeform-layout-requires-cutout`

If `freeformLayoutIntent` is `text-flow`, `text-overlap`, `layer-interlock`, or `cross-boundary`, the asset must be a `cutout-subject` with `needsCutout=true`.

A `background-plate` or `inline-photo` cannot request a freeform layout intent. Reclassify the visual as a cutout if the reference requires text to move around the subject silhouette.

### `rectangular-boundary-blocks-freeform-layout`

If freeform layout is required, `compositionBoundary` must be `freeform-silhouette` and the final frontend asset must have real alpha transparency.

It is a blocking defect to generate a green-screen/solid-color/transparent cutout and then place the result inside an opaque rectangular media box that restores the rectangle and prevents the intended text/image relationship.

## Image2 generation

The image2 background strategy remains a generation decision:

1. Prefer `transparent` + `native-alpha`.
2. Use `solid-color` + `background-removal` when a clean matte improves extraction.
3. Use `green-screen` + `chroma-key` when alpha generation is unreliable and the subject permits chroma keying.

Regardless of the generation strategy, a `cutout-subject` with freeform layout intent must ship to the frontend as a clean transparent silhouette.

## Example — editorial animal hero

```json
{
  "id": "hero-ostrich",
  "assetRole": {
    "role": "cutout-subject",
    "renderer": "image2",
    "placement": "layered",
    "generationScope": "asset-only",
    "needsCutout": true,
    "generationBackground": "green-screen",
    "keyingMode": "chroma-key",
    "compositionBoundary": "freeform-silhouette",
    "freeformLayoutIntent": "text-flow",
    "requiresTransparency": true,
    "participatesInOverlap": true,
    "containsCodeOwnedText": false
  },
  "overlayRole": {
    "mode": "cutout-layered",
    "zOrder": "image-over-text",
    "subjectCriticalZones": [[60, 12, 36, 68]],
    "allowTextOverSubject": false,
    "safeArea": "inside"
  }
}
```

The frontend should place the transparent subject as a layered element. Do not wrap it in a visible rectangular photo background merely because the generated source had one.
