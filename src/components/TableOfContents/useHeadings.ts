import { type RefObject, useEffect, useRef, useState } from "react";

import { devWarn } from "../../utils/dev";
import type { TableOfContentsItem } from "./tree";

export interface UseHeadingsOptions {
  /**
   * Where to look: an element, a ref to one, or a CSS selector. Defaults to the whole document.
   * The scan runs after mount, so a ref is read once it is attached.
   */
  root?: HTMLElement | RefObject<HTMLElement | null> | string | null;
  /** The headings to collect. @default "h2, h3" */
  selector?: string;
  /**
   * Shorthand for `selector` that lists heading levels, e.g. `[2, 3]` for `"h2, h3"`.
   * `selector` wins when both are given.
   */
  levels?: readonly number[];
}

const DEFAULT_SELECTOR = "h2, h3";

/** Headings in or under these are not part of the outline: marked out, hidden or inert. */
const SKIPPED = '[data-toc-ignore], [hidden], [aria-hidden="true"], [inert]';

/** Parts of a heading's text that do not belong in the list: decoration and marked-out bits. */
const NOISE = '[aria-hidden="true"], [data-toc-ignore]';

/** The text of a heading without its decoration. Works on a copy: the page is never edited. */
function labelOf(heading: Element): string {
  if (!heading.querySelector(NOISE)) return heading.textContent.trim();
  const copy = heading.cloneNode(true) as Element;
  for (const noise of copy.querySelectorAll(NOISE)) noise.remove();
  return copy.textContent.trim();
}

/** True when a mutation happened inside a TableOfContents: its own re-render is not news. */
function insideToc(record: MutationRecord): boolean {
  const node = record.target;
  const el = node instanceof Element ? node : node.parentElement;
  return el?.closest(".ol-toc") != null;
}

function selectorFor(selector: string | undefined, levels: readonly number[] | undefined): string {
  if (selector !== undefined) return selector;
  if (levels && levels.length > 0) return levels.map((level) => `h${String(level)}`).join(", ");
  return DEFAULT_SELECTOR;
}

function resolveRoot(root: UseHeadingsOptions["root"]): ParentNode | null {
  if (root === undefined || root === null) return document;
  if (typeof root === "string") return document.querySelector(root);
  if ("current" in root) return root.current;
  return root;
}

/** The level of a heading: `data-toc-level`, else the number in its `h1`–`h6` tag, else 1. */
function levelOf(heading: Element): number {
  const given = Number(heading.getAttribute("data-toc-level"));
  if (Number.isInteger(given) && given > 0) return given;
  const tag = /^H([1-6])$/.exec(heading.tagName);
  return tag?.[1] ? Number(tag[1]) : 1;
}

function same(a: readonly TableOfContentsItem[], b: readonly TableOfContentsItem[]): boolean {
  return (
    a.length === b.length &&
    a.every((item, i) => {
      const other = b[i];
      return other?.id === item.id && other.label === item.label && other.level === item.level;
    })
  );
}

/**
 * Reads the headings of the rendered page into `items` for a {@link TableOfContents}, and keeps
 * the list in step when the page changes. Headings need an `id` (the ones without are skipped,
 * with a development warning); headings marked `data-toc-ignore`, and headings inside an
 * element marked `data-toc-ignore`, `hidden`, `aria-hidden="true"` or `inert`, are skipped too.
 * Decorative parts of a heading (`aria-hidden="true"` or `data-toc-ignore`) stay out of its label. The level comes from the tag or from `data-toc-level`.
 *
 * It returns an empty list on the server and on the first client render, and never edits the
 * page. If the page is rendered at build time (MDX, Markdown), build `items` there instead: the
 * list then exists in the server HTML and nothing pops in.
 */
export function useHeadings({
  root,
  selector,
  levels,
}: UseHeadingsOptions = {}): TableOfContentsItem[] {
  const [items, setItems] = useState<TableOfContentsItem[]>([]);
  const warned = useRef(new WeakSet<Element>());
  const query = selectorFor(selector, levels);

  useEffect(() => {
    const scope = resolveRoot(root);
    const scan = (): void => {
      const next: TableOfContentsItem[] = [];
      for (const heading of scope?.querySelectorAll(query) ?? []) {
        if (heading.closest(SKIPPED)) continue;
        if (heading.id === "") {
          if (!warned.current.has(heading)) {
            warned.current.add(heading);
            devWarn("useHeadings", "skipped a heading without an id");
          }
          continue;
        }
        const level = levelOf(heading);
        next.push({ id: heading.id, label: labelOf(heading), level });
      }
      setItems((previous) => (same(previous, next) ? previous : next));
    };
    scan();
    if (!scope || typeof MutationObserver !== "function") return;
    // Several changes in one frame cost one scan.
    let frame: number | undefined;
    const schedule = (records: MutationRecord[]): void => {
      if (frame !== undefined || records.every(insideToc)) return;
      frame = requestAnimationFrame(() => {
        frame = undefined;
        scan();
      });
    };
    const observer = new MutationObserver(schedule);
    observer.observe(scope instanceof Document ? scope.body : scope, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["id", "data-toc-ignore", "data-toc-level"],
    });
    return () => {
      observer.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [root, query]);

  return items;
}
