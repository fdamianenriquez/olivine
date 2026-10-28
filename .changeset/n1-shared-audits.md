---
"olivine": minor
---

Button: new `square` prop for a single glyph (32 / 44 / 56px; the types require `aria-label` or `aria-labelledby`), which replaces the `ol-btn--icon` class with `ol-btn--square`; colour and arrow transitions use the motion tokens. Buttons with `aria-pressed` hover with `paper-2` while unpressed and ignore hover while pressed (the rule moves from ButtonGroup to Button). Tooltip no longer adds `aria-describedby` when its text only repeats the trigger's name. ToastStack and ToastProvider now default to the top-right corner (`tr`), since Fab owns the bottom-end corner.
