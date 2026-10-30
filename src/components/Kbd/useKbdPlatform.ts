import { createContext, useContext, useSyncExternalStore } from "react";

import type { KbdPlatform } from "./shortcut";

/** Platform a subtree draws shortcuts for. `auto` detects it in the browser. */
export type KbdPlatformSetting = "auto" | "apple" | "other";

/**
 * Platform setting for a subtree, for apps that know it from the request (user agent on the
 * server). Provided by `Root platform`.
 */
export const KbdPlatformContext = createContext<KbdPlatformSetting>("auto");

interface NavigatorUAData {
  platform?: string;
}

const APPLE = /mac|iphone|ipad|ipod/i;

/**
 * Reads the platform from the browser: `navigator.userAgentData.platform`, then
 * `navigator.platform`, then the user agent. iPadOS in desktop mode reports Mac, which is right:
 * it uses ⌘. `unknown` when nothing is available (server, frozen or empty user agent).
 */
export function detectKbdPlatform(): KbdPlatform {
  if (typeof navigator === "undefined") return "unknown";
  const data = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
  const source = [data?.platform, navigator.platform, navigator.userAgent].find(
    (value): value is string => typeof value === "string" && value !== "",
  );
  if (source === undefined) return "unknown";
  return APPLE.test(source) ? "apple" : "other";
}

// The platform never changes while the page is open.
const subscribe = () => () => undefined;
const getServerSnapshot = (): KbdPlatform => "unknown";

/**
 * The keyboard platform to draw shortcuts for: the nearest `Root platform` when set, otherwise
 * detected. Server renders and the first hydration pass return `unknown`, so the markup always
 * matches; the detected value follows right after hydration.
 */
export function useKbdPlatform(): KbdPlatform {
  return useResolvedKbdPlatform();
}

/** Detected platform, ignoring `Root platform`. Server and hydration pass: `unknown`. */
export function useDetectedKbdPlatform(): KbdPlatform {
  return useSyncExternalStore(subscribe, detectKbdPlatform, getServerSnapshot);
}

/** Resolves a setting (`auto` → detected); without one, the nearest `Root platform` applies. */
export function useResolvedKbdPlatform(setting?: KbdPlatformSetting): KbdPlatform {
  const inherited = useContext(KbdPlatformContext);
  const detected = useDetectedKbdPlatform();
  const choice = setting ?? inherited;
  return choice === "auto" ? detected : choice;
}
