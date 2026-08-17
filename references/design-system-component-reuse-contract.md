# Design System & Component Reuse Contract

## Purpose

A new UI reference must not be implemented screen-by-screen before the shared design language is understood. The Harness first extracts a reusable design system contract, then builds screens from shared components and variants.

The required order is:

```text
reference / prompt / project
  -> design system selection
  -> design token extraction
  -> shared component registry
  -> icon resolution
  -> reuse gate
  -> visual-role / asset planning
  -> implementation
  -> render QA
```

## 1. Default Design System selection

Selection priority:

1. explicit user/project design system;
2. strong reference/platform evidence;
3. product-class default;
4. generic fallback.

Defaults when there is no stronger signal:

- iOS/mobile app or iPhone device mockup -> `ios-hig`;
- Android mobile app -> `material-3`;
- dashboard/admin -> `ant-design`;
- general web app/SaaS -> `shadcn-radix`.

A detected or user-specified system always wins over a fallback. Do not mix systems merely because individual components are convenient. `allowMixedSystems=true` requires a concrete reason.

Hard rules:

- `design-system-selection-required`
- `design-system-default-mismatch`
- `mixed-design-system-without-reason`

## 2. Default iOS component skeleton

When `ios-hig` is selected, the default shared skeleton is:

- `IOSScreenRoot`
- `IOSSafeArea`
- `IOSStatusBar`
- `IOSHomeIndicator`
- `IOSNavBar`
- `IOSBottomNav`
- `IOSPrimaryButton`
- `IOSSearchBar`
- `IOSFilterChip`
- `IOSCard`

`IOSDynamicIsland` is registered when the reference/device profile contains a Dynamic Island. System chrome is shared: three iPhone screens do not get three independently redrawn status bars.

Only variants may differ, for example:

```text
IOSStatusBar(theme=light)
IOSStatusBar(theme=dark)
```

The component geometry and semantic structure remain shared.

Hard rules:

- `ios-skeleton-required`
- `ios-system-chrome-must-be-shared`
- `shared-component-reuse-required`
- `shared-component-drift`

## 3. Icon system fallback

Functional icons resolve through a library before custom drawing.

For iOS the default semantic icon system is `sf-symbols`. Resolution order:

```text
design-system-icons
-> platform-icons
-> project-icon-registry
-> compatible-library
-> custom-draw
```

For other systems, use their native icon family first (Material Symbols, Ant Icons, Arco Icons, Fluent icons, Primer Octicons, etc.).

Standard functional meanings such as back, search, close, heart, share, profile, home, settings, menu, filter, play, pause, next, ticket, calendar and location must come from the chosen icon system/library unless every allowed lookup source reports missing.

Do not add a functional trailing icon just because it looks decorative. If the reference says the icon is absent, it stays absent.

Hard rules:

- `icon-system-required`
- `ios-icon-system-default-mismatch`
- `functional-icon-library-required`
- `reference-unrequested-icon`

## 4. Reuse before custom draw

Every standard component or icon records a lookup result before implementation.

Allowed component resolution order:

```text
design-system
-> platform
-> project-shared
-> compatible-library
-> custom-draw
```

Custom drawing is allowed only when:

1. all applicable existing sources were checked;
2. `lookupStatus=missing`;
3. a specific `customReason` is recorded.

Valid custom reasons:

- `brand-specific`
- `campaign-specific`
- `hero-visual`
- `library-missing`
- `reference-specific`

For standard interaction components and functional icons, `library-missing` is the normal justification. A matched component may never be redrawn simply to save time.

Hard rules:

- `reuse-before-custom-draw`
- `existing-component-required`
- `custom-draw-without-library-miss`
- `custom-draw-without-justification`

## 5. Shared component registry

A repeated semantic component is represented once with multiple instances, not copied as independent near-duplicates.

Example:

```json
{
  "id": "system-status-bar",
  "semanticRole": "status-bar",
  "reuseKey": "ios.system-status-bar",
  "source": "platform",
  "systemRef": "ios-hig",
  "componentRef": "IOSStatusBar",
  "lookupStatus": "matched",
  "shared": true,
  "instances": ["phone-left", "phone-middle", "phone-right"],
  "variants": ["light", "dark"]
}
```

If multiple screens contain the same `reuseKey`, they must resolve to the same component family. Differences belong in variants/tokens, not duplicated implementations.

## 6. Design tokens before screen composition

`design-system-plan.json` records token sources for color, typography, spacing, radius, elevation and motion. Tokens may come from the selected design system, an existing project, the reference, or a documented hybrid. Screen implementation should consume these tokens instead of inventing per-screen values for repeated UI.

## 7. Relationship to visual assets

This contract governs reusable UI structure and functional icons. Semantic hero/person/product/animal imagery still follows the visual-role and image2 asset contracts.

- standard UI component -> reuse existing component;
- standard functional icon -> reuse icon system;
- editorial hero / cutout subject -> image2/project asset workflow;
- campaign/brand-specific visual primitive -> custom only with recorded reason.

The goal is consistent design DNA across different screens while preserving each screen's actual composition.
