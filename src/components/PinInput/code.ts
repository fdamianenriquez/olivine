/** The characters a PinInput accepts. */
export type PinCharset = "numeric" | "alphanumeric";

const ACCEPTS: Record<PinCharset, RegExp> = {
  numeric: /^[0-9]$/,
  alphanumeric: /^[A-Za-z0-9]$/,
};

/**
 * Cleans raw text into a code: Unicode NFKC (full-width `１２３` becomes `123`), drops every
 * character outside the charset (spaces and separators included) and cuts to `length`.
 * Case is kept as typed.
 */
export function sanitizeCode(raw: string, charset: PinCharset, length: number): string {
  let out = "";
  for (const char of raw.normalize("NFKC")) {
    if (out.length >= length) break;
    if (ACCEPTS[charset].test(char)) out += char;
  }
  return out;
}

/**
 * The input selection that marks cell `index` as active: the cell's one character when it is
 * filled (typing overwrites it), or a caret in the first empty cell. The index is clamped to the
 * first empty cell, and to the last cell when the code is full.
 */
export function cellSelection(
  index: number,
  filled: number,
  length: number,
): readonly [number, number] {
  const cell = Math.max(0, Math.min(index, filled, length - 1));
  return cell < filled ? [cell, cell + 1] : [cell, cell];
}

/** The cell under a pointer's x coordinate, from the cells' rectangles (left to right). */
export function cellAtX(x: number, rects: readonly { right: number }[]): number {
  const index = rects.findIndex((rect) => x < rect.right);
  return index < 0 ? Math.max(0, rects.length - 1) : index;
}

/** Splits `length` cell indexes into runs of `group` (all in one run when `group` is unset). */
export function groupCells(length: number, group: number | undefined): number[][] {
  const size = group !== undefined && group > 0 && group < length ? Math.floor(group) : length;
  const runs: number[][] = [];
  for (let start = 0; start < length; start += size) {
    runs.push(
      Array.from({ length: Math.min(size, length - start) }, (_, offset) => start + offset),
    );
  }
  return runs;
}
