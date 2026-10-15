import { type ReactNode, type RefObject, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface PortalProps {
  children: ReactNode;
  /** Where to render. Defaults to `document.body`. */
  container?: Element | null | undefined;
  /** An element inside the app whose nearest `data-theme` the portal content should keep. */
  anchor?: RefObject<Element | null> | undefined;
}

/**
 * Renders children into `container` (body by default) inside an `.ol` layer that keeps the
 * anchor's theme, so floating content looks like the island it came from. Nothing renders
 * on the server or before mount.
 */
export function Portal({ children, container, anchor }: PortalProps) {
  const [target, setTarget] = useState<Element | null>(null);
  const [theme, setTheme] = useState<string | undefined>(undefined);

  // Portals need the DOM: resolve the target and theme once mounted (never during SSR).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only read of the DOM
    setTarget(container ?? document.body);
    const themed = anchor?.current?.closest("[data-theme]");
    setTheme(themed?.getAttribute("data-theme") ?? undefined);
  }, [container, anchor]);

  if (!target) return null;
  return createPortal(
    <div className="ol ol-portal" data-theme={theme}>
      {children}
    </div>,
    target,
  );
}
