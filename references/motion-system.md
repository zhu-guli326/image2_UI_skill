# Motion System

The bundled demos use a small CSS-first motion vocabulary so generated UI stays
offline, inspectable, and easy to port into a production application.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--motion-duration-fast` | `160ms` | Hover, press, icon, and control feedback |
| `--motion-duration-base` | `220ms` | Toasts, tabs, and view state changes |
| `--motion-duration-slow` | `360ms` | Initial content and list entrances |
| `--motion-ease-standard` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Predictable UI feedback |
| `--motion-ease-emphasized` | `cubic-bezier(0.16, 1, 0.3, 1)` | Content entering or gaining focus |

## Interaction Rules

- Hover and press feedback must not change layout dimensions.
- Press feedback uses a small scale change; hover uses a small vertical lift.
- Page and list entrances use opacity plus a short positional offset.
- Toasts animate opacity and position together and remain non-blocking.
- JavaScript smooth scrolling must fall back to `auto` when reduced motion is enabled.
- Motion is supplemental: the UI must remain understandable when all transitions and animations are disabled.

## Reduced Motion

Every bundled demo includes a final `@media (prefers-reduced-motion: reduce)`
override that removes positional feedback and reduces animation/transition timing
to an effectively immediate state. Interactive behavior remains available.

When adding a new demo, copy the tokens and reduced-motion block, then add the
same behavior to the component-level motion system rather than inventing local
durations.
