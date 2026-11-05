import {
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useLabels } from "../../locale";
import { useIndicator } from "../../motion/useIndicator";
import { cx } from "../../utils/cx";
import {
  ancestorsOf,
  buildTree,
  resolveEntry,
  type TableOfContentsDepth,
  type TableOfContentsItem,
  type TocNode,
} from "./tree";
import { type ScrollRoot, useScrollSpy } from "./useScrollSpy";

export type { TableOfContentsDepth, TableOfContentsItem } from "./tree";

export interface TableOfContentsProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "title" | "onSelect"
> {
  /**
   * The entries in document order. Nesting is derived from `level`, relative to the smallest
   * level in the list. Renders nothing when empty.
   */
  items: readonly TableOfContentsItem[];
  /**
   * How many nested levels are shown. Deeper entries are dropped from the list and from the
   * spy; their sections belong to the entry above.
   * @default 2
   */
  maxDepth?: TableOfContentsDepth;
  /** The `id` of the current entry (controlled). `null` means none. */
  active?: string | null;
  /** The current entry before the reader has scrolled (uncontrolled). @default null */
  defaultActive?: string | null;
  /** Called when scrolling, a click or a hash change selects a different entry. */
  onActiveChange?: (id: string | null) => void;
  /**
   * Follow scrolling. With `false` only clicks, hash changes and `active` move the stroke.
   * @default true
   */
  spy?: boolean;
  /** The scrolling element that holds the headings, for a document inside a panel. Default: the viewport. */
  scrollRoot?: ScrollRoot;
  /**
   * Distance in px from the top of the scroll area to the reading line: the height of the
   * sticky chrome above the content. Default: the `scroll-margin-block-start` of the first
   * heading, so the CSS rule that positions a click (`.ol-anchor`) also positions the spy.
   */
  offset?: number;
  /** Called when a link is clicked. Call `event.preventDefault()` to route on the client. */
  onSelect?: (id: string, event: MouseEvent<HTMLAnchorElement>) => void;
  /**
   * Stays in view while the page scrolls (at `--ol-toc-top`; by default the page's `--ol-anchor-offset`, so the index and the headings stop below the same sticky chrome, else a space token) and
   * scrolls inside itself when taller than the viewport.
   * @default false
   */
  sticky?: boolean;
  /**
   * A visible title above the list; `true` uses the locale's "On this page". It names the
   * landmark and is a label, not a heading.
   * @default false
   */
  title?: ReactNode;
  /**
   * Accessible name of the navigation landmark when no title is shown. Defaults to the locale's
   * "On this page". Give a distinct one if the page has other `nav`s.
   */
  label?: string;
}

/** Reads the target of a hash such as `#install` or `#%C3%A9t%C3%A9`. */
function idFromHash(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (raw === "") return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * The "On this page" index of a long document: links to its headings, nested by level, with a
 * scroll-spy that marks the section being read. A hairline rail runs down the inline start side
 * and a 3px olivo stroke travels along it. The current link carries `aria-current="location"`.
 * Use Nav for a fixed list, Tabs for panels, Sidebar for site navigation.
 */
export const TableOfContents = forwardRef<HTMLElement, TableOfContentsProps>(
  function TableOfContents(
    {
      items,
      maxDepth = 2,
      active,
      defaultActive = null,
      onActiveChange,
      spy = true,
      scrollRoot,
      offset,
      onSelect,
      sticky = false,
      title = false,
      label,
      className,
      ...rest
    },
    ref,
  ) {
    const labels = useLabels();
    const titleId = useId();
    const tree = useMemo(() => buildTree(items, maxDepth), [items, maxDepth]);
    const [value, setValue] = useControllable<string | null>(active, defaultActive, onActiveChange);
    const entry = resolveEntry(tree, value);
    const current = entry?.item.id ?? null;
    const within = useMemo(() => ancestorsOf(tree, entry), [tree, entry]);
    const ids = useMemo(() => tree.visible.map((e) => e.item.id), [tree]);
    const idsKey = ids.join("\u0000");

    // A click or a hash change made an entry current: the spy leaves it alone until the reader scrolls.
    const pin = useRef<string | null>(null);
    const latest = useRef<{
      setValue: (id: string | null) => void;
      ids: string[];
      current: string | null;
      refresh: (() => void) | null;
    }>({ setValue, ids, current, refresh: null });
    useEffect(() => {
      latest.current = { ...latest.current, setValue, ids, current };
    });

    // The entry becomes current at once. It is pinned only when its heading exists to scroll to.
    const select = (id: string, exists: boolean): void => {
      if (exists) pin.current = id;
      setValue(id);
    };

    // The hash at load, and the Back and Forward buttons. The spy itself never writes the hash.
    const hashRead = useRef(false);
    useEffect(() => {
      if (hashRead.current || idsKey === "") return;
      hashRead.current = true;
      const id = idFromHash(window.location.hash);
      if (id !== null && latest.current.ids.includes(id)) {
        if (document.getElementById(id)) pin.current = id;
        latest.current.setValue(id);
      }
    }, [idsKey]);
    useEffect(() => {
      const onHash = (): void => {
        const id = idFromHash(window.location.hash);
        if (id === null || !latest.current.ids.includes(id)) {
          // Back to an address with no entry in it: the reader is where the page says, not the pin.
          pin.current = null;
          latest.current.refresh?.();
          return;
        }
        // Pinned only when the page has the heading the address points at.
        pin.current = document.getElementById(id) ? id : null;
        if (id !== latest.current.current) latest.current.setValue(id);
      };
      window.addEventListener("hashchange", onHash);
      return () => {
        window.removeEventListener("hashchange", onHash);
      };
    }, []);

    const refresh = useScrollSpy({
      ids,
      enabled: spy,
      root: scrollRoot,
      offset,
      active: current,
      onChange: setValue,
      pin,
    });

    useEffect(() => {
      latest.current.refresh = refresh;
    }, [refresh]);

    const track = useRef<HTMLDivElement | null>(null);
    const markRef = useIndicator<HTMLDivElement>(current, {
      axis: "block",
      selector: '[aria-current="location"]',
    });
    const setTrack = useCallback(
      (node: HTMLDivElement | null): void => {
        track.current = node;
        markRef(node);
      },
      [markRef],
    );

    // A long sticky list: keep the current link in view inside the list, never scroll the page.
    useEffect(() => {
      const box = track.current;
      const link = box?.querySelector<HTMLElement>('[aria-current="location"]');
      if (!sticky || !box || !link || box.scrollHeight <= box.clientHeight) return;
      const inside = box.contains(document.activeElement) || box.matches(":hover");
      if (inside) return;
      const view = box.getBoundingClientRect();
      const row = link.getBoundingClientRect();
      if (row.top < view.top) box.scrollTop += row.top - view.top;
      else if (row.bottom > view.bottom) box.scrollTop += row.bottom - view.bottom;
    }, [sticky, current]);

    if (tree.roots.length === 0) return null;

    const hasTitle = title !== false && title !== null && title !== "";
    const titleNode = title === true ? labels.tocLabel : title;

    const renderList = (nodes: readonly TocNode[], nested: boolean): ReactNode => (
      <ul className={cx("ol-toc__list", nested && "ol-toc__list--nested")}>
        {nodes.map((node) => {
          const { id, label: text, href } = node.item;
          const isCurrent = id === current;
          return (
            <li key={id} className="ol-toc__item">
              <a
                className={cx("ol-toc__link", isCurrent && "ol-toc__link--active")}
                href={href ?? `#${id}`}
                data-level={node.depth + 1}
                data-within={within.has(id) ? "" : undefined}
                aria-current={isCurrent ? "location" : undefined}
                onClick={(event) => {
                  // A modified click opens a tab or a window: the page here does not move.
                  if (
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  )
                    return;
                  onSelect?.(id, event);
                  select(id, event.currentTarget.ownerDocument.getElementById(id) !== null);
                }}
              >
                {text}
              </a>
              {node.children.length > 0 && renderList(node.children, true)}
            </li>
          );
        })}
      </ul>
    );

    return (
      <nav
        ref={ref}
        aria-labelledby={hasTitle ? titleId : undefined}
        aria-label={hasTitle ? undefined : (label ?? labels.tocLabel)}
        className={cx("ol-toc", sticky && "ol-toc--sticky", className)}
        {...rest}
      >
        {hasTitle && (
          <p id={titleId} className="ol-toc__title">
            {titleNode}
          </p>
        )}
        <div ref={setTrack} className="ol-toc__track">
          <span className="ol-indicator ol-indicator--block" aria-hidden="true" />
          {renderList(tree.roots, false)}
        </div>
      </nav>
    );
  },
);
