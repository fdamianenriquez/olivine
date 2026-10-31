import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { runAxe } from "../test/axe";
import { addRange, type ListboxOptions, toggleValue, useListbox } from "./useListbox";

const WOODS = ["Alder", "Birch", "Cedar", "Elm", "Oak"];

function List({ off = [], ...options }: ListboxOptions & { off?: string[] }) {
  const lb = useListbox(options);
  return (
    <div {...lb.getListboxProps({ "aria-label": "Woods" })}>
      {WOODS.map((w) => (
        <div key={w} {...lb.getOptionProps(w, { disabled: off.includes(w) })}>
          {w}
        </div>
      ))}
    </div>
  );
}

function Virtual(options: ListboxOptions) {
  const lb = useListbox({ ...options, focus: "virtual" });
  return (
    <>
      <input
        aria-label="Wood"
        role="combobox"
        aria-expanded
        aria-controls="list"
        {...lb.getControllerProps()}
      />
      <div id="list" {...lb.getListboxProps({ "aria-label": "Woods" })}>
        {WOODS.map((w) => (
          <div key={w} {...lb.getOptionProps(w)}>
            {w}
          </div>
        ))}
      </div>
    </>
  );
}

const option = (name: string) => screen.getByRole("option", { name });

describe("selection helpers", () => {
  it("toggles and adds ranges in list order, skipping disabled options", () => {
    expect(toggleValue(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleValue(["a", "b"], "a")).toEqual(["b"]);
    const order = ["a", "b", "c", "d"];
    expect(addRange(["d"], order, new Set(["a", "c", "d"]), "d", "a")).toEqual(["d", "a", "c"]);
  });
});

describe("useListbox (dom)", () => {
  it("is one tab stop that enters on the selected option and selects with Space", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<List defaultSelected={["Cedar"]} onSelectedChange={onChange} />);
    await user.tab();
    expect(option("Cedar")).toHaveFocus();
    expect(option("Cedar")).toHaveAttribute("data-highlighted");
    await user.keyboard("{ArrowDown} ");
    expect(onChange).toHaveBeenLastCalledWith(["Elm"]);
    expect(option("Elm")).toHaveAttribute("aria-selected", "true");
    expect(option("Cedar")).toHaveAttribute("aria-selected", "false");
  });

  it("keeps the selection on a second pick unless deselectable, and reports every pick", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const { rerender } = render(<List defaultSelected={["Oak"]} onAction={onAction} />);
    await user.click(option("Oak"));
    expect(option("Oak")).toHaveAttribute("aria-selected", "true");
    expect(onAction).toHaveBeenCalledWith("Oak", expect.anything());
    rerender(<List defaultSelected={["Oak"]} deselectable key="d" />);
    await user.click(option("Oak"));
    expect(option("Oak")).toHaveAttribute("aria-selected", "false");
  });

  it("consumes arrows at the ends and skips disabled options", async () => {
    const user = userEvent.setup();
    render(<List off={["Birch"]} />);
    await user.tab();
    const down = fireEvent.keyDown(option("Alder"), { key: "ArrowUp" });
    expect(down).toBe(false);
    await user.keyboard("{ArrowDown}");
    expect(option("Cedar")).toHaveFocus();
    await user.click(option("Birch"));
    expect(option("Birch")).toHaveAttribute("aria-selected", "false");
  });

  it("jumps by typeahead without selecting", async () => {
    const user = userEvent.setup();
    render(<List />);
    await user.tab();
    await user.keyboard("e");
    expect(option("Elm")).toHaveFocus();
    expect(option("Elm")).toHaveAttribute("aria-selected", "false");
  });

  it("multiple: Space toggles, Shift+Arrow moves and toggles, Shift+Space selects a range", async () => {
    const user = userEvent.setup();
    const onBulk = vi.fn();
    render(<List multiple off={["Cedar"]} onBulkChange={onBulk} />);
    await user.tab();
    await user.keyboard(" {Shift>}{ArrowDown}{/Shift}");
    expect(option("Alder")).toHaveAttribute("aria-selected", "true");
    expect(option("Birch")).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}{ArrowDown}{Shift>} {/Shift}");
    expect(option("Oak")).toHaveAttribute("aria-selected", "true");
    expect(option("Elm")).toHaveAttribute("aria-selected", "true");
    expect(option("Cedar")).toHaveAttribute("aria-selected", "false");
    expect(onBulk).toHaveBeenLastCalledWith(4);
  });

  it("multiple: Ctrl+A selects all enabled options, again clears", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<List multiple off={["Elm"]} onSelectedChange={onChange} />);
    await user.tab();
    await user.keyboard("{Control>}a{/Control}");
    expect(onChange).toHaveBeenLastCalledWith(["Alder", "Birch", "Cedar", "Oak"]);
    await user.keyboard("{Control>}a{/Control}");
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("has no axe violations", async () => {
    const { container } = render(<List multiple defaultSelected={["Oak"]} off={["Elm"]} />);
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

describe("useListbox (virtual)", () => {
  it("keeps focus on the controller and points aria-activedescendant at the active option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Virtual onSelectedChange={onChange} />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-activedescendant", option("Birch").id);
    expect(option("Birch")).toHaveAttribute("data-focus-visible");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(["Birch"]);
  });

  it("wraps, lets Enter through with nothing active, and highlights on pointer move", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn((e: { defaultPrevented: boolean }) => e.defaultPrevented);
    function Probe() {
      return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- test probe
        <div onKeyDown={(e) => onKeyDown(e)}>
          <Virtual />
        </div>
      );
    }
    render(<Probe />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{Enter}");
    expect(onKeyDown).toHaveLastReturnedWith(false);
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveAttribute("aria-activedescendant", option("Oak").id);
    fireEvent.pointerMove(option("Cedar"), { pointerType: "mouse" });
    expect(input).toHaveAttribute("aria-activedescendant", option("Cedar").id);
    expect(option("Cedar")).not.toHaveAttribute("data-focus-visible");
  });

  it("auto-highlights the first option and ignores keys during IME composition", async () => {
    const user = userEvent.setup();
    render(<Virtual autoHighlight="first" />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-activedescendant", option("Alder").id);
    await user.click(input);
    fireEvent.keyDown(input, { key: "ArrowDown", isComposing: true });
    expect(input).toHaveAttribute("aria-activedescendant", option("Alder").id);
  });

  it("never makes an option a tab stop, so Tab leaves the controller", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Virtual />
        <button type="button">After</button>
      </>,
    );
    expect(screen.getAllByRole("option").every((o) => o.getAttribute("tabindex") === "-1")).toBe(
      true,
    );
    await user.click(screen.getByRole("combobox"));
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });
});
