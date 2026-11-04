import { readFileSync } from "node:fs";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { en } from "../../locale/en";
import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Stepper, type StepperStep } from "./Stepper";

const steps: StepperStep[] = [
  { label: "Body", description: "Wood and shape" },
  { label: "Neck" },
  { label: "Pickups", description: "Sound" },
  { label: "Finish" },
];

function nth<T>(list: readonly T[], index: number): T {
  const value = list[index];
  if (value === undefined) throw new Error(`No item at ${String(index)}`);
  return value;
}

describe("Stepper", () => {
  it("renders a named nav with an ordered list, className and native props", () => {
    const ref = createRef<HTMLElement>();
    render(
      <Stepper
        ref={ref}
        steps={steps}
        label="Build your guitar"
        className="extra"
        data-x="1"
        id="s"
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Build your guitar" });
    expect(nav).toBe(ref.current);
    expect(nav).toHaveClass("ol-stepper", "ol-stepper--horizontal", "extra");
    expect(nav).toHaveAttribute("data-x", "1");
    expect(nav).toHaveAttribute("id", "s");
    expect(within(nav).getByRole("list").tagName).toBe("OL");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("maps orientation to a modifier class", () => {
    render(<Stepper steps={steps} orientation="vertical" label="n" />);
    expect(screen.getByRole("navigation")).toHaveClass("ol-stepper--vertical");
  });

  it("marks only the current step with aria-current=step and derives done from current", () => {
    render(<Stepper steps={steps} current={2} label="n" />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("data-state"))).toEqual([
      "done",
      "done",
      "current",
      "todo",
    ]);
    expect(items.map((li) => li.getAttribute("aria-current"))).toEqual([null, null, "step", null]);
  });

  it("announces the position in a polite live line, zero-padded", () => {
    const { rerender } = render(<Stepper steps={steps} current={0} label="n" />);
    const line = screen.getByText(/Step/, { selector: "p" });
    expect(line).toHaveAttribute("aria-live", "polite");
    expect(line).toHaveTextContent("Step 01 of 04");
    rerender(<Stepper steps={steps} current={2} label="n" />);
    expect(line).toHaveTextContent("Step 03 of 04");
  });

  it("clamps an out-of-range current", () => {
    render(<Stepper steps={steps} current={9} label="n" />);
    expect(screen.getByText(/Step/, { selector: "p" })).toHaveTextContent("Step 04 of 04");
    expect(nth(screen.getAllByRole("listitem"), 3)).toHaveAttribute("aria-current", "step");
  });

  it("names each step with its number and reads completed steps as completed", () => {
    render(<Stepper steps={steps} current={1} label="n" onStepChange={() => undefined} />);
    expect(screen.getByRole("button", { name: /Step 01:\s*Body, completed/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Step 02:\s*Neck/ })).not.toHaveAccessibleName(
      /completed/,
    );
  });

  it("uses the completed prop instead of deriving it", () => {
    render(<Stepper steps={steps} current={2} completed={[0, 3]} label="n" />);
    expect(screen.getAllByRole("listitem").map((li) => li.getAttribute("data-state"))).toEqual([
      "done",
      "todo",
      "current",
      "done",
    ]);
  });

  it("shows the error state with its words and the reason read with the step", () => {
    render(
      <Stepper
        steps={[
          { label: "Body" },
          { label: "Neck", error: "Pick a scale length" },
          { label: "Finish" },
        ]}
        current={0}
        label="n"
      />,
    );
    const item = nth(screen.getAllByRole("listitem"), 1);
    expect(item).toHaveAttribute("data-state", "error");
    expect(item).toHaveTextContent("needs attention: Pick a scale length");
    expect(item.querySelector(".ol-stepper__err b")).toHaveAttribute("aria-hidden", "true");
  });

  it("marks an error without a reason", () => {
    render(<Stepper steps={[{ label: "Body", error: true }]} label="n" />);
    expect(screen.getByRole("listitem")).toHaveAttribute("data-state", "error");
    expect(screen.getByRole("listitem")).toHaveTextContent("needs attention");
  });

  it("a read-only stepper has no buttons and no locked cursor", () => {
    render(<Stepper steps={steps} current={1} label="n" />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(document.querySelector("[data-locked]")).toBeNull();
  });

  describe("linear", () => {
    it("lets only done steps, the current one and the next after a done step be picked", () => {
      render(
        <Stepper
          steps={steps}
          current={2}
          completed={[0, 1]}
          onStepChange={() => undefined}
          label="n"
        />,
      );
      // 0, 1 done; 2 current; 3 follows current which is not done: locked.
      expect(screen.getAllByRole("button")).toHaveLength(3);
      expect(screen.queryByRole("button", { name: /Finish/ })).toBeNull();
      expect(document.querySelectorAll("[data-locked]")).toHaveLength(1);
    });

    it("opens the step after a completed one", () => {
      render(
        <Stepper
          steps={steps}
          current={0}
          completed={[0]}
          onStepChange={() => undefined}
          label="n"
        />,
      );
      expect(screen.getByRole("button", { name: /Neck/ })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Pickups/ })).toBeNull();
    });

    it("lets every step be picked when linear is false", () => {
      render(<Stepper steps={steps} linear={false} onStepChange={() => undefined} label="n" />);
      expect(screen.getAllByRole("button")).toHaveLength(4);
    });
  });

  describe("keyboard and pointer", () => {
    it("calls onStepChange with the index on click, Enter and Space", async () => {
      const onStepChange = vi.fn();
      render(<Stepper steps={steps} current={2} onStepChange={onStepChange} label="n" />);
      await userEvent.click(screen.getByRole("button", { name: /Step 01/ }));
      expect(onStepChange).toHaveBeenLastCalledWith(0);
      screen.getByRole("button", { name: /Step 02/ }).focus();
      await userEvent.keyboard("{Enter}");
      expect(onStepChange).toHaveBeenLastCalledWith(1);
      await userEvent.keyboard(" ");
      expect(onStepChange).toHaveBeenCalledTimes(3);
    });

    it("tabs through the pickable steps in order and skips locked ones", async () => {
      render(<Stepper steps={steps} current={1} onStepChange={() => undefined} label="n" />);
      await userEvent.tab();
      expect(screen.getByRole("button", { name: /Step 01/ })).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByRole("button", { name: /Step 02/ })).toHaveFocus();
      await userEvent.tab();
      expect(document.body).toHaveFocus();
    });

    it("does nothing when a locked step is clicked", async () => {
      const onStepChange = vi.fn();
      render(<Stepper steps={steps} current={0} onStepChange={onStepChange} label="n" />);
      await userEvent.click(screen.getByText("Finish"));
      expect(onStepChange).not.toHaveBeenCalled();
    });
  });

  describe("vertical panel", () => {
    it("renders the panel only under the current step", () => {
      const renderPanel = vi.fn((i: number) => <p>Panel {i}</p>);
      const { rerender } = render(
        <Stepper
          steps={steps}
          current={1}
          orientation="vertical"
          renderPanel={renderPanel}
          label="n"
        />,
      );
      const items = screen.getAllByRole("listitem");
      expect(within(nth(items, 1)).getByText("Panel 1").parentElement).toHaveClass(
        "ol-stepper__panel",
      );
      expect(screen.getAllByText(/Panel/)).toHaveLength(1);
      rerender(
        <Stepper
          steps={steps}
          current={2}
          orientation="vertical"
          renderPanel={renderPanel}
          label="n"
        />,
      );
      expect(
        within(nth(screen.getAllByRole("listitem"), 2)).getByText("Panel 2"),
      ).toBeInTheDocument();
      expect(screen.queryByText("Panel 1")).toBeNull();
    });

    it("ignores renderPanel when horizontal", () => {
      render(<Stepper steps={steps} renderPanel={() => <p>Panel</p>} label="n" />);
      expect(screen.queryByText("Panel")).toBeNull();
    });
  });

  describe("locale", () => {
    it("takes the words from the labels prop", () => {
      render(
        <Stepper
          steps={[{ label: "Cuerpo" }, { label: "Mástil", error: "Falta" }]}
          current={1}
          labels={{ step: "Paso", of: "de", error: "requiere atención" }}
          label="n"
        />,
      );
      expect(screen.getByText(/Paso/, { selector: "p" })).toHaveTextContent("Paso 02 de 02");
      expect(nth(screen.getAllByRole("listitem"), 1)).toHaveTextContent("requiere atención: Falta");
    });

    it("uses the stepper words of the nearest Root locale", () => {
      render(
        <Root
          locale={{
            ...en,
            stepper: { step: "ステップ", of: "/", completed: "完了", error: "要確認" },
          }}
        >
          <Stepper steps={steps} current={1} label="n" />
        </Root>,
      );
      expect(screen.getByText(/ステップ/, { selector: "p" })).toHaveTextContent("ステップ 02 / 04");
    });
  });

  describe("motion", () => {
    const css = readFileSync("src/components/Stepper/Stepper.css", "utf8");

    it("times every transition and animation with motion tokens only", () => {
      const timings = css.match(/(?:transition|animation):[^;]+;/g) ?? [];
      expect(timings.length).toBeGreaterThan(0);
      for (const rule of timings) {
        expect(rule).not.toMatch(/\d+m?s\b/);
        expect(rule).toMatch(/var\(--dur-[sml]\)/);
      }
      expect(css).not.toMatch(/blur|bounce|overshoot|cubic-bezier|steps\(/);
    });

    it("moves only clip-path, stroke-dashoffset and colour (no transforms)", () => {
      expect(css).not.toMatch(/transform|scale|translate/);
    });

    it("draws marks from the DOM state, so reduced motion (1ms durations) lands on the end state", () => {
      render(<Stepper steps={steps} current={1} label="n" />);
      const done = nth(screen.getAllByRole("listitem"), 0);
      const check = done.querySelector(".ol-stepper__check");
      expect(check).toHaveAttribute("pathLength", "1");
      expect(done.querySelector(".ol-stepper__mark")).toHaveAttribute("aria-hidden", "true");
      expect(css).toMatch(/\[data-state="done"\] \.ol-stepper__check \{\s*stroke-dashoffset: 0/);
    });

    it("keeps the same markup inside a reduced-motion subtree", () => {
      render(
        <div className="ol-reduce-motion">
          <Stepper
            steps={steps}
            current={1}
            orientation="vertical"
            renderPanel={() => <p>Panel</p>}
            label="n"
          />
        </div>,
      );
      expect(screen.getByText("Panel")).toBeInTheDocument();
      expect(nth(screen.getAllByRole("listitem"), 1)).toHaveAttribute("aria-current", "step");
    });
  });

  describe("CSS", () => {
    const css = readFileSync("src/components/Stepper/Stepper.css", "utf8");

    it("uses the figure face for numbers and no literal colours", () => {
      expect(css).toMatch(/--text-figure-m-family/);
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
      expect(css).not.toMatch(/uppercase/);
    });

    it("hides descriptions on phones", () => {
      expect(css).toMatch(/@media \(width < 720px\)[\s\S]*\.ol-stepper__desc\s*\{\s*display: none/);
    });
  });

  describe("axe", () => {
    it("has no violations horizontal, read-only", async () => {
      const { container } = render(<Stepper steps={steps} current={1} label="Build your guitar" />);
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no violations interactive with an error", async () => {
      const { container } = render(
        <Stepper
          steps={[
            ...steps.slice(0, 2),
            { label: "Pickups", error: "Choose a pair" },
            { label: "Finish" },
          ]}
          current={1}
          onStepChange={() => undefined}
          label="Build your guitar"
        />,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no violations vertical with a panel", async () => {
      const { container } = render(
        <Stepper
          steps={steps}
          current={1}
          orientation="vertical"
          onStepChange={() => undefined}
          renderPanel={() => <p>Choose a neck.</p>}
          label="Build your guitar"
        />,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });
});
