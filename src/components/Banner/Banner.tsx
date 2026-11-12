import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useStickyChrome } from "../../hooks/useStickyChrome";
import { useLabels } from "../../locale";
import { type PresenceOptions, usePresence } from "../../motion/usePresence";
import { cx } from "../../utils/cx";
import { DEV, devWarn } from "../../utils/dev";
import { CloseButton } from "../CloseButton";

export type BannerTone = "neutral" | "info" | "success" | "warning" | "danger";

/**
 * `status`: a state of the page, coloured by `tone`. `promo`: an announcement, a full maple strip
 * under the Navbar.
 */
export type BannerVariant = "status" | "promo";

/** `off`: a named region, not announced. `polite`: `role="status"`. `assertive`: `role="alert"`. */
export type BannerLive = "off" | "polite" | "assertive";

export interface BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "role"> {
  /**
   * `promo` turns the strip into an announcement, not a state: a full `maple` block with all
   * content in `on-maple` and the localised tag ("New", "Novedad", 新着) in place of the status
   * word. A promo ignores `tone` and `live`, is never sticky (it scrolls away; the Navbar stays
   * sticky), is a labelled `<section>` rather than a live region, and rolls up on dismiss. Show
   * at most one per page, with up to two actions (`Button size="s"` outline, then ghost).
   * @default "status"
   */
  variant?: BannerVariant;
  /**
   * Status of the message. Ignored by `variant="promo"`. Colours the bottom hairline and the word tag; the text stays ink.
   * It never chooses the role: use `live` for that.
   * @default "neutral"
   */
  tone?: BannerTone;
  /** Short run-in heading before the message. Also names the region. */
  title?: ReactNode;
  /**
   * Replaces the localised word tag (Info, Done, Note, Error). The four status tones show a
   * word by default; `neutral` shows one only when this is set. A promo always shows a tag and
   * defaults to the localised "New".
   */
  tag?: ReactNode;
  /** The message: one or two lines of phrasing content (text, links). */
  children?: ReactNode;
  /**
   * At most two actions: one `Button size="s"` (outline) as the primary and one `ghost` Button
   * or a link as the secondary.
   */
  actions?: ReactNode;
  /**
   * Shows the dismiss button and is called when it is pressed. Persist the choice here if it
   * should survive a reload. Uncontrolled banners then roll up and unmount.
   */
  onClose?: () => void;
  /** Controlled visibility. When defined, the banner closes only when the parent sets `false`. */
  open?: boolean;
  /**
   * Initial visibility when uncontrolled.
   * @default true
   */
  defaultOpen?: boolean;
  /**
   * How assistive technology hears it. `off`: a labelled `region`, silent on insertion.
   * `polite`: `role="status"`, for a banner mounted after load that is worth hearing.
   * `assertive`: `role="alert"`, only for something urgent.
   * @default "off"
   */
  live?: BannerLive;
  /**
   * Accessible name of the region when there is no `title`. Defaults to the localised
   * "Announcement" (a promo: its tag word). Give each banner on a page its own name.
   */
  label?: string;
  /**
   * Takes focus when the banner closes while focus is inside it (the dismiss button).
   * An element, or a function that moves focus itself. Defaults to the next focusable element
   * after the banner, then to a focusable `main`.
   */
  returnFocus?: PresenceOptions["returnFocus"];
  /** Called once the roll-up has ended and the banner has unmounted. */
  onExited?: () => void;
  /**
   * Unroll when `open` turns true after the first render (or on the first client mount with
   * `appear`) and roll up on close. The master switch: `false` also turns `appear` off.
   * @default true
   */
  animated?: boolean;
  /**
   * Not for `variant="promo"`, which never sticks (setting it logs a development warning).
   * Keeps the strip at the top of the page while scrolling, for a message the reader needs while
   * they work (connection lost, session ending). Sticky only when the viewport is at least 720 by
   * 480 CSS px, so phones and zoomed pages scroll it away. Stacks with a sticky Navbar by itself
   * and publishes the space it takes, so focus and in-page links stop below it. Page-level
   * banners only: leave it off inside a Card, Modal or Sheet. On a long page, pass `returnFocus`:
   * by default a dismiss moves focus to the next focusable element after the banner, which may be
   * far above where the reader is. Server-rendered, the first stuck frame uses `top: 0` until
   * hydration measures the stack.
   * @default false
   */
  sticky?: boolean;
  /**
   * Also unroll when the banner first mounts on the client, after the page is interactive (read
   * from storage, shown after an event). A banner in the server-rendered page never unrolls, with
   * or without it: render a banner known at load in the first paint and leave this off.
   * @default false
   */
  appear?: boolean;
}

const ROLES: Record<BannerLive, "region" | "status" | "alert"> = {
  off: "region",
  polite: "status",
  assertive: "alert",
};

const TABBABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]",
].join(",");

/**
 * Focuses the first focusable element after `node` in document order, outside it. Elements
 * hidden by CSS (display: none, visibility: hidden, a closed `<details>`) refuse focus, so each
 * candidate is tried until focus actually lands. True when it did.
 */
function focusNextAfter(node: HTMLElement): boolean {
  const doc = node.ownerDocument;
  for (const el of doc.querySelectorAll<HTMLElement>(TABBABLE)) {
    if (node.contains(el)) continue;
    if (!(node.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    if (el.tabIndex < 0 || el.closest("[hidden], [inert]")) continue;
    if (
      typeof el.checkVisibility === "function" &&
      !el.checkVisibility({ visibilityProperty: true })
    )
      continue;
    el.focus();
    if (doc.activeElement === el) return true;
  }
  return false;
}

const subscribeNothing = () => () => undefined;
const onClient = () => true;
const onServer = () => false;

/**
 * True on a client render that is not hydrating server markup. During hydration React uses the
 * server snapshot, so a banner present in the server HTML reads false.
 */
function useClientMount(): boolean {
  return useSyncExternalStore(subscribeNothing, onClient, onServer);
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

/**
 * A page-wide message in a ruled strip under the Navbar: a status word, the message, up to two
 * actions and an optional dismiss. It sits in the page flow (or sticks to the top with `sticky`),
 * stays until the reader acts or dismisses it, and never takes focus.
 *
 * The strip unrolls (kakejiku) when `open` turns true after the first render, or, with `appear`,
 * when it first mounts on the client. A banner present at load simply appears. It rolls back up
 * when it closes. Only `clip-path` animates: the content below moves in one step.
 *
 * `variant="promo"` is the announcement strip: full maple, an `on-maple` tag word and focus
 * band, rolled up (`--dur-m`) when dismissed.
 *
 * ```tsx
 * <Banner tone="warning" title="Maintenance" onClose={remember}>
 *   The shop is read-only on Sunday from 02:00 to 04:00.
 * </Banner>
 *
 * <Banner variant="promo" actions={<Button size="s">Reserve one</Button>} onClose={remember}>
 *   The Kaichi chambered slab is back.
 * </Banner>
 * ```
 */
export const Banner = forwardRef<HTMLDivElement, BannerProps>(function Banner(
  {
    variant = "status",
    tone = "neutral",
    title,
    tag,
    children,
    actions,
    onClose,
    open: openProp,
    defaultOpen = true,
    live = "off",
    label,
    returnFocus,
    onExited,
    animated = true,
    sticky = false,
    appear = false,
    className,
    ...rest
  },
  ref,
) {
  const t = useLabels();
  const titleId = `${useId()}-title`;
  const [open, setOpen] = useControllable<boolean>(openProp, defaultOpen);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  const focusNext = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;
    if (focusNextAfter(node)) return;
    const main = node.ownerDocument.querySelector("main");
    if (main?.hasAttribute("tabindex")) main.focus();
  }, []);

  const { mounted, state, setElement } = usePresence<HTMLDivElement>(open, {
    ...(onExited ? { onExited } : {}),
    returnFocus: returnFocus ?? focusNext,
  });

  // The unroll plays on insertion, so the motion class only appears once `open` has changed:
  // a banner present on first render stays still.
  const [prevOpen, setPrevOpen] = useState(open);
  const [moved, setMoved] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    setMoved(true);
  }

  // `appear` reads "client mount, not hydration" once, on the first render, and keeps it, so the
  // hydrated banner does not start to unroll when the snapshot switches to the client value.
  const clientMount = useClientMount();
  const [unrollOnMount] = useState(() => appear && clientMount);

  // A sticky banner stacks with other sticky chrome and publishes its height for scroll-padding.
  const promo = variant === "promo";
  const [stickyNode, setStickyNode] = useState<HTMLDivElement | null>(null);
  useStickyChrome(stickyNode, sticky && !promo);

  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      nodeRef.current = node;
      setElement(node);
      setStickyNode(node);
      assignRef(ref, node);
    },
    [setElement, ref],
  );

  useEffect(() => {
    if (promo && sticky) {
      devWarn("Banner", 'variant="promo" is never sticky; `sticky` is ignored.');
    }
  }, [promo, sticky]);

  useEffect(() => {
    if (!DEV || !actionsRef.current) return;
    const count = actionsRef.current.querySelectorAll("button, a[href]").length;
    if (count > 2) {
      devWarn("Banner", `${String(count)} actions given; keep to one primary and one secondary.`);
    }
  }, [actions]);

  if (!mounted) return null;

  const blank = (node: ReactNode) =>
    node === null || node === undefined || node === false || node === "";
  const word = promo
    ? blank(tag)
      ? t.banner.promo
      : tag
    : (tag ?? (tone === "neutral" ? null : t.tags[tone]));
  const hasTag = !blank(word);
  // A promo is a plain labelled section (not live), named by its tag word unless `label` says
  // otherwise; a status banner is a region, status or alert by `live`.
  const role = promo ? undefined : ROLES[live];
  const named = promo || role === "region";
  const fallbackName = promo
    ? typeof word === "string" || typeof word === "number"
      ? String(word)
      : t.banner.promo
    : t.banner.label;
  // Only `section` and `div` render here; both are typed as the div the ref expects.
  const Element = (promo ? "section" : "div") as "div";

  return (
    <Element
      ref={setRoot}
      role={role}
      aria-labelledby={named && title ? titleId : undefined}
      aria-label={
        named && !title ? (label === undefined || label === "" ? fallbackName : label) : undefined
      }
      data-tone={promo ? undefined : tone}
      data-state={state}
      {...rest}
      className={cx(
        "ol-banner",
        promo ? "ol-banner--promo" : `ol-banner--${tone}`,
        !hasTag && "ol-banner--untagged",
        sticky && !promo && "ol-banner--sticky",
        animated && (moved || unrollOnMount) && "ol-kakejiku",
        className,
      )}
    >
      <div className="ol-banner__inner">
        {hasTag ? (
          <span className="ol-banner__tag">
            <span>{word}</span>
          </span>
        ) : null}
        <div className="ol-banner__body">
          {title ? (
            <>
              <span className="ol-banner__title" id={titleId}>
                {title}
              </span>{" "}
            </>
          ) : null}
          {children ? <span className="ol-banner__text">{children}</span> : null}
        </div>
        {actions ? (
          <div ref={actionsRef} className="ol-banner__actions">
            {actions}
          </div>
        ) : null}
        {onClose ? (
          <CloseButton
            className="ol-banner__close"
            label={t.dismiss}
            onClick={() => {
              setOpen(false);
              onClose();
            }}
          />
        ) : null}
      </div>
    </Element>
  );
});
