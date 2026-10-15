/** Zero-padded index: `pad(1)` → `"01"`. */
export function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}
