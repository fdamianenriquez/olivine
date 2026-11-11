---
"olivine": minor
---

Offcanvas: the bottom placement is a bottom sheet with `snapPoints`, `snap` / `defaultSnap` / `onSnapChange`, a handle button that cycles the points (Enter, Space, arrows, Home, End) and swipe to dismiss (`closeOnSwipe`, also on the side panels). The title is now an `h2` (still set in the label voice), so the panel shows in the heading outline. Add `modal={false}` for a standard sheet that leaves the page usable, plus `closeButton` and `closeOnScrim`. Panels pad for safe-area insets, the bottom sheet is capped at the large modal width on wide screens, and the panel unrolls and rolls back up (kakejiku) before it unmounts.
