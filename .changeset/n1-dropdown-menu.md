---
"olivine": minor
---

Dropdown now runs on a shared menu layer. The pointer moves the highlight, so only one row is ever inverted; long menus stop at the viewport edge and scroll; headers name their group (`role="group"`); typeahead ignores case and accents in the page language and takes an optional item `textValue`. New props `restoreFocus` and item `id`, `textValue` and `closeOnSelect`; `onOpenChange` also receives why the menu closed. `kbd` takes a `Shortcut` (`"mod+r"`, or glyphs such as `"⌘R"`), drawn with Kbd and exposed as `aria-keyshortcuts`. The menu stays mounted and inert while an exit motion plays (`ol-motion-noren`). Rows are taller on touch screens.
