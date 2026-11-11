---
"olivine": minor
---

Toast: add `action`, `seal` (hanko), `priority`, swipe-to-dismiss and `onClose(reason)`; Escape closes a focused toast; enter, exit and seal motion move to the motion tokens, and the countdown bar drains in a 3px `maple` fill so it reads as time running. ToastStack is now a labelled landmark with an F6 hotkey (`label`, `hotkey`) that also works under a Modal. ToastProvider adds `actionDuration`, `swipe`, `hotkey`, `label`, and `useToast()` adds `update()` (a key set to `undefined` in the patch removes that option) and `promise()`. Fixes: the stack no longer stays paused after a focused toast is removed, touch taps no longer pause it, and showing an open id restarts its countdown.
