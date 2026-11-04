import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { runAxe } from "../../test/axe";
import type { DateRange } from "../Calendar";
import { Field } from "../Field";
import { Modal } from "../Modal";
import { Root } from "../Root";
import { DatePicker, type DatePickerProps } from ".";

afterEach(() => {
  vi.restoreAllMocks();
});

/** Thursday 22 October 2026. */
const TODAY = new Date(2026, 9, 22);
const d = (month: number, date: number, year = 2026) => new Date(year, month - 1, date);

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("element not found");
  return value;
}

const input = (name = /workshop visit/i) => screen.getByRole("textbox", { name });
const trigger = () => screen.getByRole("button", { name: /^(choose|change) date/i });
const popup = () => document.querySelector(".ol-datepop, .ol-datemodal__panel");
const day = (iso: string) =>
  must(document.querySelector<HTMLButtonElement>(`button[data-date="${iso}"]`));
const focusedIso = () => (document.activeElement as HTMLElement | null)?.dataset.date;
const hint = () => must(document.querySelector<HTMLElement>(".ol-datefield__hint"));

async function gone() {
  await waitFor(
    () => {
      expect(popup()).toBeNull();
    },
    { timeout: 2000 },
  );
}

function Single(props: Partial<Extract<DatePickerProps, { range?: false | undefined }>>) {
  const [value, setValue] = useState<Date | null>(props.defaultValue ?? null);
  return (
    <DatePicker
      label="Workshop visit"
      today={TODAY}
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        props.onChange?.(next);
      }}
    />
  );
}

function Ranged(props: Partial<Extract<DatePickerProps, { range: true }>>) {
  const [value, setValue] = useState<DateRange | null>(props.defaultValue ?? null);
  return (
    <DatePicker
      range
      label="Pickup window"
      today={TODAY}
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        props.onChange?.(next);
      }}
    />
  );
}

describe("DatePicker", () => {
  describe("the field", () => {
    it("labels the input and describes it with the format of the locale", () => {
      render(<Single />);
      const field = input();
      expect(field).toHaveAttribute("placeholder", "MM/DD/YYYY");
      expect(field).toHaveAccessibleDescription("Format: MM/DD/YYYY");
      expect(field).not.toHaveAttribute("aria-invalid");
    });

    it("names the button Choose date, then Change date with the long date", () => {
      const { rerender } = render(<DatePicker label="Workshop visit" today={TODAY} value={null} />);
      expect(trigger()).toHaveAccessibleName("Choose date");
      expect(trigger()).toHaveAttribute("aria-haspopup", "dialog");
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      rerender(<DatePicker label="Workshop visit" today={TODAY} value={d(10, 23)} />);
      expect(trigger()).toHaveAccessibleName("Change date, Friday, October 23, 2026");
    });

    it("shows the date in the typed format", () => {
      render(<DatePicker label="Workshop visit" defaultValue={d(10, 23)} />);
      expect(input()).toHaveValue("10/23/2026");
    });

    it("forwards the ref to the input and the id", () => {
      const ref = createRef<HTMLInputElement>();
      render(<DatePicker ref={ref} id="visit" label="Workshop visit" />);
      expect(ref.current).toBe(input());
      expect(input()).toHaveAttribute("id", "visit");
      expect(screen.getByText("Workshop visit")).toHaveAttribute("for", "visit");
    });

    it("keeps the label's asterisk out of the name and sets aria-required", () => {
      render(<DatePicker label="Workshop visit" required />);
      expect(input()).toHaveAttribute("aria-required", "true");
      expect(input()).toHaveAccessibleName("Workshop visit");
    });

    it("renders hidden inputs for native forms, with ISO dates", () => {
      const { container } = render(
        <>
          <DatePicker label="Visit" name="visit" defaultValue={d(10, 23)} />
          <DatePicker
            range
            label="Window"
            startName="from"
            endName="to"
            defaultValue={{ start: d(10, 26), end: d(10, 30) }}
          />
        </>,
      );
      const hidden = (n: string) =>
        must(container.querySelector<HTMLInputElement>(`input[name="${n}"]`));
      expect(hidden("visit").value).toBe("2026-10-23");
      expect(hidden("from").value).toBe("2026-10-26");
      expect(hidden("to").value).toBe("2026-10-30");
    });

    it("disables the input and the button", () => {
      render(<DatePicker label="Workshop visit" disabled />);
      expect(input()).toBeDisabled();
      expect(trigger()).toBeDisabled();
    });

    it("read only keeps the text, and its button does not open", async () => {
      const user = userEvent.setup();
      render(<DatePicker label="Workshop visit" readOnly defaultValue={d(10, 23)} />);
      expect(input()).toHaveAttribute("readonly");
      expect(trigger()).toBeDisabled();
      await user.click(trigger());
      expect(popup()).toBeNull();
    });
  });

  describe("invalid", () => {
    it("replaces the hint with the error and marks the input invalid", () => {
      render(<DatePicker label="Workshop visit" error="Pick a weekday" />);
      expect(input()).toHaveAttribute("aria-invalid", "true");
      expect(input()).toHaveAccessibleDescription("Pick a weekday");
      expect(hint()).toHaveAttribute("data-state", "invalid");
      expect(hint()).toHaveTextContent("Pick a weekday");
      expect(hint()).not.toHaveTextContent("Format");
      expect(document.querySelector(".ol-datefield")).toHaveClass("ol-datefield--invalid");
    });

    it("announces the message through a polite live region", () => {
      render(<DatePicker label="Workshop visit" />);
      expect(hint()).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("typing", () => {
    it("commits a date typed in the locale's format", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single onChange={onChange} />);
      await user.type(input(), "10/23/2026");
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(d(10, 23));
      expect(input()).toHaveValue("10/23/2026");
    });

    it("accepts ISO text, which is always allowed", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single onChange={onChange} />);
      await user.type(input(), "2026-10-23");
      expect(onChange).toHaveBeenLastCalledWith(d(10, 23));
    });

    it("leaves text that does not parse as typed and the value alone", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single defaultValue={d(10, 23)} onChange={onChange} />);
      await user.clear(input());
      onChange.mockClear();
      await user.type(input(), "13/45/2026");
      expect(input()).toHaveValue("13/45/2026");
      expect(onChange).not.toHaveBeenCalled();
      await user.tab();
      expect(input()).toHaveValue("13/45/2026");
    });

    it("emptying the field clears the value", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single defaultValue={d(10, 23)} onChange={onChange} />);
      await user.clear(input());
      expect(onChange).toHaveBeenLastCalledWith(null);
    });

    it("writes a parsed date back in the locale's format on blur", async () => {
      const user = userEvent.setup();
      render(<Single />);
      await user.type(input(), "2026-10-23");
      expect(input()).toHaveValue("2026-10-23");
      await user.tab();
      expect(input()).toHaveValue("10/23/2026");
    });

    it("ignores dates that are out of bounds or unavailable", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Single
          min={d(10, 8)}
          max={d(11, 18)}
          isDateUnavailable={(date) => date.getDay() === 0}
          onChange={onChange}
        />,
      );
      await user.type(input(), "10/01/2026");
      await user.clear(input());
      await user.type(input(), "10/25/2026"); // a Sunday
      expect(onChange).not.toHaveBeenCalled();
      await user.clear(input());
      await user.type(input(), "10/26/2026");
      expect(onChange).toHaveBeenLastCalledWith(d(10, 26));
    });

    it("reads full-width digits typed with a Japanese keyboard", () => {
      const onChange = vi.fn();
      render(<DatePicker label="納品日" locale="ja" today={TODAY} onChange={onChange} />);
      fireEvent.change(screen.getByRole("textbox", { name: "納品日" }), {
        target: { value: "２０２６／１０／２３" },
      });
      expect(onChange).toHaveBeenCalledWith(d(10, 23));
    });

    it("waits for an IME composition to end before it parses", () => {
      const onChange = vi.fn();
      render(<DatePicker label="納品日" locale="ja" today={TODAY} onChange={onChange} />);
      const field = screen.getByRole("textbox", { name: "納品日" });
      fireEvent.compositionStart(field);
      fireEvent.change(field, {
        target: { value: "2026/10/23" },
        nativeEvent: { isComposing: true },
      });
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.compositionEnd(field);
      expect(onChange).toHaveBeenCalledWith(d(10, 23));
    });

    it("follows a value set from outside, but not a typed form of the same date", async () => {
      const user = userEvent.setup();
      function Outer() {
        const [value, setValue] = useState<Date | null>(null);
        return (
          <>
            <DatePicker label="Workshop visit" value={value} onChange={setValue} />
            <button
              type="button"
              onClick={() => {
                setValue(d(11, 2));
              }}
            >
              set
            </button>
          </>
        );
      }
      render(<Outer />);
      await user.type(input(), "2026-10-23");
      expect(input()).toHaveValue("2026-10-23");
      await user.click(screen.getByRole("button", { name: "set" }));
      expect(input()).toHaveValue("11/02/2026");
    });
  });

  describe("formats", () => {
    it("es is DD/MM/YYYY", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Root locale="es">
          <DatePicker label="Fecha" today={TODAY} onChange={onChange} />
        </Root>,
      );
      const field = screen.getByRole("textbox", { name: "Fecha" });
      expect(field).toHaveAttribute("placeholder", "DD/MM/YYYY");
      expect(field).toHaveAccessibleDescription("Formato: DD/MM/YYYY");
      await user.type(field, "23/10/2026");
      expect(onChange).toHaveBeenLastCalledWith(d(10, 23));
      expect(
        screen.getByRole("button", { name: "Cambiar fecha, viernes, 23 de octubre de 2026" }),
      ).toBeInTheDocument();
    });

    it("ja is YYYY/MM/DD", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Root locale="ja">
          <DatePicker label="納品日" today={TODAY} onChange={onChange} />
        </Root>,
      );
      const field = screen.getByRole("textbox", { name: "納品日" });
      expect(field).toHaveAttribute("placeholder", "YYYY/MM/DD");
      expect(field).toHaveAccessibleDescription("形式: YYYY/MM/DD");
      await user.type(field, "2026/10/23");
      expect(onChange).toHaveBeenLastCalledWith(d(10, 23));
      expect(screen.getByRole("button", { name: /^日付を変更、/ })).toBeInTheDocument();
    });

    it("keeps a regional tag, so es-MX and en-GB format their own way", () => {
      render(
        <>
          <DatePicker label="GB" locale="en-GB" defaultValue={d(10, 23)} />
          <DatePicker label="US" locale="en-US" defaultValue={d(10, 23)} />
        </>,
      );
      expect(screen.getByRole("textbox", { name: "GB" })).toHaveValue("23/10/2026");
      expect(screen.getByRole("textbox", { name: "US" })).toHaveValue("10/23/2026");
    });

    it("takes the locale from the prop over the Root", () => {
      render(
        <Root locale="en">
          <DatePicker label="Fecha" locale="es" defaultValue={d(10, 23)} />
        </Root>,
      );
      expect(screen.getByRole("textbox", { name: "Fecha" })).toHaveValue("23/10/2026");
      expect(screen.getByRole("button", { name: /^Cambiar fecha/ })).toBeInTheDocument();
      expect(document.querySelector(".ol-datefield")).toHaveAttribute("lang", "es");
    });
  });

  describe("docked", () => {
    it("opens a dialog with the calendar and moves focus to today's day", async () => {
      const user = userEvent.setup();
      render(<Single />);
      await user.click(trigger());
      const dialog = screen.getByRole("dialog", { name: "Workshop visit" });
      expect(dialog).toHaveAttribute("aria-modal", "false");
      expect(dialog).toHaveClass("ol-datepop", "ol-kakejiku");
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
      expect(trigger()).toHaveAttribute("aria-controls", dialog.id);
      expect(within(dialog).getByRole("grid")).toBeInTheDocument();
      await waitFor(() => {
        expect(focusedIso()).toBe("2026-10-22");
      });
    });

    it("moves focus to the selected day when there is one", async () => {
      const user = userEvent.setup();
      render(<Single defaultValue={d(11, 12)} />);
      await user.click(trigger());
      await waitFor(() => {
        expect(focusedIso()).toBe("2026-11-12");
      });
    });

    it("picking a day sets the value, closes and returns focus to the button", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single onChange={onChange} />);
      await user.click(trigger());
      await user.click(day("2026-10-28"));
      expect(onChange).toHaveBeenCalledWith(d(10, 28));
      expect(input()).toHaveValue("10/28/2026");
      await gone();
      expect(trigger()).toHaveFocus();
      expect(trigger()).toHaveAccessibleName("Change date, Wednesday, October 28, 2026");
    });

    it("picks with the keyboard from the calendar", async () => {
      const user = userEvent.setup();
      render(<Single />);
      await user.click(trigger());
      await waitFor(() => {
        expect(focusedIso()).toBe("2026-10-22");
      });
      await user.keyboard("{ArrowRight}{Enter}");
      expect(input()).toHaveValue("10/23/2026");
      await gone();
      expect(trigger()).toHaveFocus();
    });

    it("Escape closes and returns focus to the button", async () => {
      const user = userEvent.setup();
      render(<Single />);
      await user.click(trigger());
      await waitFor(() => {
        expect(focusedIso()).toBe("2026-10-22");
      });
      await user.keyboard("{Escape}");
      await gone();
      expect(trigger()).toHaveFocus();
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
    });

    it("an outside press closes without stealing focus", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Single />
          <button type="button">elsewhere</button>
        </>,
      );
      await user.click(trigger());
      await user.click(screen.getByRole("button", { name: "elsewhere" }));
      await gone();
      expect(screen.getByRole("button", { name: "elsewhere" })).toHaveFocus();
    });

    it("pressing the button again closes it", async () => {
      const user = userEvent.setup();
      render(<Single />);
      await user.click(trigger());
      expect(popup()).not.toBeNull();
      await user.click(trigger());
      await gone();
    });

    it("Today picks today and closes", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single onChange={onChange} />);
      await user.click(trigger());
      await user.click(screen.getByRole("button", { name: "Today" }));
      expect(onChange).toHaveBeenCalledWith(TODAY);
      expect(input()).toHaveValue("10/22/2026");
      await gone();
    });

    it("Today is disabled when today can't be picked", async () => {
      const user = userEvent.setup();
      render(<Single min={d(10, 23)} />);
      await user.click(trigger());
      expect(screen.getByRole("button", { name: "Today" })).toBeDisabled();
    });

    it("Clear empties the value, closes and returns focus", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single defaultValue={d(10, 23)} onChange={onChange} />);
      await user.click(trigger());
      await user.click(screen.getByRole("button", { name: "Clear" }));
      expect(onChange).toHaveBeenLastCalledWith(null);
      expect(input()).toHaveValue("");
      await gone();
      expect(trigger()).toHaveFocus();
    });

    it("tabbing past the last control closes it and carries on from the button", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Single />
          <button type="button">after</button>
        </>,
      );
      await user.click(trigger());
      screen.getByRole("button", { name: "Clear" }).focus();
      await user.tab();
      await gone();
      expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
    });

    it("Shift+Tab from the first control goes back to the button", async () => {
      const user = userEvent.setup();
      render(<Single />);
      await user.click(trigger());
      must(document.querySelector<HTMLElement>(".ol-cal__title")).focus();
      await user.tab({ shift: true });
      expect(trigger()).toHaveFocus();
      expect(popup()).not.toBeNull();
    });

    it("tabbing from the field out through the button closes it", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Single defaultOpen />
          <button type="button">after</button>
        </>,
      );
      await waitFor(() => {
        expect(popup()).not.toBeNull();
      });
      trigger().focus();
      await user.tab();
      await gone();
    });

    it("typing keeps working while the calendar is open, and the calendar follows", async () => {
      const user = userEvent.setup();
      render(<Single defaultOpen />);
      await waitFor(() => {
        expect(popup()).not.toBeNull();
      });
      await user.type(input(), "2026-12-05");
      await waitFor(() => {
        expect(screen.getByRole("grid")).toHaveAccessibleName("December 2026");
      });
    });

    it("can be controlled with open and onOpenChange", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const { rerender } = render(
        <DatePicker
          label="Workshop visit"
          today={TODAY}
          open={false}
          onOpenChange={onOpenChange}
        />,
      );
      await user.click(trigger());
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(popup()).toBeNull();
      rerender(
        <DatePicker label="Workshop visit" today={TODAY} open onOpenChange={onOpenChange} />,
      );
      expect(popup()).not.toBeNull();
    });

    it("passes min, max and unavailable dates to the calendar", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Single
          min={d(10, 8)}
          max={d(10, 29)}
          isDateUnavailable={(x) => x.getDate() === 20}
          onChange={onChange}
        />,
      );
      await user.click(trigger());
      expect(day("2026-10-07")).toHaveAttribute("aria-disabled", "true");
      expect(day("2026-10-20")).toHaveAttribute("aria-disabled", "true");
      await user.click(day("2026-10-20"));
      expect(onChange).not.toHaveBeenCalled();
      expect(popup()).not.toBeNull();
    });

    it("lives in a portal with the page's language", async () => {
      const user = userEvent.setup();
      render(
        <Root locale="es">
          <DatePicker label="Fecha" today={TODAY} />
        </Root>,
      );
      await user.click(screen.getByRole("button", { name: "Elegir fecha" }));
      const dialog = screen.getByRole("dialog", { name: "Fecha" });
      expect(dialog.closest(".ol-portal")).not.toBeNull();
      expect(within(dialog).getByRole("button", { name: "Hoy" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Borrar" })).toBeInTheDocument();
    });

    it("works inside a Modal, above it", async () => {
      const user = userEvent.setup();
      render(
        <Modal open title="Book a visit" onClose={() => undefined}>
          <Single />
        </Modal>,
      );
      await user.click(trigger());
      await user.click(day("2026-10-28"));
      expect(input()).toHaveValue("10/28/2026");
      await gone();
      expect(screen.getByRole("dialog", { name: "Book a visit" })).toBeInTheDocument();
    });
  });

  describe("modal", () => {
    it("opens a modal dialog with the chosen date set large, and nothing changes until OK", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single mode="modal" defaultValue={d(10, 23)} onChange={onChange} />);
      await user.click(trigger());
      const dialog = screen.getByRole("dialog", { name: "Workshop visit" });
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveClass("ol-datemodal__panel");
      const value = must(dialog.querySelector(".ol-datemodal__value"));
      expect(value).toHaveTextContent("Fri, Oct 23");
      await user.click(day("2026-10-28"));
      expect(value).toHaveTextContent("Wed, Oct 28");
      expect(onChange).not.toHaveBeenCalled();
      expect(input()).toHaveValue("10/23/2026");
      await user.click(screen.getByRole("button", { name: "OK" }));
      expect(onChange).toHaveBeenCalledWith(d(10, 28));
      expect(input()).toHaveValue("10/28/2026");
      await gone();
      expect(trigger()).toHaveFocus();
    });

    it("Cancel, Escape and the scrim leave the value alone and return focus", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single mode="modal" defaultValue={d(10, 23)} onChange={onChange} />);

      await user.click(trigger());
      await user.click(day("2026-10-28"));
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      await gone();
      expect(trigger()).toHaveFocus();

      await user.click(trigger());
      await user.click(day("2026-10-28"));
      await user.keyboard("{Escape}");
      await gone();
      expect(trigger()).toHaveFocus();

      await user.click(trigger());
      fireEvent.pointerDown(must(document.querySelector(".ol-datemodal")));
      await gone();

      expect(onChange).not.toHaveBeenCalled();
      expect(input()).toHaveValue("10/23/2026");
    });

    it("starts again from the value each time it opens", async () => {
      const user = userEvent.setup();
      render(<Single mode="modal" defaultValue={d(10, 23)} />);
      await user.click(trigger());
      await user.click(day("2026-10-28"));
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      await gone();
      await user.click(trigger());
      expect(must(document.querySelector(".ol-datemodal__value"))).toHaveTextContent("Fri, Oct 23");
    });

    it("OK is disabled until a date is chosen, and the value shows a dash", async () => {
      const user = userEvent.setup();
      render(<Single mode="modal" />);
      await user.click(trigger());
      expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
      expect(must(document.querySelector(".ol-datemodal__value"))).toHaveTextContent("—");
      await user.click(day("2026-10-28"));
      expect(screen.getByRole("button", { name: "OK" })).toBeEnabled();
    });

    it("moves focus to the day, traps Tab and makes the page inert", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Single mode="modal" />
          <button type="button">elsewhere</button>
        </>,
      );
      await user.click(trigger());
      await waitFor(() => {
        expect(focusedIso()).toBe("2026-10-22");
      });
      screen.getByRole("button", { name: "Cancel" }).focus();
      await user.tab();
      // OK is disabled without a date: focus wraps to the first control inside the sheet.
      expect(
        must(document.querySelector(".ol-datemodal__panel")).contains(document.activeElement),
      ).toBe(true);
      expect(document.body.querySelector(".ol-datefield")?.closest("[inert]")).not.toBeNull();
    });

    it("shows a half-picked range in the sheet", async () => {
      const user = userEvent.setup();
      render(<Ranged mode="modal" />);
      await user.click(trigger());
      expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
      await user.click(day("2026-10-26"));
      const value = must(document.querySelector(".ol-datemodal__value"));
      expect(value).toHaveTextContent("Mon, Oct 26 – …");
      expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
      await user.click(day("2026-10-30"));
      expect(value).toHaveTextContent("Mon, Oct 26 – Fri, Oct 30");
      await user.click(screen.getByRole("button", { name: "OK" }));
      expect(screen.getByRole("textbox", { name: "Start" })).toHaveValue("10/26/2026");
      expect(screen.getByRole("textbox", { name: "End" })).toHaveValue("10/30/2026");
    });

    it("uses the Japanese words and display face for the date", async () => {
      const user = userEvent.setup();
      render(
        <Root locale="ja">
          <DatePicker mode="modal" label="納品日" today={TODAY} defaultValue={d(10, 23)} />
        </Root>,
      );
      await user.click(screen.getByRole("button", { name: /^日付を変更/ }));
      expect(screen.getByRole("button", { name: "キャンセル" })).toBeInTheDocument();
      expect(must(document.querySelector(".ol-datemodal__value"))).toHaveTextContent(
        "10月23日(金)",
      );
    });
  });

  describe("range", () => {
    it("renders two inputs in a named group, joined by an arrow, and one button", () => {
      render(<Ranged />);
      const group = screen.getByRole("group", { name: "Pickup window" });
      expect(within(group).getByRole("textbox", { name: "Start" })).toBeInTheDocument();
      expect(within(group).getByRole("textbox", { name: "End" })).toBeInTheDocument();
      expect(within(group).getByText("→")).toHaveAttribute("aria-hidden", "true");
      expect(within(group).getAllByRole("button")).toHaveLength(1);
    });

    it("uses startLabel and endLabel", () => {
      render(<Ranged startLabel="Pickup from" endLabel="Pickup until" />);
      expect(screen.getByRole("textbox", { name: "Pickup from" })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Pickup until" })).toBeInTheDocument();
    });

    it("localises the default input names", () => {
      render(
        <Root locale="es">
          <DatePicker range label="Ventana" />
        </Root>,
      );
      expect(screen.getByRole("textbox", { name: "Inicio" })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Fin" })).toBeInTheDocument();
    });

    it("picks the start, keeps the calendar open, then the end and closes", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Ranged onChange={onChange} />);
      await user.click(trigger());
      await user.click(day("2026-10-26"));
      expect(onChange).toHaveBeenLastCalledWith({ start: d(10, 26), end: null });
      expect(popup()).not.toBeNull();
      expect(screen.getByRole("textbox", { name: "Start" })).toHaveValue("10/26/2026");
      await user.click(day("2026-10-30"));
      expect(onChange).toHaveBeenLastCalledWith({ start: d(10, 26), end: d(10, 30) });
      await gone();
      expect(trigger()).toHaveFocus();
      expect(trigger()).toHaveAccessibleName(
        "Change date, Monday, October 26, 2026 – Friday, October 30, 2026",
      );
    });

    it("commits typed ends, and ignores an end before the start", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Ranged onChange={onChange} />);
      await user.type(screen.getByRole("textbox", { name: "Start" }), "10/26/2026");
      expect(onChange).toHaveBeenLastCalledWith({ start: d(10, 26), end: null });
      await user.type(screen.getByRole("textbox", { name: "End" }), "10/20/2026");
      expect(onChange).toHaveBeenCalledTimes(1);
      await user.clear(screen.getByRole("textbox", { name: "End" }));
      await user.type(screen.getByRole("textbox", { name: "End" }), "10/30/2026");
      expect(onChange).toHaveBeenLastCalledWith({ start: d(10, 26), end: d(10, 30) });
    });

    it("a new start after the old end drops the end", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Ranged defaultValue={{ start: d(10, 26), end: d(10, 30) }} onChange={onChange} />);
      const start = screen.getByRole("textbox", { name: "Start" });
      await user.clear(start);
      await user.type(start, "11/05/2026");
      expect(onChange).toHaveBeenLastCalledWith({ start: d(11, 5), end: null });
      expect(screen.getByRole("textbox", { name: "End" })).toHaveValue("");
    });

    it("Today starts a range and Clear empties it", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Ranged defaultValue={{ start: d(10, 26), end: d(10, 30) }} onChange={onChange} />);
      await user.click(trigger());
      await user.click(screen.getByRole("button", { name: "Today" }));
      expect(onChange).toHaveBeenLastCalledWith({ start: TODAY, end: null });
      expect(popup()).not.toBeNull();
      await user.click(screen.getByRole("button", { name: "Clear" }));
      expect(onChange).toHaveBeenLastCalledWith({ start: null, end: null });
      await gone();
    });

    it("the focus indicator belongs to the box: the group holds both inputs and the button", () => {
      render(<Ranged />);
      const box = must(document.querySelector(".ol-datefield__box"));
      expect(box).toHaveAttribute("role", "group");
      expect(box.querySelectorAll(".ol-datefield__input")).toHaveLength(2);
    });
  });

  describe("inside a Field", () => {
    it("takes its label, hint and error from the Field", () => {
      render(
        <Field label="Workshop visit" hint="Mondays only" error="Pick a Monday">
          <DatePicker today={TODAY} />
        </Field>,
      );
      const field = input();
      expect(field).toHaveAccessibleName("Workshop visit");
      expect(field).toHaveAccessibleDescription(/Mondays only/);
      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(document.querySelector(".ol-datefield__hint")).toBeNull();
      expect(document.querySelectorAll(".ol-datefield__label")).toHaveLength(0);
    });

    it("names the dialog after the Field's label", async () => {
      const user = userEvent.setup();
      render(
        <Field label="Workshop visit">
          <DatePicker today={TODAY} />
        </Field>,
      );
      await user.click(trigger());
      expect(screen.getByRole("dialog", { name: "Workshop visit" })).toBeInTheDocument();
    });
  });

  describe("names", () => {
    it("takes aria-label when there is no visible label", () => {
      render(<DatePicker aria-label="Birthday" />);
      expect(screen.getByRole("textbox", { name: "Birthday" })).toBeInTheDocument();
    });

    it("warns when the field has no name", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(<DatePicker />);
      expect(warn.mock.calls.flat().join(" ")).toMatch(/DatePicker/);
    });

    it("names a dialog after the aria-label when there is no visible label", async () => {
      const user = userEvent.setup();
      render(<DatePicker aria-label="Birthday" today={TODAY} />);
      await user.click(trigger());
      expect(screen.getByRole("dialog", { name: "Birthday" })).toBeInTheDocument();
    });
  });

  describe("motion", () => {
    it("opens and closes under reduced motion", async () => {
      const user = userEvent.setup();
      render(
        <div className={REDUCE_MOTION_CLASS}>
          <Single />
        </div>,
      );
      await user.click(trigger());
      const dialog = must(popup());
      expect(dialog).toHaveClass("ol-kakejiku");
      expect(dialog).toHaveAttribute("data-state", "open");
      await user.keyboard("{Escape}");
      await gone();
    });

    it("keeps the dialog mounted, inert, while it rolls up", async () => {
      const user = userEvent.setup();
      render(<Single />);
      await user.click(trigger());
      await act(async () => {
        await user.click(trigger());
      });
      const dialog = must(document.querySelector(".ol-datepop"));
      expect(dialog).toHaveAttribute("data-state", "closing");
      expect(dialog).toHaveAttribute("inert");
      await gone();
    });
  });

  describe("accessibility", () => {
    it("has no axe violations closed, docked, modal and ranged", async () => {
      const closed = render(<Single defaultValue={d(10, 23)} error="Pick a weekday" />);
      expect(await runAxe(closed.container)).toHaveNoViolations();
      closed.unmount();

      const user = userEvent.setup();
      const docked = render(<Single />);
      await user.click(trigger());
      expect(
        await runAxe(document.body, { rules: { region: { enabled: false } } }),
      ).toHaveNoViolations();
      docked.unmount();

      const modal = render(<Single mode="modal" />);
      await user.click(trigger());
      expect(
        await runAxe(document.body, { rules: { region: { enabled: false } } }),
      ).toHaveNoViolations();
      modal.unmount();

      const ranged = render(<Ranged />);
      expect(await runAxe(ranged.container)).toHaveNoViolations();
    });
  });
  describe("review fixes", () => {
    const NO_REGION = { rules: { region: { enabled: false } } };

    it("takes aria-required from a required Field", () => {
      render(
        <Field label="Workshop visit" required>
          <DatePicker today={TODAY} />
        </Field>,
      );
      expect(input()).toHaveAttribute("aria-required", "true");
    });

    it("leaves the input on the default text keyboard so / and - can be typed", () => {
      render(<DatePicker label="Workshop visit" />);
      expect(input()).not.toHaveAttribute("inputmode");
    });

    it("ignores an Escape that belongs to an IME composition", async () => {
      const user = userEvent.setup();
      render(<Single />);
      await user.click(trigger());
      expect(popup()).not.toBeNull();
      fireEvent.compositionStart(input());
      fireEvent.keyDown(input(), { key: "Escape", isComposing: true });
      expect(popup()).not.toBeNull();
      expect(popup()).toHaveAttribute("data-state", "open");
      fireEvent.compositionEnd(input());
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      fireEvent.keyDown(input(), { key: "Escape" });
      await gone();
    });

    it("names the modal like the docked dialog", async () => {
      const user = userEvent.setup();
      const first = render(
        <Field label="Delivery date">
          <DatePicker mode="modal" today={TODAY} />
        </Field>,
      );
      await user.click(trigger());
      expect(screen.getByRole("dialog", { name: "Delivery date" })).toHaveClass(
        "ol-datemodal__panel",
      );
      await user.keyboard("{Escape}");
      await gone();
      first.unmount();

      render(<DatePicker mode="modal" today={TODAY} aria-label="Birthday" />);
      await user.click(trigger());
      expect(screen.getByRole("dialog", { name: "Birthday" })).toBeInTheDocument();
    });

    it("announces only real dates in the modal's live value, not the placeholders", async () => {
      const user = userEvent.setup();
      render(<Ranged mode="modal" />);
      await user.click(trigger());
      const value = must(document.querySelector<HTMLElement>(".ol-datemodal__value"));
      const spoken = () =>
        Array.from(value.childNodes)
          .filter((n) => !(n instanceof HTMLElement && n.getAttribute("aria-hidden") === "true"))
          .map((n) => n.textContent)
          .join("");
      expect(spoken()).toBe("");
      await user.click(day("2026-10-26"));
      expect(spoken()).toBe("Mon, Oct 26");
      await user.click(day("2026-10-30"));
      expect(spoken()).toBe("Mon, Oct 26 – Fri, Oct 30");
    });

    it("Shift+Tab from the first control of the sheet wraps to the last", async () => {
      const user = userEvent.setup();
      render(<Single mode="modal" defaultValue={d(10, 23)} />);
      await user.click(trigger());
      must(document.querySelector<HTMLElement>(".ol-cal__title")).focus();
      await user.tab({ shift: true });
      expect(screen.getByRole("button", { name: "OK" })).toHaveFocus();
      await user.tab();
      expect(must(document.querySelector(".ol-cal__title"))).toHaveFocus();
    });

    it("picks a range in the modal from the keyboard alone", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Ranged mode="modal" onChange={onChange} />);
      trigger().focus();
      await user.keyboard("{Enter}");
      await waitFor(() => {
        expect(focusedIso()).toBe("2026-10-22");
      });
      await user.keyboard("{Enter}{ArrowRight}{ArrowRight}{Enter}");
      expect(must(document.querySelector(".ol-datemodal__value"))).toHaveTextContent(
        "Thu, Oct 22 – Sat, Oct 24",
      );
      await user.tab();
      expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "OK" })).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(onChange).toHaveBeenLastCalledWith({ start: TODAY, end: d(10, 24) });
      await gone();
      expect(trigger()).toHaveFocus();
    });

    it("releases the scroll lock and the inert page when the modal closes", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Single mode="modal" />
          <button type="button">elsewhere</button>
        </>,
      );
      await user.click(trigger());
      expect(document.body.style.overflow).toBe("hidden");
      expect(document.querySelectorAll("body > [inert]").length).toBeGreaterThan(0);
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      await gone();
      expect(document.body.style.overflow).toBe("");
      expect(document.querySelectorAll("[inert]")).toHaveLength(0);
      expect(trigger()).toHaveFocus();
    });

    it("has no axe violations for an open range, docked and modal", async () => {
      const user = userEvent.setup();
      const docked = render(<Ranged />);
      await user.click(trigger());
      expect(await runAxe(document.body, NO_REGION)).toHaveNoViolations();
      docked.unmount();
      const modal = render(
        <Ranged mode="modal" defaultValue={{ start: d(10, 26), end: d(10, 30) }} />,
      );
      await user.click(trigger());
      expect(await runAxe(document.body, NO_REGION)).toHaveNoViolations();
      modal.unmount();
    });

    it("has no axe violations inside a Field, open", async () => {
      const user = userEvent.setup();
      render(
        <Field label="Workshop visit" hint="Mondays only" required>
          <DatePicker today={TODAY} />
        </Field>,
      );
      await user.click(trigger());
      expect(await runAxe(document.body, NO_REGION)).toHaveNoViolations();
    });

    it("has no axe violations in es and ja, open", async () => {
      const user = userEvent.setup();
      const es = render(
        <Root locale="es">
          <DatePicker label="Fecha" today={TODAY} defaultValue={d(10, 23)} />
        </Root>,
      );
      await user.click(screen.getByRole("button", { name: /^Cambiar fecha/ }));
      expect(await runAxe(document.body, NO_REGION)).toHaveNoViolations();
      es.unmount();
      render(
        <Root locale="ja">
          <DatePicker mode="modal" label="納品日" today={TODAY} defaultValue={d(10, 23)} />
        </Root>,
      );
      await user.click(screen.getByRole("button", { name: /^日付を変更/ }));
      expect(await runAxe(document.body, NO_REGION)).toHaveNoViolations();
    });

    it("has no axe violations disabled or read only", async () => {
      const { container } = render(
        <>
          <DatePicker label="Disabled" disabled defaultValue={d(10, 23)} />
          <DatePicker label="Read only" readOnly defaultValue={d(10, 23)} />
        </>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });
});
