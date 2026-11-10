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
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useLabels } from "../../locale";
import { type PresenceOptions, usePresence } from "../../motion/usePresence";
import { cx } from "../../utils/cx";
import { DEV, devWarn } from "../../utils/dev";
import { CloseButton } from "../CloseButton";

export type BannerTone = "neutral" | "info" | "success" | "warning" | "danger";

/** `off`: a named region, not announced. `polite`: `role="status"`. `assertive`: `role="alert"`. */
export type BannerLive = "off" | "polite" | "assertive";

export interface BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "role"> {
  /**
   * Status of the message. Colours the bottom hairline and the word tag; the text stays ink.
   * It never chooses the role: use `live` for that.
   * @default "neutral"
   */
  tone?: BannerTone;
  /** Short run-in heading before the message. Also names the region. */
  title?: ReactNode;
  /**
   * Replaces the localised word tag (Info, Done, Note, Error). The four status tones show a
   * word by default; `neutral` shows one only when this is set.
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
   * "Announcement". Give each banner on a page its own name.
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
   * Unroll when `open` turns true after the first render and roll up on close.
   * @default true
   */
  animated?: boolean;
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

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

/**
 * A page-wide message in a ruled strip under the Navbar: a status word, the message, up to two
 * actions and an optional dismiss. It sits in the page flow (never sticky), stays until the
 * reader acts or dismisses it, and never takes focus.
 *
 * The strip unrolls (kakejiku) only when `open` turns true after the first render, so a banner
 * present at load, or one mounted later with `{show && <Banner />}`, simply appears. It rolls
 * back up when it closes. Only `clip-path` animates: the content below moves in one step.
 *
 * ```tsx
 * <Banner tone="warning" title="Maintenance" onClose={remember}>
 *   The shop is read-only on Sunday from 02:00 to 04:00.
 * </Banner>
 * ```
 */
export const Banner = forwardRef<HTMLDivElement, BannerProps>(function Banner(
  {
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

  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      nodeRef.current = node;
      setElement(node);
      assignRef(ref, node);
    },
    [setElement, ref],
  );

  useEffect(() => {
    if (!DEV || !actionsRef.current) return;
    const count = actionsRef.current.querySelectorAll("button, a[href]").length;
    if (count > 2) {
      devWarn("Banner", `${String(count)} actions given; keep to one primary and one secondary.`);
    }
  }, [actions]);

  if (!mounted) return null;

  const word = tag ?? (tone === "neutral" ? null : t.tags[tone]);
  const hasTag = word !== null && word !== false && word !== "";
  const role = ROLES[live];
  const named = role === "region";

  return (
    <div
      ref={setRoot}
      role={role}
      aria-labelledby={named && title ? titleId : undefined}
      aria-label={
        named && !title ? (label === undefined || label === "" ? t.banner.label : label) : undefined
      }
      data-tone={tone}
      data-state={state}
      {...rest}
      className={cx(
        "ol-banner",
        `ol-banner--${tone}`,
        !hasTag && "ol-banner--untagged",
        animated && moved && "ol-kakejiku",
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
    </div>
  );
});
