import { Accordion, Button, Label, Meter, Text } from "../../../src";
import {
  ALT,
  BENCH,
  DETAILS,
  FAQ,
  LEDGER,
  type ModelId,
  MODELS,
  SHOWCASE,
  WORKSHOP_STEPS,
  yen,
} from "./data";
import { GuitarSVG } from "./GuitarSVG";
import { photo } from "./images";
import { SectionHead, Shoji } from "./Parts";

/** Four figures in ruled cells. */
export function Ledger() {
  return (
    <dl className="sg-ledger">
      {LEDGER.map((item) => (
        <div key={item.label} className="sg-ledger__item">
          <dt>
            <Label>{item.label}</Label>
          </dt>
          <dd className="sg-fig sg-fig--l">
            {item.value}
            {item.unit && <small>{item.unit}</small>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The workshop: how a body is made, and the bench its current build sits on. */
export function Workshop() {
  return (
    <section id="workshop" className="sg-sec sg-workshop" aria-labelledby="workshop-title">
      <div className="sg-workshop__text">
        <SectionHead
          kicker="The workshop"
          title="Timber that waits a whole winter before it becomes a guitar."
          id="workshop-title"
        >
          Matsumoto has one of the longest guitar-making traditions in Japan. We work at workshop
          scale: every body crosses the same four benches, and the same person signs it at the end.
        </SectionHead>
        <Accordion defaultOpen={[0]} items={[...WORKSHOP_STEPS]} />
      </div>
      <div className="sg-workshop__photo">
        <Shoji src={photo("hands")} alt={ALT.hands} pos="50% 40%" className="sg-shoji--tall">
          <div className="sg-void sg-bench">
            <div className="sg-bench__head">
              <Label>Bench 03</Label>
              <span className="sg-bench__no">SG-2026-0131</span>
            </div>
            <div className="sg-bench__meters">
              {BENCH.map((b) => (
                <Meter
                  key={b.label}
                  orientation="vertical"
                  size="s"
                  label={b.label}
                  value={b.value}
                  min={0}
                  max={100}
                  low={33}
                  high={66}
                  optimum={100}
                  format={(v) => `${String(v)} %`}
                />
              ))}
            </div>
          </div>
        </Shoji>
      </div>
    </section>
  );
}

/** The wall: a rail, one hook per model, and a hang-tag with the price and a Build button. */
export function Wall({ onBuild }: { onBuild: (model: ModelId) => void }) {
  return (
    <section id="models" className="sg-sec sg-models" aria-labelledby="models-title">
      <SectionHead kicker="Models" title="Three shapes, all our own." id="models-title">
        Each model is named after a place near the workshop. Base prices before tax, with an alder
        body, maple neck and three single coils.
      </SectionHead>
      <div className="sg-wall">
        <span className="sg-wall__rail" aria-hidden="true" />
        <ul className="sg-wall__list">
          {MODELS.map((m) => (
            <li key={m.id} className="sg-hang">
              <span className="sg-hang__hook" aria-hidden="true" />
              <div className="sg-hang__guitar">
                <GuitarSVG config={SHOWCASE[m.id]} title={`${m.name}, as hung on the wall`} />
              </div>
              <div className="sg-tag">
                <span className="sg-tag__string" aria-hidden="true" />
                <span className="sg-tag__hole" aria-hidden="true" />
                <span className="sg-tag__kanji" lang="ja" aria-hidden="true">
                  {m.kanji}
                </span>
                <div className="sg-tag__body">
                  <Text variant="h2" as="h3">
                    {m.name}
                  </Text>
                  <Text variant="body-s" tone="muted">
                    {m.blurb}
                  </Text>
                  <p className="sg-tag__price">
                    <span>from</span> <b className="sg-fig sg-fig--m">{yen(m.base)}</b>
                  </p>
                  <Button
                    size="s"
                    variant="solid"
                    arrow
                    aria-label={`Build a ${m.name}`}
                    onClick={() => {
                      onBuild(m.id);
                    }}
                  >
                    Build
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** A quote over the timber store. */
export function Band() {
  return (
    <section className="sg-band" aria-label="From the timber store">
      <Shoji src={photo("shed")} alt={ALT.shed} pos="50% 55%">
        <figure className="sg-void sg-band__quote">
          <blockquote>
            <Text variant="display-m" as="p">
              “Every board in this store already belongs to someone. They just haven’t ordered yet.”
            </Text>
          </blockquote>
          <figcaption>
            <Label>Head of timber · north store</Label>
          </figcaption>
        </figure>
      </Shoji>
    </section>
  );
}

/** Four 4:5 details in a ruled grid: four columns, then two, then one. */
export function UpClose() {
  return (
    <section id="details" className="sg-sec sg-detail" aria-labelledby="detail-title">
      <SectionHead kicker="Up close" title="Seen from twenty centimetres." id="detail-title">
        The parts that decide how a guitar feels in the hand, photographed on the bench before final
        assembly.
      </SectionHead>
      <ol className="sg-detail__list">
        {DETAILS.map((d) => (
          <li key={d.key} className="sg-detail__item">
            <figure className="sg-detail__fig">
              <img
                className="sg-detail__img"
                src={photo(d.key)}
                alt={d.alt}
                loading="lazy"
                decoding="async"
              />
              <figcaption className="sg-detail__cap">
                <span className="sg-detail__meta">
                  <span className="sg-fig sg-fig--m">{d.no}</span>
                  <Label>{d.where}</Label>
                </span>
                <b className="sg-detail__title">{d.title}</b>
                <span className="sg-detail__body">{d.body}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="sg-sec sg-faq" aria-labelledby="faq-title">
      <SectionHead kicker="Questions" title="What people ask us most." id="faq-title" />
      <Accordion items={[...FAQ]} />
    </section>
  );
}
