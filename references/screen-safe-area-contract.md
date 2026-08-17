# Screen Safe Area Contract

## Why this exists

A mobile screen has two different boundaries:

1. **Screen bounds** — the full physical/display area. Backgrounds, decorative imagery, and edge-to-edge visual layers may extend here.
2. **Safe content bounds** — the unobscured region where important text, controls, navigation, and tap targets should live.

Do not solve safe-area problems by insetting the entire composition. That produces the opposite visual defect: backgrounds stop short of the device edge, the layout loses edge-to-edge depth, and the recreated screen looks like a card floating inside the phone.

The contract therefore treats safe area as a **content-placement constraint**, not a blanket padding rule.

## Platform source of truth

### iOS native runtime

Use the runtime safe area (`safeAreaInsets` / `safeAreaLayoutGuide`). Do not encode one iPhone model's top/bottom measurements as universal layout constants.

### Android native runtime

Use `WindowInsets` / system-bar and gesture insets. Edge-to-edge content can draw behind system bars while important content is positioned using insets.

### Web runtime

For an intentional edge-to-edge web viewport on devices with display cutouts/rounded corners, declare `viewport-fit=cover` and use CSS `env(safe-area-inset-top/right/bottom/left)` for important content.

### Recreated device mockup

A static/reference device mockup is different from a native runtime. Measure the safe zones from the reference/device frame and store them as normalized 0–100 rectangles. The simulated status bar and Home Indicator may be code-rendered because the device itself is part of the visual reference.

## `screenSafeArea`

Example for an iPhone-like recreated screen:

```json
{
  "screenSafeArea": {
    "platform": "ios",
    "surface": "device-mockup",
    "edgeToEdge": true,
    "insetSource": "reference-measured",
    "contentPolicy": "inside-safe-content",
    "backgroundPolicy": "screen-bounds",
    "contentSafeRect": [4, 7, 92, 86],
    "systemZones": {
      "statusBar": {
        "visibility": "visible",
        "ownership": "code-simulated",
        "rect": [4, 1.5, 92, 4.5]
      },
      "displayCutout": {
        "visibility": "visible",
        "ownership": "code-simulated",
        "rect": [40, 1.2, 20, 4.8]
      },
      "homeIndicator": {
        "visibility": "visible",
        "ownership": "code-simulated",
        "rect": [38, 95, 24, 2]
      }
    }
  }
}
```

## Element placement

Elements that need geometry-aware verification may add `screenPlacement`:

```json
{
  "id": "bottom-nav-controls",
  "screenPlacement": {
    "behavior": "persistent-control",
    "bounds": [5, 84, 90, 8]
  }
}
```

Behaviors:

- `critical-content` — important text/content that must stay inside safe content bounds.
- `persistent-control` — CTA, bottom-nav buttons, toolbar actions, or other persistent interactive content.
- `system-chrome` — simulated status bar, display cutout, Home Indicator, navigation bar, or gesture area.
- `background-bleed` — a visual background intended to reach physical screen edges.
- `decorative-bleed` — non-critical decoration that may cross safe-area boundaries.
- `reference-only` — geometry recorded only for comparison.

## Hard rules

### `screen-safe-area-contract-missing`

New mobile/device-like Recreate runs should declare the contract. Legacy plans warn instead of failing.

### `safe-area-runtime-api-required`

Native iOS must use runtime safe-area APIs; native Android must use `WindowInsets`. Do not hard-code one device profile into a runtime app.

### `web-safe-area-env-required`

An edge-to-edge web runtime must use CSS safe-area environment insets for important content.

### `web-viewport-fit-cover-missing`

If a web page intentionally fills the physical display edge-to-edge, its contract must declare `viewportFitCover=true`.

### `screen-safe-area-geometry-required`

An edge-to-edge device mockup needs a measured `contentSafeRect`.

### `status-bar-safe-area-violation`

A simulated status bar/display-cutout element must sit inside its measured top system zone. It must not appear glued to or floating outside the screen edge.

### `home-indicator-safe-area-violation`

A simulated Home Indicator must sit inside its measured bottom system zone and preserve the reference/device inset from the physical edge.

### `critical-content-outside-safe-area`

Important text and interactive content must remain inside `contentSafeRect` when static geometry is available.

### `bottom-nav-home-indicator-collision`

Bottom navigation/CTA tap targets must not occupy the Home Indicator, gesture-navigation, or navigation-bar exclusion zone. A visual bar background may extend behind the gesture area; its interactive content may not.

### `edge-to-edge-background-underfill`

When `backgroundPolicy=screen-bounds`, a declared `background-bleed` layer should cover the full screen. Do not inset the background just because the foreground content uses safe-area padding.

### `system-chrome-ownership-violation`

In a native runtime, status/navigation chrome is system-owned. Do not recreate the native system status bar or Home Indicator as app UI. Code-simulated chrome is appropriate only for visual device mockups/previews where the phone itself is being recreated.

## Correct mental model

```text
Physical screen bounds
┌──────────────────────────────┐
│ background / decoration OK  │
│  ┌────────────────────────┐  │
│  │      safe content      │  │
│  │ titles / CTA / nav     │  │
│  │ interactive controls   │  │
│  └────────────────────────┘  │
│ background / decoration OK  │
└──────────────────────────────┘
```

The safe area is not "empty padding that every layer must avoid". It is the region that protects important content from system UI and physical display intrusions while still allowing the interface to feel genuinely edge-to-edge.
