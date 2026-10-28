import {
  type AnchorHTMLAttributes,
  type ComponentPropsWithoutRef,
  type ElementType,
  type MouseEvent,
  type ReactNode,
  useEffect,
} from "react";

import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { devWarn } from "../../utils/dev";
import { forwardRefAs, type PolymorphicProps, type PolymorphicRef } from "../../utils/polymorphic";

export interface ButtonOwnProps {
  /**
   * Visual weight. Use `accent` once per view, for the one action that matters.
   * @default "outline"
   */
  variant?: "outline" | "solid" | "accent" | "ghost" | "danger";
  /**
   * Control height: 32, 44 or 56px.
   * @default "m"
   */
  size?: "s" | "m" | "l";
  /** Frames the label as [ LABEL ]. For the primary action. */
  brackets?: boolean;
  /** Appends a glyph that nudges on hover. `true` renders "→"; pass a node for another glyph. */
  arrow?: ReactNode;
  /** Leading icon. Without children the button becomes `square` and needs `aria-label`. */
  icon?: ReactNode;
  /**
   * Equal width and height (32, 44 or 56px by `size`) for one glyph from the system set
   * (→ ↗ ← ↑ ↓ ↕ + − × ✓), which is hidden from assistive tech. Requires `aria-label` or
   * `aria-labelledby`; ignores `brackets`, `arrow` and `block`.
   */
  square?: boolean;
  /** Disables the button, sets `aria-busy`, shows a stepped square and announces the locale's "loading" text. */
  loading?: boolean;
  /** Full width; the label sits left and the arrow right. */
  block?: boolean;
  /** Renders an `<a>` instead of a `<button>`. */
  href?: string;
  /** Whether the button is disabled. Anchors use `aria-disabled` and do not navigate. */
  disabled?: boolean;
  /** Label. */
  children?: ReactNode;
  /** Extra class names for the root element. */
  className?: string;
}

/** Props of a Button rendered as the default `<button>`. */
export type ButtonProps = ButtonOwnProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof ButtonOwnProps>;

type ButtonAnchorProps = ButtonOwnProps & { href: string; as?: never } & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    keyof ButtonOwnProps
  > & { ref?: PolymorphicRef<"a"> };

/** A `square` button shows only a glyph, so it must be named. */
export type ButtonNaming =
  | { square?: false | undefined }
  | { square: true; "aria-label": string }
  | { square: true; "aria-labelledby": string };

interface ButtonComponent {
  (props: ButtonAnchorProps & ButtonNaming): ReactNode;
  <E extends ElementType = "button">(
    props: PolymorphicProps<E, ButtonOwnProps> & ButtonNaming & { ref?: PolymorphicRef<E> },
  ): ReactNode;
  displayName?: string;
}

/** A square, ink-lined action that inverts to ink on hover. Renders an `<a>` when given `href`. */
export const Button = forwardRefAs<"button", ButtonOwnProps>(function Button(
  {
    variant = "outline",
    size = "m",
    block,
    icon,
    square,
    arrow,
    brackets,
    loading,
    href,
    as,
    className,
    children,
    disabled,
    onClick,
    ...rest
  },
  ref,
) {
  const labels = useLabels();
  const As: ElementType = as ?? (href ? "a" : "button");
  const native = As === "button";
  const hasLabel = children !== undefined && children !== null && children !== false;
  const isSquare = square === true || (Boolean(icon) && !hasLabel);
  const inert = disabled === true || loading === true;
  const named = Boolean(rest["aria-label"] ?? rest["aria-labelledby"]);

  useEffect(() => {
    if (isSquare && !named) {
      devWarn("Button", "a square button needs an `aria-label`.");
    }
  }, [isSquare, named]);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (inert && !native) {
      event.preventDefault();
      return;
    }
    (onClick as ((e: MouseEvent<HTMLElement>) => void) | undefined)?.(event);
  };

  const stateProps = native
    ? { type: (rest.type as string | undefined) ?? "button", disabled: inert }
    : { href, "aria-disabled": inert || undefined };

  return (
    <As
      ref={ref}
      {...rest}
      {...stateProps}
      onClick={handleClick}
      aria-busy={loading ? true : undefined}
      data-state={loading ? "loading" : undefined}
      className={cx(
        "ol-btn",
        variant !== "outline" && `ol-btn--${variant}`,
        size !== "m" && `ol-btn--${size}`,
        block && !isSquare && "ol-btn--block",
        isSquare && "ol-btn--square",
        className,
      )}
    >
      {icon && !(square && loading) ? <span aria-hidden="true">{icon}</span> : null}
      {square && hasLabel ? (
        loading ? null : (
          <span className="ol-btn__glyph" aria-hidden="true">
            {children}
          </span>
        )
      ) : brackets && hasLabel ? (
        <span>
          <span className="ol-btn__br" aria-hidden="true">
            [{" "}
          </span>
          {children}
          <span className="ol-btn__br" aria-hidden="true">
            {" "}
            ]
          </span>
        </span>
      ) : (
        children
      )}
      {loading ? (
        <>
          <span className="ol-btn__spin" aria-hidden="true" />
          {/* A real space keeps the label and the announcement as separate words. */}
          <span className="ol-sr"> {labels.loading}</span>
        </>
      ) : (
        !isSquare &&
        arrow != null &&
        arrow !== false &&
        arrow !== "" && (
          <span className="ol-btn__arrow" aria-hidden="true">
            {arrow === true ? "→" : arrow}
          </span>
        )
      )}
    </As>
  );
}) as ButtonComponent;
