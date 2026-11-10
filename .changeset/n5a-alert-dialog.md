---
"olivine": minor
---

Add AlertDialog: a modal confirmation announced as `alertdialog` that composes Modal, with no close button or scrim dismissal, focus on Cancel by default, a `danger` tone with a localised Caution word, `onClose(reason)` (`confirm` | `cancel` | `escape`), and an asynchronous `onConfirm` that keeps the dialog pending until it settles. New locale group `alertDialog` (confirm, cancel, caution).
