import {
  createContext,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useIsomorphicLayoutEffect } from "../../hooks/useFloating";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useLabels } from "../../locale";
import { usePresence } from "../../motion/usePresence";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import type { NavDestination } from "../../utils/navDestination";
import { Badge } from "../Badge";
import { Offcanvas } from "../Offcanvas";

/** A destination nested under a {@link SidebarItem}. One level only: deeper trees are TreeView. */
export interface SidebarSubItem extends Pick<NavDestination, "key" | "label" | "href" | "badge"> {
  /** Greys the row out and takes it out of the tab order. */
  disabled?: boolean;
}

/**
 * A top-level destination. The shared {@link NavDestination} shape with an optional mark, so the
 * same data can also feed a NavigationRail (which requires the mark).
 */
export interface SidebarItem extends Omit<NavDestination, "mark"> {
  /**
   * A kanji or a typographic glyph shown before the label. Never the only label: it is hidden
   * from assistive tech.
   */
  mark?: string;
  /** Greys the row out and takes it out of the tab order. */
  disabled?: boolean;
  /**
   * Nested destinations, one level deep. The item gets a +/− toggle; without an `href` the
   * whole row is the toggle.
   */
  children?: readonly SidebarSubItem[];
}

/** A titled group of destinations. */
export interface SidebarSection {
  /** Identifier of the section; also its entry in the expanded keys when it is collapsible. */
  key: string;
  /** Short sentence-case title. It labels the list; it is not a heading. */
  title?: ReactNode;
  /** The destinations of the group, in order. */
  items: readonly SidebarItem[];
  /** Lets the title collapse the group. Needs a `title`. */
  collapsible?: boolean;
}

export type SidebarVariant = "standard" | "modal";
export type SidebarPlacement = "start" | "end";

export interface SidebarProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onSelect" | "children"
> {
  /** The groups, in order. Use `sections` or `items`, not both. */
  sections?: readonly SidebarSection[];
  /** Shorthand for a single untitled section. */
  items?: readonly SidebarItem[];
  /** The `key` of the current destination (item or sub-item): it gets `aria-current="page"`. */
  active?: string;
  /**
   * Called with the `key` and the click event when a destination is activated. For an item with
   * an `href`, call `event.preventDefault()` to route on the client. Toggles do not call it.
   */
  onSelect?: (key: string, event: MouseEvent<HTMLElement>) => void;
  /**
   * Controlled list of the open collapsible sections and parent items. Keys must be unique
   * across the whole sidebar.
   */
  expanded?: readonly string[];
  /**
   * Open keys when uncontrolled. Defaults to every collapsible section plus the ancestors of
   * `active`.
   */
  defaultExpanded?: readonly string[];
  /** Called with the next list of open keys when a section or parent item is toggled. */
  onExpandedChange?: (keys: string[]) => void;
  /** Pinned above the destinations (a brand or workspace block). Outside the navigation landmark. */
  header?: ReactNode;
  /** Pinned below the destinations (an account block). Outside the navigation landmark. */
  footer?: ReactNode;
  /** Name of the navigation landmark and of the modal drawer. Defaults to the locale's. */
  label?: string;
  /**
   * `standard` sits in the page flow; `modal` is a drawer in an Offcanvas.
   * @default "standard"
   */
  variant?: SidebarVariant;
  /**
   * Viewport width in px below which the standard sidebar renders as the modal one. Crossing the
   * width calls `onOpenChange(false)` when it becomes modal and `onOpenChange(true)` when it is
   * standard again, so the drawer never pops open on resize.
   */
  modalBelow?: number;
  /** Controlled visibility. */
  open?: boolean;
  /**
   * Initial visibility when uncontrolled. Open for `standard`, closed for `modal`.
   */
  defaultOpen?: boolean;
  /** Called with the next visibility (modal close, a destination chosen, a breakpoint crossed). */
  onOpenChange?: (open: boolean) => void;
  /**
   * In the modal variant, close after a destination is activated.
   * @default true
   */
  closeOnSelect?: boolean;
  /**
   * The edge it sits on; follows the writing direction.
   * @default "start"
   */
  placement?: SidebarPlacement;
}

interface SidebarContextValue {
  id: string;
  active: string | undefined;
  expanded: ReadonlySet<string>;
  hasMarks: boolean;
  within: string;
  toggle: (key: string) => void;
  select: (key: string, event: MouseEvent<HTMLElement>) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function useSidebar(): SidebarContextValue {
  const value = useContext(SidebarContext);
  if (!value) throw new Error("Sidebar parts must render inside a Sidebar.");
  return value;
}

const CJK = /[぀-ヿ㐀-鿿]/;
const ITEMS_KEY = "items";
const MAX_STAGGER = 6;

function hasContent(node: ReactNode): boolean {
  return node != null && node !== false && node !== "";
}

/** Sets the position in the unfold; the stylesheet turns it into a delay. */
function fold(index: number): CSSProperties {
  return { "--ol-i": Math.min(index, MAX_STAGGER) } as CSSProperties;
}

function isCollapsible(section: SidebarSection): boolean {
  return section.collapsible === true && hasContent(section.title);
}

/** Section and parent keys that must be open for `active` to be visible. */
function ancestorsOf(groups: readonly SidebarSection[], active: string | undefined): string[] {
  if (active === undefined) return [];
  const keys: string[] = [];
  for (const section of groups) {
    for (const item of section.items) {
      const inside = item.key === active || item.children?.some((child) => child.key === active);
      if (!inside) continue;
      if (isCollapsible(section)) keys.push(section.key);
      if (item.children?.some((child) => child.key === active)) keys.push(item.key);
    }
  }
  return keys;
}

/**
 * Presence for a list that folds open and shut. `animate` turns on after the first change, so a
 * list that starts open does not play its unfold on mount.
 */
function useFold<T extends HTMLElement>(open: boolean, ownerId?: string) {
  // A list that folds while focus is inside it hands focus back to the control that owns it.
  const { mounted, state, setElement } = usePresence<T>(
    open,
    ownerId === undefined
      ? {}
      : {
          returnFocus: () => {
            document.getElementById(ownerId)?.focus();
          },
        },
  );
  const [seen, setSeen] = useState(open);
  const [animate, setAnimate] = useState(false);
  if (seen !== open) {
    setSeen(open);
    setAnimate(true);
  }
  return { mounted, state, setElement, animate };
}

/* ---------- Rows ---------- */

interface RowProps {
  item: SidebarItem | SidebarSubItem;
  id: string;
  sub?: boolean;
  /** Ancestor of the current page, collapsed: say so after the label. */
  within?: boolean;
  /** Parent without an `href`: the whole row toggles instead of selecting. */
  toggles?: { open: boolean; controls: string | undefined; onToggle: () => void };
}

function Row({ item, id, sub = false, within = false, toggles }: RowProps) {
  const ctx = useSidebar();
  const mark = "mark" in item ? item.mark : undefined;
  const current = !toggles && ctx.active === item.key;
  const disabled = item.disabled === true;
  const className = cx(
    "ol-sidebar__item",
    sub && "ol-sidebar__item--sub",
    toggles && "ol-sidebar__item--parent",
  );
  const common = {
    id,
    className,
    "aria-current": current ? ("page" as const) : undefined,
    "data-within": within ? "" : undefined,
  };
  const content = (
    <>
      {!sub && ctx.hasMarks && (
        <span
          className="ol-sidebar__mark"
          aria-hidden="true"
          lang={mark !== undefined && CJK.test(mark) ? "ja" : undefined}
        >
          {mark}
        </span>
      )}
      <span id={`${id}-label`} className="ol-sidebar__label">
        {item.label}
      </span>
      {within && <span className="ol-sr">, {ctx.within}</span>}
      {item.badge != null && (
        <Badge tone="accent" count className="ol-sidebar__badge">
          <span className="ol-sr">, </span>
          {item.badge}
        </Badge>
      )}
      {toggles && (
        <span className="ol-sidebar__sign" aria-hidden="true">
          {toggles.open ? "−" : "+"}
        </span>
      )}
    </>
  );

  if (toggles) {
    return (
      <button
        {...common}
        type="button"
        disabled={disabled}
        aria-expanded={toggles.open}
        aria-controls={toggles.controls}
        onClick={toggles.onToggle}
      >
        {content}
      </button>
    );
  }
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    ctx.select(item.key, event);
  };
  if (item.href !== undefined) {
    return (
      <a
        {...common}
        // A disabled link has no href, so it is not focusable or navigable.
        href={disabled ? undefined : item.href}
        role={disabled ? "link" : undefined}
        aria-disabled={disabled ? true : undefined}
        onClick={handleClick}
      >
        {content}
      </a>
    );
  }
  return (
    <button {...common} type="button" disabled={disabled} onClick={handleClick}>
      {content}
    </button>
  );
}

function Entry({ item, path }: { item: SidebarItem; path: string }) {
  const ctx = useSidebar();
  const children = item.children;
  const parent = children !== undefined && children.length > 0;
  const open = parent && item.disabled !== true && ctx.expanded.has(item.key);
  const { mounted, state, setElement, animate } = useFold<HTMLUListElement>(
    open,
    item.href === undefined ? `${ctx.id}-${path}` : `${ctx.id}-${path}-toggle`,
  );
  const rowId = `${ctx.id}-${path}`;
  const listId = `${rowId}-list`;

  if (!parent) return <Row item={item} id={rowId} />;

  const within = !open && children.some((child) => child.key === ctx.active);
  const toggle = () => {
    ctx.toggle(item.key);
  };
  const controls = mounted ? listId : undefined;
  return (
    <>
      {item.href === undefined ? (
        <Row
          item={item}
          id={rowId}
          within={within}
          toggles={{ open, controls, onToggle: toggle }}
        />
      ) : (
        <div className="ol-sidebar__row">
          <Row item={item} id={rowId} within={within} />
          <button
            type="button"
            id={`${rowId}-toggle`}
            className="ol-sidebar__toggle"
            disabled={item.disabled}
            aria-expanded={open}
            aria-controls={controls}
            aria-labelledby={`${rowId}-label`}
            onClick={toggle}
          >
            <span className="ol-sidebar__sign" aria-hidden="true">
              {open ? "−" : "+"}
            </span>
          </button>
        </div>
      )}
      {mounted && (
        <ul
          ref={setElement}
          id={listId}
          className="ol-sidebar__sublist"
          data-state={state}
          data-animate={animate ? "" : undefined}
        >
          {children.map((child, index) => (
            <li key={child.key} style={fold(index)}>
              <Row item={child} id={`${rowId}-${String(index)}`} sub />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Section({ section, index }: { section: SidebarSection; index: number }) {
  const ctx = useSidebar();
  const collapsible = isCollapsible(section);
  const titled = hasContent(section.title);
  const open = !collapsible || ctx.expanded.has(section.key);
  const base = `${ctx.id}-s${String(index)}`;
  const titleId = `${base}-title`;
  const { mounted, state, setElement, animate } = useFold<HTMLUListElement>(open, titleId);
  const listId = `${base}-list`;
  const within =
    collapsible &&
    !open &&
    section.items.some(
      (item) => item.key === ctx.active || item.children?.some((child) => child.key === ctx.active),
    );

  return (
    <li className="ol-sidebar__section" data-state={open ? "open" : "closed"}>
      {titled &&
        (collapsible ? (
          <button
            type="button"
            id={titleId}
            className="ol-sidebar__title ol-sidebar__title--toggle"
            aria-expanded={open}
            aria-controls={mounted ? listId : undefined}
            data-within={within ? "" : undefined}
            onClick={() => {
              ctx.toggle(section.key);
            }}
          >
            <span className="ol-sidebar__title-text">{section.title}</span>
            {within && <span className="ol-sr">, {ctx.within}</span>}
            <span className="ol-sidebar__sign" aria-hidden="true">
              {open ? "−" : "+"}
            </span>
          </button>
        ) : (
          <div id={titleId} className="ol-sidebar__title">
            <span className="ol-sidebar__title-text">{section.title}</span>
          </div>
        ))}
      {mounted && (
        <ul
          ref={setElement}
          id={listId}
          className="ol-sidebar__list"
          aria-labelledby={titled ? titleId : undefined}
          data-state={state}
          data-animate={animate ? "" : undefined}
        >
          {section.items.map((item, itemIndex) => (
            <li key={item.key} className="ol-sidebar__entry" style={fold(itemIndex)}>
              <Entry item={item} path={`s${String(index)}-i${String(itemIndex)}`} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/* ---------- Frame ---------- */

interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect" | "children"> {
  groups: readonly SidebarSection[];
  name: string;
  header: ReactNode;
  footer: ReactNode;
  placement: SidebarPlacement;
  modal: boolean;
  state?: "open" | "closing";
  animate?: boolean;
  rootRef: Ref<HTMLDivElement>;
  /** Set when the panel unmounts with focus inside it. */
  lostFocusRef: RefObject<boolean>;
}

function Panel({
  groups,
  name,
  header,
  footer,
  placement,
  modal,
  state,
  animate = false,
  rootRef,
  lostFocusRef,
  className,
  ...rest
}: PanelProps) {
  const navRef = useRef<HTMLElement | null>(null);

  // Remembers whether focus was inside when the panel goes, so the app's opener can take it.
  useIsomorphicLayoutEffect(() => {
    const node = navRef.current?.parentElement;
    lostFocusRef.current = false;
    return () => {
      if (node?.contains(document.activeElement)) lostFocusRef.current = true;
    };
  }, [lostFocusRef]);

  // Bring the current destination into view on mount, scrolling the list and nothing else.
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current) return;
    const box = nav.getBoundingClientRect();
    const row = current.getBoundingClientRect();
    if (row.top < box.top) nav.scrollTop -= box.top - row.top;
    else if (row.bottom > box.bottom) nav.scrollTop += row.bottom - box.bottom;
  }, []);

  return (
    <div
      {...rest}
      ref={rootRef}
      className={cx(
        "ol-sidebar",
        placement === "end" && "ol-sidebar--end",
        modal && "ol-sidebar--modal",
        className,
      )}
      data-state={state}
      data-animate={animate ? "" : undefined}
    >
      {hasContent(header) && <div className="ol-sidebar__header">{header}</div>}
      <nav ref={navRef} className="ol-sidebar__nav" aria-label={name}>
        <ul className="ol-sidebar__sections">
          {groups.map((section, index) => (
            <Section key={section.key} section={section} index={index} />
          ))}
        </ul>
      </nav>
      {hasContent(footer) && <div className="ol-sidebar__footer">{footer}</div>}
    </div>
  );
}

/**
 * The persistent side navigation of a content-heavy product: titled sections of links, sections
 * that fold shut, one nested level, counts, and a header and footer for the brand and the
 * account. It sits in the page flow at 280px; as a modal (or below `modalBelow`) the same content
 * opens in an Offcanvas. It is a `nav`, not a menu or a tree: Tab moves through the links and
 * toggles, and the current destination carries `aria-current="page"` and an olivo edge. For a
 * narrow form, swap to NavigationRail with the same items.
 */
export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(function Sidebar(
  {
    sections,
    items,
    active,
    onSelect,
    expanded: expandedProp,
    defaultExpanded,
    onExpandedChange,
    header,
    footer,
    label,
    variant = "standard",
    modalBelow,
    open: openProp,
    defaultOpen,
    onOpenChange,
    closeOnSelect = true,
    placement = "start",
    id,
    ...rest
  },
  ref,
) {
  const dictionary = useLabels();
  const baseId = useId();

  const groups: readonly SidebarSection[] = sections ?? (items ? [{ key: ITEMS_KEY, items }] : []);
  const both = sections !== undefined && items !== undefined;
  const untitled = groups.some(
    (section) => section.collapsible === true && !hasContent(section.title),
  );
  useEffect(() => {
    if (both) devWarn("Sidebar", "pass `sections` or `items`, not both; `items` is ignored.");
    if (untitled)
      devWarn("Sidebar", "a collapsible section needs a `title`; it stays open without one.");
  }, [both, untitled]);

  /* ---------- Open state and the breakpoint ---------- */

  const narrow = useMediaQuery(
    modalBelow === undefined ? "not all" : `(max-width: ${String(modalBelow - 0.02)}px)`,
  );
  const below = variant === "standard" && modalBelow !== undefined && narrow;
  const modal = variant === "modal" || below;
  const [open, setOpen] = useControllable(openProp, defaultOpen ?? !modal, onOpenChange);
  // The `below` value the app has been told about; until they match the drawer stays shut, so a
  // resize never flashes it open.
  const [told, setTold] = useState(false);
  const latest = useRef({ setOpen });
  useEffect(() => {
    latest.current = { setOpen };
  });
  const lostFocusRef = useRef(false);
  useEffect(() => {
    if (told === below) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- records the width the app was told about
    setTold(below);
    latest.current.setOpen(!below);
    // The standard panel was replaced by a closed drawer while focus was inside it: give focus
    // to the control that opens the sidebar, when the app named it with `aria-controls`.
    const active = document.activeElement;
    if (below && lostFocusRef.current && (active === null || active === document.body)) {
      const opener = [...document.querySelectorAll<HTMLElement>("[aria-controls]")].find(
        (element) =>
          id !== undefined && element.getAttribute("aria-controls")?.split(/\s+/).includes(id),
      );
      opener?.focus();
    }
    lostFocusRef.current = false;
  }, [told, below, id]);
  const shown = open && told === below;

  /* ---------- Expanded sections ---------- */

  const [initialExpanded] = useState(
    () =>
      defaultExpanded ?? [
        ...groups.filter(isCollapsible).map((section) => section.key),
        ...ancestorsOf(groups, active),
      ],
  );
  const [expandedKeys, setExpanded] = useControllable<readonly string[]>(
    expandedProp,
    initialExpanded,
    onExpandedChange &&
      ((keys) => {
        onExpandedChange([...keys]);
      }),
  );
  const expandedSet = new Set(expandedKeys);
  const current = useRef({
    groups,
    expandedKeys,
    controlled: expandedProp !== undefined,
    setExpanded,
  });
  useEffect(() => {
    current.current = { groups, expandedKeys, controlled: expandedProp !== undefined, setExpanded };
  });
  // Uncontrolled: a new current page opens the sections and parents that hide it. The page it
  // starts on is left to `defaultExpanded`.
  const seenActive = useRef(active);
  useEffect(() => {
    if (seenActive.current === active) return;
    seenActive.current = active;
    const {
      groups: latestGroups,
      expandedKeys: keys,
      controlled,
      setExpanded: set,
    } = current.current;
    if (controlled) return;
    const missing = ancestorsOf(latestGroups, active).filter((key) => !keys.includes(key));
    if (missing.length > 0) set([...keys, ...missing]);
  }, [active]);

  const toggle = (key: string) => {
    setExpanded(
      expandedSet.has(key) ? expandedKeys.filter((k) => k !== key) : [...expandedKeys, key],
    );
  };
  const select = (key: string, event: MouseEvent<HTMLElement>) => {
    onSelect?.(key, event);
    if (modal && closeOnSelect) setOpen(false);
  };

  const context: SidebarContextValue = {
    id: baseId,
    active,
    expanded: expandedSet,
    hasMarks: groups.some((section) => section.items.some((item) => item.mark !== undefined)),
    within: dictionary.sidebarWithin,
    toggle,
    select,
  };

  /* ---------- Standard: in the flow, slides in and out ---------- */

  const { mounted, state, setElement, animate } = useFold<HTMLDivElement>(shown && !modal);
  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      setElement(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [setElement, ref],
  );

  const name = label ?? dictionary.sidebarLabel;
  const panel = {
    groups,
    name,
    header,
    footer,
    placement,
    id,
    ...rest,
  };

  if (modal) {
    return (
      <Offcanvas
        open={shown}
        onClose={() => {
          setOpen(false);
        }}
        title={name}
        placement={placement}
        className="ol-sidebar-drawer"
      >
        <SidebarContext.Provider value={context}>
          <Panel {...panel} modal rootRef={ref} lostFocusRef={lostFocusRef} />
        </SidebarContext.Provider>
      </Offcanvas>
    );
  }
  if (!mounted) return null;
  return (
    <SidebarContext.Provider value={context}>
      <Panel
        {...panel}
        modal={false}
        state={state === "closing" ? "closing" : "open"}
        animate={animate}
        rootRef={setRoot}
        lostFocusRef={lostFocusRef}
      />
    </SidebarContext.Provider>
  );
});
