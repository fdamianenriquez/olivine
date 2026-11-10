---
"olivine": patch
---

Modal and other overlays release the focus trap, the inert page and the scroll lock before their exit motion starts, so a close that happens outside an event handler no longer leaves focus on the page body for a frame.
