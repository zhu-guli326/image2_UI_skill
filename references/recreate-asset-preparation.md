# Recreate Asset Preparation

Use this contract whenever `recreate` contains bitmap imagery visible only inside a screenshot or design reference.

## Goal

The screenshot is a **fidelity target and visual guide**, not an asset source. Do not ship pixels cropped out of the reference. First identify what each visual is and where it sits, then call the project-designated `image2` path to generate/edit a clean standalone asset. Code renders all semantic UI text and controls.

## Core rule

```text
reference screenshot
  ↓
identify / select visual region
  ↓
referenceRegion + asset kind + image2 prompt
  ↓
image2 generate / edit
  ↓
provenance-tracked standalone asset
  ↓
implementation
```

`source: "reference"` is forbidden for final Recreate bitmap assets.

Allowed final sources:

- `source: "image2"` — required when the visual exists only inside the screenshot/reference.
- `source: "project"` — allowed only when the project already contains a legitimate reusable asset.

The reference or a selected reference region may be passed to image2 as visual guidance for an `edit` operation. That does **not** authorize using the crop itself in the frontend.

## Asset kinds

- `background-plate` — a clean image2-generated photographic/illustrative background without code-owned UI text/chrome.
- `cutout` — an image2-generated/edited subject intentionally layered into the composition; export transparent PNG/WebP when transparency is required.
- `inline-photo` — an image2-generated/edited photo/media asset for a card or media slot.
- `generated-clean` — a general image2-generated/edited clean visual when the more specific kinds above do not fit.
- `project-existing` — an existing legitimate project asset that does not need recreation from screenshot pixels.

## Hard rules

1. **Never ship screenshot pixels as imagery.** Raw crops, cleaned crops, masked crops, and background-removed crops taken directly from the reference are analysis inputs only, never final implementation assets.
2. If a bitmap visual is visible in the reference but no legitimate project asset exists, call `image2` and use the returned asset.
3. Every `source: "image2"` asset must record `referenceRegion`, `referenceRole: "visual-guide-only"`, `image2Action`, `image2Prompt`, output path, and image2 provenance.
4. Semantic UI text is rendered once in code. Generated assets must not contain headings, labels, button text, dates, nav labels, status bars, or functional UI chrome that code owns.
5. Buttons, status bars, navigation, toolbar chrome, common functional icons, chips, labels, and controls are always Code UI.
6. A collage/overlapping subject whose silhouette participates in the composition should be a `cutout`, not a rectangular photo block.
7. Local Pillow/Canvas scripts may resize, compress, optimize, format-convert, or remove a background **after image2 output exists**. They may not turn reference screenshot pixels into final semantic imagery.
8. Every raster actually referenced by the rendered Recreate UI must appear in `asset-plan.json`.
9. Visible reference controls must not silently disappear. Record important controls in `referenceElements` and verify them during QA.
10. If image2 is required but unavailable, block the asset step instead of substituting a screenshot crop.

## asset-plan.json

A Recreate run with bitmap assets must produce `asset-plan.json` before implementation. The Runtime scheduler stores the multi-agent version under the canonical run's scheduler artifacts; a single-agent workflow may write `artifacts/asset-plan.json` in the target project.

Example:

```json
{
  "version": 1,
  "workflow": "recreate",
  "reference": "reference.png",
  "assets": [
    {
      "id": "hero-ostrich",
      "kind": "cutout",
      "source": "image2",
      "output": "assets/hero-ostrich.png",
      "referenceRegion": [240, 50, 180, 330],
      "referenceRole": "visual-guide-only",
      "image2Action": "edit",
      "image2Prompt": "Recreate only the black-and-white ostrich wearing sunglasses from the selected reference area as a clean transparent cutout. Preserve pose, scale, glasses, feather silhouette, and editorial high-contrast photography. Remove all text, UI, borders, and background.",
      "operations": ["image2-edit", "remove-background", "resize"],
      "backgroundRemoved": true,
      "codeOwnedText": ["MAKE AIR VIBE"],
      "embeddedText": []
    },
    {
      "id": "seal-hero",
      "kind": "background-plate",
      "source": "image2",
      "output": "assets/seal-hero.png",
      "referenceRegion": [190, 180, 150, 180],
      "referenceRole": "visual-guide-only",
      "image2Action": "edit",
      "image2Prompt": "Recreate the black-and-white seal portrait with winter beanie as a clean vertical hero photograph. Keep the frontal pose and dark background. Do not include EVENT, buttons, icons, labels, or any readable text.",
      "operations": ["image2-edit", "resize"],
      "backgroundRemoved": false,
      "codeOwnedText": ["NEW WINTER EVENT", "Get Tickets"],
      "embeddedText": []
    }
  ],
  "referenceElements": [
    { "id": "back-button", "kind": "code-ui", "required": true, "status": "implemented" },
    { "id": "favorite-button", "kind": "code-ui", "required": true, "status": "implemented" }
  ]
}
```

Each `source: "image2"` output must have the provenance sidecar emitted by `scripts/image2_asset.py`, including the image2 channel, action, prompt, output, and model metadata.

Schema: `schemas/asset-plan.schema.json`.

## Recreate QA findings

The QA pass must compare the rendered UI to the original reference and use these rule IDs for visible failures:

- `recreate-reference-raster-forbidden` — final implementation imagery directly uses screenshot/reference pixels.
- `image2-provenance-required` — a generated asset has no valid image2 provenance.
- `asset-text-contamination` — generated imagery contains code-owned UI text/chrome.
- `duplicate-semantic-content` — the same semantic text appears in both bitmap pixels and Code UI.
- `asset-kind-mismatch` — a cutout/background/inline-photo is implemented as the wrong asset type.
- `reference-element-missing` — a visible required control or reference element was dropped.
- `layout-ratio-drift` — major hero/card/media/nav proportions materially drift from the reference.

These are Must Fix when they materially change Recreate fidelity.
