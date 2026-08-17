# Visual Role, Asset Background & Text/Image Overlay Rules

This contract answers five questions before implementation:

1. **What is this visible thing?** — code UI, a graphic primitive, a background plate, a cutout subject, or an inline photo.
2. **Does the semantic image need a freeform silhouette?** — decide cutout vs complete frame before calling image2.
3. **How should image2 generate the background?** — transparent, solid-color, green-screen, or full-scene.
4. **How does imagery relate to nearby text/controls?** — separated, safely overlapped, masked, or layered.
5. **How dense should the composition feel?** — preserve the reference information density; local breathing room must not turn into large accidental dead space.

The goal is not to add more Runtime stages. New runs record the answers in `visual-role-plan.json`; the existing Analyze/Decompose/Implement/Verify flow consumes that plan.

## Harness rule checklist

### A. Visual-role classification

1. Text, buttons, navigation, tabs, chips, labels, status chrome and functional icons are `code-ui`.
2. Lines, dots, dividers, flat color blocks, simple geometric ornaments and non-semantic placeholders are `graphic-primitive`; render them with HTML/CSS/SVG, not image2.
3. A photographic/illustrative field whose background is part of the composition is `background-plate`.
4. A subject whose silhouette participates in the composition or crosses normal rectangular boundaries is `cutout-subject`.
5. A bounded photo/media item inside a card or media slot is `inline-photo`.
6. A semantic raster visible only in a reference must be recreated through image2 (or reuse a legitimate project asset); reference pixels never ship.
7. One image2 job generates **one clean asset**, not a whole UI screenshot to be cropped later.
8. Generated semantic imagery may not contain code-owned text, controls, device chrome, cards, nav bars or action icons.

## Image2 Background Strategy

The background strategy is decided **before** generation.

### Cutout subject

Use a cutout when the subject silhouette needs to participate in freeform editorial composition, text wrapping/overlap, or cross a rectangular media boundary.

Preferred generation strategies:

1. `transparent` + `native-alpha` — preferred when image2 can produce clean alpha.
2. `solid-color` + `background-removal` — useful when a simple high-contrast matte is easier to remove cleanly.
3. `green-screen` + `chroma-key` — allowed when transparent output is unreliable and the subject does not contain conflicting green detail.

The **final frontend asset must be a real transparent cutout**. A green-screen or solid-color generation is an intermediate extraction aid, not something that ships visibly.

### Background plate

A `background-plate` keeps the full scene/background:

- `needsCutout=false`
- `generationBackground=full-scene`
- `keyingMode=none`

Do not remove the background simply to make positioning easier. If text needs freedom around the subject, first ask whether the visual role was misclassified and should actually be a cutout.

### Inline photo

An `inline-photo` is container-bound and normally stays a complete rectangular frame:

- `needsCutout=false`
- `generationBackground=full-scene`
- `keyingMode=none`

Do not green-screen ordinary card/media photos.

### Key principle

> Background removal is not merely an image-cleanup trick. It unlocks freeform layout by removing the artificial rectangular media boundary.

If text needs to visually flow around an animal/person/product silhouette, classify that visual as `cutout-subject` before generation.

## Overlay classification

Choose exactly one overlay mode:

- `none` — no text/image relationship.
- `side-by-side` — text and image occupy distinct layout regions.
- `safe-overlap` — text overlaps only a known low-detail/text-safe zone.
- `masked-overlay` — text overlays imagery with an explicit gradient/backplate/blur readability mask.
- `cutout-layered` — a transparent subject and text share the composition with explicit z-order.
- `card-overlay` — text/control content overlays media inside one bounded card/media component.

### Layering and layout

1. If an overlap exists, z-order must be explicit.
2. Text must not cover a subject-critical zone (face, eyes, product mark, primary focal object) unless the reference explicitly does so and the plan records a reason.
3. `safe-overlap` requires at least one `textSafeZone`.
4. `masked-overlay` requires a non-`none` mask.
5. `cutout-layered` requires a `cutout-subject`, transparency, explicit z-order and subject-critical zones.
6. `background-plate` must not be implemented as a floating cutout merely to make layout easier.
7. `inline-photo` stays container-bound; if it needs freeform silhouette overlap, reclassify it as `cutout-subject`.
8. Persistent controls (CTA, tab bar, bottom nav, status chrome) remain Code UI and must sit inside their safe area; imagery must not cover them.
9. Device/frame decoration must never sit above functional navigation or CTA content.
10. In Recreate, the overlay mode should reproduce the reference relationship rather than choosing a more convenient layout.

## Composition Density & Whitespace Intent

Whitespace is a design choice, not a default safety mechanism.

### Core rule

> **Breathing room is local; dead space is global.**

A focal subject may need clearance around its face, product silhouette, title, or CTA. That does **not** mean the implementation should shrink the subject and leave a large unassigned blank region.

### Recreate policy

1. `preserveReferenceDensity=true` for Recreate.
2. Classify `densityIntent` as `tight`, `balanced`, `spacious`, or `reference-matched`.
3. Large empty regions are allowed only when the reference visibly uses them as a deliberate compositional device.
4. `allowLargeEmptyRegions=true` requires `referenceBackedWhitespaceReason`.
5. For `tight` editorial compositions, the default `maxUnassignedWhitespaceRatio` is **25% or less**.
6. Recreate should target `maxDensityDriftPercent <= 15`.
7. Do not solve hero-crop problems by shrinking the hero inside a large empty canvas. Regenerate/extend/recompose the image2 asset instead.
8. Do not convert a dense editorial reference into an airy minimalist redesign during Recreate.
9. Responsive breakpoints may redistribute space, but the hierarchy and perceived information density should remain faithful.
10. Visual QA must inspect for large blank bands, empty card bodies, oversized gaps, undersized imagery, or unused hero areas that are not present in the reference.

Example:

```json
{
  "compositionPolicy": {
    "densityIntent": "tight",
    "preserveReferenceDensity": true,
    "allowLargeEmptyRegions": false,
    "maxUnassignedWhitespaceRatio": 0.2,
    "maxDensityDriftPercent": 10
  }
}
```

## Hero Crop & Bleed Rules

A primary hero is not just "an image that fills a box". It is an image prepared for a specific layout, with enough framing freedom to survive the final aspect ratio without visibly chopping the focal subject.

### Hero asset generation

1. Generate the hero for the **target layout/aspect ratio**, not as an arbitrary tight portrait that will later be forced through `object-fit: cover`.
2. The image2 prompt must reserve layout-safe visual space where the reference needs title, CTA, navigation, or other persistent overlays.
3. Faces, eyes, hats, headphones, product silhouettes and other focal edges belong inside `subjectCriticalZones`.
4. A primary `background-plate` must declare `cropPolicy`.
5. `fit=cover` requires either `focalPoint` or `safeCropBox`.
6. Default minimum hero bleed budget:
   - top: **10%**
   - left/right: **8%**
   - bottom: **12%**
7. `criticalCropMaxPercent` must be **3% or less** for a primary hero.
8. Persistent CTA/nav/status zones should be recorded as `persistentControlZones` and must not intersect `subjectCriticalZones` unless the reference explicitly requires that overlap and records a reason.
9. If the source asset is already too tightly cropped to satisfy this contract, regenerate/extend the image2 asset. Do not hide the problem with CSS scaling.
10. `object-fit: cover` is a placement tool, not a substitute for a correctly composed hero asset.
11. Crop safety must not be achieved by making the subject visibly too small relative to the reference. Hero bleed and composition density must both pass.

Example:

```json
{
  "id": "winter-seal-hero",
  "semanticPriority": "primary",
  "assetRole": {
    "role": "background-plate",
    "renderer": "image2",
    "placement": "background",
    "generationScope": "asset-only",
    "needsCutout": false,
    "generationBackground": "full-scene",
    "keyingMode": "none",
    "containsCodeOwnedText": false
  },
  "overlayRole": {
    "mode": "safe-overlap",
    "zOrder": "text-over-image",
    "textOnImage": true,
    "textSafeZones": [[0, 0, 100, 20]],
    "subjectCriticalZones": [[18, 24, 64, 45]],
    "persistentControlZones": [[8, 82, 84, 12]],
    "allowTextOverSubject": false,
    "allowControlOverSubject": false,
    "safeArea": "inside"
  },
  "cropPolicy": {
    "fit": "cover",
    "focalPoint": [50, 48],
    "safeCropBox": [8, 10, 84, 72],
    "minBleedTop": 10,
    "minBleedSides": 8,
    "minBleedBottom": 12,
    "criticalCropMaxPercent": 3,
    "targetAspectRatio": 0.85
  }
}
```

## Hard Rules

The following are **Must Fix** in Recreate when materially visible or contract-breaking:

### Asset/background

- `asset-background-strategy-required` — image2 was called before deciding cutout vs complete frame/background.
- `cutout-background-strategy-invalid` — a cutout lacks a valid transparent/solid-color/green-screen extraction strategy.
- `green-screen-keying-required` — green-screen output is not paired with chroma-key extraction.
- `background-plate-cutout-violation` — a full-scene background plate was incorrectly converted into a cutout.
- `inline-photo-keying-overkill` — a normal container photo was unnecessarily treated as a keyable cutout.
- `cutout-transparency-required` — final cutout is not transparency-capable/prepared.
- `cutout-overlay-required` — an overlapping silhouette subject is not implemented as `cutout-layered`.

### Overlay/layout

- `placeholder-renderer-violation` — a placeholder/graphic primitive was sent to image2 instead of code.
- `asset-role-renderer-mismatch` — role and renderer disagree.
- `overlay-safe-zone-required` — text is placed on imagery without a declared safe zone where required.
- `overlay-mask-required` — a masked overlay has no readability mask.
- `overlay-z-order-required` — overlapping text/image layers have no explicit stacking order.
- `subject-critical-overlap` — text content covers a protected focal zone without explicit reference-backed justification.
- `cta-subject-overlap` — CTA/nav/status overlays cross a protected focal zone instead of using reserved safe space.
- `safe-area-overlap` — CTA/navigation/status content enters the device or viewport safe-area exclusion zone.
- `stacking-order-violation` — imagery/frame/mask covers functional UI because layer order is wrong.

### Hero crop

- `hero-cover-without-focal-point` — a primary hero uses `cover` without focal/crop guidance.
- `insufficient-hero-bleed` — a primary hero has too little top/side/bottom compositional bleed for the target layout.
- `critical-subject-crop` — visual crop removes too much of a face/product/focal subject.

### Composition density

- `excessive-unreferenced-whitespace` — the implementation introduces large blank regions not supported by the reference.
- `composition-density-drift` — occupied/empty-space balance materially diverges from the Recreate reference.

### Raster provenance/content

- `bitmap-code-content` — generated imagery contains code-owned UI/text.
- `full-ui-image2-generation` — image2 was asked to generate a complete UI composition and that output was then mined for frontend assets.

## Recommended decision tree

```text
Visible element
  ↓
Is it semantic UI text/control or a simple geometric primitive?
  ├─ yes → code-ui / graphic-primitive → renderer=code
  └─ no
      ↓
Is it semantic photography/illustration/product/person/animal imagery?
      ├─ no → code or project primitive
      └─ yes
          ↓
Does its silhouette need to participate in freeform text/layout overlap?
          ├─ yes → cutout-subject
          │        ↓
          │   transparent preferred
          │   or solid-color / green-screen → extract alpha
          │        ↓
          │   cutout-layered
          └─ no
              ↓
Is the background itself part of the composition?
              ├─ yes → background-plate → full-scene
              │        ↓
              │   Is it a primary hero?
              │        ├─ yes → cropPolicy + focal/safe crop + bleed + critical zones
              │        └─ no → ordinary background placement
              └─ no → inline-photo → full-scene/container-bound

Then:
  ↓
Match reference density and whitespace intent.
Do not trade crop safety for large dead space.
```

## Files

- `schemas/asset-role.schema.json`
- `schemas/overlay-role.schema.json`
- `schemas/composition-policy.schema.json`
- `schemas/visual-role-plan.schema.json`

`visual-role-plan.json` is a design/implementation contract. It does not replace `asset-plan.json`; the asset plan still owns image2 provenance and output paths.
