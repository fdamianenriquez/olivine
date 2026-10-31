import type { KeyboardEvent } from "react";

/**
 * True while a key belongs to an IME composition (Japanese, Chinese, Korean input), so it must
 * not select, submit, remove or filter. Safari sends the key that ends a composition with
 * `isComposing` false and keyCode 229, and some browsers report the key as "Process".
 */
export function isImeKey(event: KeyboardEvent | globalThis.KeyboardEvent): boolean {
  const native = "nativeEvent" in event ? event.nativeEvent : event;
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- keyCode 229 is the only signal Safari gives
  return native.isComposing || native.key === "Process" || native.keyCode === 229;
}
