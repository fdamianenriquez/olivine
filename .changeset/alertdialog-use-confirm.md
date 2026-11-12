---
"olivine": minor
---

AlertDialog: add `ConfirmProvider` and `useConfirm()` to ask from code (a promise of `true`/`false`, one dialog at a time, `AbortSignal` support); add `onExited`; a result that arrives after `open` turned false is now ignored and the pending state resets.
