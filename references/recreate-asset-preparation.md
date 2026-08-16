# Recreate Asset Preparation

Use this contract whenever `recreate` consumes bitmap imagery from a screenshot or design reference.

## Goal

Do not treat screenshot rectangles as ready-to-ship assets. First decide what each visible visual actually is, prepare a clean reusable asset, then let code render all semantic UI text and controls.

## Asset kinds

- `background-plate` — a clean photographic/illustrative region used as a background. Remove code-owned text, buttons, status/nav chrome, labels, and other UI pixels before implementation.
- `cutout` — a subject intentionally layered into the composition. Remove the background and export transparent PNG/WebP. Do not replace a collage/cutout subject with a rectangular screenshot crop.
- `inline-photo` — a photo/media crop inside a card or media slot. Crop to the intended subject and remove code-owned text/UI contamination.
- `generated-clean` — an image2-generated or image2-edited clean asset used when reference cleanup needs semantic inpainting/reconstruction. Preserve provenance.
- `project-existing` — an existing legitimate project asset that does not need reference cleanup.

## Hard rules

1. Semantic UI text is rendered once in code. If a screenshot crop still contains a heading, label, button text, date, navigation label, or other code-owned text that is also rendered in DOM, the asset is invalid.
2. Buttons, status bars, navigation, toolbar chrome, common functional icons, chips, labels, and controls may not remain baked into a bitmap implementation asset.
3. A reference crop that may contain text/UI must be cleaned before use. Cropping alone is not cleanup.
4. A collage/overlapping subject whose silhouette participates in the composition should be a `cutout`, not a rectangular crop.
5. Cutouts require real background removal and transparency-capable output (PNG/WebP).
6. Local Pillow/Canvas scripts may crop, resize, compress, optimize, or remove a background. They may not invent or repaint semantic backgrounds/people/products/illustrations. Semantic reconstruction or inpainting goes through image2.
7. Every local raster actually referenced by the rendered Recreate UI must appear in `asset-plan.json`.
8. Visible reference controls must not silently disappear. Record important controls in `referenceElements` and verify them during QA.

## asset-plan.json

A Recreate run with local raster assets must produce `asset-plan.json` before implementation. The Runtime scheduler stores the multi-agent version under the canonical run's scheduler artifacts; a single-agent workflow may write `artifacts/asset-plan.json` in the target project.

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
      "source": "reference",
      "output": "assets/hero-ostrich.png",
      "referenceRegion": [240, 50, 180, 330],
      "operations": ["crop", "remove-text", "remove-ui", "remove-background"],
      "sourceMayContainText": true,
      "sourceMayContainUi": true,
      "textRemoved": true,
      "uiRemoved": true,
      "backgroundRemoved": true,
      "codeOwnedText": ["MAKE AIR VIBE"],
      "embeddedText": []
    },
    {
      "id": "seal-hero",
      "kind": "background-plate",
      "source": "reference",
      "output": "assets/seal-hero-clean.png",
      "referenceRegion": [190, 180, 150, 180],
      "operations": ["crop", "remove-text", "remove-ui"],
      "sourceMayContainText": true,
      "sourceMayContainUi": true,
      "textRemoved": true,
      "uiRemoved": true,
      "backgroundRemoved": false,
      "codeOwnedText": ["EVENT"],
      "embeddedText": []
    }
  ],
  "referenceElements": [
    { "id": "back-button", "kind": "code-ui", "required": true, "status": "implemented" },
    { "id": "favorite-button", "kind": "code-ui", "required": true, "status": "implemented" }
  ]
}
```

Schema: `schemas/asset-plan.schema.json`.

## Portable preview delivery

The canonical implementation and the user-facing standalone preview are different artifacts.

- **Canonical implementation:** keep normal traceable files such as `index.html`, CSS/JS, and `assets/*`. Recreate guards continue to reject hidden base64 raster shortcuts in canonical source.
- **Portable preview:** when an HTML file may be opened or attached by itself (for example in chat, an artifact viewer, email, or a file handoff that does not preserve sibling paths), generate a self-contained preview with:

```bash
image2-ui preview <demo-dir-or-html> --out preview.html
```

The preview bundler inlines local CSS, JS, images, fonts, and media and marks the output with `data-image2-ui-artifact="preview-only"`. This marker is the only reason inline raster data is allowed there.

Delivery rules:

1. Never hand off canonical `index.html` by itself when it still references sibling local assets.
2. For a clickable single-file handoff, provide the generated preview-only HTML as the primary preview and provide the canonical project/ZIP separately.
3. Never use the preview-only file as implementation source, verification source, or a replacement for `asset-plan.json` / provenance.
4. The preview bundler must fail rather than silently drop missing or root-escaping local assets.
5. Do not manually base64-encode assets into the canonical implementation to solve a delivery-path problem.

## Recreate QA findings

The QA pass must compare the rendered UI to the original reference and use these rule IDs for visible failures:

- `asset-text-contamination` — code-owned text or UI chrome remains inside a bitmap.
- `duplicate-semantic-content` — the same semantic text appears in both bitmap pixels and code UI.
- `asset-kind-mismatch` — a cutout/background/inline-photo is implemented as the wrong asset type.
- `reference-element-missing` — a visible required control or reference element was dropped.
- `layout-ratio-drift` — major hero/card/media/nav proportions materially drift from the reference.

These are Must Fix when they materially change Recreate fidelity.
