import "./shirakaba.css";

import { useState } from "react";

import { Alert, Root } from "../../../src";
import { Configurator } from "./Configurator";
import { DEFAULT_CONFIG, type GuitarConfig, type ModelId, RAIL } from "./data";
import { FretRail } from "./FretRail";
import { Hero } from "./Hero";
import { useActiveSection } from "./hooks";
import { Band, Faq, Ledger, UpClose, Wall, Workshop } from "./Sections";
import { Closing, Weeks } from "./Weeks";

const SECTION_IDS = RAIL.map((s) => s.id);

export interface ShirakabaPageProps {
  /**
   * Locale of the library's own words (the stepper, the alert tag, the navigation name). The page
   * copy is English whatever the locale.
   * @default "en"
   */
  locale?: string;
}

/**
 * Shirakaba Gakki, a fictional custom-guitar workshop in Matsumoto, as one page built only with
 * Olivine. Brand, models, prices and people are invented; nothing is sent, stored or charged.
 * This is demo code: it is not exported from the library and not part of the npm package.
 */
export function ShirakabaPage({ locale = "en" }: ShirakabaPageProps) {
  const [cfg, setCfg] = useState<GuitarConfig>(DEFAULT_CONFIG);
  const [step, setStep] = useState(0);
  const [demo, setDemo] = useState(true);
  const active = useActiveSection(SECTION_IDS);

  const set =
    <K extends keyof GuitarConfig>(key: K) =>
    (value: GuitarConfig[K]) => {
      setCfg((c) => ({ ...c, [key]: value }));
    };

  const build = (model: ModelId) => {
    setCfg((c) => ({ ...c, model }));
    setStep(1);
    document.getElementById("build")?.scrollIntoView();
  };

  return (
    <Root locale={locale}>
      <div className="sg-page">
        <FretRail active={active} />
        <main className="sg-main">
          {demo && (
            <div className="sg-demo">
              <Alert
                tone="warning"
                tag="Demo"
                title="Demonstration site"
                onClose={() => {
                  setDemo(false);
                }}
              >
                Shirakaba Gakki is a fictional brand made to show the Olivine component library. No
                guitars are sold, no data is stored and no payments are taken.
              </Alert>
            </div>
          )}
          <Hero />
          <Ledger />
          <Workshop />
          <Wall onBuild={build} />
          <Band />
          <UpClose />
          <Configurator cfg={cfg} set={set} step={step} setStep={setStep} />
          <Weeks />
          <Faq />
          <Closing />
        </main>
      </div>
    </Root>
  );
}
