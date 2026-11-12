import { useCallback, useState } from "react";

/** Appended to a repeated message so a live region sees a change and reads it out again. */
const NBSP = " ";

/**
 * Marks the `count`-th announcement of a message so that two in a row differ: every other one
 * gets a trailing no-break space. Use it when the message is derived during render (from a
 * status plus an attempt counter) rather than set by an event.
 */
export function repeatable(text: string, count: number): string {
  return text === "" || count % 2 !== 0 ? text : text + NBSP;
}

export interface StatusMessage {
  /** The text to render inside a `role="status"` (or other live) region. */
  message: string;
  /** Sets the message; the same text twice in a row is still read out twice. */
  announce: (text: string) => void;
  /** Empties the region, for example when focus leaves the widget. */
  clear: () => void;
}

/**
 * State for a polite live region. A repeated message gets a trailing no-break space, so screen
 * readers announce it again instead of ignoring an unchanged region.
 */
export function useStatusMessage(): StatusMessage {
  const [message, setMessage] = useState("");
  const announce = useCallback((text: string) => {
    setMessage((prev) => (prev === text ? text + NBSP : text));
  }, []);
  const clear = useCallback(() => {
    setMessage("");
  }, []);
  return { message, announce, clear };
}
