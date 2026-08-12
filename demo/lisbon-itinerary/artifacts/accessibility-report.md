# Accessibility review

- All icon-only buttons have accessible names and 44px target areas.
- The day rail uses `role=tab` and `aria-selected`.
- The add-stop modal has an accessible name, Escape/backdrop close, and restores focus to the invoking button.
- Timeline expansion exposes `aria-expanded`; completion is represented by an icon and progress text rather than color alone.
- Reduced-motion preferences suppress CSS transitions.
