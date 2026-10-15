import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";

import { useDismiss } from "../../hooks/useDismiss";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { Button } from "../Button";

export interface NavbarLink {
  /** Link text. */
  label: ReactNode;
  /** Link target. */
  href: string;
  /** Marks the current page: sets `aria-current="page"` and shows the olive dot. */
  active?: boolean;
}

export interface NavbarProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Brand name or wordmark, set in the display serif. */
  brand: ReactNode;
  /** Mincho mark beside the brand. Decorative: hidden from assistive technology. */
  kanji?: ReactNode;
  /**
   * Where the brand links to.
   * @default "#"
   */
  href?: string;
  /**
   * Primary links. Under 720px they fold behind a menu button.
   * @default []
   */
  links?: NavbarLink[];
  /** Content for the end cell (a button, a search field). Hidden under 720px. */
  end?: ReactNode;
  /** Sticks the bar to the top of the viewport while scrolling. */
  sticky?: boolean;
  /**
   * Accessible name of the navigation landmark. Defaults to the brand when it is a string;
   * pass it when the brand is not plain text or when the page has more than one navigation.
   */
  label?: string;
}

/**
 * The top bar: brand cell, link cells and an end cell divided by hairlines. Under 720px the
 * links fold behind a menu button that closes on Escape and when a link is chosen.
 */
export const Navbar = forwardRef<HTMLElement, NavbarProps>(function Navbar(
  { brand, kanji, href = "#", links = [], end, sticky, label, className, ...rest },
  ref,
) {
  const t = useLabels();
  const navId = useId();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const onDismiss = useCallback((reason: "escape" | "outside") => {
    if (reason !== "escape") return;
    setOpen(false);
    toggleRef.current?.focus();
  }, []);
  useDismiss(open, onDismiss, []);

  return (
    <header
      ref={ref}
      className={cx(
        "ol-navbar",
        sticky && "ol-navbar--sticky",
        open && "ol-navbar--open",
        className,
      )}
      data-state={open ? "open" : "closed"}
      {...rest}
    >
      <a className="ol-navbar__brand" href={href}>
        {brand}
        {kanji ? (
          <span className="ol-navbar__brand-kanji" lang="ja" aria-hidden="true">
            {kanji}
          </span>
        ) : null}
      </a>
      <Button
        ref={toggleRef}
        size="s"
        className="ol-navbar__toggle"
        aria-expanded={open}
        aria-controls={navId}
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        {open ? t.menuClose : t.menu}
      </Button>
      <nav
        id={navId}
        className="ol-navbar__nav"
        aria-label={label ?? (typeof brand === "string" ? brand : undefined)}
      >
        <ul className="ol-navbar__links">
          {links.map((l, i) => (
            <li key={l.href || i} className="ol-navbar__item">
              <a
                className="ol-navbar__link"
                href={l.href}
                aria-current={l.active ? "page" : undefined}
                onClick={() => {
                  setOpen(false);
                }}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {end ? <div className="ol-navbar__end">{end}</div> : null}
    </header>
  );
});
