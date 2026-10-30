import { type ReactNode, type RefObject, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { KEEP_ACTIVE_ATTR } from "../hooks/useOverlay";
import { REDUCE_MOTION_CLASS } from "../motion/reducedMotion";
import { cx } from "./cx";

/** In-app motion settings that portalled layers inherit from their anchor. */
const PAUSED_CLASS = "ol-motion-paused";

export interface PortalProps {
  children: ReactNode;
  /** Where to render. Defaults to `document.body`. */
  container?: Element | null | undefined;
  /** An element inside the app whose nearest `data-theme` the portal content should keep. */
  anchor?: RefObject<Element | null> | undefined;
  /** Keeps the layer reachable while a modal overlay makes the rest of the page inert. */
  keepActive?: boolean | undefined;
}

/**
 * Renders children into `container` (body by default) inside an `.ol` layer that keeps the
 * anchor's theme, language, direction and in-app motion settings (`ol-reduce-motion`,
 * `ol-motion-paused`), so floating content looks, reads and moves like the island it came from. Nothing renders
 * on the server or before mount.
 */
export function Portal({ children, container, anchor, keepActive }: PortalProps) {
  const [target, setTarget] = useState<Element | null>(null);
  const [theme, setTheme] = useState<string | undefined>(undefined);
  const [lang, setLang] = useState<string | undefined>(undefined);
  const [dir, setDir] = useState<string | undefined>(undefined);
  const [reduce, setReduce] = useState(false);
  const [paused, setPaused] = useState(false);

  // Portals need the DOM: resolve the target and theme once mounted (never during SSR).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only read of the DOM
    setTarget(container ?? document.body);
    const themed = anchor?.current?.closest("[data-theme]");
    setTheme(themed?.getAttribute("data-theme") ?? undefined);
    setLang(anchor?.current?.closest("[lang]")?.getAttribute("lang") ?? undefined);
    setDir(anchor?.current?.closest("[dir]")?.getAttribute("dir") ?? undefined);
    setReduce(Boolean(anchor?.current?.closest(`.${REDUCE_MOTION_CLASS}`)));
    setPaused(Boolean(anchor?.current?.closest(`.${PAUSED_CLASS}`)));
  }, [container, anchor]);

  if (!target) return null;
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
