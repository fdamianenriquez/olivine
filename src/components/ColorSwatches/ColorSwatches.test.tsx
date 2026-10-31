import { readFileSync } from "node:fs";

import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { runAxe } from "../../test/axe";
import { Field } from "../Field/Field";
import { Root } from "../Root";
import { ColorSwatches, type ColorSwatchesProps, type ColorSwatchOption } from "./ColorSwatches";

const FINISHES: ColorSwatchOption[] = [
  { value: "natural", label: "Natural", color: "#e8d9b8", hint: "Included" },
  { value: "sunburst", label: "Sunburst", color: "rgb(160 70 20 / 0.6)", base: "#d8b78a" },
  { value: "ebony", label: "Ebony", color: "#1b1410", disabled: true, hint: "Sold out" },
  { value: "white", label: "Snow", color: "#fbfaf6" },
  { value: "none", label: "No finish" },
];

const css = readFileSync("src/components/ColorSwatches/ColorSwatches.css", "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

function must<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("missing element");
  return value;
}

const radio = (name: string) => screen.getByRole("radio", { name });
const cell = (name: string) => must(radio(name).closest("label"));

function swatches(props: Partial<ColorSwatchesProps> = {}) {
  return render(<ColorSwatches legend="Finish" options={FINISHES} {...props} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ColorSwatches", () => {
  describe("structure and ARIA", () => {
    it("renders a fieldset named by its legend, with native props and modifiers", () => {
      swatches({ className: "extra", "data-testid": "g" } as Partial<ColorSwatchesProps>);
      const group = screen.getByRole("group", { name: "Finish" });
      expect(group.tagName).toBe("FIELDSET");
      expect(group).toHaveClass("ol-swatches", "ol-swatches--grid", "ol-swatches--m", "extra");
      expect(group).toHaveAttribute("data-testid", "g");
    });

    it("applies layout and size modifiers", () => {
      swatches({ layout: "stack", size: "l" });
      expect(screen.getByRole("group")).toHaveClass("ol-swatches--stack", "ol-swatches--l");
    });

    it("names each radio by its label only and describes it by its hint", () => {
      swatches();
      expect(screen.getAllByRole("radio")).toHaveLength(5);
      const natural = radio("Natural");
      expect(natural).toHaveAccessibleDescription("Included");
      expect(radio("Ebony")).toHaveAccessibleDescription("Sold out");
      expect(radio("Snow")).not.toHaveAttribute("aria-describedby");
    });

    it("hides the tile from assistive tech and passes colours only as custom properties", () => {
      const { container } = swatches();
      const tiles = container.querySelectorAll<HTMLElement>(".ol-swatches__tile");
      expect(tiles).toHaveLength(5);
      tiles.forEach((tile) => {
        expect(tile).toHaveAttribute("aria-hidden", "true");
      });
      const [natural, sunburst] = tiles;
      expect(must(natural).style.getPropertyValue("--ol-swatch")).toBe("#e8d9b8");
      expect(must(natural).style.background).toBe("");
      expect(must(sunburst).style.getPropertyValue("--ol-swatch")).toBe("rgb(160 70 20 / 0.6)");
      expect(must(sunburst).style.getPropertyValue("--ol-swatch-base")).toBe("#d8b78a");
    });

    it("draws the none tile for an option without a colour", () => {
      const { container } = swatches();
      const tile = must(cell("No finish").querySelector(".ol-swatches__tile"));
      expect(tile).toHaveClass("ol-swatches__tile--none");
      expect((tile as HTMLElement).style.getPropertyValue("--ol-swatch")).toBe("");
      expect(container.querySelectorAll(".ol-swatches__tile--none")).toHaveLength(1);
    });

    it("describes a disabled option without a hint with the locale word", () => {
      swatches({
        options: [
          { value: "a", label: "Natural", color: "#e8d9b8" },
          { value: "b", label: "Ebony", color: "#1b1410", disabled: true },
        ],
      });
      expect(radio("Ebony")).toHaveAccessibleDescription("Unavailable");
      expect(radio("Natural")).not.toHaveAttribute("aria-describedby");
    });

    it("uses the Japanese locale word", () => {
      render(
        <Root locale="ja">
          <ColorSwatches
            legend="仕上げ"
            options={[{ value: "b", label: "Ebony", color: "#1b1410", disabled: true }]}
          />
        </Root>,
      );
      expect(radio("Ebony")).toHaveAccessibleDescription("選択できません");
    });

    it("uses the locale of the nearest Root", () => {
      render(
        <Root locale="es">
          <ColorSwatches
            legend="Acabado"
            options={[{ value: "b", label: "Ébano", color: "#1b1410", disabled: true }]}
          />
        </Root>,
      );
      expect(radio("Ébano")).toHaveAccessibleDescription("No disponible");
    });

    it("can be named with aria-label instead of a legend", () => {
      const { container } = render(<ColorSwatches aria-label="Finish" options={FINISHES} />);
      expect(container.querySelector("legend")).toBeNull();
      expect(screen.getByRole("group", { name: "Finish" })).toBeInTheDocument();
    });

    it("takes its name and description from a surrounding Field", () => {
      render(
        <Field label="Finish" hint="Choose one">
          <ColorSwatches options={FINISHES} />
        </Field>,
      );
      const group = screen.getByRole("group", { name: "Finish" });
      expect(group).toHaveAccessibleDescription("Choose one");
    });

    it("forwards the ref to the fieldset", () => {
      const ref = createRef<HTMLFieldSetElement>();
      render(<ColorSwatches ref={ref} legend="Finish" options={FINISHES} />);
      expect(ref.current).toBeInstanceOf(HTMLFieldSetElement);
    });
  });

  describe("selection", () => {
    it("selects on click when uncontrolled and marks the cell on", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      swatches({ defaultValue: "natural", onChange });
      expect(radio("Natural")).toBeChecked();
      expect(cell("Natural")).toHaveAttribute("data-state", "on");
      expect(cell("Natural")).toHaveClass("ol-ink-wipe");
      await user.click(cell("Snow"));
      expect(onChange).toHaveBeenCalledWith("white");
      expect(radio("Snow")).toBeChecked();
      expect(cell("Snow")).toHaveAttribute("data-state", "on");
      expect(cell("Natural")).toHaveAttribute("data-state", "off");
    });

    it("does not call onChange when the selected swatch is pressed again", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      swatches({ defaultValue: "natural", onChange });
      await user.click(cell("Natural"));
      expect(onChange).not.toHaveBeenCalled();
    });

    it("selects nothing by default", () => {
      swatches();
      screen.getAllByRole("radio").forEach((r) => {
        expect(r).not.toBeChecked();
      });
    });

    it("follows the controlled value and keeps it when the owner rejects a change", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { rerender } = render(
        <ColorSwatches legend="Finish" options={FINISHES} value="natural" onChange={onChange} />,
      );
      await user.click(cell("Snow"));
      expect(onChange).toHaveBeenCalledWith("white");
      expect(radio("Natural")).toBeChecked();
      expect(radio("Snow")).not.toBeChecked();
      rerender(
        <ColorSwatches legend="Finish" options={FINISHES} value="white" onChange={onChange} />,
      );
      expect(radio("Snow")).toBeChecked();
      expect(cell("Snow")).toHaveAttribute("data-state", "on");
      rerender(
        <ColorSwatches legend="Finish" options={FINISHES} value={null} onChange={onChange} />,
      );
      expect(radio("Snow")).not.toBeChecked();
    });

    it("ignores clicks on a disabled swatch and on a disabled group", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { rerender } = swatches({ onChange });
      expect(radio("Ebony")).toBeDisabled();
      expect(cell("Ebony")).toHaveClass("ol-swatches__item--disabled");
      await user.click(cell("Ebony"));
      expect(onChange).not.toHaveBeenCalled();
      rerender(<ColorSwatches legend="Finish" options={FINISHES} disabled onChange={onChange} />);
      screen.getAllByRole("radio").forEach((r) => {
        expect(r).toBeDisabled();
      });
      await user.click(cell("Snow"));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("keyboard", () => {
    it("Tab enters on the selected swatch: one tab stop for the group", async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">Before</button>
          <ColorSwatches legend="Finish" options={FINISHES} defaultValue="white" />
          <button type="button">After</button>
        </>,
      );
      await user.click(screen.getByRole("button", { name: "Before" }));
      await user.tab();
      expect(radio("Snow")).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
      await user.tab({ shift: true });
      expect(radio("Snow")).toHaveFocus();
    });

    it("Tab enters on the first swatch when none is selected", async () => {
      const user = userEvent.setup();
      swatches();
      await user.tab();
      expect(radio("Natural")).toHaveFocus();
    });

    it("arrows move and select, skip disabled swatches and wrap", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      swatches({ defaultValue: "sunburst", onChange });
      radio("Sunburst").focus();
      await user.keyboard("{ArrowRight}");
      expect(radio("Snow")).toHaveFocus();
      expect(radio("Snow")).toBeChecked();
      expect(onChange).toHaveBeenLastCalledWith("white");
      await user.keyboard("{ArrowLeft}");
      expect(radio("Sunburst")).toBeChecked();
      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(radio("No finish")).toBeChecked();
      await user.keyboard("{ArrowDown}");
      expect(radio("Natural")).toBeChecked();
      await user.keyboard("{ArrowUp}");
      expect(radio("No finish")).toBeChecked();
      expect(radio("Ebony")).not.toBeChecked();
    });

    it("Space selects the focused swatch", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      swatches({ onChange });
      await user.tab();
      expect(radio("Natural")).not.toBeChecked();
      await user.keyboard(" ");
      expect(radio("Natural")).toBeChecked();
      expect(onChange).toHaveBeenCalledWith("natural");
    });

    it("never focuses a disabled swatch with Tab", async () => {
      const user = userEvent.setup();
      swatches({
        options: [
          { value: "b", label: "Ebony", color: "#1b1410", disabled: true },
          { value: "a", label: "Natural", color: "#e8d9b8" },
        ],
      });
      await user.tab();
      expect(radio("Natural")).toHaveFocus();
    });
  });

  describe("forms", () => {
    it("submits the value under `name`", () => {
      render(
        <form data-testid="f">
          <ColorSwatches legend="Finish" name="finish" options={FINISHES} defaultValue="white" />
        </form>,
      );
      const data = new FormData(screen.getByTestId<HTMLFormElement>("f"));
      expect(data.get("finish")).toBe("white");
    });

    it("is not submitted with an enclosing form when it has no `name`", () => {
      render(
        <form data-testid="f">
          <ColorSwatches legend="Finish" options={FINISHES} defaultValue="white" />
        </form>,
      );
      const form = screen.getByTestId<HTMLFormElement>("f");
      expect([...new FormData(form).keys()]).toHaveLength(0);
      expect(screen.getByRole<HTMLInputElement>("radio", { name: "Snow" }).form).toBeNull();
      // The radios still form one group.
      const names = new Set(screen.getAllByRole("radio").map((r) => r.getAttribute("name")));
      expect(names.size).toBe(1);
    });

    it("marks the radios required", () => {
      swatches({ required: true });
      screen.getAllByRole("radio").forEach((r) => {
        expect(r).toBeRequired();
      });
    });
  });

  describe("tooltip labels", () => {
    it("shows the name and reason of a disabled swatch on pointer hover", async () => {
      const user = userEvent.setup();
      const { container } = swatches({ labels: "tooltip", defaultValue: "natural" });
      expect(radio("Ebony")).toHaveAccessibleDescription("Sold out");
      await user.hover(cell("Ebony"));
      const tip = await screen.findByRole("tooltip");
      expect(tip).toHaveTextContent("Ebony — Sold out");
      // The tooltip is portalled to the body; `region` is a page-level rule, off for a fragment.
      expect(
        await runAxe(container.ownerDocument.body, { rules: { region: { enabled: false } } }),
      ).toHaveNoViolations();
      await user.unhover(cell("Ebony"));
    });

    it("uses the locale word as the reason of a disabled swatch without a hint", async () => {
      const user = userEvent.setup();
      swatches({
        labels: "tooltip",
        options: [
          { value: "a", label: "Natural", color: "#e8d9b8" },
          { value: "b", label: "Jet", color: "#000000", disabled: true },
        ],
      });
      await user.hover(cell("Jet"));
      expect(await screen.findByRole("tooltip")).toHaveTextContent("Jet — Unavailable");
    });

    it("shows tiles only, names radios by the label and echoes the selection", async () => {
      const user = userEvent.setup();
      const { container } = swatches({ labels: "tooltip", defaultValue: "natural" });
      expect(screen.getByRole("group")).toHaveClass("ol-swatches--tooltip");
      expect(container.querySelector(".ol-swatches__text")).toBeNull();
      expect(radio("Natural")).toHaveAccessibleDescription("Included");
      const echo = must(container.querySelector(".ol-swatches__current"));
      expect(echo).toHaveAttribute("aria-hidden", "true");
      expect(echo).toHaveTextContent("Natural");
      expect(echo).toHaveTextContent("Included");
      await user.click(cell("Snow"));
      expect(echo).toHaveTextContent("Snow");
    });

    it("opens a tooltip with the name on keyboard focus without describing the radio twice", async () => {
      const user = userEvent.setup();
      swatches({ labels: "tooltip", defaultValue: "white" });
      await user.tab();
      expect(radio("Snow")).toHaveFocus();
      expect(screen.getByRole("tooltip")).toHaveTextContent("Snow");
      expect(radio("Snow").getAttribute("aria-describedby") ?? "").not.toContain(
        screen.getByRole("tooltip").id,
      );
    });
  });

  describe("motion", () => {
    it("does not stamp the ✓ on first render or a controlled change", () => {
      const { container, rerender } = render(
        <ColorSwatches legend="Finish" options={FINISHES} value="natural" onChange={vi.fn()} />,
      );
      expect(container.querySelector(".ol-swatches__item--stamp")).toBeNull();
      rerender(
        <ColorSwatches legend="Finish" options={FINISHES} value="white" onChange={vi.fn()} />,
      );
      expect(container.querySelector(".ol-swatches__item--stamp")).toBeNull();
    });

    it("stamps the ✓ on a user's selection and clears it after the animation", async () => {
      const user = userEvent.setup();
      swatches({ defaultValue: "natural" });
      await user.click(cell("Snow"));
      expect(cell("Snow")).toHaveClass("ol-swatches__item--stamp");
      act(() => {
        fireEvent.animationEnd(must(cell("Snow").querySelector(".ol-swatches__check")));
      });
      expect(cell("Snow")).not.toHaveClass("ol-swatches__item--stamp");
    });

    it("does not stamp when a controlled owner rejects the press", async () => {
      const user = userEvent.setup();
      function Owner() {
        const [value, setValue] = useState("natural");
        return (
          <>
            <ColorSwatches
              legend="Finish"
              options={FINISHES}
              value={value}
              onChange={() => undefined}
            />
            <button
              type="button"
              onClick={() => {
                setValue("white");
              }}
            >
              Set
            </button>
          </>
        );
      }
      const { container } = render(<Owner />);
      await user.click(cell("Snow"));
      await user.click(screen.getByRole("button", { name: "Set" }));
      expect(radio("Snow")).toBeChecked();
      expect(container.querySelector(".ol-swatches__item--stamp")).toBeNull();
    });

    it("does not stamp under reduced motion", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div className={REDUCE_MOTION_CLASS}>
          <ColorSwatches legend="Finish" options={FINISHES} defaultValue="natural" />
        </div>,
      );
      await user.click(cell("Snow"));
      expect(radio("Snow")).toBeChecked();
      expect(container.querySelector(".ol-swatches__item--stamp")).toBeNull();
    });

    it("uses only motion tokens and the shared ink wipe", () => {
      expect(css).not.toMatch(/\d+m?s\b(?![\w-])/);
      expect(css).toMatch(/animation: ol-hanko var\(--dur-s\) var\(--ease-move\)/);
      expect(css).toMatch(/\.ol-swatches__item\.ol-ink-wipe:dir\(rtl\)/);
    });
  });

  describe("stylesheet", () => {
    it("reads the user's colour only through the custom properties", () => {
      expect(css).toMatch(/var\(--ol-swatch, var\(--paper-2\)\)/);
      expect(css).toMatch(/var\(--ol-swatch-base, transparent\)/);
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    });

    it("has forced-colors rules that keep the colour and give it a system edge", () => {
      const forced = css.slice(css.indexOf("@media (forced-colors: active)"));
      expect(forced).toMatch(/forced-color-adjust: none/);
      expect(forced).toMatch(/CanvasText/);
      expect(forced).toMatch(/GrayText/);
    });
  });

  describe("development warnings", () => {
    it("warns without a group name, on duplicate values, a missing label and value without onChange", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <ColorSwatches
          value="a"
          options={[
            { value: "a", label: "Natural" },
            { value: "a", label: "" },
          ]}
        />,
      );
      const messages = warn.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("needs a name"))).toBe(true);
      expect(messages.some((m) => m.includes("unique"))).toBe(true);
      expect(messages.some((m) => m.includes("needs a `label`"))).toBe(true);
      expect(messages.some((m) => m.includes("read-only"))).toBe(true);
    });

    it("warns when `required` is set without a `name`", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const { rerender } = render(<ColorSwatches legend="Finish" options={FINISHES} required />);
      expect(warn.mock.calls.some((c) => String(c[0]).includes("`required` needs a `name`"))).toBe(
        true,
      );
      warn.mockClear();
      rerender(<ColorSwatches legend="Finish" name="finish" options={FINISHES} required />);
      expect(warn).not.toHaveBeenCalled();
    });

    it("warns about an unsafe colour and does not pass it to the tile", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const { container } = render(
        <ColorSwatches
          legend="Finish"
          options={[{ value: "a", label: "Natural", color: "red; background: url(x)" }]}
        />,
      );
      expect(warn.mock.calls.some((c) => String(c[0]).includes("not valid CSS colours"))).toBe(
        true,
      );
      const tile = must(container.querySelector<HTMLElement>(".ol-swatches__tile"));
      expect(tile.style.getPropertyValue("--ol-swatch")).toBe("");
      expect(tile).not.toHaveClass("ol-swatches__tile--none");
    });
  });

  describe("axe", () => {
    it("has no violations with an error in a Field on an enabled group", async () => {
      const { container } = render(
        <Field label="Finish" hint="Choose one" error="Pick a finish">
          <ColorSwatches name="finish" options={FINISHES} />
        </Field>,
      );
      const group = screen.getByRole("group", { name: "Finish" });
      expect(group).toHaveAccessibleDescription(/Pick a finish/);
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no violations (grid, selected, unavailable option)", async () => {
      const { container } = swatches({ defaultValue: "natural" });
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no violations in the sumi theme and the stack layout", async () => {
      const { container } = render(
        <Root theme="sumi">
          <ColorSwatches legend="Finish" layout="stack" options={FINISHES} defaultValue="white" />
        </Root>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no violations in tooltip mode with the tooltip open", async () => {
      const user = userEvent.setup();
      const { container } = swatches({ labels: "tooltip", defaultValue: "natural" });
      await user.tab();
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no violations inside a Field and when disabled", async () => {
      const { container } = render(
        <Field label="Finish" hint="Choose one" error="Pick a finish">
          <ColorSwatches options={FINISHES} disabled />
        </Field>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });
});
