---
"olivine": minor
---

Narrow the `react` and `react-dom` peer dependency range from `>=18` to `^18.0.0 || ^19.0.0`. Olivine is tested against React 18.3 and React 19.3; React 20 and later are no longer accepted until they are tested. Apps on React 18 or 19 are not affected. Also make a few internal ref and test types compatible with `@types/react` 18.
