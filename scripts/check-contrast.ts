/**
 * Fails if any documented colour pair falls below its WCAG 2.2 threshold in either theme.
 * 4.5:1 for text, 3:1 for large/bold text and for non-text boundaries (1.4.11).
 */
import { readTokens, THEMES } from "./lib/tokens";

interface Pair {
  fg: string;
  bg: string;
  min: 3 | 4.5;
  why: string;
}

const PAPERS = ["paper", "paper-2", "paper-3"];
const STATUSES = ["ai", "matsu", "kitsune", "beni"];

const PAIRS: Pair[] = [
  ...PAPERS.map((bg): Pair => ({ fg: "ink", bg, min: 4.5, why: "text" })),
  ...PAPERS.map((bg): Pair => ({ fg: "ink-2", bg, min: 4.5, why: "secondary text" })),
  ...PAPERS.map((bg): Pair => ({ fg: "rule", bg, min: 3, why: "control boundary" })),
  { fg: "on-ink", bg: "ink", min: 4.5, why: "text on solid fills" },
  { fg: "olivo", bg: "paper", min: 4.5, why: "accent text, focus ring" },
  { fg: "olivo", bg: "paper-3", min: 4.5, why: "accent text on overlays" },
  { fg: "olivo", bg: "paper-2", min: 3, why: "marks, figures 24px+, bold labels only" },
  { fg: "on-olivo", bg: "olivo", min: 4.5, why: "accent button" },
  { fg: "on-maple", bg: "maple", min: 4.5, why: "maple fills" },
  ...STATUSES.map((fg): Pair => ({ fg, bg: "paper", min: 4.5, why: "status text" })),
  ...STATUSES.map((bg): Pair => ({ fg: "on-status", bg, min: 4.5, why: "text on status fills" })),
];

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const colors = new Map(readTokens().color.tokens.map((t) => [t.name, t.value]));
const failures: string[] = [];

for (const pair of PAIRS) {
  for (const theme of THEMES) {
    const fg = colors.get(pair.fg)?.[theme];
    const bg = colors.get(pair.bg)?.[theme];
    if (!fg || !bg) {
      failures.push(`${pair.fg} on ${pair.bg}: unknown token`);
      continue;
    }
    const value = ratio(fg, bg);
    const ok = value >= pair.min;
    const line = `${ok ? "✓" : "✗"} ${theme.padEnd(5)} ${pair.fg.padEnd(9)} on ${pair.bg.padEnd(8)} ${value.toFixed(2).padStart(5)}:1  (min ${String(pair.min)}:1, ${pair.why})`;
    console.log(line);
    if (!ok) failures.push(line);
  }
}

if (failures.length > 0) {
  console.error(`\n${String(failures.length)} pair(s) below threshold:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`\nAll ${String(PAIRS.length * THEMES.length)} pairs pass.`);
