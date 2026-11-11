---
"olivine": patch
---

Tour: the in-view check now reads `scroll-padding` from the target's nearest scrolling container (and clips to it), not only from `<html>`, so a sticky header inside a scrolling panel no longer hides the target.
