import { useRef } from "react";

import { Button, Text } from "../../../src";
import { ALT, STAGES } from "./data";
import { fretAt, fretMid, fretPct, fretSpan, pinnedProgress, SINGLE_DOTS, weekAt } from "./fret";
import { usePinnedProgress } from "./hooks";
import { photo } from "./images";
import { SectionHead, Shoji } from "./Parts";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Twelve weeks in 300svh. The section pins a fixed-camera time-lapse of one bench (one frame per
 * stage) beside a neck: twelve frets are twelve weeks, and an olivo cursor slides down the neck in
 * semitones as the page scrolls. The position is read once per animation frame. On a phone the
 * section is a plain list.
 */
export function Weeks() {
  const ref = useRef<HTMLElement>(null);
  const progress = usePinnedProgress(ref, pinnedProgress);
  const weeks = progress * 12;
  const week = weekAt(progress);
  const stage = STAGES.find((s) => week >= s.from && week <= s.to) ?? STAGES[0];

  return (
    <section id="process" className="sg-weeks" ref={ref} aria-labelledby="weeks-title">
      <div className="sg-weeks__pin">
        <div className="sg-weeks__photo">
          {STAGES.map((s) => {
            const on = s === stage;
            return (
              <img
                key={s.key}
                className={["sg-weeks__img", on && "sg-weeks__img--on"].filter(Boolean).join(" ")}
                src={photo(s.key)}
                alt={on ? s.alt : ""}
                aria-hidden={on ? undefined : true}
                loading="lazy"
                decoding="async"
              />
            );
          })}
          {stage && (
            <div className="sg-void sg-weeks__now" aria-hidden="true">
              <span className="sg-weeks__num">
                <span className="sg-fig sg-fig--xl">{pad(week)}</span>
                <span className="sg-weeks__of">of 12</span>
              </span>
              <span className="sg-weeks__stage">
                <b>{stage.title}</b>
                <span>{stage.body}</span>
              </span>
            </div>
          )}
        </div>

        <div className="sg-weeks__side">
          <SectionHead kicker="After you order" title="Twelve weeks, one octave." id="weeks-title">
            The neck has twelve frets to the double dot; a guitar takes twelve weeks to the door. If
            something isn’t right before the finish goes on, we change it at no cost.
          </SectionHead>
          <div className="sg-neck">
            <span
              className="sg-neck__cursor"
              aria-hidden="true"
              style={{ top: `${(fretAt(weeks) * 100).toFixed(3)}%` }}
            />
            <ol className="sg-neck__list">
              {STAGES.map((s) => {
                const span = fretSpan(s.from, s.to);
                return (
                  <li
                    key={s.title}
                    className={["sg-neck__stage", s === stage && "sg-neck__stage--on"]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ top: span.start, height: span.size }}
                  >
                    <span className="sg-neck__wk">
                      {s.from === s.to
                        ? `W${String(s.from)}`
                        : `W${String(s.from)}–${String(s.to)}`}
                    </span>
                    <span className="sg-neck__txt">
                      <b>{s.title}</b>
                      <span className="sg-neck__body">{s.body}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            {Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                className={["sg-neck__fret", i === 11 && "sg-neck__fret--12"]
                  .filter(Boolean)
                  .join(" ")}
                style={{ top: fretPct(i + 1) }}
                aria-hidden="true"
              />
            ))}
            {SINGLE_DOTS.map((n) => (
              <span
                key={n}
                className="sg-neck__inlay"
                style={{ top: fretMid(n) }}
                aria-hidden="true"
              />
            ))}
            {(["a", "b"] as const).map((k) => (
              <span
                key={k}
                className={`sg-neck__inlay sg-neck__inlay--${k}`}
                style={{ top: fretMid(12) }}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** The birch shoji, the double-inlay mark and the footer. */
export function Closing() {
  return (
    <section id="order" className="sg-closing" aria-labelledby="close-title">
      <Shoji src={photo("birch")} alt={ALT.birch} pos="50% 60%">
        <div className="sg-void sg-closing__text">
          <Text variant="display-l" as="h2" id="close-title">
            Shirakaba means white birch.
          </Text>
          <Text variant="body-l" className="sg-measure">
            It grows around the workshop, and it’s the first thing you see from the window each
            morning.
          </Text>
          <div className="sg-row">
            <Button variant="accent" arrow href="#build">
              Start your build
            </Button>
          </div>
        </div>
        <div className="sg-void sg-closing__dots" aria-hidden="true">
          <span className="sg-closing__inlay">
            <span />
            <span />
          </span>
          <span className="sg-fig sg-fig--xs">12</span>
        </div>
      </Shoji>
      <footer className="sg-foot">
        <p className="sg-foot__brand">
          <span className="sg-foot__name">Shirakaba</span>
          <span lang="ja">白樺楽器 · 松本</span>
        </p>
        <Text variant="body-s" tone="muted" className="sg-measure">
          Made with Olivine. Demonstration only: brand, models, people, prices and orders are
          fictional; any resemblance to real makers is coincidental. The photographs are
          AI-generated. No personal data is collected.
        </Text>
      </footer>
    </section>
  );
}
