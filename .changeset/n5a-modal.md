---
"olivine": minor
---

Modal: add `closeButton` (default `true`) to hide the "×" while Escape still calls `onClose`. Modal now unrolls downwards on open and rolls back up on close (kakejiku); during the exit it stays mounted and inert while focus, scroll and the page are already released. Replaces the old slide-in and the deprecated `--motion-slow`/`--motion-base` timings on the Modal scrim.
