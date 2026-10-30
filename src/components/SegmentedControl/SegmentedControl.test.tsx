import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type CSSProperties, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import {
  SegmentedControl,
  type SegmentedControlOption,
  type SegmentedControlProps,
} from "./SegmentedControl";

afterEach(() => vi.restoreAllMocks());

const VIEWS: SegmentedControlOption[] = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
  { value: "index", label: "Index" },
];

const WITH_DISABLED: SegmentedControlOption[] = [
  { value: "jpy", label: "JPY" },
  { value: "usd", label: "USD", disabled: true },
  { value: "eur", label: "EUR" },
  { value: "gbp", label: "GBP" },
];

const cell = (name: string) => screen.getByRole("radio", { name });
const toggle = (name: string) => screen.getByRole("button", { name });
const press = (key: string, init: Partial<KeyboardEventInit> = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });

function single(props: Partial<SegmentedControlProps> = {}) {
  return render(
    <SegmentedControl
      label="View"
      options={VIEWS}
      defaultValue="grid"
      {...(props as Record<string, unknown>)}
    />,
  );
}

describe("SegmentedControl — single", () => {
  it("renders a named radiogroup of radio cells with classes and native props", () => {
    single({ className: "x", "data-testid": "seg" } as Partial<SegmentedControlProps>);
    const group = screen.getByRole("radiogroup", { name: "View" });
    expect(group).toHaveClass("ol-btngroup", "ol-seg", "x");
    expect(group).toHaveAttribute("data-testid", "seg");
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(cell("Grid")).toHaveAttribute("aria-checked", "true");
    expect(cell("List")).toHaveAttribute("aria-checked", "false");
    expect(cell("Grid")).toHaveClass("ol-btn", "ol-seg__cell", "ol-ink-wipe");
  });

  it("renders an aria-hidden inked copy of the label in each cell", () => {
    single();
    const copy = cell("Grid").querySelector(".ol-ink-wipe__ink");
    expect(copy).toHaveAttribute("aria-hidden", "true");
    expect(copy).toHaveTextContent("Grid");
  });

  it("is one tab stop that enters on the selected cell", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SegmentedControl label="View" options={VIEWS} defaultValue="list" />
        <button>After</button>
      </>,
    );
    expect(cell("List")).toHaveAttribute("tabindex", "0");
    expect(cell("Grid")).toHaveAttribute("tabindex", "-1");
    await user.tab();
    expect(cell("List")).toHaveFocus();
    await user.tab();
    expect(toggle("After")).toHaveFocus();
  });

  it("enters on the first enabled cell when nothing is selected", () => {
    render(<SegmentedControl label="Currency" options={WITH_DISABLED.slice(1)} />);
    expect(cell("EUR")).toHaveAttribute("tabindex", "0");
    expect(
      screen.getAllByRole("radio").every((r) => r.getAttribute("aria-checked") === "false"),
    ).toBe(true);
  });

  it("moves and selects with the arrows, skips disabled cells and wraps", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Currency"
        options={WITH_DISABLED}
        defaultValue="jpy"
        onChange={onChange}
      />,
    );
    act(() => {
      cell("JPY").focus();
    });
    press("ArrowRight");
    expect(cell("EUR")).toHaveFocus();
    expect(cell("EUR")).toHaveAttribute("aria-checked", "true");
    expect(onChange).toHaveBeenLastCalledWith("eur");
    press("ArrowDown");
    expect(cell("GBP")).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith("gbp");
    press("ArrowRight"); // wraps
    expect(cell("JPY")).toHaveFocus();
    press("ArrowLeft"); // wraps back
    expect(cell("GBP")).toHaveFocus();
    press("ArrowUp");
    expect(cell("EUR")).toHaveFocus();
    expect(cell("EUR")).toHaveAttribute("aria-checked", "true");
    expect(cell("USD")).toHaveAttribute("aria-checked", "false");
  });

  it("jumps to the first and last enabled cell with Home and End", () => {
    const onChange = vi.fn();
    single({ onChange });
    act(() => {
      cell("Grid").focus();
    });
    press("End");
    expect(cell("Index")).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith("index");
    press("Home");
    expect(cell("Grid")).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith("grid");
  });

  it("mirrors Left and Right in RTL", () => {
    render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <SegmentedControl label="View" options={VIEWS} defaultValue="grid" />
      </div>,
    );
    act(() => {
      cell("Grid").focus();
    });
    press("ArrowLeft");
    expect(cell("List")).toHaveFocus();
    expect(cell("List")).toHaveAttribute("aria-checked", "true");
  });

  it("moves with all four arrows when vertical", () => {
    single({ vertical: true });
    expect(screen.getByRole("radiogroup")).toHaveClass("ol-btngroup--v", "ol-seg--v");
    act(() => {
      cell("Grid").focus();
    });
    press("ArrowDown");
    expect(cell("List")).toHaveFocus();
    press("ArrowRight");
    expect(cell("Index")).toHaveFocus();
    press("ArrowLeft");
    expect(cell("List")).toHaveFocus();
    press("ArrowUp");
    expect(cell("Grid")).toHaveAttribute("aria-checked", "true");
  });

  it("leaves modifier combinations to others", () => {
    const onChange = vi.fn();
    single({ onChange });
    act(() => {
      cell("Grid").focus();
    });
    press("ArrowRight", { altKey: true });
    press("ArrowDown", { ctrlKey: true });
    expect(cell("Grid")).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("selects with click, Space and Enter, and pressing the selected cell does nothing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    single({ onChange });
    await user.click(cell("Grid"));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(cell("List"));
    expect(onChange).toHaveBeenLastCalledWith("list");
    act(() => {
      cell("Index").focus();
    });
    await user.keyboard(" ");
    expect(onChange).toHaveBeenLastCalledWith("index");
    act(() => {
      cell("Grid").focus();
    });
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("grid");
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("is controlled with value and follows a programmatic change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <SegmentedControl label="View" options={VIEWS} value="grid" onChange={onChange} />,
    );
    await user.click(cell("List"));
    expect(onChange).toHaveBeenCalledWith("list");
    expect(cell("Grid")).toHaveAttribute("aria-checked", "true");
    act(() => {
      cell("List").blur();
    });
    rerender(<SegmentedControl label="View" options={VIEWS} value="index" onChange={onChange} />);
    expect(cell("Index")).toHaveAttribute("aria-checked", "true");
    expect(cell("Index")).toHaveAttribute("tabindex", "0");
    rerender(<SegmentedControl label="View" options={VIEWS} value={null} onChange={onChange} />);
    expect(screen.queryByRole("radio", { checked: true })).toBeNull();
  });

  it("disables the whole group", () => {
    single({ disabled: true });
    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-disabled", "true");
    for (const r of screen.getAllByRole("radio")) expect(r).toBeDisabled();
  });

  it("shows a check glyph, hidden from assistive tech, inked only in selected cells", () => {
    single({ check: true });
    const glyph = cell("Grid").querySelector(".ol-seg__check");
    expect(glyph).toHaveAttribute("aria-hidden", "true");
    // Unselected cells keep the glyph hidden by CSS, so selecting never shifts the row.
    expect(cell("List").querySelector(".ol-seg__check")).toHaveAttribute("aria-hidden", "true");
    expect(cell("List")).toHaveAccessibleName("List");
    expect(cell("Grid")).toHaveAccessibleName("Grid");
  });

  it("names icon-only cells with aria-label", () => {
    render(
      <SegmentedControl
        label="Align"
        options={[
          { value: "l", icon: "←", "aria-label": "Left" },
          { value: "r", icon: "→", "aria-label": "Right" },
        ]}
        defaultValue="l"
      />,
    );
    expect(cell("Left").querySelector(".ol-seg__icon")).toHaveAttribute("aria-hidden", "true");
  });

  it("maps size and fill", () => {
    single({ size: "s", fill: true });
    expect(screen.getByRole("radiogroup")).toHaveClass("ol-seg--fill");
    expect(cell("Grid")).toHaveClass("ol-btn--s");
  });

  it("renders a hidden input for the selected value with name", () => {
    const { container } = single({ name: "view" });
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="hidden"]');
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toHaveAttribute("name", "view");
    expect(inputs[0]?.value).toBe("grid");
  });

  it("forwards the ref and composes the root handlers", () => {
    const ref = createRef<HTMLDivElement>();
    const onKeyDown = vi.fn();
    const onFocus = vi.fn();
    render(
      <SegmentedControl
        ref={ref}
        label="View"
        options={VIEWS}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
      />,
    );
    expect(ref.current).toBe(screen.getByRole("radiogroup"));
    act(() => {
      cell("Grid").focus();
    });
    press("ArrowRight");
    expect(onFocus).toHaveBeenCalled();
    expect(onKeyDown).toHaveBeenCalled();
    expect(cell("List")).toHaveFocus();
  });

  it("does not ink-wipe on first render and moves the ink on a later change", () => {
    single();
    const group = screen.getByRole("radiogroup");
    expect(group.getAttribute("data-ink-wipe")).not.toBe("moving");
    act(() => {
      cell("Grid").focus();
    });
    act(() => {
      group.setAttribute("data-ink-wipe", "ready");
    });
    press("ArrowRight");
    expect(group).toHaveAttribute("data-ink-wipe", "moving");
  });

  it("changes instantly under reduced motion (no travel timer beyond the collapsed token)", () => {
    vi.useFakeTimers();
    try {
      render(
        <div style={{ "--dur-m": "1ms" } as CSSProperties}>
          <SegmentedControl label="View" options={VIEWS} defaultValue="grid" />
        </div>,
      );
      const group = screen.getByRole("radiogroup");
      act(() => {
        group.setAttribute("data-ink-wipe", "ready");
        cell("Grid").focus();
      });
      press("ArrowRight");
      expect(cell("List")).toHaveAttribute("aria-checked", "true");
      act(() => {
        vi.advanceTimersByTime(60);
      });
      expect(group).toHaveAttribute("data-ink-wipe", "ready");
    } finally {
      vi.useRealTimers();
    }
  });

  it("mirrors Left and Right when vertical in RTL", () => {
    render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <SegmentedControl vertical label="View" options={VIEWS} defaultValue="grid" />
      </div>,
    );
    act(() => {
      cell("Grid").focus();
    });
    press("ArrowLeft");
    expect(cell("List")).toHaveFocus();
    expect(cell("List")).toHaveAttribute("aria-checked", "true");
    press("ArrowRight");
    expect(cell("Grid")).toHaveFocus();
  });

  it("returns to the selected cell with Shift+Tab after arrows moved it", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SegmentedControl label="View" options={VIEWS} defaultValue="grid" />
        <button>After</button>
      </>,
    );
    await user.tab();
    expect(cell("Grid")).toHaveFocus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(cell("Index")).toHaveAttribute("aria-checked", "true");
    await user.tab();
    expect(toggle("After")).toHaveFocus();
    await user.tab({ shift: true });
    expect(cell("Index")).toHaveFocus();
  });

  it("has no axe violations after an arrow-key change", async () => {
    const { container } = single();
    act(() => {
      cell("Grid").focus();
    });
    press("ArrowRight");
    expect(cell("List")).toHaveAttribute("aria-checked", "true");
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations with icon-only cells or a disabled group", async () => {
    const icons = render(
      <SegmentedControl
        label="Direction"
        options={[
          { value: "prev", icon: "←", "aria-label": "Previous" },
          { value: "next", icon: "→", "aria-label": "Next" },
        ]}
        defaultValue="next"
      />,
    );
    expect(await runAxe(icons.container)).toHaveNoViolations();
    const off = render(
      <SegmentedControl disabled label="View" options={VIEWS} defaultValue="list" />,
    );
    expect(await runAxe(off.container)).toHaveNoViolations();
  });

  it("has no axe violations", async () => {
    const { container } = single({ check: true });
    expect(await runAxe(container)).toHaveNoViolations();
    const v = render(
      <SegmentedControl label="Currency" options={WITH_DISABLED} defaultValue="usd" vertical />,
    );
    expect(await runAxe(v.container)).toHaveNoViolations();
  });
});

describe("SegmentedControl — multiple", () => {
  const STYLES: SegmentedControlOption[] = [
    { value: "bold", label: "Bold" },
    { value: "italic", label: "Italic" },
    { value: "mono", label: "Mono" },
  ];

  it("renders a named group of pressed buttons, each its own tab stop", async () => {
    const user = userEvent.setup();
    render(
      <SegmentedControl multiple label="Text style" options={STYLES} defaultValue={["bold"]} />,
    );
    expect(screen.getByRole("group", { name: "Text style" })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(toggle("Bold")).toHaveAttribute("aria-pressed", "true");
    expect(toggle("Italic")).toHaveAttribute("aria-pressed", "false");
    expect(toggle("Bold")).not.toHaveAttribute("tabindex", "-1");
    await user.tab();
    expect(toggle("Bold")).toHaveFocus();
    await user.tab();
    expect(toggle("Italic")).toHaveFocus();
    // Arrows do nothing in multiple mode.
    press("ArrowRight");
    expect(toggle("Italic")).toHaveFocus();
  });

  it("toggles with click, Space and Enter, reporting values in option order", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        multiple
        label="Text style"
        options={STYLES}
        defaultValue={["mono"]}
        onChange={onChange}
      />,
    );
    await user.click(toggle("Bold"));
    expect(onChange).toHaveBeenLastCalledWith(["bold", "mono"]);
    act(() => {
      toggle("Mono").focus();
    });
    await user.keyboard(" ");
    expect(onChange).toHaveBeenLastCalledWith(["bold"]);
    act(() => {
      toggle("Italic").focus();
    });
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(["bold", "italic"]);
  });

  it("keeps the last selected cell on with disallowEmpty", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        multiple
        disallowEmpty
        label="Text style"
        options={STYLES}
        defaultValue={["bold"]}
        onChange={onChange}
      />,
    );
    await user.click(toggle("Bold"));
    expect(onChange).not.toHaveBeenCalled();
    expect(toggle("Bold")).toHaveAttribute("aria-pressed", "true");
  });

  it("is controlled with value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState<string[]>([]);
      return (
        <>
          <SegmentedControl
            multiple
            label="Text style"
            options={STYLES}
            value={value}
            onChange={setValue}
          />
          <output>{value.join(",")}</output>
        </>
      );
    }
    render(<Controlled />);
    await user.click(toggle("Italic"));
    await user.click(toggle("Bold"));
    expect(screen.getByRole("status")).toHaveTextContent("bold,italic");
  });

  it("renders one hidden input per selected value with name", () => {
    const { container } = render(
      <SegmentedControl
        multiple
        name="style"
        label="Text style"
        options={STYLES}
        defaultValue={["mono", "bold"]}
      />,
    );
    const values = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="hidden"][name="style"]'),
    ).map((i) => i.value);
    expect(values).toEqual(["mono", "bold"]);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <SegmentedControl
        multiple
        check
        label="Text style"
        options={STYLES}
        defaultValue={["bold"]}
      />,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

describe("SegmentedControl — development warnings", () => {
  it("warns about a missing name, option count, duplicates, unnamed icons and disallowEmpty", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <SegmentedControl
        options={[
          { value: "a", label: "A" },
          { value: "a", icon: "→" },
        ]}
      />,
    );
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.some((m) => m.includes("needs a name"))).toBe(true);
    expect(messages.some((m) => m.includes("unique"))).toBe(true);
    expect(messages.some((m) => m.includes("icon-only"))).toBe(true);
    warn.mockClear();
    render(<SegmentedControl label="One" options={[{ value: "a", label: "A" }]} />);
    expect(warn.mock.calls.some((c) => String(c[0]).includes("two to five"))).toBe(true);
    warn.mockClear();
    render(<SegmentedControl aria-labelledby="x" options={VIEWS} />);
    expect(warn).not.toHaveBeenCalled();
  });
});
