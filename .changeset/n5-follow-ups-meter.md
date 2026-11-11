---
"olivine": patch
---

Meter and Progress: `aria-describedby` and `aria-details` now land on the element with the `meter` / `progressbar` role instead of the wrapper. Meter also warns for `notation: "compact"` with `compactDisplay: "long"` (it writes words), and no longer rebuilds its number format when `formatOptions` is passed inline.
