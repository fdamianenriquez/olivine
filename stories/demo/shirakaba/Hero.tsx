import { useRef } from "react";

import { Button, Label, Seal, Text } from "../../../src";
import { byId, MODELS, standKey, yen } from "./data";
import { SHOWCASE } from "./data";
import { GuitarSVG } from "./GuitarSVG";
import { useCrossing } from "./hooks";
import { photo } from "./images";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The hero is a narrow column of the three studio photographs, one viewport per model. Beside it a
 * sticky panel names the model on screen: its name moves up as a strip when the next photograph
 * crosses the middle of the viewport (no fade), and the price and blurb change with it.
 */
export function Hero() {
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const index = useCrossing(items, MODELS.length);
  const model = byId(MODELS, MODELS[index]?.id ?? "");

  return (
    <section id="top" className="sg-col" aria-labelledby="hero-title">
      <div className="sg-col__text">
        <Label>Matsumoto · Nagano · since 1987</Label>
        <Text variant="display-l" as="h1" id="hero-title">
          Guitars made at the foot of the Alps.
        </Text>
        <Text variant="body-l" className="sg-measure">
          Eleven luthiers in a small workshop in the Matsumoto valley. Dry winter air lets us season
          timber slowly, so every instrument takes as long as it takes — and is built for one
          player.
        </Text>
        <div className="sg-row">
          <Button variant="accent" arrow href="#build">
            Build yours
          </Button>
          <Button variant="ghost" href="#models">
            Compare the models
          </Button>
        </div>
        <span className="sg-col__seal">
          <Seal ink="shu" variant="hakubun" shape="vertical" press decorative>
            山木製
          </Seal>
        </span>
      </div>

      <ol className="sg-col__list" aria-label="Three shapes">
        {MODELS.map((m, i) => {
          const src = photo(standKey(m.id));
          return (
            <li
              key={m.id}
              className="sg-col__item"
              data-index={i}
              ref={(el) => {
                items.current[i] = el;
              }}
            >
              <figure
                className={["sg-col__fig", src && "sg-col__fig--photo"].filter(Boolean).join(" ")}
              >
                {src ? (
                  <img
                    className="sg-col__photo"
                    src={src}
                    alt={`${m.name}, front view`}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                ) : (
                  <GuitarSVG config={SHOWCASE[m.id]} title={`${m.name}, front view`} />
                )}
                <figcaption className="sg-col__cap">
                  <span className="sg-col__no">{pad(i + 1)} / 03</span>
                  <span lang="ja">{m.kanji}</span> {m.name} · from{" "}
                  <span className="sg-fig sg-fig--xs">{yen(m.base)}</span>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ol>

      <div className="sg-col__side" aria-hidden="true">
        <div className="sg-col__name">
          <span className="sg-col__kanji" lang="ja">
            {model.kanji}
          </span>
          <span className="sg-col__names">
            {MODELS.map((m, i) => (
              <span
                key={m.id}
                className={[
                  "sg-col__word",
                  i === index && "sg-col__word--on",
                  i < index && "sg-col__word--past",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {m.name}
              </span>
            ))}
          </span>
          <span className="sg-col__meta">
            <span className="sg-fig sg-fig--m">{pad(index + 1)}</span>
            <span className="sg-col__of">of 03 · from</span>
            <b className="sg-fig sg-fig--m">{yen(model.base)}</b>
          </span>
          <span className="sg-col__blurb">{model.blurb}</span>
        </div>
      </div>
    </section>
  );
}
