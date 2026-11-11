/** Collapses white space and case so two phrasings of the same words compare equal. */
export const normalise = (text: string): string =>
  text.trim().replace(/\s+/g, " ").toLocaleLowerCase();

/** Visible text of a subtree as a screen reader would read it, skipping hidden parts. */
export function textOf(node: Node): string {
  if (node.nodeType === 3) return node.textContent ?? "";
  if (node.nodeType !== 1) return "";
  const el = node as Element;
  if (el.getAttribute("aria-hidden") === "true") return "";
  if ((el as HTMLElement).hidden) return "";
  const label = el.getAttribute("aria-label");
  if (label?.trim()) return label;
  if (el.tagName === "IMG") return el.getAttribute("alt") ?? "";
  return Array.from(el.childNodes, textOf).join(" ");
}

export interface ResolvedName {
  /** The trigger's accessible name; empty when it has none. */
  name: string;
  /** True when the name comes from other elements (`aria-labelledby` or a `<label>`). */
  fromLabel: boolean;
}

/**
 * Resolves an element's accessible name from the DOM, in the order the accessible name
 * computation uses: `aria-labelledby`, `aria-label`, an associated `<label>`, its own text, then
 * a native `title`.
 */
export function accessibleName(el: HTMLElement): ResolvedName {
  const doc = el.ownerDocument;
  const ids = el.getAttribute("aria-labelledby");
  if (ids) {
    const text = ids
      .split(/\s+/)
      .map((id) => {
        const target = id ? doc.getElementById(id) : null;
        return target ? textOf(target) : "";
      })
      .join(" ");
    if (normalise(text)) return { name: text, fromLabel: true };
  }
  const label = el.getAttribute("aria-label");
  if (label?.trim()) return { name: label, fromLabel: false };
  const labels = (el as HTMLInputElement).labels as NodeListOf<HTMLLabelElement> | null | undefined;
  if (labels && labels.length > 0) {
    const text = Array.from(labels, textOf).join(" ");
    if (normalise(text)) return { name: text, fromLabel: true };
  }
  if (el.tagName === "INPUT") {
    const input = el as HTMLInputElement;
    if (["submit", "button", "reset"].includes(input.type) && input.value.trim()) {
      return { name: input.value, fromLabel: false };
    }
    const alt = input.type === "image" ? input.getAttribute("alt") : null;
    if (alt?.trim()) return { name: alt, fromLabel: false };
  }
  const own = textOf(el);
  if (normalise(own)) return { name: own, fromLabel: false };
  return { name: el.getAttribute("title") ?? "", fromLabel: false };
}

/**
 * True when a tooltip with `text` only repeats the trigger's name: describing it again would
 * make screen readers say the same words twice. A name built from a label element that already
 * contains the words, as whole words, counts as a repeat too.
 */
export function repeatsName(trigger: HTMLElement, text: string): boolean {
  const words = normalise(text);
  if (!words) return false;
  const { name, fromLabel } = accessibleName(trigger);
  const resolved = normalise(name);
  return resolved === words || (fromLabel && ` ${resolved} `.includes(` ${words} `));
}
