import { type ComponentPropsWithoutRef, forwardRef, type MouseEvent, type ReactNode } from "react";

import { useControllable } from "../../hooks/useControllable";
import { cx } from "../../utils/cx";
import { Button, type ButtonNaming } from "../Button/Button";

export interface ToggleButtonOwnProps {
  /** Whether the toggle is on (controlled). */
  pressed?: boolean;
  /**
   * Initial state when uncontrolled.
   * @default false
   */
  defaultPressed?: boolean;
  /** Called with the next state whenever the toggle is activated. */
  onPressedChange?: (pressed: boolean) => void;
  /**
   * Visual weight. Pressed is always the ink fill, so filled variants are not offered.
   * @default "outline"
   */
  variant?: "outline" | "ghost";
  /**
   * Control height: 32, 44 or 56px.
   * @default "m"
   */
  size?: "s" | "m" | "l";
  /**
   * Equal width and height for one glyph, hidden from assistive tech. Requires `aria-label` or
   * `aria-labelledby`. Implied when `icon` is set without children.
   */
  square?: boolean;
  /** Leading glyph. */
  icon?: ReactNode;
  /**
   * Glyph shown instead of `icon` while pressed. The accessible name stays the same. It pairs with
   * `icon`: for a glyph-only toggle, pass the glyph as `icon` (not as children) so only one shows.
   */
  pressedIcon?: ReactNode;
  /** Whether the toggle is disabled. It keeps showing its state. */
  disabled?: boolean;
  /** Label. It must not change with the state; the fill carries it. */
  children?: ReactNode;
  /** Extra class names for the root element. */
  className?: string;
}

/** Props of a ToggleButton: its own props plus everything a `<button>` accepts. */
export type ToggleButtonProps = ToggleButtonOwnProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof ToggleButtonOwnProps | "aria-pressed" | "type"> &
  ButtonNaming;

/**
 * A Button that holds an on/off state: off is outlined, on is filled with ink, and
 * `aria-pressed` announces which. Space and Enter toggle it; focus stays in place.
 */
export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(function ToggleButton(
  {
    pressed: pressedProp,
    defaultPressed = false,
    onPressedChange,
    icon,
    pressedIcon,
    className,
    onClick,
    ...rest
  },
  ref,
) {
  const [pressed, setPressed] = useControllable<boolean>(
    pressedProp,
    defaultPressed,
    onPressedChange,
  );

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    const ariaDisabled = rest["aria-disabled"] === true || rest["aria-disabled"] === "true";
    if (!event.defaultPrevented && !rest.disabled && !ariaDisabled) setPressed(!pressed);
  };

  const glyph = pressed && pressedIcon != null && pressedIcon !== false ? pressedIcon : icon;

  return (
    <Button
      {...rest}
      ref={ref}
      type="button"
      icon={glyph}
      aria-pressed={pressed}
      onClick={handleClick}
      className={cx("ol-btn--toggle", className)}
    />
  );
});
