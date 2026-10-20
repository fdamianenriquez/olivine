---
"olivine": patch
---

Stop `Tooltip` logging "Accessing element.ref was removed in React 19" in development. It now reads its child's ref the same way `Popover` does, through a shared helper that works on React 18 and 19.
