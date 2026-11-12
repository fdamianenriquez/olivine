/** Collapses white space and case so two phrasings of the same words compare equal. */
export const normalise = (text: string): string =>
  text.trim().replace(/\s+/g, " ").toLocaleLowerCase();

/**
 * Elements whose text is read as a separate run: their words never fuse with a neighbour's.
 * Detected by tag name, not by computed CSS display.
 */
const BLOCK =
  /^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|BR|DD|DIV|DL|DT|FIELDSET|FIGCAPTION|FIGURE|FOOTER|FORM|H[1-6]|HEADER|HR|LI|MAIN|NAV|OL|P|PRE|SECTION|TABLE|TD|TH|TR|UL)$/;

/** Roles whose name comes from their content when nothing else names them. */
const NAME_FROM_CONTENT = new Set([
  "button",
  "link",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "tab",
  "checkbox",
  "radio",
  "switch",
  "treeitem",
  "cell",
  "gridcell",
  "columnheader",
  "rowheader",
  "heading",
  "tooltip",
]);

/** Roles that may not be named, so an `aria-label` on them is ignored. */
const NAME_PROHIBITED = new Set([
  "caption",
  "code",
  "deletion",
  "emphasis",
  "generic",
  "insertion",
  "mark",
  "none",
  "paragraph",
  "presentation",
  "strong",
  "subscript",
  "superscript",
  "time",
]);

const NATIVE_INTERACTIVE = /^(BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/;

const explicitRole = (el: Element) => el.getAttribute("role")?.trim().split(/\s+/)[0] ?? "";

/** The element's role as far as these checks need it: explicit, or implied by a few tags. */
function roleOf(el: Element): string {
  const role = explicitRole(el);
  if (role) return role;
  const tag = el.tagName;
  if (tag === "BUTTON" || tag === "SUMMARY") return "button";
  if (tag === "A" && el.hasAttribute("href")) return "link";
  if (/^H[1-6]$/.test(tag)) return "heading";
  if (tag === "OPTION") return "option";
  if (tag === "TD") return "cell";
  if (tag === "TH") return "columnheader";
  return "";
}

/** True when the element's own text may be its accessible name. */
const namedFromContent = (el: Element) => NAME_FROM_CONTENT.has(roleOf(el));

/** True when an `aria-label` on a nested element replaces its text. */
function takesLabel(el: Element): boolean {
  const role = explicitRole(el);
  if (role) return !NAME_PROHIBITED.has(role);
  return (
    el.tagName === "IMG" ||
    NATIVE_INTERACTIVE.test(el.tagName) ||
    (el.tagName === "A" && el.hasAttribute("href"))
  );
}

/**
 * Hidden from assistive technology: `aria-hidden`, `hidden` (any value, `until-found` too), or
 * hidden by CSS. A visible child inside a `visibility: hidden` parent is treated as hidden too.
 */
function isHidden(el: Element): boolean {
  if (el.getAttribute("aria-hidden") === "true" || el.hasAttribute("hidden")) return true;
  const view = el.ownerDocument.defaultView;
  if (!view) return false;
  const style = view.getComputedStyle(el);
  return (
    style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse"
  );
}

/**
 * Text of a subtree as a screen reader would read it: hidden parts (ARIA, `hidden` or CSS) are
 * skipped, a nested `aria-label` on a nameable element or an image `alt` stands in for its
 * element as separate words, inline elements join their neighbours (`Co<b>py</b>` reads "Copy")
 * and block elements read as separate words. A nested `aria-labelledby` is not followed.
 * `root` is read even when hidden, as `aria-labelledby` does with the elements it points to,
 * and its own `aria-label` always counts.
 */
export function textOf(node: Node, root = true): string {
  if (node.nodeType === 3) return node.textContent ?? "";
  if (node.nodeType !== 1) return "";
  const el = node as Element;
  if (!root && isHidden(el)) return "";
  const label = el.getAttribute("aria-label");
  if (label?.trim() && (root || takesLabel(el))) return ` ${label} `;
  if (el.tagName === "IMG") return ` ${el.getAttribute("alt") ?? ""} `;
  const text = Array.from(el.childNodes, (child) => textOf(child, false)).join("");
  return BLOCK.test(el.tagName) ? ` ${text} ` : text;
}

/**
 * Where a name comes from. `labelledby`: `aria-labelledby`. `label`: `<label>` elements.
 * `own`: the element itself (`aria-label`, `value`, `alt` or its own text). `title`: a native
 * `title` only. `none`: no name.
 */
export type NameSource = "labelledby" | "label" | "own" | "title" | "none";

export interface ResolvedName {
  /** The trigger's accessible name; empty when it has none. */
  name: string;
  /** Where the name comes from. */
  source: NameSource;
}

/**
 * Resolves an element's accessible name from the DOM, in the order the accessible name
 * computation uses: `aria-labelledby`, `aria-label`, an associated `<label>`, its own text (only
 * for roles named from content, such as button or link), then a native `title`.
 */
export function accessibleName(el: HTMLElement): ResolvedName {
  const doc = el.ownerDocument;
  const ids = el.getAttribute("aria-labelledby");
  if (ids) {
    const text = ids
      .split(/\s+/)
      .map((id) => {
        if (!id) return "";
        const target = doc.getElementById(id);
        if (!target) return "";
        // The trigger may list itself; it then counts with its aria-label or own text.
        if (target === el) {
          const own = el.getAttribute("aria-label");
          return own?.trim() ? own : textOf(el);
        }
        return textOf(target);
      })
      .join(" ");
    if (normalise(text)) return { name: text, source: "labelledby" };
  }
  const label = el.getAttribute("aria-label");
  if (label?.trim()) return { name: label, source: "own" };
  const labels = (el as HTMLInputElement).labels as NodeListOf<HTMLLabelElement> | null | undefined;
  if (labels && labels.length > 0) {
    const text = Array.from(labels, (node) => textOf(node)).join(" ");
    if (normalise(text)) return { name: text, source: "label" };
  }
  if (el.tagName === "INPUT") {
    const input = el as HTMLInputElement;
    if (["submit", "button", "reset"].includes(input.type) && input.value.trim()) {
      return { name: input.value, source: "own" };
    }
    const alt = input.type === "image" ? input.getAttribute("alt") : null;
    if (alt?.trim()) return { name: alt, source: "own" };
  }
  if (namedFromContent(el)) {
    const own = textOf(el);
    if (normalise(own)) return { name: own, source: "own" };
  }
  const title = el.getAttribute("title") ?? "";
  return title.trim() ? { name: title, source: "title" } : { name: "", source: "none" };
}

/**
 * True when a tooltip with `text` only repeats the trigger's name: describing it again would
 * make screen readers say the same words twice. A name built from other elements
 * (`aria-labelledby` or a `<label>`) that already contains the words, as whole words, counts as
 * a repeat too.
 */
export function repeatsName(trigger: HTMLElement, text: string): boolean {
  const words = normalise(text);
  if (!words) return false;
  const { name, source } = accessibleName(trigger);
  const resolved = normalise(name);
  const fromLabel = source === "labelledby" || source === "label";
  return resolved === words || (fromLabel && ` ${resolved} `.includes(` ${words} `));
}
