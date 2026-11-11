---
"olivine": minor
---

Tooltip: add `title` and `variant` (a rich, non-interactive tooltip), `disabled`, and render no tooltip for empty `content`. Add `TooltipProvider` (`openDelay` 300, `closeDelay` 0, `skipDelay` 300); a built-in default group applies without it, so a neighbouring tooltip opens at once and only one is open at a time. `openDelay` and `closeDelay` now default to the group's values (same numbers). The tooltip stays open while hover or keyboard focus remains, a mouse or pen press on the trigger closes it, a touch tap on the box closes it, and it does not reopen after Escape until the pointer leaves and returns. The `aria-describedby` skip now reads the trigger's name from the DOM. Plain tooltips fade in and rich ones settle in.
