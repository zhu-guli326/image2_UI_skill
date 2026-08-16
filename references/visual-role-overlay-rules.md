# Visual Role & Text/Image Overlay Rules

This contract answers two questions before implementation:

1. **What is this visible thing?** — code UI, a graphic primitive/placeholder, a background plate, a cutout subject, or an inline photo.
2. **How does it relate to nearby text?** — separated, safely overlapped, masked, layered as a cutout, or contained inside a card.

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

### B. Overlay classification

Choose exactly one overlay mode:

- `none` — no text/image relationship.
- `side-by-side` — text and image occupy distinct layout regions.
- `safe-overlap` — text overlaps only a known low-detail/text-safe zone.
- `masked-overlay` — text overlays imagery with an explicit gradient/backplate/blur readability mask.
- `cutout-layered` — a transparent subject and text share the composition with explicit z-order.
- `card-overlay` — text/control content overlays media inside one bounded card/media component.

### C. Layering and layout

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

## Text/Image Hard Rules

The following are **Must Fix** in Recreate when materially visible:

- `placeholder-renderer-violation` — a placeholder/graphic primitive was sent to image2 instead of code.
- `asset-role-renderer-mismatch` — role and renderer disagree.
- `cutout-transparency-required` — a cutout subject is not transparency-capable/prepared.
- `cutout-overlay-required` — an overlapping silhouette subject is not implemented as `cutout-layered`.
- `overlay-safe-zone-required` — text is placed on imagery without a declared safe zone where required.
- `overlay-mask-required` — a masked overlay has no readability mask.
- `overlay-z-order-required` — overlapping text/image layers have no explicit stacking order.
- `subject-critical-overlap` — text/control content covers a protected focal zone without explicit reference-backed justification.
- `bitmap-code-content` — generated imagery contains code-owned UI/text.
- `full-ui-image2-generation` — image2 was asked to generate a complete UI composition and that output was then mined for frontend assets.
- `safe-area-overlap` — CTA/navigation/status content enters the device or viewport safe-area exclusion zone.
- `stacking-order-violation` — imagery/frame/mask covers functional UI because layer order is wrong.

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
Does the subject silhouette participate in freeform overlap?
          ├─ yes → cutout-subject → image2/project → remove background → cutout-layered
          └─ no
              ↓
Is the background itself part of the composition?
              ├─ yes → background-plate
              └─ no → inline-photo
```

## Files

- `schemas/asset-role.schema.json`
- `schemas/overlay-role.schema.json`
- `schemas/visual-role-plan.schema.json`

`visual-role-plan.json` is a design/implementation contract. It does not replace `asset-plan.json`; the asset plan still owns image2 provenance and output paths.