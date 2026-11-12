import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useId, useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { pad } from "../../utils/pad";
import { Button } from "../Button";
import { Field } from "../Field";
import { Input } from "../Input";
import { Root } from "../Root";
import { Tour, type TourProps, type TourStep } from "./Tour";
import { useTour } from "./useTour";

const meta = {
  title: "Overlays/Tour",
  component: Tour,
  tags: ["autodocs"],
  args: { steps: [] },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          'Tour walks the reader through a screen one step at a time: a card with a counter ("02 / 05" in the figure face), a title, a few sentences and Back / Next controls, pointed at a real element of the page.\n\nBy default it is a **spotlight**: a scrim covers the page except a square window around the target, the page is inert, focus stays in the card and Escape or "Skip tour" ends the tour. With `modal={false}` the page stays usable and the target gets a drawn hairline frame. Focus starts on Next and stays on the button that was pressed; each step change is announced politely. A step whose target is not on the page is skipped. A step without `target` is shown centred.\n\nArrow keys: Right / Left go forward and back (mirrored in right-to-left), unless focus is in a text field.\n\n`useTour()` holds `open` and `step` for you: `const tour = useTour()`, then `<Tour {...tour.props} steps={steps} />` and `tour.start()` from a visible control. Storing that a reader has seen the tour stays in the app.\n\n`progress="segments"` adds a row of printed blocks under the counter (up to twelve steps); the counter stays and is what is read aloud.\n\n- Do keep a tour to three to six steps, one idea each, with the target named in the text.\n- Do start it from a visible control ("Take the tour") and store "seen" in the app.\n- Do give every step a `title`; it names the dialog.\n- Do use a centred step for a welcome or a goodbye, not for pointing at something.\n- Do prefer the modal default for anything longer than a coachmark.\n- Don\'t point at something the user must operate during the step; use `modal={false}` for that.\n- Don\'t open a tour on page load without the user\'s choice.\n- Don\'t put forms, long text or a second tour in a card; use `Modal` or a help page.\n- Don\'t rely on the spotlight to carry meaning; the step text must say what is highlighted.',
      },
    },
  },
} satisfies Meta<typeof Tour>;

export default meta;

type Story = StoryObj<typeof meta>;

type Part = "wood" | "finish" | "order";

/** Function targets that find the demo page's parts by id (unique per story). */
interface Targets extends Record<Part, () => HTMLElement | null> {
  ids: Record<Part, string>;
}

/** A small configurator page for the tour to point at. */
function Workbench({
  targets,
  onStart,
  children,
  tall = false,
}: {
  targets: Targets;
  onStart: () => void;
  children?: ReactNode;
  tall?: boolean | undefined;
}) {
  const [finish, setFinish] = useState("Oil");
  return (
    <div
      style={{
        display: "grid",
        gap: "var(--space-6)",
        maxWidth: "var(--modal-width-l)",
        padding: "var(--space-8) var(--space-6)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "var(--space-4)",
        }}
      >
        <h1 style={{ margin: 0 }}>Shirakaba SG</h1>
        <Button size="s" onClick={onStart}>
          Take the tour
        </Button>
      </div>
      <Field label="Wood" hint="Body and neck.">
        <Input id={targets.ids.wood} defaultValue="Japanese oak" />
      </Field>
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <Button
          id={targets.ids.finish}
          onClick={() => {
            setFinish(finish === "Oil" ? "Lacquer" : "Oil");
          }}
        >
          Finish: {finish}
        </Button>
        {tall ? null : (
          <Button id={targets.ids.order} variant="solid">
            Add to order
          </Button>
        )}
      </div>
      {tall ? (
        <>
          <p style={{ minHeight: "150vh", color: "var(--ink-2)" }}>
            Every body is cut from one board and left to rest for a season before it is shaped.
          </p>
          <div style={{ paddingBottom: "50vh" }}>
            <Button id={targets.ids.order} variant="solid">
              Add to order
            </Button>
          </div>
        </>
      ) : null}
      {children}
    </div>
  );
}

function useTargets(): Targets {
  const id = useId();
  const ids = { wood: `${id}-wood`, finish: `${id}-finish`, order: `${id}-order` };
  return {
    ids,
    wood: () => document.getElementById(ids.wood),
    finish: () => document.getElementById(ids.finish),
    order: () => document.getElementById(ids.order),
  };
}

function spotlightSteps(targets: Targets): TourStep[] {
  return [
    {
      target: targets.wood,
      title: "Pick a wood",
      content: "The Wood field above sets the body and the neck. Oak is the house wood.",
    },
    {
      target: targets.finish,
      title: "Choose a finish",
      content: "The Finish button switches between hand-rubbed oil and a thin lacquer.",
      placement: "right",
    },
    {
      target: targets.order,
      title: "Place the order",
      content: "Add to order keeps the guitar in your list; nothing is charged yet.",
    },
  ];
}

function Demo({
  steps,
  defaultOpen = true,
  tall,
  ...props
}: Partial<Omit<TourProps, "steps">> & {
  steps?: (targets: Targets) => TourStep[];
  tall?: boolean;
}) {
  const targets = useTargets();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Workbench
      targets={targets}
      tall={tall}
      onStart={() => {
        setOpen(true);
      }}
    >
      <Tour
        {...props}
        steps={(steps ?? spotlightSteps)(targets)}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
        }}
      />
    </Workbench>
  );
}

/** The spotlight: the page is dimmed and inert except the target. */
export const Default: Story = { render: () => <Demo /> };

/** Centred first and last steps (no `target`) for a welcome and a goodbye. */
export const Welcome: Story = {
  render: () => (
    <Demo
      steps={(targets) => [
        {
          title: "Welcome to the workbench",
          content: "Three things to know before you build your guitar. It takes a minute.",
        },
        ...spotlightSteps(targets),
        {
          title: "That is all",
          content: "You can take this tour again from the button at the top of the page.",
        },
      ]}
    />
  ),
};

/**
 * `modal={false}`: no scrim, the page stays usable and the target gets a drawn hairline frame.
 * Tab past the last button moves to the target.
 */
export const NonModal: Story = {
  render: () => (
    <Demo
      modal={false}
      steps={(targets) => [
        {
          target: targets.finish,
          title: "Try a finish",
          content: "Press the Finish button to switch between oil and lacquer, then come back.",
        },
        {
          target: targets.order,
          title: "Place the order",
          content: "Add to order keeps the guitar in your list; nothing is charged yet.",
        },
      ]}
    />
  ),
};

/**
 * Non-modal on a page with a sticky header (declared as `scroll-padding-top` on the scrolling
 * container) and a control right below the target, under the card. Tab past the card's last
 * button goes to the target and on into the page; Escape still ends the tour from there, and
 * focus stays where it is.
 */
export const NonModalStickyHeader: Story = {
  render: function Render() {
    const id = useId();
    const [open, setOpen] = useState(true);
    const [notes, setNotes] = useState(0);
    return (
      <div style={{ height: "100vh", overflow: "auto", scrollPaddingTop: "var(--space-16)" }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: "var(--space-16)",
            padding: "0 var(--space-6)",
            background: "var(--paper-2)",
            borderBottom: "var(--stroke-hair) solid var(--rule)",
          }}
        >
          <span className="ol-label">Shirakaba SG</span>
          <Button
            size="s"
            onClick={() => {
              setOpen(true);
            }}
          >
            Take the tour
          </Button>
        </header>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "var(--space-3)",
            padding: "var(--space-8) var(--space-6)",
            paddingBottom: "100vh",
          }}
        >
          <Button id={`${id}-fret`}>Fret wire</Button>
          <Button
            onClick={() => {
              setNotes(notes + 1);
            }}
          >
            Add a note ({notes})
          </Button>
        </div>
        <Tour
          modal={false}
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
          }}
          steps={[
            {
              target: () => document.getElementById(`${id}-fret`),
              title: "Fret wire",
              content:
                "The Fret wire button picks nickel or stainless steel. Try it, then press Escape.",
            },
          ]}
        />
      </div>
    );
  },
};

/** The app owns `open` and `step`, and can show where the reader is. */
export const Controlled: Story = {
  render: function Render() {
    const targets = useTargets();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [log, setLog] = useState("Not started");
    return (
      <Workbench
        targets={targets}
        onStart={() => {
          setStep(0);
          setOpen(true);
        }}
      >
        <p className="ol-label" style={{ margin: 0, color: "var(--ink-2)" }}>
          {log}
        </p>
        <Tour
          steps={spotlightSteps(targets)}
          open={open}
          step={step}
          closeButton
          onStepChange={(index, reason) => {
            setStep(index);
            setLog(`Step ${String(index + 1)} (${reason})`);
          }}
          onOpenChange={(next, reason) => {
            setOpen(next);
            if (!next) setLog(`Ended (${reason})`);
          }}
        />
      </Workbench>
    );
  },
};

/**
 * `useTour()` holds `open` and `step`: spread `tour.props` onto the tour and call `tour.start()`
 * from a visible control. Its callbacks hear what the reader did; remembering that the tour was
 * seen stays in the app (here, in a state flag set when it ends). The caption under the page is
 * the app's own copy, read from `tour.open` and `tour.step`.
 */
export const WithUseTour: Story = {
  render: function Render() {
    const targets = useTargets();
    const [seen, setSeen] = useState(false);
    const steps = spotlightSteps(targets);
    const tour = useTour({
      onOpenChange: (open, reason) => {
        if (!open && (reason === "finish" || reason === "skip")) setSeen(true);
      },
    });
    return (
      <Workbench
        targets={targets}
        onStart={() => {
          tour.start();
        }}
      >
        <p className="ol-label" style={{ margin: 0, color: "var(--ink-2)" }}>
          {tour.open
            ? `On step ${pad(tour.step + 1)} / ${pad(steps.length)}`
            : seen
              ? "Tour seen"
              : "Not started"}
        </p>
        <Tour {...tour.props} steps={steps} />
      </Workbench>
    );
  },
};

/**
 * `progress="segments"`: a row of blocks under the counter, one per step. The block that turns
 * on when you go forward prints; going back turns blocks off without motion. The counter is
 * still what is read aloud. Above twelve steps the tour shows the counter alone.
 */
export const Segments: Story = {
  render: () => (
    <Demo
      progress="segments"
      defaultStep={2}
      steps={(targets) => [
        {
          title: "Welcome to the workbench",
          content: "Five things to know before you build your guitar.",
        },
        ...spotlightSteps(targets),
        {
          title: "That is all",
          content: "You can take this tour again from the button at the top of the page.",
        },
      ]}
    />
  ),
};

/** A step whose target is not on the page is skipped; the counter keeps the authored list. */
export const MissingTarget: Story = {
  render: () => (
    <Demo
      steps={(targets) => {
        const [first, , last] = spotlightSteps(targets);
        return [
          first ?? { title: "Pick a wood" },
          { target: "#not-on-this-page", title: "Compare models", content: "Never shown." },
          last ?? { title: "Place the order" },
        ];
      }}
    />
  ),
};

/** The last target is far below: the page scrolls it into the centre when its step starts. */
export const LongPage: Story = { render: () => <Demo tall defaultStep={2} /> };

/** "Omitir recorrido" is long: Skip takes its own row when the card is narrow. */
export const Spanish: Story = {
  render: () => (
    <Root locale="es">
      <Demo
        defaultStep={1}
        steps={(targets) => [
          { target: targets.wood, title: "Elige la madera", content: "El campo Madera." },
          {
            target: targets.finish,
            title: "Elige el acabado",
            content: "El botón Acabado cambia entre aceite y laca.",
          },
          { target: targets.order, title: "Haz el pedido", content: "Añadir al pedido." },
        ]}
      />
    </Root>
  ),
};

export const Japanese: Story = {
  render: () => (
    <Root locale="ja">
      <Demo
        steps={(targets) => [
          {
            target: targets.wood,
            title: "木材を選ぶ",
            content: "上の木材欄でボディとネックの材を決めます。",
          },
          {
            target: targets.finish,
            title: "仕上げを選ぶ",
            content: "仕上げボタンで切り替えます。",
          },
        ]}
      />
    </Root>
  ),
};

/** Under reduced motion the scrim and card appear at once, the hole jumps, scrolling is instant. */
export const ReducedMotion: Story = {
  render: () => (
    <div className={REDUCE_MOTION_CLASS}>
      <Demo />
    </div>
  ),
};
