import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { runAxe } from "../../test/axe";
import { Chip } from "../Chip";
import { Field } from "../Field";
import { Root } from "../Root";
import { ChipGroup, type ChipGroupActions, type ChipGroupProps } from "./ChipGroup";

afterEach(() => {
  vi.restoreAllMocks();
});

const woods = ["Walnut", "Oak", "Alder", "Ash"];

function Woods(props: Partial<ChipGroupProps> & { disabledChip?: string }) {
  const { disabledChip, ...group } = props;
  return (
    <ChipGroup label="Woods" {...group}>
      {woods.map((w) => (
        <Chip key={w} value={w} disabled={w === disabledChip}>
          {w}
        </Chip>
      ))}
    </ChipGroup>
  );
}

/** A removable list whose owner removes the chip (or vetoes it). */
function Recipients({
  initial = ["Yui", "Haruka", "Daichi"],
  veto = false,
  children,
  ...group
}: Partial<ChipGroupProps> & { initial?: string[]; veto?: boolean; children?: ReactNode }) {
  const [people, setPeople] = useState(initial);
  return (
    <>
      <ChipGroup
        label="Recipients"
        empty="No recipients"
        onRemove={(v) => {
          if (!veto) {
            setPeople((p) => p.filter((x) => x !== v));
          }
        }}
        {...group}
      >
        {people.map((p) => (
          <Chip key={p} value={p}>
            {p}
          </Chip>
        ))}
      </ChipGroup>
      {children}
    </>
  );
}

const chip = (name: string) => screen.getByRole("button", { name });
const remove = (name: string) => screen.getByRole("button", { name: `Remove ${name}` });

describe("ChipGroup", () => {
  describe("roles and name", () => {
    it("is a labelled toolbar of chips", () => {
      render(<Woods />);
      const toolbar = screen.getByRole("toolbar", { name: "Woods" });
      expect(toolbar).toHaveClass("ol-chipgroup");
      expect(toolbar).not.toHaveAttribute("aria-orientation");
    });

    it("stays a toolbar with one chip", () => {
      render(
        <ChipGroup label="Woods">
          <Chip value="w" onClick={() => undefined}>
            Walnut
          </Chip>
        </ChipGroup>,
      );
      expect(screen.getByRole("toolbar")).toBeInTheDocument();
    });

    it("becomes a group with the empty content when there are no chips", () => {
      render(
        <ChipGroup label="Recipients" empty="No recipients">
          {[]}
          <>{null}</>
        </ChipGroup>,
      );
      const group = screen.getByRole("group", { name: "Recipients" });
      expect(group).toHaveAttribute("data-state", "empty");
      expect(group).toHaveTextContent("No recipients");
      expect(group.querySelector(".ol-chipgroup__empty")).toBeInTheDocument();
      expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    });

    it("forwards ref, className, style and other props to the root", () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <ChipGroup
          ref={ref}
          label="Woods"
          className="x"
          style={{ order: 2 }}
          data-testid="g"
          id="g1"
        >
          <Chip value="a">Alder</Chip>
        </ChipGroup>,
      );
      expect(ref.current).toBe(screen.getByTestId("g"));
      expect(ref.current).toHaveClass("ol-chipgroup", "x");
      expect(ref.current).toHaveStyle({ order: "2" });
      expect(ref.current).toHaveAttribute("id", "g1");
    });

    it("takes aria-labelledby instead of label", () => {
      render(
        <>
          <span id="lbl">Filters</span>
          <ChipGroup aria-labelledby="lbl">
            <Chip value="a" onClick={() => undefined}>
              A
            </Chip>
          </ChipGroup>
        </>,
      );
      expect(screen.getByRole("toolbar", { name: "Filters" })).toBeInTheDocument();
    });

    it("reads its description from a surrounding Field", () => {
      render(
        <Field hint="Pick any" error="Pick one at least">
          <Woods selectionMode="multiple" />
        </Field>,
      );
      expect(screen.getByRole("toolbar")).toHaveAccessibleDescription("Pick any Pick one at least");
    });

    it("is named by its own label inside a Field and does not take the Field's control id", () => {
      const { container } = render(
        <Field label="Woods" hint="Pick any">
          <Woods label="Woods" selectionMode="multiple" />
        </Field>,
      );
      const toolbar = screen.getByRole("toolbar", { name: "Woods" });
      expect(toolbar).not.toHaveAttribute("id");
      const fieldLabel = container.querySelector("label");
      expect(fieldLabel?.htmlFor).not.toBe("");
      expect(container.querySelector(`#${CSS.escape(fieldLabel?.htmlFor ?? "")}`)).toBeNull();
      expect(toolbar).toHaveAccessibleDescription("Pick any");
    });

    it("warns when it has no name inside a Field", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <Field label="Woods">
          <ChipGroup selectionMode="multiple">
            <Chip value="a">Alder</Chip>
          </ChipGroup>
        </Field>,
      );
      expect(
        warn.mock.calls.some((c) => String(c[0]).includes("a Field's label does not name")),
      ).toBe(true);
    });

    it("keeps chip semantics: aria-pressed only when the group selects", () => {
      const { rerender } = render(<Woods />);
      expect(screen.queryAllByRole("button")).toHaveLength(0); // static chips in mode none
      rerender(<Woods selectionMode="multiple" />);
      expect(chip("Walnut")).toHaveAttribute("aria-pressed", "false");
      rerender(
        <ChipGroup label="Woods">
          <Chip value="w" onClick={() => undefined}>
            Walnut
          </Chip>
        </ChipGroup>,
      );
      expect(chip("Walnut")).not.toHaveAttribute("aria-pressed");
    });
  });

  describe("axe", () => {
    it.each(["none", "single", "multiple"] as const)(
      "has no violations in mode %s",
      async (mode) => {
        const { container } = render(
          <Woods selectionMode={mode} defaultValue={["Oak"]} disabledChip="Ash" />,
        );
        expect(await runAxe(container)).toHaveNoViolations();
      },
    );

    it("has no violations with remove cells and when empty", async () => {
      const { container, rerender } = render(<Recipients selectionMode="multiple" />);
      expect(await runAxe(container)).toHaveNoViolations();
      rerender(<Recipients initial={[]} />);
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no violations when disabled", async () => {
      const { container } = render(<Woods selectionMode="multiple" disabled />);
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });

  describe("axe in active states", () => {
    it("has no violations after Escape filled the status", async () => {
      const user = userEvent.setup();
      const { container } = render(<Woods selectionMode="multiple" defaultValue={["Oak"]} />);
      await user.tab();
      await user.keyboard("{Escape}");
      expect(screen.getByRole("status")).toHaveTextContent("Selection cleared");
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no violations with the root focused after the last removal", async () => {
      const user = userEvent.setup();
      const { container } = render(<Recipients initial={["Yui"]} />);
      await user.tab();
      await user.keyboard("{Delete}");
      expect(screen.getByRole("group")).toHaveFocus();
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no violations inside a Field with a hint and an error", async () => {
      const { container } = render(
        <Field label="Woods" hint="Pick any" error="Pick one at least">
          <Woods selectionMode="multiple" />
        </Field>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });

  describe("tab stop", () => {
    it("is one stop: the first enabled chip, skipping a disabled one", async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">before</button>
          <Woods selectionMode="multiple" disabledChip="Walnut" />
          <button type="button">after</button>
        </>,
      );
      await user.tab();
      await user.tab();
      expect(chip("Oak")).toHaveFocus();
      expect(chip("Walnut")).toHaveAttribute("tabindex", "-1");
      await user.tab();
      expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
      await user.tab({ shift: true });
      expect(chip("Oak")).toHaveFocus();
    });

    it("enters on the first selected chip", async () => {
      const user = userEvent.setup();
      render(<Woods selectionMode="multiple" defaultValue={["Alder", "Ash"]} />);
      await user.tab();
      expect(chip("Alder")).toHaveFocus();
    });

    it("enters on the last focused chip", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Woods selectionMode="multiple" defaultValue={["Walnut"]} />
          <button type="button">after</button>
        </>,
      );
      await user.tab();
      await user.keyboard("{ArrowRight}{ArrowRight}");
      expect(chip("Alder")).toHaveFocus();
      await user.tab();
      await user.tab({ shift: true });
      expect(chip("Alder")).toHaveFocus();
    });

    it("keeps × buttons out of the tab order", async () => {
      const user = userEvent.setup();
      render(
        <>
          <ChipGroup label="Picks" selectionMode="multiple" onRemove={() => undefined}>
            <Chip value="a">Alder</Chip>
            <Chip value="b">Birch</Chip>
          </ChipGroup>
          <button type="button">after</button>
        </>,
      );
      expect(remove("Alder")).toHaveAttribute("tabindex", "-1");
      await user.tab();
      expect(chip("Alder")).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
    });

    it("roves over remove-only chips through their × buttons", async () => {
      const user = userEvent.setup();
      render(<Recipients />);
      await user.tab();
      expect(remove("Yui")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(remove("Haruka")).toHaveFocus();
    });

    it("is skipped entirely when the group is disabled", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Woods selectionMode="multiple" disabled />
          <button type="button">after</button>
        </>,
      );
      expect(screen.getByRole("toolbar")).toHaveAttribute("aria-disabled", "true");
      for (const w of woods) expect(chip(w)).toBeDisabled();
      await user.tab();
      expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
    });
  });

  describe("arrow keys", () => {
    it("moves with Left/Right, stops at the ends, and Home/End go to the ends", async () => {
      const user = userEvent.setup();
      render(<Woods selectionMode="multiple" disabledChip="Alder" />);
      await user.tab();
      await user.keyboard("{ArrowLeft}");
      expect(chip("Walnut")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(chip("Oak")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(chip("Ash")).toHaveFocus(); // Alder is disabled
      await user.keyboard("{ArrowRight}");
      expect(chip("Ash")).toHaveFocus(); // no wrap
      await user.keyboard("{Home}");
      expect(chip("Walnut")).toHaveFocus();
      await user.keyboard("{End}");
      expect(chip("Ash")).toHaveFocus();
    });

    it("does not select on arrow", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Woods selectionMode="single" onChange={onChange} />);
      await user.tab();
      await user.keyboard("{ArrowRight}{End}");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("swaps Left and Right under rtl", async () => {
      const user = userEvent.setup();
      render(
        <div dir="rtl" style={{ direction: "rtl" }}>
          <Woods selectionMode="multiple" />
        </div>,
      );
      await user.tab();
      await user.keyboard("{ArrowLeft}");
      expect(chip("Oak")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(chip("Walnut")).toHaveFocus();
    });

    it("moves Up and Down by visual row", () => {
      render(<Woods selectionMode="multiple" />);
      // Two rows: Walnut Oak Alder / Ash
      const boxes: Record<string, [number, number]> = {
        Walnut: [0, 0],
        Oak: [90, 0],
        Alder: [180, 0],
        Ash: [80, 40],
      };
      for (const [name, [left, top]] of Object.entries(boxes)) {
        chip(name).getBoundingClientRect = () =>
          ({ left, top, width: 80, height: 32, right: left + 80, bottom: top + 32 }) as DOMRect;
      }
      act(() => {
        chip("Alder").focus();
      });
      fireEvent.keyDown(chip("Alder"), { key: "ArrowDown" });
      expect(chip("Ash")).toHaveFocus();
      // Last row: nothing happens and the key is not prevented, so the page can scroll.
      expect(fireEvent.keyDown(chip("Ash"), { key: "ArrowDown" })).toBe(true);
      expect(chip("Ash")).toHaveFocus();
      fireEvent.keyDown(chip("Ash"), { key: "ArrowUp" });
      expect(chip("Oak")).toHaveFocus();
    });
  });

  describe("selection", () => {
    it("multiple: each press toggles one chip, in the chips' order", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Woods selectionMode="multiple" onChange={onChange} />);
      await user.click(chip("Alder"));
      await user.click(chip("Walnut"));
      expect(onChange).toHaveBeenLastCalledWith(["Walnut", "Alder"]);
      expect(chip("Walnut")).toHaveAttribute("aria-pressed", "true");
      await user.click(chip("Alder"));
      expect(onChange).toHaveBeenLastCalledWith(["Walnut"]);
      expect(chip("Alder")).toHaveAttribute("aria-pressed", "false");
    });

    it("toggles with Space and Enter", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Woods selectionMode="multiple" onChange={onChange} />);
      await user.tab();
      await user.keyboard(" ");
      expect(onChange).toHaveBeenLastCalledWith(["Walnut"]);
      await user.keyboard("{ArrowRight}{Enter}");
      expect(onChange).toHaveBeenLastCalledWith(["Walnut", "Oak"]);
    });

    it("single: a press replaces the selection and a second press releases it", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Woods selectionMode="single" defaultValue={["Oak"]} onChange={onChange} />);
      await user.click(chip("Ash"));
      expect(onChange).toHaveBeenLastCalledWith(["Ash"]);
      expect(chip("Oak")).toHaveAttribute("aria-pressed", "false");
      expect(chip("Ash")).toHaveAttribute("aria-pressed", "true");
      await user.click(chip("Ash"));
      expect(onChange).toHaveBeenLastCalledWith([]);
    });

    it("disallowEmptySelection keeps the last selected chip", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { rerender } = render(
        <Woods
          selectionMode="single"
          defaultValue={["Oak"]}
          disallowEmptySelection
          onChange={onChange}
        />,
      );
      await user.click(chip("Oak"));
      expect(onChange).not.toHaveBeenCalled();
      expect(chip("Oak")).toHaveAttribute("aria-pressed", "true");
      rerender(
        <Woods
          selectionMode="multiple"
          value={["Oak"]}
          disallowEmptySelection
          onChange={onChange}
        />,
      );
      await user.click(chip("Oak"));
      expect(onChange).not.toHaveBeenCalled();
    });

    it("is controlled by value", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { rerender } = render(
        <Woods selectionMode="multiple" value={["Oak"]} onChange={onChange} />,
      );
      await user.click(chip("Ash"));
      expect(onChange).toHaveBeenLastCalledWith(["Oak", "Ash"]);
      expect(chip("Ash")).toHaveAttribute("aria-pressed", "false"); // owner did not update
      rerender(<Woods selectionMode="multiple" value={["Ash"]} onChange={onChange} />);
      expect(chip("Ash")).toHaveAttribute("aria-pressed", "true");
      expect(chip("Oak")).toHaveAttribute("aria-pressed", "false");
    });

    it("ignores the chips' own selection props inside a group", () => {
      render(
        <ChipGroup label="Woods" selectionMode="multiple">
          <Chip value="w" selected>
            Walnut
          </Chip>
        </ChipGroup>,
      );
      expect(chip("Walnut")).toHaveAttribute("aria-pressed", "false");
    });

    it("renders hidden inputs for name, not in mode none", () => {
      const { container, rerender } = render(
        <form>
          <Woods selectionMode="multiple" name="wood" defaultValue={["Oak", "Ash"]} />
        </form>,
      );
      const values = () =>
        Array.from(container.querySelectorAll<HTMLInputElement>('input[type="hidden"]')).map(
          (i) => `${i.name}=${i.value}`,
        );
      expect(values()).toEqual(["wood=Oak", "wood=Ash"]);
      rerender(
        <form>
          <Woods name="wood" defaultValue={["Oak"]} />
        </form>,
      );
      expect(values()).toEqual([]);
    });

    it("does not submit from a disabled group", () => {
      const { container } = render(
        <form>
          <Woods selectionMode="multiple" name="wood" defaultValue={["Oak"]} disabled />
        </form>,
      );
      expect(container.querySelector('input[type="hidden"]')).toBeNull();
    });

    it("does not select from a disabled group", () => {
      const onChange = vi.fn();
      render(<Woods selectionMode="multiple" disabled onChange={onChange} />);
      fireEvent.click(chip("Oak"));
      expect(onChange).not.toHaveBeenCalled();
    });

    it("does not stamp the ✓ under reduced motion", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div className={REDUCE_MOTION_CLASS}>
          <Woods selectionMode="multiple" />
        </div>,
      );
      await user.click(chip("Oak"));
      expect(chip("Oak")).toHaveAttribute("aria-pressed", "true");
      expect(container.querySelector(".ol-chip--stamp")).toBeNull();
    });
  });

  describe("Escape", () => {
    it("clears the non-disabled selection and announces it", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Woods
          selectionMode="multiple"
          defaultValue={["Walnut", "Alder", "Ash"]}
          disabledChip="Alder"
          onChange={onChange}
        />,
      );
      await user.tab();
      await user.keyboard("{Escape}");
      expect(onChange).toHaveBeenLastCalledWith(["Alder"]);
      expect(chip("Alder")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("status")).toHaveTextContent("Selection cleared");
    });

    it("is stopped when it clears and passed on when nothing changes", () => {
      const outer = vi.fn();
      render(
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
          onKeyDown={(e) => {
            outer(e.key, e.defaultPrevented);
          }}
        >
          <Woods selectionMode="multiple" defaultValue={["Oak"]} />
        </div>,
      );
      act(() => {
        chip("Oak").focus();
      });
      expect(fireEvent.keyDown(chip("Oak"), { key: "Escape" })).toBe(false);
      expect(outer).not.toHaveBeenCalled();
      expect(fireEvent.keyDown(chip("Oak"), { key: "Escape" })).toBe(true);
      expect(outer).toHaveBeenCalledWith("Escape", false);
    });

    it("is passed on in mode none, with disallowEmptySelection, and when disabled", () => {
      const { rerender } = render(<Woods />);
      const root = screen.getByRole("toolbar");
      expect(fireEvent.keyDown(root, { key: "Escape" })).toBe(true);
      rerender(<Woods selectionMode="multiple" value={["Oak"]} disallowEmptySelection />);
      expect(fireEvent.keyDown(chip("Oak"), { key: "Escape" })).toBe(true);
      expect(chip("Oak")).toHaveAttribute("aria-pressed", "true");
      rerender(<Woods selectionMode="multiple" value={["Oak"]} disabled />);
      expect(fireEvent.keyDown(chip("Oak"), { key: "Escape" })).toBe(true);
    });

    it("is ignored during IME composition", () => {
      const onChange = vi.fn();
      render(<Woods selectionMode="multiple" defaultValue={["Oak"]} onChange={onChange} />);
      fireEvent.keyDown(chip("Oak"), { key: "Escape", isComposing: true });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("removal", () => {
    it("calls onRemove with the value from the × button and from Delete/Backspace", async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      render(
        <ChipGroup label="Picks" selectionMode="multiple" onRemove={onRemove}>
          <Chip value="a">Alder</Chip>
          <Chip value="b" removable={false}>
            Birch
          </Chip>
          <Chip value="c">Cedar</Chip>
        </ChipGroup>,
      );
      expect(screen.queryByRole("button", { name: "Remove Birch" })).not.toBeInTheDocument();
      fireEvent.click(remove("Alder"));
      expect(onRemove).toHaveBeenLastCalledWith("a", expect.objectContaining({ type: "click" }));
      await user.tab();
      await user.keyboard("{Delete}");
      expect(onRemove).toHaveBeenLastCalledWith("a", expect.objectContaining({ key: "Delete" }));
      await user.keyboard("{End}{Backspace}");
      expect(onRemove).toHaveBeenLastCalledWith("c", expect.objectContaining({ key: "Backspace" }));
      await user.keyboard("{ArrowLeft}{Delete}");
      expect(onRemove).toHaveBeenCalledTimes(3); // Birch is not removable
    });

    it("does not remove during IME composition or from a disabled group", () => {
      const onRemove = vi.fn();
      const { rerender } = render(<Recipients onRemove={onRemove} />);
      fireEvent.keyDown(remove("Yui"), { key: "Backspace", isComposing: true });
      fireEvent.keyDown(remove("Yui"), { key: "Backspace", keyCode: 229 });
      expect(onRemove).not.toHaveBeenCalled();
      rerender(<Recipients onRemove={onRemove} disabled />);
      fireEvent.click(remove("Yui"));
      fireEvent.keyDown(remove("Yui"), { key: "Delete" });
      expect(onRemove).not.toHaveBeenCalled();
    });

    it("moves focus to the next chip and announces the removal", async () => {
      const user = userEvent.setup();
      render(<Recipients />);
      await user.tab();
      await user.keyboard("{Delete}");
      expect(screen.queryByText("Yui")).not.toBeInTheDocument();
      expect(remove("Haruka")).toHaveFocus();
      expect(remove("Haruka")).toHaveAttribute("tabindex", "0");
      expect(screen.getByRole("status")).toHaveTextContent("Yui removed");
    });

    it("moves focus to the previous chip when the last one goes", async () => {
      const user = userEvent.setup();
      render(<Recipients />);
      await user.tab();
      await user.keyboard("{End}{Backspace}");
      expect(remove("Haruka")).toHaveFocus();
    });

    it("moves focus to the group when no chip is left", async () => {
      const user = userEvent.setup();
      render(<Recipients initial={["Yui"]} />);
      await user.tab();
      await user.keyboard("{Delete}");
      const group = screen.getByRole("group", { name: "Recipients" });
      expect(group).toHaveFocus();
      expect(group).toHaveTextContent("No recipients");
      expect(screen.getByRole("status")).toHaveTextContent("Yui removed");
      // Not a tab stop once focus leaves.
      await user.tab();
      expect(group).not.toHaveAttribute("tabindex");
    });

    it("moves focus after a click on the focused chip's × button", async () => {
      const user = userEvent.setup();
      render(
        <Recipients selectionMode="multiple">
          <span />
        </Recipients>,
      );
      await user.click(remove("Haruka"));
      expect(chip("Daichi")).toHaveFocus();
    });

    it("leaves focus alone when focus was elsewhere", () => {
      render(
        <Recipients>
          <input aria-label="To" />
        </Recipients>,
      );
      const input = screen.getByRole("textbox", { name: "To" });
      act(() => {
        input.focus();
      });
      fireEvent.click(remove("Haruka"));
      expect(input).toHaveFocus();
      expect(screen.getByRole("status")).toHaveTextContent("Haruka removed");
    });

    it("does nothing when the owner vetoes the removal", async () => {
      const user = userEvent.setup();
      render(<Recipients veto />);
      await user.tab();
      await user.keyboard("{Delete}");
      expect(remove("Yui")).toHaveFocus();
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });

    it("repeats the same message", async () => {
      const user = userEvent.setup();
      function Twice() {
        const [n, setN] = useState(0);
        return (
          <ChipGroup
            label="Tags"
            onRemove={() => {
              setN((x) => x + 1);
            }}
          >
            <Chip key={n} value={`t${String(n)}`}>
              Draft
            </Chip>
          </ChipGroup>
        );
      }
      render(<Twice />);
      await user.click(remove("Draft"));
      const first = screen.getByRole("status").textContent;
      await user.click(remove("Draft"));
      const second = screen.getByRole("status").textContent;
      expect(first.trim()).toBe("Draft removed");
      expect(second.trim()).toBe("Draft removed");
      expect(second).not.toBe(first);
    });

    it("falls back to the chip's text when the label is not a string", async () => {
      const user = userEvent.setup();
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      function Rich() {
        const [on, setOn] = useState(true);
        return (
          <ChipGroup
            label="Tags"
            onRemove={() => {
              setOn(false);
            }}
          >
            {on ? (
              <Chip value="u1" removeLabel="Remove Yui">
                <b>Yui</b>
              </Chip>
            ) : null}
          </ChipGroup>
        );
      }
      render(<Rich />);
      await user.click(screen.getByRole("button", { name: "Remove Yui" }));
      expect(screen.getByRole("status")).toHaveTextContent("Yui removed");
    });

    it("stays silent with announce={false}", async () => {
      const user = userEvent.setup();
      render(<Recipients announce={false} />);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      await user.tab();
      await user.keyboard("{Delete}");
      expect(remove("Haruka")).toHaveFocus();
    });

    it.each([
      ["en", "Yui removed", "Selection cleared"],
      ["es", "Yui quitado", "Selección borrada"],
      ["ja", "Yuiを削除しました", "選択を解除しました"],
    ] as const)("announces in %s", async (locale, removed, cleared) => {
      const user = userEvent.setup();
      render(
        <Root locale={locale}>
          <Recipients selectionMode="multiple" defaultValue={["Haruka"]} />
        </Root>,
      );
      await user.tab();
      await user.keyboard("{ArrowRight}{Escape}");
      expect(screen.getByRole("status")).toHaveTextContent(cleared);
      await user.keyboard("{Home}{Delete}");
      expect(screen.getByRole("status")).toHaveTextContent(removed);
    });
  });

  describe("actionRef", () => {
    it("focuses the first, the last or a chip by value", () => {
      const actions = createRef<ChipGroupActions>();
      render(<Woods selectionMode="multiple" actionRef={actions} disabledChip="Ash" />);
      act(() => {
        expect(actions.current?.focus("last")).toBe(true);
      });
      expect(chip("Alder")).toHaveFocus();
      act(() => {
        actions.current?.focus("first");
      });
      expect(chip("Walnut")).toHaveFocus();
      act(() => {
        expect(actions.current?.focus("Oak")).toBe(true);
      });
      expect(chip("Oak")).toHaveFocus();
      act(() => {
        expect(actions.current?.focus("Ash")).toBe(false); // disabled
        expect(actions.current?.focus("Pine")).toBe(false);
      });
    });
  });

  describe("dev warnings", () => {
    it("passes on the chip warnings: no value, and a rich label without textValue", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <ChipGroup label="Tags" onRemove={() => undefined}>
          <Chip>Loose</Chip>
          <Chip value="r">
            <b>Rich</b>
          </Chip>
        </ChipGroup>,
      );
      const messages = warn.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("needs a `value`"))).toBe(true);
      expect(messages.some((m) => m.includes("needs `textValue`"))).toBe(true);
    });

    it("warns about a missing name, duplicate values and a chip tabIndex", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <ChipGroup>
          <Chip value="a" onClick={() => undefined}>
            A
          </Chip>
          <Chip value="a" onClick={() => undefined} tabIndex={0}>
            B
          </Chip>
        </ChipGroup>,
      );
      const messages = warn.mock.calls.map((c) => String(c[0]));
      expect(messages.some((m) => m.includes("needs a name"))).toBe(true);
      expect(messages.some((m) => m.includes('"a" repeats'))).toBe(true);
      expect(messages.some((m) => m.includes("must not set `tabIndex`"))).toBe(true);
    });

    it("warns about a controlled value in mode none and extra values in single", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const { rerender } = render(<Woods value={["Oak"]} />);
      expect(warn.mock.calls.some((c) => String(c[0]).includes("is ignored"))).toBe(true);
      rerender(<Woods selectionMode="single" value={["Oak", "Ash"]} />);
      expect(warn.mock.calls.some((c) => String(c[0]).includes("only the first"))).toBe(true);
      expect(chip("Oak")).toHaveAttribute("aria-pressed", "true");
      expect(chip("Ash")).toHaveAttribute("aria-pressed", "false");
    });

    it("does not warn for a well-formed group", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(<Woods selectionMode="multiple" />);
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
