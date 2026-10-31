import { readFileSync } from "node:fs";

import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Field } from "../Field";
import { Root } from "../Root";
import { cellAtX, cellSelection, groupCells, sanitizeCode } from "./code";
import { PinInput, type PinInputProps } from "./PinInput";

afterEach(() => vi.restoreAllMocks());

const box = () => screen.getByRole<HTMLInputElement>("textbox");
const cells = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(".ol-pin__cell"));
const chars = (container: HTMLElement) => cells(container).map((c) => c.textContent);
const activeIndex = (container: HTMLElement) =>
  cells(container).findIndex((c) => c.hasAttribute("data-active"));
const inputOf = (container: HTMLElement) => {
  const input = container.querySelector("input");
  if (!input) throw new Error("missing input");
  return input;
};
const live = (container: HTMLElement) => container.querySelector('[aria-live="polite"]');

function pin(props: Partial<PinInputProps> = {}) {
  return render(<PinInput aria-label="Code" {...props} />);
}

describe("code helpers", () => {
  it("cleans: NFKC full-width digits, separators dropped, cut to length", () => {
    expect(sanitizeCode("１２３４５６", "numeric", 6)).toBe("123456");
    expect(sanitizeCode("123 456", "numeric", 6)).toBe("123456");
    expect(sanitizeCode("12-34", "numeric", 6)).toBe("1234");
    expect(sanitizeCode("123456789", "numeric", 6)).toBe("123456");
    expect(sanitizeCode("a1b2", "numeric", 6)).toBe("12");
    expect(sanitizeCode("aB-3ｃ", "alphanumeric", 6)).toBe("aB3c");
  });

  it("selects a filled active cell and puts a caret in the first empty one", () => {
    expect(cellSelection(1, 3, 6)).toEqual([1, 2]);
    expect(cellSelection(3, 3, 6)).toEqual([3, 3]);
    expect(cellSelection(5, 3, 6)).toEqual([3, 3]);
    expect(cellSelection(-1, 3, 6)).toEqual([0, 1]);
    expect(cellSelection(6, 6, 6)).toEqual([5, 6]);
    expect(cellSelection(0, 0, 6)).toEqual([0, 0]);
  });

  it("finds the cell under a pointer and splits groups", () => {
    const rects = [{ right: 10 }, { right: 20 }, { right: 30 }];
    expect(cellAtX(5, rects)).toBe(0);
    expect(cellAtX(15, rects)).toBe(1);
    expect(cellAtX(99, rects)).toBe(2);
    expect(cellAtX(5, [])).toBe(0);
    expect(groupCells(6, 3)).toEqual([
      [0, 1, 2],
      [3, 4, 5],
    ]);
    expect(groupCells(5, 2)).toEqual([[0, 1], [2, 3], [4]]);
    expect(groupCells(4, undefined)).toEqual([[0, 1, 2, 3]]);
    expect(groupCells(4, 4)).toEqual([[0, 1, 2, 3]]);
  });
});

describe("PinInput — structure and ARIA", () => {
  it("exposes one named text input; the cells are hidden drawings of its value", () => {
    const { container } = pin({ defaultValue: "12" });
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    const input = box();
    expect(input).toHaveAccessibleName("Code");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("autocomplete", "one-time-code");
    expect(input).toHaveAttribute("autocapitalize", "off");
    expect(input).toHaveAttribute("spellcheck", "false");
    expect(input).toHaveAttribute("enterkeyhint", "done");
    expect(input).not.toHaveAttribute("maxlength");
    expect(input).not.toHaveAttribute("pattern");
    expect(input).toHaveClass("ol-pin__input");
    expect(input).toHaveValue("12");
    expect(cells(container)).toHaveLength(6);
    expect(chars(container)).toEqual(["1", "2", "", "", "", ""]);
    for (const run of container.querySelectorAll(".ol-pin__group")) {
      expect(run).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("describes the code shape: digits for numeric, characters for alphanumeric", () => {
    const { rerender } = pin();
    expect(box()).toHaveAccessibleDescription("6 digits");
    rerender(<PinInput aria-label="Code" charset="alphanumeric" length={8} />);
    expect(box()).toHaveAccessibleDescription("8 characters");
    expect(box()).toHaveAttribute("inputmode", "text");
  });

  it("forces left-to-right, sets size classes, root class names and style", () => {
    const { container, rerender } = pin({ className: "x", style: { marginTop: 1 } });
    const root = container.querySelector(".ol-pin");
    expect(root).toHaveAttribute("dir", "ltr");
    expect(root).toHaveClass("ol-pin", "x");
    expect(root).toHaveStyle({ marginTop: "1px" });
    rerender(<PinInput aria-label="Code" size="s" />);
    expect(container.querySelector(".ol-pin")).toHaveClass("ol-pin--s");
    rerender(<PinInput aria-label="Code" size="l" />);
    expect(container.querySelector(".ol-pin")).toHaveClass("ol-pin--l");
  });

  it("forwards the ref to the input and passes native props", () => {
    const ref = createRef<HTMLInputElement>();
    render(<PinInput ref={ref} aria-label="Code" name="otp" data-testid="pin" />);
    expect(ref.current).toBe(box());
    expect(box()).toHaveAttribute("name", "otp");
    expect(box()).toHaveAttribute("data-testid", "pin");
  });

  it("also accepts a callback ref", () => {
    let node: HTMLInputElement | null = null;
    render(
      <PinInput
        aria-label="Code"
        ref={(n) => {
          node = n;
        }}
      />,
    );
    expect(node).toBe(box());
  });

  it("splits the cells into groups", () => {
    const { container } = pin({ group: 3 });
    const runs = container.querySelectorAll(".ol-pin__group");
    expect(runs).toHaveLength(2);
    expect(runs[0]?.querySelectorAll(".ol-pin__cell")).toHaveLength(3);
  });

  it("shows the placeholder in empty cells only", () => {
    const { container } = pin({ length: 4, placeholder: "·", defaultValue: "1" });
    expect(chars(container)).toEqual(["1", "·", "·", "·"]);
  });

  it("renders on the server", () => {
    const html = renderToString(<PinInput aria-label="Code" defaultValue="12" />);
    expect(html).toContain("ol-pin__cell");
    expect(html).toContain('value="12"');
  });
});

describe("PinInput — Field", () => {
  it("takes its name, description, validity and required from Field; the label focuses it", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Field
        label="Verification code"
        hint="We sent it to your phone."
        error="Enter the code."
        required
      >
        <PinInput />
      </Field>,
    );
    const input = box();
    expect(input).toHaveAccessibleName(/Verification code/);
    expect(input).toHaveAccessibleDescription(/We sent it to your phone\./);
    expect(input).toHaveAccessibleDescription(/6 digits/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toBeRequired();
    expect(container.querySelector(".ol-pin")).toHaveAttribute("data-invalid");
    await user.click(screen.getByText("Verification code"));
    expect(input).toHaveFocus();
  });

  it("keeps its own aria-describedby next to the length", () => {
    render(
      <>
        <span id="extra">Extra</span>
        <PinInput aria-label="Code" aria-describedby="extra" />
      </>,
    );
    expect(box()).toHaveAccessibleDescription("Extra 6 digits");
  });
});

describe("PinInput — typing", () => {
  it("advances the active cell, calls onChange with a string and onComplete once", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onComplete = vi.fn();
    const { container } = pin({ length: 4, onChange, onComplete });
    await user.click(box());
    expect(activeIndex(container)).toBe(0);
    await user.keyboard("12");
    expect(onChange).toHaveBeenLastCalledWith("12");
    expect(activeIndex(container)).toBe(2);
    await user.keyboard("34");
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("1234");
    expect(container.querySelector(".ol-pin")).toHaveAttribute("data-complete");
    // Full: the last cell is active and typing replaces it, without completing again.
    expect(activeIndex(container)).toBe(3);
    expect(box().selectionStart).toBe(3);
    expect(box().selectionEnd).toBe(4);
    await user.keyboard("9");
    expect(box()).toHaveValue("1239");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("completes again after an edit empties a cell and the code is re-filled", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    pin({ length: 4, onComplete });
    await user.click(box());
    await user.keyboard("1234");
    await user.keyboard("{Backspace}");
    expect(box()).toHaveValue("123");
    await user.keyboard("5");
    expect(onComplete).toHaveBeenCalledTimes(2);
    expect(onComplete).toHaveBeenLastCalledWith("1235");
  });

  it("does not complete on mount with a full defaultValue", () => {
    const onComplete = vi.fn();
    pin({ length: 4, defaultValue: "1234", onComplete });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("drops characters outside the charset silently", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    pin({ onChange });
    await user.click(box());
    await user.keyboard("1a- 2");
    expect(box()).toHaveValue("12");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("keeps the case typed in alphanumeric mode", async () => {
    const user = userEvent.setup();
    pin({ charset: "alphanumeric" });
    await user.click(box());
    await user.keyboard("aB3-c");
    expect(box()).toHaveValue("aB3c");
  });

  it("uses a custom sanitize instead of the built-in cleaning, cut to length", async () => {
    const user = userEvent.setup();
    pin({ length: 3, sanitize: (raw) => raw.toUpperCase().replace(/[^A-F]/g, "") });
    await user.click(box());
    await user.keyboard("abxc");
    expect(box()).toHaveValue("ABC");
    await user.keyboard("d");
    expect(box()).toHaveValue("ABD");
  });

  it("Backspace on the first empty cell deletes the previous character and moves back", async () => {
    const user = userEvent.setup();
    const { container } = pin({ defaultValue: "123" });
    await user.click(box());
    expect(activeIndex(container)).toBe(3);
    await user.keyboard("{Backspace}");
    expect(box()).toHaveValue("12");
    expect(activeIndex(container)).toBe(2);
  });

  it("Backspace and Delete on a filled cell remove it; later characters shift left", async () => {
    const user = userEvent.setup();
    const { container } = pin({ defaultValue: "1234" });
    await user.click(box());
    await user.keyboard("{Home}{ArrowRight}");
    expect(activeIndex(container)).toBe(1);
    await user.keyboard("{Delete}");
    expect(box()).toHaveValue("134");
    expect(activeIndex(container)).toBe(1);
    await user.keyboard("{Backspace}");
    expect(box()).toHaveValue("14");
    expect(activeIndex(container)).toBe(1);
  });

  it("typing on a filled cell replaces it and moves on", async () => {
    const user = userEvent.setup();
    const { container } = pin({ defaultValue: "1234" });
    await user.click(box());
    await user.keyboard("{Home}9");
    expect(box()).toHaveValue("9234");
    expect(activeIndex(container)).toBe(1);
  });
});

describe("PinInput — keyboard movement", () => {
  it("arrows move one cell; the caret never passes the first empty cell; Home and End jump", async () => {
    const user = userEvent.setup();
    const { container } = pin({ defaultValue: "123" });
    await user.click(box());
    await user.keyboard("{ArrowRight}");
    expect(activeIndex(container)).toBe(3);
    await user.keyboard("{ArrowLeft}");
    expect(activeIndex(container)).toBe(2);
    expect([box().selectionStart, box().selectionEnd]).toEqual([2, 3]);
    await user.keyboard("{Home}");
    expect(activeIndex(container)).toBe(0);
    await user.keyboard("{ArrowLeft}");
    expect(activeIndex(container)).toBe(0);
    await user.keyboard("{End}");
    expect(activeIndex(container)).toBe(3);
    expect([box().selectionStart, box().selectionEnd]).toEqual([3, 3]);
  });

  it("announces the position after arrow, Home and End moves", async () => {
    const user = userEvent.setup();
    const { container } = pin({ defaultValue: "123" });
    await user.click(box());
    await user.keyboard("{ArrowLeft}");
    expect(live(container)).toHaveTextContent("Digit 3 of 6");
    await user.keyboard("{Home}");
    expect(live(container)).toHaveTextContent("Digit 1 of 6");
  });

  it("leaves modified keys and other keys to the browser", () => {
    const onKeyDown = vi.fn();
    pin({ defaultValue: "123", onKeyDown });
    const input = box();
    act(() => {
      input.focus();
    });
    expect(fireEvent.keyDown(input, { key: "ArrowLeft", shiftKey: true })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "a", metaKey: true })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "ArrowLeft", isComposing: true })).toBe(true);
    expect(onKeyDown).toHaveBeenCalledTimes(4);
  });

  it("paints a selected range instead of an active cell", async () => {
    const user = userEvent.setup();
    const { container } = pin({ defaultValue: "1234" });
    await user.click(box());
    act(() => {
      box().setSelectionRange(0, 4);
      fireEvent.select(box());
    });
    expect(activeIndex(container)).toBe(-1);
    const selected = cells(container).map((c) => c.hasAttribute("data-selected"));
    expect(selected).toEqual([true, true, true, true, false, false]);
  });

  it("puts the caret in the first empty cell on focus and is one Tab stop", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <PinInput aria-label="Code" defaultValue="12" />
        <button type="button">Next</button>
      </>,
    );
    await user.tab();
    expect(box()).toHaveFocus();
    expect(activeIndex(container)).toBe(2);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    expect(activeIndex(container)).toBe(-1);
  });

  it("maps a click to the cell under the pointer, clamped to the first empty cell", () => {
    const { container } = pin({ defaultValue: "123" });
    cells(container).forEach((cell, i) => {
      vi.spyOn(cell, "getBoundingClientRect").mockReturnValue({
        left: i * 44,
        right: (i + 1) * 44,
      } as DOMRect);
    });
    const input = box();
    act(() => {
      input.focus();
    });
    fireEvent.mouseUp(input, { clientX: 50 });
    expect(activeIndex(container)).toBe(1);
    fireEvent.mouseUp(input, { clientX: 250 });
    expect(activeIndex(container)).toBe(3);
  });
});

describe("PinInput — paste, autofill, composition", () => {
  it("paste replaces the whole code from any cell and strips separators", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    pin({ defaultValue: "98", onComplete });
    await user.click(box());
    await user.keyboard("{Home}");
    await user.paste("123 456");
    expect(box()).toHaveValue("123456");
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("normalises full-width digits and cuts an over-long paste", async () => {
    const user = userEvent.setup();
    pin();
    await user.click(box());
    await user.paste("１２３４５６");
    expect(box()).toHaveValue("123456");
    await user.paste("987654321");
    expect(box()).toHaveValue("987654");
  });

  it("a new full code pasted over a full code completes again", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    pin({ length: 4, defaultValue: "1111", onComplete });
    await user.click(box());
    await user.paste("2222");
    expect(onComplete).toHaveBeenCalledWith("2222");
  });

  it("an autofill (an input event with no input type) fills and completes", () => {
    const onComplete = vi.fn();
    pin({ length: 4, defaultValue: "1111", onComplete });
    fireEvent.change(box(), { target: { value: "4321" } });
    expect(box()).toHaveValue("4321");
    expect(onComplete).toHaveBeenCalledWith("4321");
  });

  it("does not intercept a paste with nothing usable", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    pin({ defaultValue: "12", onChange });
    await user.click(box());
    await user.paste("abc");
    expect(box()).toHaveValue("12");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not change the value until an IME composition ends", () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    const { container } = pin({ length: 3, onChange, onComplete });
    const input = box();
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "１２" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(chars(container)).toEqual(["１", "２", ""]);
    fireEvent.change(input, { target: { value: "１２３" } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
    expect(onChange).toHaveBeenCalledWith("123");
    expect(onComplete).toHaveBeenCalledWith("123");
    expect(input).toHaveValue("123");
  });
});

describe("PinInput — mask", () => {
  it("switches to a password input, draws bullets and announces the count", async () => {
    const user = userEvent.setup();
    const { container } = pin({ length: 4, mask: true });
    const input = inputOf(container);
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("autocomplete", "off");
    await user.click(input);
    await user.keyboard("73");
    expect(chars(container)).toEqual(["•", "•", "", ""]);
    expect(live(container)).toHaveTextContent("2 of 4 digits entered");
  });

  it("does not announce unmasked typing (the browser echoes it)", async () => {
    const user = userEvent.setup();
    const { container } = pin();
    await user.click(box());
    await user.keyboard("7");
    expect(live(container)).toHaveTextContent("");
  });

  it("lets autoComplete be overridden", () => {
    pin({ autoComplete: "off" });
    expect(box()).toHaveAttribute("autocomplete", "off");
  });
});

describe("PinInput — state", () => {
  it("is controlled by value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [code, setCode] = useState("1");
      return (
        <>
          <PinInput aria-label="Code" value={code} onChange={setCode} />
          <output>{code}</output>
        </>
      );
    }
    render(<Controlled />);
    await user.click(box());
    await user.keyboard("2");
    expect(screen.getByRole("status")).toHaveTextContent("12");
    expect(box()).toHaveValue("12");
  });

  it("does not change while controlled without onChange updating it", async () => {
    const user = userEvent.setup();
    pin({ value: "12" });
    await user.click(box());
    await user.keyboard("3");
    expect(box()).toHaveValue("12");
  });

  it("is submitted with its name", () => {
    render(
      <form data-testid="form">
        <PinInput aria-label="Code" name="otp" defaultValue="4817" />
      </form>,
    );
    const data = new FormData(screen.getByTestId<HTMLFormElement>("form"));
    expect(data.get("otp")).toBe("4817");
  });

  it("disabled: the input is disabled and no cell is active", () => {
    const { container } = pin({ disabled: true, defaultValue: "12" });
    expect(box()).toBeDisabled();
    expect(container.querySelector(".ol-pin")).toHaveAttribute("data-disabled");
    expect(activeIndex(container)).toBe(-1);
  });

  it("read-only: focusable and selectable, with no active underline", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = pin({ readOnly: true, defaultValue: "12", onChange });
    await user.click(box());
    expect(box()).toHaveFocus();
    expect(container.querySelector(".ol-pin")).toHaveAttribute("data-readonly");
    expect(activeIndex(container)).toBe(-1);
    await user.keyboard("3{ArrowLeft}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls the consumer's event handlers", async () => {
    const user = userEvent.setup();
    const handlers = {
      onFocus: vi.fn(),
      onBlur: vi.fn(),
      onSelect: vi.fn(),
      onMouseUp: vi.fn(),
      onPaste: vi.fn(),
      onCompositionStart: vi.fn(),
      onCompositionEnd: vi.fn(),
    };
    pin(handlers);
    await user.click(box());
    await user.paste("1");
    fireEvent.compositionStart(box());
    fireEvent.compositionEnd(box());
    act(() => {
      box().blur();
    });
    for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalled();
  });
});

describe("PinInput — locale", () => {
  it("speaks Spanish and Japanese", async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(
      <Root locale="es">
        <PinInput aria-label="Código" defaultValue="12" />
      </Root>,
    );
    expect(box()).toHaveAccessibleDescription("6 dígitos");
    await user.click(box());
    await user.keyboard("{Home}");
    expect(live(container)).toHaveTextContent("Dígito 1 de 6");
    unmount();

    const ja = render(
      <Root locale="ja">
        <PinInput aria-label="コード" charset="alphanumeric" length={4} mask />
      </Root>,
    );
    const jaInput = inputOf(ja.container);
    expect(jaInput).toHaveAccessibleDescription("4文字");
    await user.click(jaInput);
    await user.keyboard("a");
    expect(live(ja.container)).toHaveTextContent("4文字中1文字入力済み");
  });
});

describe("PinInput — development warnings", () => {
  it("warns when the input has no name, and about a long placeholder", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<PinInput placeholder="ab" />);
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.some((m) => m.includes("PinInput") && m.includes("needs a name"))).toBe(true);
    expect(messages.some((m) => m.includes("single character"))).toBe(true);
  });

  it("does not warn inside a labelled Field", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <Field label="Code">
        <PinInput />
      </Field>,
    );
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("PinInput — axe", () => {
  it.each(["washi", "sumi"] as const)("has no violations in %s", async (theme) => {
    const { container } = render(
      <Root theme={theme}>
        <Field label="Verification code" hint="We sent a 6-digit code to your phone.">
          <PinInput group={3} defaultValue="48" />
        </Field>
        <Field label="PIN" error="Enter the 4-digit PIN.">
          <PinInput length={4} mask defaultValue="7" />
        </Field>
        <PinInput aria-label="Disabled" disabled />
      </Root>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

describe("PinInput — CSS and motion", () => {
  const css = readFileSync("src/components/PinInput/PinInput.css", "utf8");

  it("times the underline only with motion tokens (collapsed under reduced motion)", () => {
    const timings = css.match(/transition:[^;]+;/g) ?? [];
    expect(timings.length).toBeGreaterThan(0);
    for (const rule of timings) {
      expect(rule).not.toMatch(/\d+m?s\b/);
      expect(rule).toMatch(/var\(--dur-s\)/);
    }
    expect(css).toMatch(/clip-path: inset\(0 100% 0 0\)/);
    expect(css).not.toMatch(/transform|blur/);
  });

  it("uses Xanh Mono for the characters, never the figure face", () => {
    expect(css).toMatch(/font-family: var\(--font-mono\)/);
    expect(css).not.toMatch(/--font-figure|Sprat/);
  });
});
