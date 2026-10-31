/**
 * The text an item is known by: its `data-text-value`, else its text without the parts hidden
 * from assistive technology (a shortcut, a check mark). Typeahead and filters read it.
 */
export function visibleText(item: HTMLElement): string {
  const own = item.getAttribute("data-text-value");
  if (own !== null) return own;
  let text = "";
  const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.parentElement?.closest('[aria-hidden="true"]')) text += node.textContent ?? "";
  }
  return text;
}

/**
 * Scrolls a list so the item is in view, without scrolling the page: to the nearest edge, or
 * centred (a list opening on its selected option). Always instant.
 */
export function reveal(
  list: HTMLElement,
  item: HTMLElement,
  align: "nearest" | "center" = "nearest",
) {
  if (list.scrollHeight <= list.clientHeight) return;
  const box = list.getBoundingClientRect();
  const row = item.getBoundingClientRect();
  if (align === "center") {
    list.scrollTop += row.top + row.height / 2 - (box.top + box.height / 2);
  } else if (row.top < box.top) {
    list.scrollTop -= box.top - row.top;
  } else if (row.bottom > box.bottom) {
    list.scrollTop += row.bottom - box.bottom;
  }
}
