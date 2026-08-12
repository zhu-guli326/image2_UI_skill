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

## Semantic Motion Families

Motion must explain what changed. Do not apply one hover lift or fade-up recipe to
every control and card.

| Family | Communicates | Required behavior |
| --- | --- | --- |
| Navigation | hierarchy and direction | Forward views enter from the trailing edge; Back returns from the leading edge. Focus moves with the active view. |
| Selection | which option owns the current state | Tabs and segmented controls use a shared indicator that travels between options. Content does not re-enter on every selection. |
| Toggle | a binary state changed | Track color and thumb position animate continuously; `aria-pressed` changes with the visual state. |
| Continuous control | magnitude and direct manipulation | Dials, sliders, and progress controls follow pointer movement and update values during the gesture. |
| Command | the system accepted an action | Press feedback is brief, then resolves to pending, success, failure, or another visible result. |
| Content entrance | reading order | Use once when content first appears, with a short motivated stagger. Do not replay it for unrelated state changes. |

## Interaction Rules

- Hover and press feedback must not change layout dimensions.
- Hover treatment depends on affordance: clickable cards may change border or image scale; icon buttons may change surface color; toggles and tabs should preview their own state instead of lifting.
- Press feedback is reserved for commands. Selection controls communicate through their indicator or thumb.
- Forward and backward navigation use opposite directions.
- Page transitions update focus and remove inactive content from pointer and keyboard interaction.
- Toasts animate opacity and position together and remain non-blocking.
- JavaScript smooth scrolling and direct-manipulation animation must fall back to immediate state changes when reduced motion is enabled.
- Motion is supplemental: the UI must remain understandable when all transitions and animations are disabled.

## Reduced Motion

Every bundled demo includes a final `@media (prefers-reduced-motion: reduce)`
override that removes positional feedback and reduces animation/transition timing
to an effectively immediate state. Interactive behavior remains available.

When adding a new demo, copy the tokens and reduced-motion block, then add the
same behavior to the component-level motion system rather than inventing local
durations.
