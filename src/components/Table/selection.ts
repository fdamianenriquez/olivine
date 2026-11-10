/** A row's identity: the value `rowKey` returns. */
export type TableKey = string | number;

/**
 * Pure selection helpers. Every function returns a new array, keeps the order in which keys were
 * chosen, and leaves keys it was not asked about untouched (rows on other pages, disabled rows).
 */

/** Adds or removes one key. */
export function toggleKey(
  keys: readonly TableKey[],
  key: TableKey,
  on: boolean,
): readonly TableKey[] {
  const has = keys.includes(key);
  if (on) return has ? keys : [...keys, key];
  return has ? keys.filter((k) => k !== key) : keys;
}

/** Adds every key in `target` that is missing, after the ones already chosen. */
export function addKeys(
  keys: readonly TableKey[],
  target: readonly TableKey[],
): readonly TableKey[] {
  const missing = target.filter((k) => !keys.includes(k));
  return missing.length ? [...keys, ...missing] : keys;
}

/** Removes every key in `target`; other keys stay. */
export function removeKeys(
  keys: readonly TableKey[],
  target: readonly TableKey[],
): readonly TableKey[] {
  const drop = new Set(target);
  return keys.some((k) => drop.has(k)) ? keys.filter((k) => !drop.has(k)) : keys;
}

/**
 * The keys between `from` and `to` (both included) in displayed order. `order` already omits the
 * keys that cannot change (disabled rows). Empty when either end is not in `order`.
 */
export function keyRange(
  order: readonly TableKey[],
  from: TableKey,
  to: TableKey,
): readonly TableKey[] {
  const a = order.indexOf(from);
  const b = order.indexOf(to);
  if (a < 0 || b < 0) return [];
  return order.slice(Math.min(a, b), Math.max(a, b) + 1);
}

/** The header checkbox state over the rows that can change. */
export function headerState(
  keys: readonly TableKey[],
  enabled: readonly TableKey[],
): "all" | "some" | "none" {
  const count = enabled.filter((k) => keys.includes(k)).length;
  if (count === 0) return "none";
  return count === enabled.length ? "all" : "some";
}
