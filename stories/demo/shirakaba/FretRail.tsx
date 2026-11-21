import { type CSSProperties } from "react";

import { Button, NavigationRail, Seal } from "../../../src";
import { RAIL } from "./data";
import { fretMid, fretPct, fretSpan, SINGLE_DOTS } from "./fret";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The page navigation, drawn as a fretboard. On desktop it is a vertical neck beside the page:
 * fret n falls at 2·(1 − 2^(−n/12)) of its length, each section sits in the space of its fret, and
 * the olivo finger rests on the section being read. The double dot at fret 12 is «Order». On a
 * phone the same board lies horizontally under the brand. It is built on NavigationRail: the rail
 * keeps the landmark, the list of links and `aria-current`; this file only places them.
 */
export function FretRail({ active }: { active: string }) {
  const current = RAIL.find((s) => s.id === active) ?? RAIL[0];
  if (!current) return null;
  const items = RAIL.map((s) => ({
    key: s.id,
    label: s.label,
    // The mark is the fret number: it is never the only label and the page keeps it out of sight.
    mark: pad(s.fret),
    href: `#${s.id}`,
  }));
  // The space of each link on the neck, set from here because the rail takes no per-item props.
  const spans: Record<string, string> = {};
  RAIL.forEach((s, i) => {
    const span = fretSpan(s.fret, s.fret);
    spans[`--sg-top-${String(i + 1)}`] = span.start;
    spans[`--sg-size-${String(i + 1)}`] = span.size;
  });
  const finger = fretSpan(current.fret);

  return (
    <NavigationRail className="sg-rail" items={items} active={active} style={spans}>
      <a className="sg-rail__brand" href="#top">
        <Seal ink="shu" variant="hakubun" shape="square" label="Shirakaba Gakki, back to top">
          白樺楽器
        </Seal>
      </a>

      <div className="sg-board" aria-hidden="true">
        <span className="sg-board__nut" />
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="sg-board__fret" style={{ top: fretPct(i + 1) }} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="sg-board__string" style={{ "--i": i } as CSSProperties} />
        ))}
        {SINGLE_DOTS.map((n) => (
          <span key={n} className="sg-board__inlay" style={{ top: fretMid(n) }} />
        ))}
        <span className="sg-board__inlay sg-board__inlay--a" style={{ top: fretMid(12) }} />
        <span className="sg-board__inlay sg-board__inlay--b" style={{ top: fretMid(12) }} />
        <span className="sg-board__finger" style={{ top: finger.start, height: finger.size }} />
      </div>

      <Button size="s" variant="solid" href="#build" className="sg-rail__cta">
        Order
      </Button>

      <div className="sg-rail__phone" aria-hidden="true">
        <span className="sg-rail__phone-label">
          <b>{pad(current.fret)}</b> {current.label}
        </span>
        <span className="sg-hboard">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className="sg-hboard__fret" style={{ left: fretPct(i + 1) }} />
          ))}
          <span className="sg-hboard__finger" style={{ left: finger.start, width: finger.size }} />
        </span>
      </div>
    </NavigationRail>
  );
}
