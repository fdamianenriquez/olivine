import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Field } from "../Field";
import { Root } from "../Root";
import { parseNumber, readSymbols, snapToStep, stepValue } from "./number";
import { NumberField, type NumberFieldProps } from "./NumberField";
import { REPEAT_DELAY, REPEAT_INTERVAL } from "./usePressRepeat";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function spin() {
  return screen.getByRole<HTMLInputElement>("spinbutton");
}

function stepButtons(): [HTMLElement, HTMLElement] {
  const [dec, inc] = screen.getAllByRole("button");
  if (!dec || !inc) throw new Error("steppers not found");
  return [dec, inc];
}

function formIn(container: HTMLElement): HTMLFormElement {
  const form = container.querySelector("form");
  if (!form) throw new Error("form not found");
  return form;
}

function setup(props: NumberFieldProps = {}) {
  const onValueChange = vi.fn();
  const utils = render(<NumberField aria-label="Seats" onValueChange={onValueChange} {...props} />);
  return { ...utils, onValueChange, input: spin() };
}

function parse(locale: string, text: string, format: Intl.NumberFormatOptions = {}) {
  return parseNumber(text, readSymbols(new Intl.NumberFormat(locale, format)));
}

describe("number helpers", () => {
  it.each([
    ["en", "1,234.5", 1234.5],
    ["en", "1,500", 1500],
    ["en", "1,5", 1.5],
    ["en", "−12", -12],
    ["en", "１２３", 123],
    ["en", "", null],
    ["es-ES", "1.500", 1500],
    ["es-ES", "1.5", 1.5],
    ["es-ES", "1234,5", 1234.5],
    ["es-ES", "12.345,5", 12345.5],
    ["es-ES", "1,234.5", 1234.5],
    ["es-MX", "1,234.5", 1234.5],
    ["es-MX", "1.5", 1.5],
    ["ja-JP", "１２３", 123],
    ["ja-JP", "９，８００", 9800],
    ["ja-JP", "１２。５", 12.5],
    ["ja-JP", "－４．５", -4.5],
  ])("parses %s %j as %j", (locale, text, expected) => {
    expect(parse(locale, text)).toBe(expected);
  });

  it.each(["abc", "12a", "1-2-3", "-", "1.2.3,4.5", "1,2,3"])("refuses %j", (text) => {
    expect(parse("en", text)).toBeNaN();
  });

  it("reads percent text as a fraction and currency text without its symbol", () => {
    expect(parse("en", "25", { style: "percent" })).toBe(0.25);
    expect(parse("en", "14.3%", { style: "percent" })).toBe(0.143);
    expect(parse("es-ES", "25 %", { style: "percent" })).toBe(0.25);
    expect(parse("ja-JP", "￥48,000", { style: "currency", currency: "JPY" })).toBe(48000);
    expect(parse("en", "$1,250.50", { style: "currency", currency: "USD" })).toBe(1250.5);
  });

  it("maps a locale's own digits to ASCII", () => {
    expect(parse("ar-EG", "١٢٣")).toBe(123);
  });

  it("snaps to the step from min and rounds float noise", () => {
    expect(snapToStep(0.1 + 0.2, { step: 0.1 })).toBe(0.3);
    expect(snapToStep(7, { step: 5, min: 1 })).toBe(6);
    expect(snapToStep(-0.4, { step: 1 })).toBe(0);
    expect(Object.is(snapToStep(-0.4, { step: 1 }), -0)).toBe(false);
    expect(snapToStep(99, { step: 1, max: 12 })).toBe(12);
    expect(snapToStep(5, { step: 0 })).toBe(5);
  });

  it("steps to the next grid point in the direction of travel", () => {
    expect(stepValue(0.2, 1, 0.1, { step: 0.1 })).toBe(0.3);
    expect(stepValue(1.5, 1, 1, { step: 1 })).toBe(2);
    expect(stepValue(1.5, -1, 1, { step: 1 })).toBe(1);
    expect(stepValue(2, 1, 10, { step: 1, max: 5 })).toBe(5);
    expect(stepValue(1, 1, 1, { step: 0 })).toBe(2);
  });
});

describe("NumberField", () => {
  describe("anatomy and ARIA", () => {
    it("renders a text spinbutton between − and + in a ruled bar", () => {
      const { container, input } = setup({
        defaultValue: 1250,
        className: "x",
        style: { order: 2 },
      });
      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveClass("ol-inputgroup", "ol-numberfield", "x");
      expect(root).toHaveStyle({ order: "2" });
      expect(input).toHaveAttribute("type", "text");
      expect(input).toHaveClass("ol-input", "ol-numberfield__input");
      expect(input).toHaveValue("1,250");
      expect(input).toHaveAttribute("aria-valuenow", "1250");
      expect(input).toHaveAttribute("aria-valuetext", "1,250");
      expect(input).toHaveAttribute("autocomplete", "off");
      expect(input).toHaveAttribute("spellcheck", "false");
      const [dec, inc] = screen.getAllByRole("button");
      expect(dec).toHaveAccessibleName("Decrease Seats");
      expect(inc).toHaveAccessibleName("Increase Seats");
      expect(dec).toHaveClass("ol-btn--square", "ol-numberfield__step--dec");
      expect(inc).toHaveAttribute("tabindex", "-1");
      expect(inc).toHaveAttribute("aria-controls", input.id);
      expect(input.id).not.toBe("");
    });

    it("omits aria-valuenow when empty and sets the range when given", () => {
      const { input } = setup({ min: 1, max: 12, placeholder: "0" });
      expect(input).toHaveValue("");
      expect(input).not.toHaveAttribute("aria-valuenow");
      expect(input).not.toHaveAttribute("aria-valuetext");
      expect(input).toHaveAttribute("aria-valuemin", "1");
      expect(input).toHaveAttribute("aria-valuemax", "12");
      expect(input).toHaveAttribute("placeholder", "0");
    });

    it("adds a string unit to the spoken value and draws it in a cell", () => {
      const { container, input } = setup({ defaultValue: 12.5, step: 0.5, unit: "kg" });
      expect(input).toHaveAttribute("aria-valuetext", "12.5 kg");
      expect(container.querySelector(".ol-numberfield__unit")).toHaveTextContent("kg");
    });

    it("chooses the keypad from the format and range", () => {
      const { rerender } = render(
        <NumberField aria-label="n" min={0} format={{ maximumFractionDigits: 0 }} />,
      );
      expect(spin()).toHaveAttribute("inputmode", "numeric");
      rerender(<NumberField aria-label="n" />);
      expect(spin()).toHaveAttribute("inputmode", "decimal");
      rerender(<NumberField aria-label="n" inputMode="text" />);
      expect(spin()).toHaveAttribute("inputmode", "text");
    });

    it("hides the steppers with steppers={false} and aligns figures to the end", () => {
      const { container } = setup({ steppers: false });
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(container.firstElementChild).toHaveAttribute("data-steppers", "false");
    });

    it("applies the size to the bar, the input and the steppers", () => {
      const { container } = setup({ size: "l" });
      expect(container.firstElementChild).toHaveClass("ol-numberfield--l");
      expect(spin()).toHaveClass("ol-input--l");
      for (const button of screen.getAllByRole("button")) expect(button).toHaveClass("ol-btn--l");
    });

    it("forwards the ref to the text input", () => {
      const ref = createRef<HTMLInputElement>();
      render(<NumberField aria-label="n" ref={ref} />);
      expect(ref.current).toBe(spin());
      const fn = vi.fn();
      render(<NumberField aria-label="m" ref={fn} />);
      expect(fn).toHaveBeenCalledWith(expect.any(HTMLInputElement));
    });

    it("keeps the type it controls", () => {
      render(<NumberField aria-label="n" {...({ type: "number" } as object)} />);
      expect(spin()).toHaveAttribute("type", "text");
    });

    it("has no axe violations, alone and in a Field", async () => {
      const { container } = render(
        <div>
          <NumberField aria-label="Seats" defaultValue={3} min={1} max={12} unit="seats" />
          <Field label="Quantity" hint="1 to 12" error="Enter a quantity between 1 and 12.">
            <NumberField defaultValue={20} />
          </Field>
          <NumberField aria-label="Disabled" disabled defaultValue={1} />
        </div>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });

  describe("axe in every state", () => {
    it.each<[string, NumberFieldProps]>([
      ["at a limit", { defaultValue: 12, min: 1, max: 12 }],
      ["read-only", { defaultValue: 4, readOnly: true }],
      ["empty", { placeholder: "0" }],
    ])("has no violations %s", async (_, props) => {
      const { container } = render(<NumberField aria-label="Seats" {...props} />);
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no violations after a step changes the spoken value", async () => {
      const user = userEvent.setup();
      const { container } = render(<NumberField aria-label="Weight" defaultValue={1} unit="kg" />);
      await user.click(spin());
      await user.keyboard("{ArrowUp}");
      expect(spin()).toHaveAttribute("aria-valuetext", "2 kg");
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no violations inside a Japanese Root and Field", async () => {
      const { container } = render(
        <Root locale="ja">
          <Field label="数量" required>
            <NumberField defaultValue={3} min={1} max={12} />
          </Field>
        </Root>,
      );
      expect(screen.getByRole("button", { name: "数量を増やす" })).toBeInTheDocument();
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });

  describe("Field wiring", () => {
    it("takes the label, description, validity and required state from Field", () => {
      render(
        <Field label="Quantity" hint="1 to 12" error="Enter a quantity between 1 and 12." required>
          <NumberField defaultValue={2} />
        </Field>,
      );
      const input = screen.getByRole("spinbutton", { name: "Quantity" });
      expect(input).toHaveAccessibleDescription(/1 to 12/);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toBeRequired();
      expect(screen.getAllByRole("button")[0]).toHaveAttribute("aria-controls", input.id);
    });

    it("names the steppers after the Field label, without the required asterisk", () => {
      render(
        <Field label="Seats" required>
          <NumberField />
        </Field>,
      );
      expect(screen.getByRole("button", { name: "Increase Seats" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Decrease Seats" })).toBeInTheDocument();
    });

    it("keeps the generic stepper names in a Field without a label", () => {
      render(
        <Field hint="Seats">
          <NumberField aria-labelledby="x" />
        </Field>,
      );
      expect(screen.getByRole("button", { name: "Increase" })).toBeInTheDocument();
    });

    it("keeps an explicit id and points the label at it", () => {
      render(
        <Field label="Weight">
          <NumberField id="weight" />
        </Field>,
      );
      expect(screen.getByRole("spinbutton", { name: "Weight" })).toHaveAttribute("id", "weight");
    });
  });

  describe("keyboard", () => {
    it("steps with the arrows and Page Up/Down and commits at once", async () => {
      const user = userEvent.setup();
      const { input, onValueChange } = setup({ defaultValue: 5 });
      await user.click(input);
      await user.keyboard("{ArrowUp}");
      expect(onValueChange).toHaveBeenLastCalledWith(6);
      expect(input).toHaveValue("6");
      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(onValueChange).toHaveBeenLastCalledWith(4);
      await user.keyboard("{PageUp}");
      expect(onValueChange).toHaveBeenLastCalledWith(14);
      await user.keyboard("{PageDown}");
      expect(onValueChange).toHaveBeenLastCalledWith(4);
      expect(input).toHaveAttribute("aria-valuenow", "4");
    });

    it("uses largeStep for Page Up/Down", async () => {
      const user = userEvent.setup();
      const { input, onValueChange } = setup({ defaultValue: 0, largeStep: 25 });
      await user.click(input);
      await user.keyboard("{PageUp}");
      expect(onValueChange).toHaveBeenLastCalledWith(25);
    });

    it("leaves Shift and Alt arrows to the text caret", async () => {
      const user = userEvent.setup();
      const { input, onValueChange } = setup({ defaultValue: 5 });
      await user.click(input);
      await user.keyboard("{Shift>}{ArrowUp}{/Shift}{Alt>}{ArrowDown}{/Alt}");
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it("steps from empty to min or step, and to max or −step", async () => {
      const user = userEvent.setup();
      const first = setup({ min: 3, max: 9 });
      await user.click(first.input);
      await user.keyboard("{ArrowUp}");
      expect(first.onValueChange).toHaveBeenLastCalledWith(3);
      first.unmount();

      const second = setup({ min: 3, max: 9 });
      await user.click(second.input);
      await user.keyboard("{ArrowDown}");
      expect(second.onValueChange).toHaveBeenLastCalledWith(9);
      second.unmount();

      const third = setup({ step: 2 });
      await user.click(third.input);
      await user.keyboard("{ArrowDown}");
      expect(third.onValueChange).toHaveBeenLastCalledWith(-2);
      third.unmount();

      const fourth = setup({ step: 2 });
      await user.click(fourth.input);
      await user.keyboard("{ArrowUp}");
      expect(fourth.onValueChange).toHaveBeenLastCalledWith(2);
    });

    it("clamps arrow steps at the limits", async () => {
      const user = userEvent.setup();
      const { input, onValueChange } = setup({ defaultValue: 11, max: 12 });
      await user.click(input);
      await user.keyboard("{PageUp}{ArrowUp}");
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(input).toHaveValue("12");
    });

    it("goes to min and max with Home and End only when they exist", async () => {
      const user = userEvent.setup();
      const bounded = setup({ defaultValue: 5, min: 1, max: 12 });
      await user.click(bounded.input);
      await user.keyboard("{Home}");
      expect(bounded.onValueChange).toHaveBeenLastCalledWith(1);
      await user.keyboard("{End}");
      expect(bounded.onValueChange).toHaveBeenLastCalledWith(12);
      bounded.unmount();

      const open = setup({ defaultValue: 345 });
      await user.click(open.input);
      await user.keyboard("{Home}");
      expect(open.onValueChange).not.toHaveBeenCalled();
      expect(open.input.selectionStart).toBe(0);
      await user.keyboard("{End}");
      expect(open.input.selectionStart).toBe(3);
    });

    it("commits typed text on Enter without blocking form submission", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: SubmitEvent) => {
        event.preventDefault();
      });
      const onValueChange = vi.fn();
      render(
        <form ref={(f) => f?.addEventListener("submit", onSubmit)}>
          <NumberField aria-label="n" onValueChange={onValueChange} max={10} />
        </form>,
      );
      await user.type(spin(), "42{Enter}");
      expect(onValueChange).toHaveBeenCalledWith(10);
      expect(spin()).toHaveValue("10");
      expect(onSubmit).toHaveBeenCalled();
    });

    it("is one tab stop; Tab skips the steppers", async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">before</button>
          <NumberField aria-label="n" />
          <button type="button">after</button>
        </>,
      );
      await user.tab();
      await user.tab();
      expect(spin()).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
      await user.tab({ shift: true });
      expect(spin()).toHaveFocus();
    });

    it("lets the consumer's onKeyDown cancel the stepping", async () => {
      const user = userEvent.setup();
      const { input, onValueChange } = setup({
        defaultValue: 1,
        onKeyDown: (event) => {
          event.preventDefault();
        },
      });
      await user.click(input);
      await user.keyboard("{ArrowUp}");
      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  describe("typing and commit", () => {
    it("keeps the typed text until blur, then parses, clamps, snaps and reformats", async () => {
      const user = userEvent.setup();
      const { input, onValueChange } = setup({ min: 0, max: 5000, step: 5 });
      await user.type(input, "1234");
      expect(input).toHaveValue("1234");
      expect(onValueChange).not.toHaveBeenCalled();
      await user.tab();
      expect(onValueChange).toHaveBeenCalledWith(1235);
      expect(input).toHaveValue("1,235");
    });

    it("snaps float steps to the step's precision", async () => {
      const user = userEvent.setup();
      const { input, onValueChange } = setup({ step: 0.1, defaultValue: 0.1 });
      await user.click(input);
      await user.keyboard("{ArrowUp}{ArrowUp}");
      expect(onValueChange).toHaveBeenLastCalledWith(0.3);
      expect(input).toHaveValue("0.3");
    });

    it("blocks characters that cannot be part of a number", async () => {
      const user = userEvent.setup();
      const { input } = setup({ min: 0 });
      await user.type(input, "1a2-b,3.4");
      expect(input).toHaveValue("12,3.4");
    });

    it("allows a minus only when the range allows negatives", async () => {
      const user = userEvent.setup();
      const { input, onValueChange } = setup();
      await user.type(input, "-7");
      await user.tab();
      expect(onValueChange).toHaveBeenCalledWith(-7);
    });

    it("restores the value when the text is not a number", async () => {
      const user = userEvent.setup();
      const { input, onValueChange } = setup({ defaultValue: 8 });
      await user.clear(input);
      fireEvent.change(input, { target: { value: "1-2-3" } });
      await user.tab();
      expect(onValueChange).not.toHaveBeenCalled();
      expect(input).toHaveValue("8");
    });

    it("commits null when the text is cleared", async () => {
      const user = userEvent.setup();
      const { input, onValueChange } = setup({ defaultValue: 8 });
      await user.clear(input);
      await user.tab();
      expect(onValueChange).toHaveBeenCalledWith(null);
      expect(input).not.toHaveAttribute("aria-valuenow");
    });

    it("reads pasted text on commit", async () => {
      const user = userEvent.setup();
      const { input, onValueChange } = setup();
      await user.click(input);
      await user.paste("USD 1,250");
      await user.tab();
      expect(onValueChange).not.toHaveBeenCalled();
      expect(input).toHaveValue("");
      await user.click(input);
      await user.paste(" 1,250 ");
      await user.tab();
      expect(onValueChange).toHaveBeenCalledWith(1250);
    });

    it("chains the consumer's onChange and onBlur", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const onBlur = vi.fn();
      const { input } = setup({ onChange, onBlur });
      await user.type(input, "1");
      await user.tab();
      expect(onChange).toHaveBeenCalled();
      expect(onBlur).toHaveBeenCalled();
    });
  });

  describe("locales", () => {
    async function typeIn(props: NumberFieldProps, text: string) {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const utils = render(<NumberField aria-label="n" onValueChange={onValueChange} {...props} />);
      await user.click(spin());
      await user.paste(text);
      await user.tab();
      return { ...utils, onValueChange };
    }

    it("formats and parses es-ES (1234,5 and 12.345,5; 1.500 reads 1500)", async () => {
      const { onValueChange, unmount } = await typeIn({ locale: "es-ES" }, "1.500");
      expect(onValueChange).toHaveBeenCalledWith(1500);
      expect(spin()).toHaveValue("1500");
      unmount();
      await typeIn({ locale: "es-ES", step: 0.1 }, "12345,5");
      expect(spin()).toHaveValue("12.345,5");
    });

    it("formats and parses es-MX like en", async () => {
      const { onValueChange } = await typeIn({ locale: "es-MX", step: 0.1 }, "1,234.5");
      expect(onValueChange).toHaveBeenCalledWith(1234.5);
      expect(spin()).toHaveValue("1,234.5");
    });

    it("reads full-width digits typed through a Japanese IME", async () => {
      const { onValueChange } = await typeIn({ locale: "ja-JP" }, "９，８００");
      expect(onValueChange).toHaveBeenCalledWith(9800);
      expect(spin()).toHaveValue("9,800");
    });

    it("takes the locale from Root", () => {
      render(
        <Root locale="es-ES">
          <NumberField aria-label="n" defaultValue={12345.5} />
        </Root>,
      );
      expect(spin()).toHaveValue("12.345,5");
    });

    it("lets the field's own locale win over Root", () => {
      render(
        <Root locale="es-ES">
          <NumberField aria-label="n" locale="en" defaultValue={12345.5} />
        </Root>,
      );
      expect(spin()).toHaveValue("12,345.5");
    });

    it("names the steppers from the locale dictionary", () => {
      const { unmount } = render(
        <Root locale="es">
          <NumberField />
        </Root>,
      );
      expect(screen.getByRole("button", { name: "Aumentar" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Disminuir" })).toBeInTheDocument();
      unmount();
      render(
        <Root locale="ja">
          <NumberField aria-label="数量" />
        </Root>,
      );
      expect(screen.getByRole("button", { name: "数量を増やす" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "数量を減らす" })).toBeInTheDocument();
    });

    it("uses the label overrides", () => {
      render(<NumberField aria-label="n" incrementLabel="More" decrementLabel="Less" />);
      expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Less" })).toBeInTheDocument();
    });

    it("treats percent values as fractions", async () => {
      const { onValueChange } = await typeIn({ format: { style: "percent" }, step: 0.01 }, "25");
      expect(onValueChange).toHaveBeenCalledWith(0.25);
      expect(spin()).toHaveValue("25%");
    });

    it("shows a currency symbol in the field", async () => {
      const { onValueChange } = await typeIn(
        { locale: "ja-JP", format: { style: "currency", currency: "JPY" } },
        "￥48000",
      );
      expect(onValueChange).toHaveBeenCalledWith(48000);
      expect(spin()).toHaveValue("¥48,000");
    });

    it("warns and falls back to symbols for currency codes, names and unsupported styles", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <NumberField
          aria-label="a"
          defaultValue={5}
          format={{ style: "currency", currency: "USD", currencyDisplay: "name" }}
        />,
      );
      expect(spin()).toHaveValue("$5.00");
      expect(warn).toHaveBeenCalled();
      warn.mockClear();
      render(<NumberField aria-label="b" format={{ style: "unit", unit: "kilogram" }} />);
      render(<NumberField aria-label="c" format={{ notation: "compact" }} />);
      expect(warn).toHaveBeenCalledTimes(2);
    });

    it("falls back to en for an invalid locale tag", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(<NumberField aria-label="n" locale="not a tag!" defaultValue={1000} />);
      expect(spin()).toHaveValue("1,000");
      expect(warn).toHaveBeenCalled();
    });
  });

  describe("IME composition", () => {
    it("does not commit or step while composing, and filters the committed text", () => {
      const { input, onValueChange } = setup({ min: 0 });
      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: "１２あ" } });
      fireEvent.keyDown(input, { key: "Enter", keyCode: 229 });
      fireEvent.keyDown(input, { key: "ArrowUp", isComposing: true });
      expect(onValueChange).not.toHaveBeenCalled();
      fireEvent.compositionEnd(input);
      expect(input).toHaveValue("１２");
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onValueChange).toHaveBeenCalledWith(12);
      expect(input).toHaveValue("12");
    });

    it("does not filter keystrokes inside a composition", () => {
      const { input } = setup();
      fireEvent.compositionStart(input);
      const event = new InputEvent("beforeinput", {
        data: "か",
        inputType: "insertText",
        cancelable: true,
      });
      input.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      fireEvent.compositionEnd(input);
      const typed = new InputEvent("beforeinput", {
        data: "か",
        inputType: "insertText",
        cancelable: true,
      });
      input.dispatchEvent(typed);
      expect(typed.defaultPrevented).toBe(true);
    });
  });

  describe("steppers", () => {
    it("steps on click by keyboard or assistive tech and moves focus to the input", () => {
      const { input, onValueChange } = setup({ defaultValue: 2 });
      const [dec, inc] = stepButtons();
      fireEvent.click(inc, { detail: 0 });
      expect(onValueChange).toHaveBeenLastCalledWith(3);
      expect(input).toHaveFocus();
      fireEvent.click(dec, { detail: 0 });
      expect(onValueChange).toHaveBeenLastCalledWith(2);
    });

    it("steps once on a short press and keeps focus in the input", () => {
      const { input, onValueChange } = setup({ defaultValue: 2 });
      const inc = stepButtons()[1];
      fireEvent.pointerDown(inc, { button: 0, pointerType: "mouse" });
      const down = fireEvent.mouseDown(inc);
      expect(down).toBe(false);
      fireEvent.pointerUp(window);
      fireEvent.click(inc, { detail: 1 });
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenLastCalledWith(3);
      expect(input).toHaveFocus();
    });

    it("ignores other mouse buttons and does not focus the field on touch", () => {
      const { input, onValueChange } = setup({ defaultValue: 2 });
      const inc = stepButtons()[1];
      fireEvent.pointerDown(inc, { button: 2, pointerType: "mouse" });
      expect(onValueChange).not.toHaveBeenCalled();
      fireEvent.pointerDown(inc, { button: 0, pointerType: "touch" });
      fireEvent.pointerCancel(window);
      expect(onValueChange).toHaveBeenCalledWith(3);
      expect(input).not.toHaveFocus();
    });

    it("repeats while held and stops on release", () => {
      vi.useFakeTimers();
      const { onValueChange } = setup({ defaultValue: 0 });
      const inc = stepButtons()[1];
      fireEvent.pointerDown(inc, { button: 0, pointerType: "mouse" });
      expect(onValueChange).toHaveBeenCalledTimes(1);
      act(() => {
        vi.advanceTimersByTime(REPEAT_DELAY - 1);
      });
      expect(onValueChange).toHaveBeenCalledTimes(1);
      act(() => {
        vi.advanceTimersByTime(1 + REPEAT_INTERVAL * 3);
      });
      expect(onValueChange).toHaveBeenCalledTimes(5);
      expect(onValueChange).toHaveBeenLastCalledWith(5);
      fireEvent.pointerUp(window);
      act(() => {
        vi.advanceTimersByTime(REPEAT_INTERVAL * 10);
      });
      expect(onValueChange).toHaveBeenCalledTimes(5);
    });

    it("stops repeating when the pointer leaves or the field blurs", () => {
      vi.useFakeTimers();
      const { input, onValueChange } = setup({ defaultValue: 10 });
      const dec = stepButtons()[0];
      fireEvent.pointerDown(dec, { button: 0, pointerType: "mouse" });
      fireEvent.pointerLeave(dec);
      act(() => {
        vi.advanceTimersByTime(REPEAT_DELAY * 3);
      });
      expect(onValueChange).toHaveBeenCalledTimes(1);
      fireEvent.pointerDown(dec, { button: 0, pointerType: "mouse" });
      fireEvent.blur(input);
      act(() => {
        vi.advanceTimersByTime(REPEAT_DELAY * 3);
      });
      expect(onValueChange).toHaveBeenCalledTimes(2);
    });

    it("stops at the limit and disables the stepper that cannot move", () => {
      vi.useFakeTimers();
      const { onValueChange } = setup({ defaultValue: 8, max: 10 });
      const [dec, inc] = stepButtons();
      fireEvent.pointerDown(inc, { button: 0, pointerType: "mouse" });
      act(() => {
        vi.advanceTimersByTime(REPEAT_DELAY + REPEAT_INTERVAL * 10);
      });
      expect(onValueChange).toHaveBeenCalledTimes(2);
      expect(onValueChange).toHaveBeenLastCalledWith(10);
      expect(inc).toBeDisabled();
      expect(dec).toBeEnabled();
    });

    it("clears its timers on unmount", () => {
      vi.useFakeTimers();
      const { onValueChange, unmount } = setup({ defaultValue: 0 });
      fireEvent.pointerDown(stepButtons()[1], {
        button: 0,
        pointerType: "mouse",
      });
      unmount();
      act(() => {
        vi.advanceTimersByTime(REPEAT_DELAY * 3);
      });
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("does not step twice when a pointer press is followed by its click", () => {
      vi.useFakeTimers();
      const { onValueChange } = setup({ defaultValue: 0 });
      const inc = stepButtons()[1];
      fireEvent.pointerDown(inc, { button: 0, pointerType: "touch" });
      fireEvent.pointerUp(window);
      fireEvent.click(inc);
      expect(onValueChange).toHaveBeenCalledTimes(1);
      // A later activation without a pointer press steps again.
      act(() => {
        vi.runOnlyPendingTimers();
      });
      fireEvent.click(inc);
      expect(onValueChange).toHaveBeenCalledTimes(2);
    });

    it("forgets a pointer press released away from the stepper", () => {
      vi.useFakeTimers();
      const { onValueChange } = setup({ defaultValue: 0 });
      const inc = stepButtons()[1];
      fireEvent.pointerDown(inc, { button: 0, pointerType: "mouse" });
      fireEvent.pointerCancel(window);
      act(() => {
        vi.runOnlyPendingTimers();
      });
      fireEvent.click(inc);
      expect(onValueChange).toHaveBeenCalledTimes(2);
    });

    it("disables the min stepper at min", () => {
      setup({ defaultValue: 0, min: 0 });
      const [dec, inc] = screen.getAllByRole("button");
      expect(dec).toBeDisabled();
      expect(inc).toBeEnabled();
    });

    it("steps from the typed text when the user has not committed yet", async () => {
      const user = userEvent.setup();
      const { input, onValueChange } = setup({ defaultValue: 1 });
      await user.clear(input);
      await user.type(input, "40");
      fireEvent.click(stepButtons()[1], { detail: 0 });
      expect(onValueChange).toHaveBeenLastCalledWith(41);
    });
  });

  describe("live announcement", () => {
    function region(container: HTMLElement) {
      const live = container.querySelector('[aria-live="polite"]');
      if (!live) throw new Error("live region not found");
      return live;
    }

    it("repeats the value after a stepper tap that leaves focus off the input", () => {
      const { container } = setup({ defaultValue: 4, unit: "kg" });
      const live = region(container);
      expect(live).toHaveClass("ol-sr");
      expect(live).toHaveTextContent("");
      const inc = stepButtons()[1];
      inc.focus();
      fireEvent.pointerDown(inc, { button: 0, pointerType: "touch" });
      fireEvent.pointerUp(window);
      expect(spin()).not.toHaveFocus();
      expect(live).toHaveTextContent("5 kg");
    });

    it("stays quiet when the input has focus (mouse press, keyboard, wheel)", async () => {
      const user = userEvent.setup();
      const { container } = setup({ defaultValue: 4, allowWheel: true });
      const live = region(container);
      fireEvent.pointerDown(stepButtons()[1], { button: 0, pointerType: "mouse" });
      fireEvent.pointerUp(window);
      expect(spin()).toHaveFocus();
      expect(spin()).toHaveValue("5");
      await user.keyboard("{ArrowUp}");
      fireEvent.wheel(spin(), { deltaY: -100 });
      expect(spin()).toHaveValue("7");
      expect(live).toHaveTextContent("");
    });
  });

  describe("disabled and read-only", () => {
    it("disables the whole bar but keeps the value visible", () => {
      const { container, input } = setup({ defaultValue: 4, disabled: true });
      expect(input).toBeDisabled();
      expect(input).toHaveValue("4");
      for (const b of screen.getAllByRole("button")) expect(b).toBeDisabled();
      expect(container.firstElementChild).toHaveAttribute("data-disabled", "true");
    });

    it("read-only keeps the text but turns off stepping", async () => {
      const user = userEvent.setup();
      const { input, onValueChange } = setup({ defaultValue: 4, readOnly: true, allowWheel: true });
      expect(input).toHaveAttribute("aria-readonly", "true");
      expect(input).toHaveAttribute("readonly");
      for (const b of screen.getAllByRole("button")) expect(b).toBeDisabled();
      await user.click(input);
      await user.keyboard("{ArrowUp}{PageUp}");
      fireEvent.wheel(input, { deltaY: -100 });
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it.each<[string, NumberFieldProps]>([
      ["read-only", { readOnly: true }],
      ["disabled", { disabled: true }],
    ])("%s ignores a pointer press on a stepper (browsers send it to disabled buttons)", (_, p) => {
      const { input, onValueChange } = setup({ defaultValue: 4, ...p });
      for (const b of stepButtons()) {
        fireEvent.pointerDown(b, { button: 0, pointerType: "mouse" });
        fireEvent.pointerUp(window);
      }
      expect(onValueChange).not.toHaveBeenCalled();
      expect(input).toHaveValue("4");
    });
  });

  describe("wheel", () => {
    it("is off by default", async () => {
      const user = userEvent.setup();
      const { input, onValueChange } = setup({ defaultValue: 1 });
      await user.click(input);
      expect(fireEvent.wheel(input, { deltaY: -100 })).toBe(true);
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it("steps one notch at a time while focused with allowWheel", async () => {
      const user = userEvent.setup();
      const { input, onValueChange } = setup({ defaultValue: 1, allowWheel: true });
      fireEvent.wheel(input, { deltaY: -100 });
      expect(onValueChange).not.toHaveBeenCalled();
      await user.click(input);
      expect(fireEvent.wheel(input, { deltaY: -100 })).toBe(false);
      expect(onValueChange).toHaveBeenLastCalledWith(2);
      fireEvent.wheel(input, { deltaY: 100 });
      expect(onValueChange).toHaveBeenLastCalledWith(1);
      fireEvent.wheel(input, { deltaX: 50, deltaY: 0 });
      expect(onValueChange).toHaveBeenCalledTimes(2);
    });
  });

  describe("value model", () => {
    it("follows a controlled value while not editing, and keeps typed text while editing", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<NumberField aria-label="n" value={3} />);
      expect(spin()).toHaveValue("3");
      rerender(<NumberField aria-label="n" value={7} />);
      expect(spin()).toHaveValue("7");
      await user.clear(spin());
      await user.type(spin(), "12");
      rerender(<NumberField aria-label="n" value={9} />);
      expect(spin()).toHaveValue("12");
    });

    it("shows the controlled value when the parent refuses a commit", async () => {
      const user = userEvent.setup();
      render(<NumberField aria-label="n" value={3} onValueChange={() => undefined} />);
      await user.click(spin());
      await user.keyboard("{ArrowUp}");
      expect(spin()).toHaveValue("3");
    });

    it("works as a controlled field", async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [v, setV] = useState<number | null>(1);
        return (
          <>
            <NumberField aria-label="n" value={v} onValueChange={setV} />
            <output>{String(v)}</output>
          </>
        );
      }
      render(<Controlled />);
      await user.click(spin());
      await user.keyboard("{ArrowUp}");
      expect(screen.getByRole("status")).toHaveTextContent("2");
      expect(spin()).toHaveValue("2");
    });

    it("submits the raw number through a hidden input named `name`", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <form>
          <NumberField aria-label="n" name="qty" defaultValue={1234.5} locale="es-ES" />
        </form>,
      );
      const form = formIn(container);
      expect(new FormData(form).get("qty")).toBe("1234.5");
      expect(spin()).not.toHaveAttribute("name");
      await user.clear(spin());
      await user.tab();
      expect(new FormData(form).get("qty")).toBe("");
    });

    it("does not submit a disabled field", () => {
      const { container } = render(
        <form>
          <NumberField aria-label="n" name="qty" defaultValue={2} disabled />
        </form>,
      );
      expect(new FormData(formIn(container)).has("qty")).toBe(false);
    });
  });
});
