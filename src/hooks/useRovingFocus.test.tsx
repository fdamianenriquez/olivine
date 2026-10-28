import { act, fireEvent, render, screen } from "@testing-library/react";
import { type CSSProperties, type ReactNode, useLayoutEffect, useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type RovingFocus, type RovingFocusOptions, useRovingFocus } from "./useRovingFocus";

/** The last mounted group's handle, for focusItem. */
const handle: { current?: RovingFocus | undefined } = {};

function Group({
  options,
  children,
  ...rest
}: {
  options?: Partial<RovingFocusOptions>;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const root = useRef<HTMLDivElement>(null);
  const roving = useRovingFocus(root, { itemSelector: "[data-item]", ...options });
  useLayoutEffect(() => {
    handle.current = roving;
  });
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- a bare test root
    <div
      ref={root}
      data-testid="root"
      onKeyDown={roving.onKeyDown}
      onFocus={roving.onFocus}
      onBlur={roving.onBlur}
      {...rest}
    >
      {children}
    </div>
  );
}

const item = (name: string) => screen.getByRole("button", { name });
const stops = () =>
  screen
    .getAllByRole("button")
    .filter((b) => b.getAttribute("tabindex") === "0")
    .map((b) => b.textContent);
const press = (key: string, init: Partial<KeyboardEventInit> = {}) => {
  const target = document.activeElement ?? document.body;
  return fireEvent.keyDown(target, { key, ...init });
};

const three = (
  <>
    <button data-item>A</button>
    <button data-item>B</button>
    <button data-item>C</button>
  </>
);

afterEach(() => {
  handle.current = undefined;
});

describe("useRovingFocus", () => {
  it("makes the first enabled item the only tab stop", () => {
    render(
      <Group>
        <button data-item disabled>
          A
        </button>
        <span>
          <button data-item>B</button>
        </span>
        <button data-item>C</button>
      </Group>,
    );
    expect(stops()).toEqual(["B"]);
    expect(item("A")).toHaveAttribute("tabindex", "-1");
  });

  it("moves with Left/Right and Home/End, skips disabled items and stops at the ends", () => {
    render(
      <Group>
        <button data-item>A</button>
        <button data-item disabled>
          B
        </button>
        <button data-item>C</button>
        <button data-item data-disabled="">
          D
        </button>
      </Group>,
    );
    act(() => {
      item("A").focus();
    });
    press("ArrowRight");
    expect(item("C")).toHaveFocus();
    expect(stops()).toEqual(["C"]);
    // No loop: the key at the end is left to the browser.
    expect(press("ArrowRight")).toBe(true);
    expect(item("C")).toHaveFocus();
    press("Home");
    expect(item("A")).toHaveFocus();
    press("End");
    expect(item("C")).toHaveFocus();
  });

  it("wraps with loop and leaves the other axis to the browser", () => {
    render(<Group options={{ loop: true }}>{three}</Group>);
    act(() => {
      item("C").focus();
    });
    expect(press("ArrowRight")).toBe(false); // prevented
    expect(item("A")).toHaveFocus();
    expect(press("ArrowDown")).toBe(true); // not prevented: the page scrolls
    expect(item("A")).toHaveFocus();
  });

  it("uses Up/Down when vertical and leaves Left/Right alone", () => {
    render(<Group options={{ orientation: "vertical" }}>{three}</Group>);
    act(() => {
      item("A").focus();
    });
    press("ArrowDown");
    expect(item("B")).toHaveFocus();
    expect(press("ArrowRight")).toBe(true);
    expect(item("B")).toHaveFocus();
    press("ArrowUp");
    expect(item("A")).toHaveFocus();
  });

  it("swaps Left and Right in RTL", () => {
    render(<Group style={{ direction: "rtl" }}>{three}</Group>);
    act(() => {
      item("A").focus();
    });
    press("ArrowLeft");
    expect(item("B")).toHaveFocus();
  });

  it("moves to the nearest item of the next visual row with orientation both", () => {
    render(
      <Group options={{ orientation: "both" }}>
        <button data-item>A</button>
        <button data-item>B</button>
        <button data-item>C</button>
        <button data-item>D</button>
        <button data-item>E</button>
      </Group>,
    );
    // Row 1: A B C; row 2: D (under A) E (under C).
    const boxes: Record<string, [number, number]> = {
      A: [0, 0],
      B: [100, 0],
      C: [200, 0],
      D: [0, 40],
      E: [190, 40],
    };
    for (const [name, [left, top]] of Object.entries(boxes)) {
      item(name).getBoundingClientRect = () =>
        ({ left, top, width: 80, height: 32, right: left + 80, bottom: top + 32 }) as DOMRect;
    }
    act(() => {
      item("C").focus();
    });
    press("ArrowDown");
    expect(item("E")).toHaveFocus();
    expect(press("ArrowDown")).toBe(true); // last row: not prevented
    press("ArrowUp");
    expect(item("C")).toHaveFocus();
    press("ArrowRight");
    expect(item("D")).toHaveFocus(); // DOM order
  });

  it("leaves modifier combinations, IME composition and handled keys to others", () => {
    const onActiveChange = vi.fn();
    render(<Group options={{ onActiveChange }}>{three}</Group>);
    act(() => {
      item("A").focus();
    });
    for (const init of [
      { ctrlKey: true },
      { altKey: true },
      { metaKey: true },
      { isComposing: true },
    ]) {
      expect(press("ArrowRight", init)).toBe(true);
    }
    expect(item("A")).toHaveFocus();
    press("ArrowRight", { shiftKey: true });
    expect(item("B")).toHaveFocus();
    expect(onActiveChange).toHaveBeenCalledTimes(1);
  });

  it("reports key-driven moves only, with the element", () => {
    const onActiveChange = vi.fn();
    render(<Group options={{ onActiveChange }}>{three}</Group>);
    act(() => {
      item("A").focus();
    });
    act(() => {
      handle.current?.focusItem("last");
    });
    expect(item("C")).toHaveFocus();
    expect(onActiveChange).not.toHaveBeenCalled();
    press("Home");
    expect(onActiveChange).toHaveBeenCalledWith(item("A"), "Home");
    press("Home");
    expect(onActiveChange).toHaveBeenCalledTimes(1);
  });

  it("keeps the stop on the last focused item, and re-resolves it when that item goes", () => {
    const list = (names: string[]) => (
      <Group>
        {names.map((n) => (
          <button key={n} data-item>
            {n}
          </button>
        ))}
      </Group>
    );
    const { rerender } = render(list(["A", "B", "C"]));
    act(() => {
      item("B").focus();
    });
    act(() => {
      item("B").blur();
    });
    expect(stops()).toEqual(["B"]);
    rerender(list(["A", "C"]));
    expect(stops()).toEqual(["A"]);
  });

  it("returns the stop to the selected item when focus leaves, with restore selected", () => {
    render(
      <>
        <Group options={{ restore: "selected", selectedSelector: '[aria-pressed="true"]' }}>
          <button data-item aria-pressed="false">
            A
          </button>
          <button data-item aria-pressed="true">
            B
          </button>
          <button data-item aria-pressed="false">
            C
          </button>
        </Group>
        <button>Outside</button>
      </>,
    );
    expect(stops()).toEqual(["B"]);
    act(() => {
      item("B").focus();
    });
    press("ArrowRight");
    expect(stops()).toEqual(["C"]);
    act(() => {
      item("Outside").focus();
    });
    expect(stops()).toEqual(["B"]);
  });

  it("ignores the items of a nested root", () => {
    render(
      <Group>
        <button data-item>A</button>
        <Group>
          <button data-item>Inner</button>
        </Group>
        <button data-item>B</button>
      </Group>,
    );
    act(() => {
      item("A").focus();
    });
    press("ArrowRight");
    expect(item("B")).toHaveFocus();
    expect(item("Inner")).toHaveAttribute("tabindex", "0");
  });

  it("focusItem refuses a disabled or foreign element", () => {
    render(
      <>
        <Group>
          <button data-item>A</button>
          <button data-item disabled>
            B
          </button>
        </Group>
        <button>Outside</button>
      </>,
    );
    let moved: boolean | undefined;
    act(() => {
      moved = handle.current?.focusItem(item("B"));
    });
    expect(moved).toBe(false);
    act(() => {
      moved = handle.current?.focusItem(item("Outside"));
    });
    expect(moved).toBe(false);
    act(() => {
      moved = handle.current?.focusItem("first");
    });
    expect(moved).toBe(true);
    expect(item("A")).toHaveFocus();
  });
});
