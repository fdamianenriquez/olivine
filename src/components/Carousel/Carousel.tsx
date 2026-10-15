import {
  type ComponentPropsWithoutRef,
  type FocusEvent,
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import { useControllable } from "../../hooks/useControllable";
import { useLabels } from "../../locale";
import { cx } from "../../utils/cx";
import { pad } from "../../utils/pad";
import { Button } from "../Button";

export interface CarouselProps extends Omit<ComponentPropsWithoutRef<"section">, "children"> {
  /** The slides, one node each. Only one is visible and reachable at a time. */
  slides: ReactNode[];
  /**
   * Auto-advance delay in milliseconds. Omit for a manual carousel (preferred).
   * Rotation pauses on hover and focus, never starts under `prefers-reduced-motion: reduce`,
   * and adds a play/pause button.
   */
  interval?: number;
  /** Accessible name of the carousel. Defaults to the locale's "Carousel". */
  label?: string;
  /** Visible slide, 0-based. Makes the component controlled. */
  index?: number;
  /** Initial slide when uncontrolled. */
  defaultIndex?: number;
  /** Called with the new 0-based index when the slide changes (user or autoplay). */
  onIndexChange?: (index: number) => void;
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(notify: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", notify);
  return () => {
    query.removeEventListener("change", notify);
  };
}

function reducedSnapshot(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(REDUCED_QUERY).matches;
}

/** Tracks `prefers-reduced-motion: reduce`; false on the server. */
function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, reducedSnapshot, () => false);
}

/** One slide in view, a tick bar, a "01 / 03" counter and ← → cells. */
export const Carousel = forwardRef<HTMLElement, CarouselProps>(function Carousel(
  {
    slides,
    interval,
    label,
    index,
    defaultIndex = 0,
    onIndexChange,
    className,
    onKeyDown,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const t = useLabels();
  const n = slides.length;
  const [raw, setIndex] = useControllable(index, defaultIndex, onIndexChange);
  const current = n > 0 ? Math.min(Math.max(0, Math.floor(raw)), n - 1) : 0;
  const go = (k: number) => {
    if (n > 0) setIndex(((k % n) + n) % n);
  };

  const auto = interval !== undefined && interval > 0 && n > 1;
  const reduced = useReducedMotion();
  // `null` means the user has not touched the toggle: follow the motion preference.
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !reduced;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const rotating = auto && playing && !hovered && !focused;

  useEffect(() => {
    if (!rotating || !interval) return;
    const id = setTimeout(() => {
      go(current + 1);
    }, interval);
    return () => {
      clearTimeout(id);
    };
    // `go` only closes over `current`, `n` and the controllable setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotating, interval, current, n, setIndex]);

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const target = e.target as HTMLElement;
    if (target.isContentEditable || target.closest("input, textarea, select")) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(current + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(current - 1);
    }
  };

  return (
    // Arrow keys and hover/focus tracking are conveniences; every control inside is a real button.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      aria-roledescription="carousel"
      aria-label={label ?? t.carousel}
      {...rest}
      ref={ref}
      className={cx("ol-carousel", className)}
      data-rotating={rotating ? "" : undefined}
      onKeyDown={handleKeyDown}
      onMouseEnter={(e: MouseEvent<HTMLElement>) => {
        onMouseEnter?.(e);
        setHovered(true);
      }}
      onMouseLeave={(e: MouseEvent<HTMLElement>) => {
        onMouseLeave?.(e);
        setHovered(false);
      }}
      onFocus={(e: FocusEvent<HTMLElement>) => {
        onFocus?.(e);
        setFocused(true);
      }}
      onBlur={(e: FocusEvent<HTMLElement>) => {
        onBlur?.(e);
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <div className="ol-carousel__viewport" aria-live={rotating ? "off" : "polite"}>
        <div
          className="ol-carousel__track"
          style={{ "--ol-index": current } as React.CSSProperties}
        >
          {slides.map((slide, k) => {
            const active = k === current;
            return (
              <div
                key={k}
                className="ol-carousel__slide"
                role="group"
                aria-roledescription={t.slide}
                aria-label={t.slideOf(k + 1, n)}
                // `aria-hidden` hides the slide from the accessibility tree, while `inert` removes
                // its content from the tab order. `inert` is set through the DOM because React 18
                // does not render the prop; both are kept so every supported version behaves alike.
                aria-hidden={active ? undefined : true}
                ref={(el) => {
                  el?.toggleAttribute("inert", !active);
                }}
                data-active={active ? "" : undefined}
              >
                {slide}
              </div>
            );
          })}
        </div>
      </div>
      <div className="ol-carousel__bar">
        {auto && (
          <Button
            className="ol-carousel__play"
            icon={<span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>}
            aria-label={playing ? t.pause : t.play}
            onClick={() => {
              setUserPlaying(!playing);
            }}
          />
        )}
        <span className="ol-carousel__count" aria-hidden="true">
          <b>{pad(n > 0 ? current + 1 : 0)}</b> / {pad(n)}
        </span>
        <div className="ol-carousel__ticks">
          {slides.map((_, k) => (
            <button
              key={k}
              type="button"
              className="ol-carousel__tick"
              aria-label={t.goToSlide(k + 1)}
              aria-current={k === current ? "true" : undefined}
              onClick={() => {
                go(k);
              }}
            />
          ))}
        </div>
        <div className="ol-carousel__nav">
          <Button
            icon={<span aria-hidden="true">←</span>}
            aria-label={t.prevSlide}
            onClick={() => {
              go(current - 1);
            }}
          />
          <Button
            icon={<span aria-hidden="true">→</span>}
            aria-label={t.nextSlide}
            onClick={() => {
              go(current + 1);
            }}
          />
        </div>
      </div>
    </section>
  );
});
