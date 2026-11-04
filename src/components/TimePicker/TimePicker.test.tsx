import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Field } from "../Field";
import { Root } from "../Root";
import { TimePicker, type TimePickerProps, type TimeValue } from "./TimePicker";

const NO_REGION = { rules: { region: { enabled: false } } };

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("element not found");
  return value;
}

const hour = () => screen.getByRole("spinbutton", { name: "Hour" });
const minute = () => screen.getByRole("spinbutton", { name: "Minute" });
const period = () => screen.getByRole("spinbutton", { name: "AM/PM" });
const opener = () => screen.getByRole("button", { name: "Choose time" });
const dialog = () => screen.getByRole("dialog");
const column = (name: string) => within(dialog()).getByRole("listbox", { name });
const option = (list: string, name: string | RegExp) =>
  within(column(list)).getByRole("option", { name });

/** A controlled picker that reports every value to `onChange`. */
function Controlled({
  initial = null,
  onChange,
  ...props
}: Omit<TimePickerProps, "value" | "onChange"> & {
  initial?: TimeValue | null;
  onChange?: (value: TimeValue | null) => void;
}) {
  const [value, setValue] = useState<TimeValue | null>(initial);
  return (
    <TimePicker
      label="Arrival"
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("TimePicker", () => {
  stubNoAnimations();

  describe("structure and ARIA", () => {
    it("is a group named by its label and described by its hint", () => {
      render(<TimePicker label="Arrival" hint="Between 9 and 4" />);
      const group = screen.getByRole("group", { name: "Arrival" });
      expect(group).toHaveAccessibleDescription("Between 9 and 4");
    });

    it("exposes the segments as spinbuttons with their range and text", () => {
      render(<TimePicker label="Arrival" defaultValue={{ h: 14, m: 5 }} />);
      expect(hour()).toHaveAttribute("aria-valuemin", "1");
      expect(hour()).toHaveAttribute("aria-valuemax", "12");
      expect(hour()).toHaveAttribute("aria-valuenow", "2");
      expect(hour()).toHaveAttribute("aria-valuetext", "2");
      expect(minute()).toHaveAttribute("aria-valuemin", "0");
      expect(minute()).toHaveAttribute("aria-valuemax", "59");
      expect(minute()).toHaveAttribute("aria-valuenow", "5");
      expect(minute()).toHaveAttribute("aria-valuetext", "05");
      expect(hour()).toHaveTextContent("2");
      expect(minute()).toHaveTextContent("05");
      expect(period()).toHaveAttribute("aria-valuetext", "PM");
      expect(period()).toHaveTextContent("PM");
    });

    it("shows a 24 h clock without AM/PM when asked", () => {
      render(<TimePicker label="Arrival" hourCycle={24} defaultValue={{ h: 14, m: 5 }} />);
      expect(hour()).toHaveAttribute("aria-valuemin", "0");
      expect(hour()).toHaveAttribute("aria-valuemax", "23");
      expect(hour()).toHaveTextContent("14");
      expect(screen.queryByRole("spinbutton", { name: "AM/PM" })).toBeNull();
    });

    it("defaults the hour cycle by locale: en 12 h, es and ja 24 h", () => {
      const { unmount } = render(<TimePicker label="Arrival" locale="en" />);
      expect(screen.queryByRole("spinbutton", { name: "AM/PM" })).not.toBeNull();
      unmount();
      render(<TimePicker label="Llegada" locale="es" />);
      expect(screen.queryByRole("spinbutton", { name: "AM/PM" })).toBeNull();
      expect(screen.getByRole("spinbutton", { name: "Hora" })).toBeInTheDocument();
      expect(screen.getByRole("spinbutton", { name: "Minuto" })).toBeInTheDocument();
    });

    it("writes the day period in the locale's words", () => {
      render(<TimePicker label="到着" locale="ja" hourCycle={12} defaultValue={{ h: 15, m: 0 }} />);
      expect(screen.getByRole("spinbutton", { name: "午前/午後" })).toHaveTextContent("午後");
      expect(screen.getByRole("spinbutton", { name: "時" })).toHaveTextContent("3");
    });

    it("marks an empty segment and speaks it as empty", () => {
      render(<TimePicker label="Arrival" />);
      expect(hour()).toHaveTextContent("––");
      expect(hour()).toHaveAttribute("data-empty");
      expect(hour()).not.toHaveAttribute("aria-valuenow");
      expect(hour()).toHaveAttribute("aria-valuetext", "Empty");
      expect(minute()).toHaveAttribute("aria-valuetext", "Empty");
    });

    it("passes the ref and extra props to the root", () => {
      const ref = createRef<HTMLDivElement>();
      render(<TimePicker ref={ref} label="Arrival" className="x" data-testid="root" />);
      expect(ref.current).toBe(screen.getByTestId("root"));
      expect(ref.current).toHaveClass("ol-timepicker", "x");
    });

    it("takes its name from aria-label when there is no label", () => {
      render(<TimePicker aria-label="Pickup" />);
      expect(screen.getByRole("group", { name: "Pickup" })).toBeInTheDocument();
    });

    it("takes its name and description from an enclosing Field", () => {
      render(
        <Field label="Doors open" hint="Local time">
          <TimePicker />
        </Field>,
      );
      const group = screen.getByRole("group", { name: "Doors open" });
      expect(group).toHaveAccessibleDescription("Local time");
    });

    it("carries an invalid Field's state to the segments", () => {
      render(
        <Field label="Doors open" error="Pick a time">
          <TimePicker />
        </Field>,
      );
      expect(hour()).toHaveAttribute("aria-invalid", "true");
      expect(document.querySelector(".ol-timepicker")).toHaveAttribute("data-invalid");
    });

    it("submits HH:MM through a hidden input", () => {
      const { rerender } = render(<TimePicker label="Arrival" name="arrival" />);
      const input = () => must(document.querySelector<HTMLInputElement>('input[name="arrival"]'));
      expect(input().value).toBe("");
      rerender(<TimePicker label="Arrival" name="arrival" value={{ h: 9, m: 5 }} />);
      expect(input().value).toBe("09:05");
    });
  });

  describe("segment keyboard", () => {
    it("steps the hour with the arrow keys and wraps inside the period", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled initial={{ h: 11, m: 30 }} onChange={onChange} />);
      hour().focus();
      await user.keyboard("{ArrowUp}");
      // 11 AM wraps to 12 AM (hour 0): the period does not change.
      expect(onChange).toHaveBeenLastCalledWith({ h: 0, m: 30 });
      await user.keyboard("{ArrowDown}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 11, m: 30 });
      await user.keyboard("{ArrowDown}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 10, m: 30 });
    });

    it("wraps a 24 h hour from 23 to 0", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled hourCycle={24} initial={{ h: 23, m: 0 }} onChange={onChange} />);
      hour().focus();
      await user.keyboard("{ArrowUp}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 0, m: 0 });
      await user.keyboard("{ArrowDown}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 23, m: 0 });
    });

    it("steps the minute by one, wrapping, and by minuteStep with Page Up and Down", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled minuteStep={15} initial={{ h: 9, m: 59 }} onChange={onChange} />);
      minute().focus();
      await user.keyboard("{ArrowUp}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 9, m: 0 });
      await user.keyboard("{ArrowDown}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 9, m: 59 });
      await user.keyboard("{PageUp}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 9, m: 14 });
      await user.keyboard("{PageDown}{PageDown}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 9, m: 44 });
    });

    it("jumps to the first and last value with Home and End", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled initial={{ h: 9, m: 30 }} onChange={onChange} />);
      minute().focus();
      await user.keyboard("{End}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 9, m: 59 });
      await user.keyboard("{Home}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 9, m: 0 });
      hour().focus();
      await user.keyboard("{End}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 11, m: 0 });
      await user.keyboard("{Home}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 0, m: 0 });
    });

    it("starts an empty field at the first value going up and the last going down", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled hourCycle={24} onChange={onChange} />);
      minute().focus();
      await user.keyboard("{ArrowDown}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 0, m: 59 });
    });

    it("types digits, completing a segment and moving on to the next", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled hourCycle={24} onChange={onChange} />);
      hour().focus();
      await user.keyboard("1");
      expect(onChange).toHaveBeenLastCalledWith({ h: 1, m: 0 });
      expect(hour()).toHaveFocus();
      await user.keyboard("4");
      expect(onChange).toHaveBeenLastCalledWith({ h: 14, m: 0 });
      expect(minute()).toHaveFocus();
      await user.keyboard("3");
      expect(minute()).toHaveFocus();
      await user.keyboard("7");
      expect(onChange).toHaveBeenLastCalledWith({ h: 14, m: 37 });
    });

    it("moves on at once when a digit cannot start a longer number", async () => {
      const user = userEvent.setup();
      render(<Controlled hourCycle={24} />);
      hour().focus();
      await user.keyboard("5");
      expect(minute()).toHaveFocus();
      await user.keyboard("7");
      expect(minute()).toHaveTextContent("07");
    });

    it("lets a 12 h hour start with 0 and rejects 0 as a value", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled onChange={onChange} />);
      hour().focus();
      await user.keyboard("0");
      expect(onChange).not.toHaveBeenCalled();
      await user.keyboard("9");
      expect(onChange).toHaveBeenLastCalledWith({ h: 9, m: 0 });
      expect(minute()).toHaveFocus();
    });

    it("restarts the number when the typed pair is out of range", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled hourCycle={24} onChange={onChange} />);
      hour().focus();
      await user.keyboard("2");
      await user.keyboard("9");
      // 29 is not an hour: the 9 starts over and, being complete, moves on.
      expect(onChange).toHaveBeenLastCalledWith({ h: 9, m: 0 });
      expect(minute()).toHaveFocus();
    });

    it("keeps the PM period while typing a 12 h hour", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled initial={{ h: 13, m: 0 }} onChange={onChange} />);
      hour().focus();
      await user.keyboard("1");
      await user.keyboard("1");
      expect(onChange).toHaveBeenLastCalledWith({ h: 23, m: 0 });
    });

    it("clears the field with Backspace", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled initial={{ h: 9, m: 30 }} onChange={onChange} />);
      minute().focus();
      await user.keyboard("{Backspace}");
      expect(onChange).toHaveBeenLastCalledWith(null);
      expect(hour()).toHaveTextContent("––");
      expect(minute()).toHaveTextContent("––");
    });

    it("does not trap Tab and ignores modified keys", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled initial={{ h: 9, m: 30 }} onChange={onChange} />);
      hour().focus();
      await user.tab();
      expect(minute()).toHaveFocus();
      await user.keyboard("{Control>}{ArrowUp}{/Control}");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("toggles AM and PM with the arrows and sets them with A and P", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled initial={{ h: 9, m: 30 }} onChange={onChange} />);
      period().focus();
      await user.keyboard("{ArrowUp}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 21, m: 30 });
      expect(period()).toHaveTextContent("PM");
      expect(period()).toHaveAttribute("aria-valuetext", "PM");
      await user.keyboard("{ArrowDown}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 9, m: 30 });
      await user.keyboard("p");
      expect(onChange).toHaveBeenLastCalledWith({ h: 21, m: 30 });
      await user.keyboard("A");
      expect(onChange).toHaveBeenLastCalledWith({ h: 9, m: 30 });
    });

    it("uses uncontrolled state when no value is given", async () => {
      const user = userEvent.setup();
      render(<TimePicker label="Arrival" defaultValue={{ h: 9, m: 30 }} />);
      hour().focus();
      await user.keyboard("{ArrowUp}");
      expect(hour()).toHaveTextContent("10");
    });

    it("changes nothing when read-only or disabled", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { rerender } = render(
        <TimePicker label="Arrival" readOnly defaultValue={{ h: 9, m: 30 }} onChange={onChange} />,
      );
      hour().focus();
      await user.keyboard("{ArrowUp}{Backspace}5");
      expect(onChange).not.toHaveBeenCalled();
      expect(hour()).toHaveAttribute("aria-readonly", "true");
      expect(opener()).toBeDisabled();
      rerender(
        <TimePicker label="Arrival" disabled defaultValue={{ h: 9, m: 30 }} onChange={onChange} />,
      );
      expect(hour()).toHaveAttribute("aria-disabled", "true");
      expect(hour()).toHaveAttribute("tabindex", "-1");
      expect(opener()).toBeDisabled();
    });
  });

  describe("opening hours", () => {
    it("skips the hours outside minHour and maxHour when stepping", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Controlled
          hourCycle={24}
          minHour={9}
          maxHour={16}
          initial={{ h: 16, m: 0 }}
          onChange={onChange}
        />,
      );
      hour().focus();
      await user.keyboard("{ArrowUp}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 9, m: 0 });
      await user.keyboard("{ArrowDown}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 16, m: 0 });
    });

    it("refuses a typed hour outside the range but waits for a longer one", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled hourCycle={24} minHour={9} maxHour={16} onChange={onChange} />);
      hour().focus();
      await user.keyboard("5");
      expect(onChange).not.toHaveBeenCalled();
      await user.keyboard("1");
      // 1 is out of range, but 12 is not.
      expect(onChange).not.toHaveBeenCalled();
      await user.keyboard("2");
      expect(onChange).toHaveBeenLastCalledWith({ h: 12, m: 0 });
    });

    it("starts an empty field at the first open hour", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled hourCycle={24} minHour={9} maxHour={16} onChange={onChange} />);
      minute().focus();
      await user.keyboard("{ArrowUp}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 9, m: 0 });
    });

    it("moves to the nearest open hour of the other period", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled minHour={9} maxHour={16} initial={{ h: 10, m: 0 }} onChange={onChange} />);
      period().focus();
      await user.keyboard("p");
      // 10 PM is closed: 4 PM (16) is the nearest open hour.
      expect(onChange).toHaveBeenLastCalledWith({ h: 16, m: 0 });
    });
  });

  describe("picker", () => {
    it("has a button that names itself and announces the dialog", async () => {
      const user = userEvent.setup();
      render(<TimePicker label="Arrival" />);
      expect(opener()).toHaveAttribute("aria-haspopup", "dialog");
      expect(opener()).toHaveAttribute("aria-expanded", "false");
      expect(opener()).not.toHaveAttribute("aria-controls");
      await user.click(opener());
      expect(opener()).toHaveAttribute("aria-expanded", "true");
      expect(opener()).toHaveAttribute("aria-controls", dialog().id);
    });

    it("leaves the button out when picker is false", () => {
      render(<TimePicker label="Arrival" picker={false} />);
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("opens a dialog named by the label with the hour and minute listboxes", async () => {
      const user = userEvent.setup();
      render(<TimePicker label="Arrival" defaultValue={{ h: 14, m: 0 }} />);
      await user.click(opener());
      expect(dialog()).toHaveAccessibleName("Arrival");
      expect(column("Hour")).toBeInTheDocument();
      expect(column("Minute")).toBeInTheDocument();
      expect(dialog()).toHaveClass("ol-kakejiku");
    });

    it("names the dialog from the locale when the field has no label", async () => {
      const user = userEvent.setup();
      render(<TimePicker aria-label="Pickup" />);
      await user.click(opener());
      expect(dialog()).toHaveAccessibleName("Choose time");
    });

    it("sets the time large and marks the selected options", async () => {
      const user = userEvent.setup();
      render(<TimePicker label="Arrival" defaultValue={{ h: 14, m: 5 }} />);
      await user.click(opener());
      expect(must(document.querySelector(".ol-timepicker__value"))).toHaveTextContent("2:05");
      expect(must(document.querySelector(".ol-timepicker__period"))).toHaveTextContent("PM");
      expect(option("Hour", "2 PM")).toHaveAttribute("aria-selected", "true");
      expect(option("Hour", "3 PM")).toHaveAttribute("aria-selected", "false");
      expect(option("Minute", "05")).toHaveAttribute("aria-selected", "true");
      expect(within(column("Hour")).getAllByRole("option")).toHaveLength(24);
    });

    it("lists 24 h hours without a period and minutes by minuteStep", async () => {
      const user = userEvent.setup();
      render(<TimePicker label="Arrival" hourCycle={24} minuteStep={15} />);
      await user.click(opener());
      expect(option("Hour", "07")).toBeInTheDocument();
      expect(document.querySelector(".ol-timepicker__period")).toBeNull();
      const minutes = within(column("Minute")).getAllByRole("option");
      expect(minutes.map((o) => o.textContent)).toEqual(["00", "15", "30", "45"]);
    });

    it("takes focus in the hour column, on the selected option", async () => {
      const user = userEvent.setup();
      render(<TimePicker label="Arrival" defaultValue={{ h: 14, m: 0 }} />);
      await user.click(opener());
      expect(option("Hour", "2 PM")).toHaveFocus();
    });

    it("focuses the first open hour when nothing is selected", async () => {
      const user = userEvent.setup();
      render(<TimePicker label="Arrival" minHour={9} maxHour={16} />);
      await user.click(opener());
      expect(option("Hour", "9 AM")).toHaveFocus();
    });

    it("keeps one tab stop per column, on the selected option", async () => {
      const user = userEvent.setup();
      render(<TimePicker label="Arrival" defaultValue={{ h: 14, m: 10 }} />);
      await user.click(opener());
      const stops = (list: string) =>
        within(column(list))
          .getAllByRole("option")
          .filter((o) => o.getAttribute("tabindex") === "0");
      expect(stops("Hour")).toEqual([option("Hour", "2 PM")]);
      expect(stops("Minute")).toEqual([option("Minute", "10")]);
    });

    it("moves through a column with the arrows, Home and End without picking", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<TimePicker label="Arrival" defaultValue={{ h: 14, m: 0 }} onChange={onChange} />);
      await user.click(opener());
      await user.keyboard("{ArrowDown}");
      expect(option("Hour", "3 PM")).toHaveFocus();
      await user.keyboard("{ArrowUp}{ArrowUp}");
      expect(option("Hour", "1 PM")).toHaveFocus();
      await user.keyboard("{End}");
      expect(option("Hour", "11 PM")).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      expect(option("Hour", "11 PM")).toHaveFocus();
      await user.keyboard("{Home}");
      expect(option("Hour", "12 AM")).toHaveFocus();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("picks with Enter and with a press", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled initial={{ h: 14, m: 0 }} onChange={onChange} />);
      await user.click(opener());
      await user.keyboard("{ArrowDown}{Enter}");
      expect(onChange).toHaveBeenLastCalledWith({ h: 15, m: 0 });
      expect(option("Hour", "3 PM")).toHaveAttribute("aria-selected", "true");
      await user.click(option("Minute", "25"));
      expect(onChange).toHaveBeenLastCalledWith({ h: 15, m: 25 });
      expect(option("Minute", "25")).toHaveAttribute("aria-selected", "true");
      expect(must(document.querySelector(".ol-timepicker__value"))).toHaveTextContent("3:25");
      // The field behind follows.
      expect(hour()).toHaveTextContent("3");
      expect(minute()).toHaveTextContent("25");
    });

    it("picks with Space", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled initial={{ h: 14, m: 0 }} onChange={onChange} />);
      await user.click(opener());
      await user.keyboard("{ArrowUp} ");
      expect(onChange).toHaveBeenLastCalledWith({ h: 13, m: 0 });
    });

    it("marks hours outside the opening hours unavailable and skips them", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled minHour={9} maxHour={16} initial={{ h: 9, m: 0 }} onChange={onChange} />);
      await user.click(opener());
      expect(option("Hour", "8 AM")).toHaveAttribute("aria-disabled", "true");
      expect(option("Hour", "5 PM")).toHaveAttribute("aria-disabled", "true");
      expect(option("Hour", "4 PM")).not.toHaveAttribute("aria-disabled");
      await user.click(option("Hour", "5 PM"));
      expect(onChange).not.toHaveBeenCalled();
      await user.keyboard("{ArrowUp}");
      expect(option("Hour", "9 AM")).toHaveFocus();
      await user.keyboard("{Home}");
      expect(option("Hour", "9 AM")).toHaveFocus();
      await user.keyboard("{End}");
      expect(option("Hour", "4 PM")).toHaveFocus();
    });

    it("sets an empty field to the first open hour when a minute is picked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled minHour={9} maxHour={16} onChange={onChange} />);
      await user.click(opener());
      await user.click(option("Minute", "30"));
      expect(onChange).toHaveBeenLastCalledWith({ h: 9, m: 30 });
    });

    it("closes with OK and returns focus to the button", async () => {
      const user = userEvent.setup();
      render(<TimePicker label="Arrival" defaultValue={{ h: 14, m: 0 }} />);
      await user.click(opener());
      await user.click(within(dialog()).getByRole("button", { name: "OK" }));
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });
      expect(opener()).toHaveFocus();
      expect(opener()).toHaveAttribute("aria-expanded", "false");
    });

    it("closes with Escape and returns focus to the button", async () => {
      const user = userEvent.setup();
      render(<TimePicker label="Arrival" defaultValue={{ h: 14, m: 0 }} />);
      await user.click(opener());
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });
      expect(opener()).toHaveFocus();
    });

    it("closes on a press outside without moving focus", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button type="button">Elsewhere</button>
          <TimePicker label="Arrival" />
        </div>,
      );
      await user.click(opener());
      await user.click(screen.getByRole("button", { name: "Elsewhere" }));
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });
      expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
    });

    it("toggles with the button", async () => {
      const user = userEvent.setup();
      render(<TimePicker label="Arrival" />);
      await user.click(opener());
      await user.click(opener());
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });
    });

    it("tabs through the columns and OK, then back out to the button", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <TimePicker label="Arrival" defaultValue={{ h: 14, m: 10 }} />
          <button type="button">After</button>
        </div>,
      );
      await user.click(opener());
      await user.tab();
      expect(option("Minute", "10")).toHaveFocus();
      await user.tab();
      expect(within(dialog()).getByRole("button", { name: "OK" })).toHaveFocus();
      await user.tab();
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });
      expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    });

    it("returns focus to the button on Shift+Tab from the first column", async () => {
      const user = userEvent.setup();
      render(<TimePicker label="Arrival" defaultValue={{ h: 14, m: 10 }} />);
      await user.click(opener());
      await user.tab({ shift: true });
      expect(opener()).toHaveFocus();
    });

    it("can be controlled", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const { rerender } = render(
        <TimePicker label="Arrival" open={false} onOpenChange={onOpenChange} />,
      );
      await user.click(opener());
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
      expect(screen.queryByRole("dialog")).toBeNull();
      rerender(<TimePicker label="Arrival" open onOpenChange={onOpenChange} />);
      expect(dialog()).toBeInTheDocument();
    });

    it("can start open", () => {
      render(<TimePicker label="Arrival" defaultOpen />);
      expect(dialog()).toBeInTheDocument();
    });

    it("writes the picker's words in the locale", async () => {
      const user = userEvent.setup();
      render(<TimePicker locale="es" aria-label="Llegada" />);
      await user.click(screen.getByRole("button", { name: "Elegir hora" }));
      expect(within(dialog()).getByRole("listbox", { name: "Hora" })).toBeInTheDocument();
      expect(within(dialog()).getByRole("listbox", { name: "Minuto" })).toBeInTheDocument();
      expect(within(dialog()).getByRole("button", { name: "Aceptar" })).toBeInTheDocument();
    });
  });

  describe("locale", () => {
    it("names the Japanese segments and speaks their values", () => {
      render(<TimePicker label="到着" locale="ja" hourCycle={12} defaultValue={{ h: 15, m: 5 }} />);
      const h = screen.getByRole("spinbutton", { name: "時" });
      const m = screen.getByRole("spinbutton", { name: "分" });
      const p = screen.getByRole("spinbutton", { name: "午前/午後" });
      expect(h).toHaveAttribute("aria-valuetext", "3");
      expect(m).toHaveAttribute("aria-valuetext", "05");
      expect(p).toHaveAttribute("aria-valuetext", "午後");
      expect(p).toHaveTextContent("午後");
      expect(screen.getByRole("button", { name: "時刻を選択" })).toBeInTheDocument();
    });

    it("sets lang on the root and on the portalled popup", async () => {
      const user = userEvent.setup();
      render(<TimePicker label="Llegada" locale="es-MX" data-testid="root" />);
      expect(screen.getByTestId("root")).toHaveAttribute("lang", "es-MX");
      await user.click(screen.getByRole("button", { name: "Elegir hora" }));
      expect(must(dialog().closest(".ol-portal"))).toHaveAttribute("lang", "es-MX");
    });

    it("takes lang for the popup from the Root", async () => {
      const user = userEvent.setup();
      render(
        <Root locale="ja">
          <TimePicker label="到着" />
        </Root>,
      );
      await user.click(screen.getByRole("button", { name: "時刻を選択" }));
      expect(must(dialog().closest(".ol-portal"))).toHaveAttribute("lang", "ja");
    });

    it("follows a Root locale that changes en -> es -> ja", () => {
      const tree = (locale: "en" | "es" | "ja") => (
        <Root locale={locale}>
          <TimePicker aria-label="t" defaultValue={{ h: 15, m: 5 }} />
        </Root>
      );
      const { rerender } = render(tree("en"));
      expect(screen.getByRole("spinbutton", { name: "Hour" })).toHaveTextContent("3");
      expect(period()).toHaveTextContent("PM");
      rerender(tree("es"));
      expect(screen.getByRole("spinbutton", { name: "Hora" })).toHaveTextContent("15");
      expect(screen.queryByRole("spinbutton", { name: "AM/PM" })).toBeNull();
      expect(screen.getByRole("button", { name: "Elegir hora" })).toBeInTheDocument();
      rerender(tree("ja"));
      expect(screen.getByRole("spinbutton", { name: "時" })).toHaveTextContent("15");
      expect(screen.getByRole("button", { name: "時刻を選択" })).toBeInTheDocument();
    });
  });

  describe("motion", () => {
    it("unrolls as a kakejiku and carries the in-app reduced-motion setting to the layer", async () => {
      const user = userEvent.setup();
      render(
        <Root className={REDUCE_MOTION_CLASS}>
          <TimePicker label="Arrival" />
        </Root>,
      );
      await user.click(opener());
      expect(dialog()).toHaveClass("ol-kakejiku");
      expect(dialog()).toHaveAttribute("data-state", "open");
      expect(must(dialog().closest(".ol-portal"))).toHaveClass(REDUCE_MOTION_CLASS);
    });

    it("keeps the dialog inert while it rolls up, then unmounts it", async () => {
      let finish: () => void = () => undefined;
      const pending = {
        effect: { getComputedTiming: () => ({ endTime: 300 }) },
        finished: new Promise<void>((resolve) => {
          finish = resolve;
        }),
      };
      vi.spyOn(Element.prototype, "getAnimations").mockReturnValue([
        pending as unknown as Animation,
      ]);
      const user = userEvent.setup();
      render(<TimePicker label="Arrival" />);
      await user.click(opener());
      const popup = dialog();
      await user.click(opener());
      expect(popup).toHaveAttribute("data-state", "closing");
      expect(popup).toHaveAttribute("inert");
      act(() => {
        finish();
      });
      await waitFor(() => {
        expect(popup).not.toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("has no axe violations closed", async () => {
      const { container } = render(
        <TimePicker label="Arrival" hint="Between 9 and 4" defaultValue={{ h: 14, m: 5 }} />,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no axe violations empty, 24 h and without a picker", async () => {
      const { container } = render(<TimePicker label="Arrival" hourCycle={24} picker={false} />);
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no axe violations open", async () => {
      const user = userEvent.setup();
      render(
        <TimePicker label="Arrival" minHour={9} maxHour={16} defaultValue={{ h: 14, m: 5 }} />,
      );
      await user.click(opener());
      expect(await runAxe(document.body, NO_REGION)).toHaveNoViolations();
    });

    it("has no axe violations open in 24 h", async () => {
      const user = userEvent.setup();
      render(
        <TimePicker
          label="Arrival"
          hourCycle={24}
          minuteStep={15}
          defaultValue={{ h: 14, m: 15 }}
        />,
      );
      await user.click(opener());
      expect(await runAxe(document.body, NO_REGION)).toHaveNoViolations();
    });

    it("has no axe violations with a segment focused", async () => {
      const { container } = render(<TimePicker label="Arrival" defaultValue={{ h: 14, m: 5 }} />);
      minute().focus();
      expect(minute()).toHaveFocus();
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no axe violations in a Field, disabled or invalid", async () => {
      const { container } = render(
        <div>
          <Field label="Doors open" error="Pick a time">
            <TimePicker />
          </Field>
          <TimePicker label="Closed" disabled defaultValue={{ h: 9, m: 0 }} />
        </div>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });
});
