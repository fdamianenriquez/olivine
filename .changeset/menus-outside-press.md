---
"olivine": patch
---

Menus (Dropdown, SplitButton, Fab, Menubar, ContextMenu): a press outside only dismisses the menu, its click does not reach the page; a touch scroll outside no longer closes it; right and middle presses still land; focus moving into an iframe closes it. A press on a Modal or Offcanvas scrim closes an open menu or popup without also closing the dialog, and a press in a menu opened from a Popover no longer closes the Popover. When the app closes a menu while focus is inside, `restoreFocus` applies with reason `trigger`.
