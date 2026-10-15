import { useCallback, useState } from "react";

/**
 * State that is controlled when `value` is defined and uncontrolled otherwise.
 * `setValue` updates internal state only when uncontrolled, and always calls `onChange`.
 */
export function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): [T, (next: T) => void] {
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  const setValue = useCallback(
    (next: T) => {
      if (!controlled) setInner(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [controlled ? value : inner, setValue];
}
