import { type ReactNode, type RefObject, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { KEEP_ACTIVE_ATTR } from "../../hooks/useOverlay";
import { REDUCE_MOTION_CLASS } from "../../motion/reducedMotion";
import { cx } from "../../utils/cx";

/** In-app motion settings that portalled layers inherit from their anchor. */
const PAUSED_CLASS = "ol-motion-paused";

export interface PortalProps {
  children?: ReactNode;
  /**
   * Where to render. Leave it out for `document.body`; `null` means the container is not ready
   * yet, and nothing renders until it is.
   */
  container?: Element | null | undefined;
  /**
   * An element inside the app. The layer copies its island theme (a `data-theme` below `<html>`),
   * `lang`, `dir` and in-app motion settings, and follows the island theme while open.
   */
  anchor?: RefObject<Element | null> | undefined;
  /** Keeps the layer reachable while a modal overlay makes the rest of the page inert. */
  keepActive?: boolean | undefined;
}

interface Inherited {
  theme: string | undefined;
  lang: string | undefined;
  dir: string | undefined;
  reduce: boolean;
  paused: boolean;
}

const NONE: Inherited = {
  theme: undefined,
  lang: undefined,
  dir: undefined,
  reduce: false,
  paused: false,
};

/**
 * Renders children into `container` (body by default) inside an `.ol` layer that keeps the
 * anchor's island theme, language, direction and in-app motion settings (`ol-reduce-motion`,
 * `ol-motion-paused`), so floating content looks, reads and moves like the island it came from.
 * A theme on `<html>` is not copied: the layer inherits it, and follows it when it changes.
 * Nothing renders on the server or before mount.
 */
export function Portal({ children, container, anchor, keepActive }: PortalProps) {
  const [target, setTarget] = useState<Element | null>(null);
  const [inherited, setInherited] = useState<Inherited>(NONE);

  // Portals need the DOM: resolve the target and the anchor's settings once mounted (never
  // during SSR), then follow the island's theme while the layer is open.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time read of the DOM
    setTarget(container === undefined ? document.body : container);
    const el = anchor?.current ?? null;
    const themed = el?.closest("[data-theme]");
    const island = themed && themed !== document.documentElement ? themed : null;
    const read = () => {
      setInherited({
        theme: island?.getAttribute("data-theme") ?? undefined,
        lang: el?.closest("[lang]")?.getAttribute("lang") ?? undefined,
        dir: el?.closest("[dir]")?.getAttribute("dir") ?? undefined,
        reduce: Boolean(el?.closest(`.${REDUCE_MOTION_CLASS}`)),
        paused: Boolean(el?.closest(`.${PAUSED_CLASS}`)),
      });
    };
    read();
    if (!island) return;
    const observer = new MutationObserver(read);
    observer.observe(island, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      observer.disconnect();
    };
  }, [container, anchor]);

  if (!target) return null;
  const { theme, lang, dir, reduce, paused } = inherited;
  return createPortal(
    <div
      className={cx("ol ol-portal", reduce && REDUCE_MOTION_CLASS, paused && PAUSED_CLASS)}
      data-theme={theme}
      lang={lang}
      dir={dir}
      {...(keepActive ? { [KEEP_ACTIVE_ATTR]: "" } : null)}
    >
      {children}
    </div>,
    target,
  );
}
