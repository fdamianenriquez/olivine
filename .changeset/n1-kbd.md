---
"olivine": minor
---

Add Kbd and KbdGroup for keys and shortcuts, with platform-aware symbols and spoken key names from the locale (new `keys` dictionary, merged one level deep like `tags`), plus the shared `Shortcut` type and the `formatShortcut`, `parseShortcut`, `toAriaKeyShortcuts` and `useKbdPlatform` helpers. New tokens `--kbd-size` and `--kbd-pad`.
