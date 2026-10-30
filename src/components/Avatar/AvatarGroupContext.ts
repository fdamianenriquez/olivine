import { createContext } from "react";

export type AvatarSize = "xs" | "s" | "m" | "l" | "xl";

/** What an AvatarGroup passes to its members: one size for the row, and that names stay hidden. */
export interface AvatarGroupContextValue {
  size: AvatarSize;
}

export const AvatarGroupContext = createContext<AvatarGroupContextValue | null>(null);
