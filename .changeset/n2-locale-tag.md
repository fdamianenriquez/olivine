---
"olivine": minor
---

Add `useLocaleTag()`: the BCP 47 tag of the nearest `Root` (regional tags such as `es-MX` are kept), for formatting numbers and dates. `Root` now passes its string `locale` down as that tag.
