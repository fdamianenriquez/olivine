import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Calendar, type CalendarHandle } from "./Calendar";
import { type DateRange, toIsoDate } from "./dates";

/** Thursday 22 October 2026. */
const TODAY = new Date(2026, 9, 22);
const d = (month: number, date: number, year = 2026) => new Date(year, month - 1, date);

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("element not found");
  return value;
}

const grid = () => screen.getByRole("grid");
const day = (iso: string) =>
  must(document.querySelector<HTMLButtonElement>(`button[data-date="${iso}"]`));
const focusedIso = () => (document.activeElement as HTMLElement | null)?.dataset.date;
const tabStops = () => document.querySelectorAll('.ol-cal__day[tabindex="0"]');
const title = () => must(document.querySelector(".ol-cal__head [aria-live]")).textContent;
const toggle = () => must(document.querySelector<HTMLButtonElement>(".ol-cal__title"));

describe("Calendar", () => {
  describe("structure and ARIA", () => {
    it("renders a grid of six weeks labelled by the live month title", () => {
      render(<Calendar today={TODAY} />);
      const table = grid();
      const titleId = table.getAttribute("aria-labelledby");
      const label = must(document.getElementById(must(titleId)));
      expect(label).toHaveTextContent("October 2026");
      expect(label).toHaveAttribute("aria-live", "polite");
      expect(within(table).getAllByRole("row")).toHaveLength(7);
      expect(within(table).getAllByRole("gridcell")).toHaveLength(42);
    });

    it("names the column headers in full with abbr", () => {
      render(<Calendar today={TODAY} />);
      const headers = within(grid()).getAllByRole("columnheader");
      expect(headers[0]).toHaveTextContent("Sun");
      expect(headers[0]).toHaveAttribute("abbr", "Sunday");
      expect(headers[0]).toHaveAttribute("data-weekend");
      expect(headers[1]).not.toHaveAttribute("data-weekend");
    });

    it("marks today with aria-current, the seal and the word today", () => {
      render(<Calendar today={TODAY} />);
      const button = day("2026-10-22");
      expect(button).toHaveAttribute("aria-current", "date");
      expect(button).toHaveAccessibleName("Thursday, October 22, 2026, today");
      expect(button.querySelector(".ol-cal__seal.ol-stamp--round.ol-stamp--shu")).not.toBeNull();
      expect(day("2026-10-21")).not.toHaveAttribute("aria-current");
      expect(document.querySelectorAll(".ol-cal__seal")).toHaveLength(1);
    });

    it("keeps one roving tab stop, on the selected day or today", () => {
      const { unmount } = render(<Calendar today={TODAY} />);
      expect(tabStops()).toHaveLength(1);
      expect(day("2026-10-22")).toHaveAttribute("tabindex", "0");
      unmount();
      render(<Calendar today={TODAY} defaultValue={d(10, 5)} />);
      expect(tabStops()).toHaveLength(1);
      expect(day("2026-10-05")).toHaveAttribute("tabindex", "0");
    });

    it("shows days of the neighbouring months as context only", () => {
      render(<Calendar today={TODAY} />);
      const outside = document.querySelectorAll(".ol-cal__day[data-outside]");
      // October 2026 starts on a Thursday: 4 leading days, 42 - 4 - 31 = 7 trailing days.
      expect(outside).toHaveLength(11);
      for (const el of outside) {
        expect(el.tagName).toBe("SPAN");
        expect(el).toHaveAttribute("aria-hidden", "true");
      }
      expect(document.querySelector('[data-date="2026-09-30"]')).toBeNull();
    });

    it("forwards ref, className and other props to the root", () => {
      const ref = createRef<HTMLDivElement>();
      render(<Calendar ref={ref} today={TODAY} className="x" data-testid="cal" />);
      expect(ref.current).toBe(screen.getByTestId("cal"));
      expect(ref.current).toHaveClass("ol-cal", "x");
      expect(ref.current).toHaveAttribute("data-view", "days");
    });

    it("has no axe violations in the day grid", async () => {
      const { container } = render(
        <Calendar
          today={TODAY}
          defaultValue={d(10, 12)}
          isDateUnavailable={(x) => x.getDay() === 0}
        />,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("is multiselectable only with a range", () => {
      const { unmount } = render(<Calendar today={TODAY} />);
      expect(grid()).not.toHaveAttribute("aria-multiselectable");
      unmount();
      render(<Calendar range today={TODAY} />);
      expect(grid()).toHaveAttribute("aria-multiselectable", "true");
    });

    it("has no axe violations with a range", async () => {
      const { container } = render(
        <Calendar range today={TODAY} defaultValue={{ start: d(10, 26), end: d(10, 30) }} />,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no axe violations in the month grid", async () => {
      const user = userEvent.setup();
      const { container } = render(<Calendar today={TODAY} />);
      await user.click(toggle());
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });

  describe("keyboard (APG date grid)", () => {
    it("moves by day with Left and Right, by week with Up and Down", async () => {
      const user = userEvent.setup();
      render(<Calendar today={TODAY} />);
      day("2026-10-22").focus();
      await user.keyboard("{ArrowRight}");
      expect(focusedIso()).toBe("2026-10-23");
      await user.keyboard("{ArrowLeft}{ArrowLeft}");
      expect(focusedIso()).toBe("2026-10-21");
      await user.keyboard("{ArrowDown}");
      expect(focusedIso()).toBe("2026-10-28");
      await user.keyboard("{ArrowUp}{ArrowUp}");
      expect(focusedIso()).toBe("2026-10-14");
      expect(tabStops()).toHaveLength(1);
    });

    it("moves to the ends of the week with Home and End, following the week start", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<Calendar today={TODAY} />);
      day("2026-10-22").focus();
      await user.keyboard("{Home}");
      expect(focusedIso()).toBe("2026-10-18"); // Sunday
      await user.keyboard("{End}");
      expect(focusedIso()).toBe("2026-10-24"); // Saturday
      unmount();
      render(<Calendar today={TODAY} weekStartsOn={1} />);
      day("2026-10-22").focus();
      await user.keyboard("{Home}");
      expect(focusedIso()).toBe("2026-10-19"); // Monday
      await user.keyboard("{End}");
      expect(focusedIso()).toBe("2026-10-25"); // Sunday
    });

    it("swaps Left and Right in a right-to-left context, keeping Up and Down by week", async () => {
      const user = userEvent.setup();
      render(
        <div dir="rtl">
          <Calendar today={TODAY} />
        </div>,
      );
      day("2026-10-22").focus();
      await user.keyboard("{ArrowRight}");
      expect(focusedIso()).toBe("2026-10-21");
      await user.keyboard("{ArrowLeft}{ArrowLeft}");
      expect(focusedIso()).toBe("2026-10-23");
      await user.keyboard("{ArrowDown}");
      expect(focusedIso()).toBe("2026-10-30");
      await user.keyboard("{ArrowUp}");
      expect(focusedIso()).toBe("2026-10-23");
      expect(tabStops()).toHaveLength(1);
    });

    it("has no axe violations in RTL and names the month buttons by their labels alone", async () => {
      const { container } = render(
        <div dir="rtl">
          <Calendar today={TODAY} />
        </div>,
      );
      const prev = screen.getByRole("button", { name: "Previous month" });
      const next = screen.getByRole("button", { name: "Next month" });
      expect(prev).toHaveAccessibleName("Previous month");
      expect(next).toHaveAccessibleName("Next month");
      for (const button of [prev, next]) {
        expect(must(button.querySelector(".ol-cal__arrow"))).toHaveAttribute("aria-hidden", "true");
      }
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("reads the direction at key time, so a later dir change is followed", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div dir="ltr">
          <Calendar today={TODAY} />
        </div>,
      );
      day("2026-10-22").focus();
      await user.keyboard("{ArrowRight}");
      expect(focusedIso()).toBe("2026-10-23");
      must(container.firstElementChild).setAttribute("dir", "rtl");
      await user.keyboard("{ArrowRight}");
      expect(focusedIso()).toBe("2026-10-22");
    });

    it("keeps Home and End on the first and last day of the week in RTL", async () => {
      const user = userEvent.setup();
      render(
        <div dir="rtl">
          <Calendar today={TODAY} weekStartsOn={6} />
        </div>,
      );
      day("2026-10-22").focus();
      await user.keyboard("{Home}");
      expect(focusedIso()).toBe("2026-10-17"); // Saturday
      await user.keyboard("{End}");
      expect(focusedIso()).toBe("2026-10-23"); // Friday
    });

    it("moves across a month boundary with the swapped arrows in RTL", async () => {
      const user = userEvent.setup();
      render(
        <div dir="rtl">
          <Calendar today={TODAY} defaultValue={d(10, 31)} />
        </div>,
      );
      day("2026-10-31").focus();
      await user.keyboard("{ArrowLeft}");
      expect(focusedIso()).toBe("2026-11-01");
      expect(title()).toBe("November 2026");
    });

    it("changes month with Page Up and Page Down, and year with Shift", async () => {
      const user = userEvent.setup();
      render(<Calendar today={TODAY} />);
      day("2026-10-22").focus();
      await user.keyboard("{PageDown}");
      expect(focusedIso()).toBe("2026-11-22");
      expect(title()).toBe("November 2026");
      await user.keyboard("{PageUp}{PageUp}");
      expect(focusedIso()).toBe("2026-09-22");
      await user.keyboard("{Shift>}{PageDown}{/Shift}");
      expect(focusedIso()).toBe("2027-09-22");
      expect(title()).toBe("September 2027");
      await user.keyboard("{Shift>}{PageUp}{/Shift}");
      expect(focusedIso()).toBe("2026-09-22");
    });

    it("clamps the day when the next month is shorter", async () => {
      const user = userEvent.setup();
      render(<Calendar today={TODAY} defaultValue={d(1, 31)} />);
      day("2026-01-31").focus();
      await user.keyboard("{PageDown}");
      expect(focusedIso()).toBe("2026-02-28");
    });

    it("crosses into the next month with the arrows", async () => {
      const user = userEvent.setup();
      render(<Calendar today={TODAY} defaultValue={d(10, 31)} />);
      day("2026-10-31").focus();
      await user.keyboard("{ArrowRight}");
      expect(focusedIso()).toBe("2026-11-01");
      expect(title()).toBe("November 2026");
    });

    it("selects with Enter and Space", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Calendar today={TODAY} onChange={onChange} />);
      day("2026-10-22").focus();
      await user.keyboard("{Enter}");
      expect(onChange).toHaveBeenLastCalledWith(d(10, 22));
      await user.keyboard("{ArrowRight}[Space]");
      expect(onChange).toHaveBeenLastCalledWith(d(10, 23));
      const cell = must(day("2026-10-23").closest("td"));
      expect(cell).toHaveAttribute("aria-selected", "true");
      expect(day("2026-10-23")).toHaveAccessibleName("Friday, October 23, 2026, selected");
    });

    it("leaves modified keys to the browser", () => {
      render(<Calendar today={TODAY} />);
      day("2026-10-22").focus();
      fireEvent.keyDown(day("2026-10-22"), { key: "ArrowRight", ctrlKey: true });
      fireEvent.keyDown(day("2026-10-22"), { key: "x" });
      expect(focusedIso()).toBe("2026-10-22");
    });
  });

  describe("single selection", () => {
    it("is uncontrolled with defaultValue", async () => {
      const user = userEvent.setup();
      render(<Calendar today={TODAY} defaultValue={d(10, 5)} />);
      expect(day("2026-10-05")).toHaveAttribute("data-selected");
      await user.click(day("2026-10-09"));
      expect(day("2026-10-09")).toHaveAttribute("data-selected");
      expect(day("2026-10-05")).not.toHaveAttribute("data-selected");
      expect(must(day("2026-10-05").closest("td"))).toHaveAttribute("aria-selected", "false");
    });

    it("is controlled with value", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Calendar today={TODAY} value={d(10, 5)} onChange={onChange} />);
      await user.click(day("2026-10-09"));
      expect(onChange).toHaveBeenCalledWith(d(10, 9));
      expect(day("2026-10-05")).toHaveAttribute("data-selected");
      expect(day("2026-10-09")).not.toHaveAttribute("data-selected");
    });

    it("follows a value set from outside to its month", () => {
      const { rerender } = render(<Calendar today={TODAY} value={d(10, 5)} />);
      rerender(<Calendar today={TODAY} value={d(3, 14, 2027)} />);
      expect(title()).toBe("March 2027");
      expect(day("2027-03-14")).toHaveAttribute("tabindex", "0");
    });
  });

  describe("range selection", () => {
    function Controlled({ onChange }: { onChange?: (r: DateRange) => void }) {
      const [value, setValue] = useState<DateRange | null>(null);
      return (
        <Calendar
          range
          today={TODAY}
          value={value}
          onChange={(r) => {
            setValue(r);
            onChange?.(r);
          }}
        />
      );
    }

    it("sets the start, then the end, and draws the band", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled onChange={onChange} />);
      await user.click(day("2026-10-26"));
      expect(onChange).toHaveBeenLastCalledWith({ start: d(10, 26), end: null });
      await user.click(day("2026-10-30"));
      expect(onChange).toHaveBeenLastCalledWith({ start: d(10, 26), end: d(10, 30) });
      expect(day("2026-10-26")).toHaveAttribute("data-selected");
      expect(day("2026-10-30")).toHaveAttribute("data-selected");
      expect(must(day("2026-10-26").closest("td"))).toHaveAttribute("data-range-start");
      expect(must(day("2026-10-30").closest("td"))).toHaveAttribute("data-range-end");
      for (const iso of ["2026-10-27", "2026-10-28", "2026-10-29"]) {
        const cell = must(day(iso).closest("td"));
        expect(cell).toHaveAttribute("data-in-range");
        expect(cell).toHaveAttribute("aria-selected", "true");
        expect(day(iso)).not.toHaveAttribute("data-selected");
      }
      expect(day("2026-10-28")).toHaveAccessibleName("Wednesday, October 28, 2026, selected");
    });

    it("restarts when the second press is before the start, or after a full range", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled onChange={onChange} />);
      await user.click(day("2026-10-20"));
      await user.click(day("2026-10-10"));
      expect(onChange).toHaveBeenLastCalledWith({ start: d(10, 10), end: null });
      await user.click(day("2026-10-12"));
      await user.click(day("2026-10-15"));
      expect(onChange).toHaveBeenLastCalledWith({ start: d(10, 15), end: null });
    });

    it("previews the band on hover and focus while only the start is set", async () => {
      const user = userEvent.setup();
      render(<Calendar range today={TODAY} defaultValue={{ start: d(10, 26), end: null }} />);
      await user.hover(day("2026-10-29"));
      expect(must(day("2026-10-27").closest("td"))).toHaveAttribute("data-in-range");
      expect(must(day("2026-10-29").closest("td"))).toHaveAttribute("data-preview");
      // A preview is not a selection.
      expect(must(day("2026-10-27").closest("td"))).toHaveAttribute("aria-selected", "false");
      await user.unhover(grid());
      expect(must(day("2026-10-27").closest("td"))).not.toHaveAttribute("data-in-range");
      day("2026-10-26").focus();
      await user.keyboard("{ArrowRight}{ArrowRight}");
      expect(must(day("2026-10-27").closest("td"))).toHaveAttribute("data-in-range");
      await user.tab();
      expect(must(day("2026-10-27").closest("td"))).not.toHaveAttribute("data-in-range");
    });

    it("ignores a preview before the start", async () => {
      const user = userEvent.setup();
      render(<Calendar range today={TODAY} defaultValue={{ start: d(10, 26), end: null }} />);
      await user.hover(day("2026-10-20"));
      expect(document.querySelectorAll("td[data-in-range]")).toHaveLength(0);
    });
  });

  describe("bounds and unavailable days", () => {
    it("disables days outside min and max", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Calendar today={TODAY} min={d(10, 10)} max={d(10, 25)} onChange={onChange} />);
      expect(day("2026-10-09")).toHaveAttribute("aria-disabled", "true");
      expect(day("2026-10-26")).toHaveAttribute("aria-disabled", "true");
      expect(day("2026-10-10")).not.toHaveAttribute("aria-disabled");
      expect(day("2026-10-09")).toHaveAccessibleName("Friday, October 9, 2026, unavailable");
      await user.click(day("2026-10-09"));
      expect(onChange).not.toHaveBeenCalled();
    });

    it("keeps keyboard focus within min and max", async () => {
      const user = userEvent.setup();
      render(<Calendar today={TODAY} min={d(10, 10)} max={d(11, 5)} />);
      day("2026-10-22").focus();
      await user.keyboard("{PageUp}");
      expect(focusedIso()).toBe("2026-10-10");
      await user.keyboard("{Shift>}{PageDown}{/Shift}");
      expect(focusedIso()).toBe("2026-11-05");
      await user.keyboard("{ArrowRight}");
      expect(focusedIso()).toBe("2026-11-05");
    });

    it("starts focus inside the bounds", () => {
      render(<Calendar today={TODAY} min={d(12, 3)} />);
      expect(title()).toBe("December 2026");
      expect(day("2026-12-03")).toHaveAttribute("tabindex", "0");
    });

    it("disables the month buttons at the bounds and moves focus to the grid", async () => {
      const user = userEvent.setup();
      render(<Calendar today={TODAY} min={d(9, 15)} max={d(11, 20)} />);
      const prev = screen.getByRole("button", { name: "Previous month" });
      const next = screen.getByRole("button", { name: "Next month" });
      expect(prev).toBeEnabled();
      await user.click(prev);
      expect(title()).toBe("September 2026");
      expect(prev).toBeDisabled();
      expect(focusedIso()).toBe("2026-09-22");
      await user.click(next);
      await user.click(next);
      expect(title()).toBe("November 2026");
      expect(next).toBeDisabled();
      expect(focusedIso()).toBe("2026-11-20");
    });

    it("keeps unavailable days focusable but not selectable", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Calendar today={TODAY} isDateUnavailable={(x) => x.getDay() === 0} onChange={onChange} />,
      );
      const sunday = day("2026-10-25");
      expect(sunday).toHaveAttribute("aria-disabled", "true");
      // Neighbouring months are crossed out too, without being focusable.
      expect(document.querySelector(".ol-cal__day[data-outside][data-unavailable]")).not.toBeNull();
      day("2026-10-24").focus();
      await user.keyboard("{ArrowRight}");
      expect(focusedIso()).toBe("2026-10-25");
      await user.keyboard("{Enter}");
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("month buttons and the month grid", () => {
    it("steps one month with the buttons and keeps focus on them", async () => {
      const user = userEvent.setup();
      render(<Calendar today={TODAY} />);
      const next = screen.getByRole("button", { name: "Next month" });
      await user.click(next);
      expect(title()).toBe("November 2026");
      expect(next).toHaveFocus();
      await user.click(screen.getByRole("button", { name: "Previous month" }));
      await user.click(screen.getByRole("button", { name: "Previous month" }));
      expect(title()).toBe("September 2026");
    });

    it("opens a twelve-month grid from the title, focused on the shown month", async () => {
      const user = userEvent.setup();
      render(<Calendar today={TODAY} />);
      expect(toggle()).toHaveAccessibleName("October 2026");
      expect(toggle()).toHaveAccessibleDescription("Choose month");
      expect(toggle()).toHaveAttribute("aria-expanded", "false");
      expect(toggle()).not.toHaveAttribute("aria-controls");
      await user.click(toggle());
      expect(toggle()).toHaveAttribute("aria-expanded", "true");
      expect(screen.queryByRole("grid")).toBeNull();
      const list = screen.getByRole("listbox", { name: "Choose month" });
      expect(toggle()).toHaveAttribute("aria-controls", list.id);
      const options = within(list).getAllByRole("option");
      expect(options).toHaveLength(12);
      expect(options[9]).toHaveFocus();
      // Nothing is picked yet, so no month is selected; this month is marked current.
      expect(options[9]).toHaveAttribute("aria-selected", "false");
      expect(options[9]).toHaveAttribute("aria-current", "date");
      expect(options[8]).not.toHaveAttribute("aria-current");
      expect(options[9]).toHaveAccessibleName("Oct 2026");
      expect(screen.getByRole("button", { name: "Previous year" })).toBeInTheDocument();
    });

    it("selects the month of the value, while the tab stop stays on the shown month", async () => {
      const user = userEvent.setup();
      render(
        <Calendar
          range
          today={TODAY}
          defaultValue={{ start: d(8, 30), end: d(9, 2) }}
          defaultFocusedDate={d(10, 1)}
        />,
      );
      await user.click(toggle());
      const august = screen.getByRole("option", { name: "Aug 2026" });
      expect(august).toHaveAttribute("aria-selected", "true");
      expect(august).toHaveAttribute("tabindex", "-1");
      expect(screen.getByRole("option", { name: "Sep 2026" })).toHaveAttribute(
        "aria-selected",
        "false",
      );
      expect(screen.getByRole("option", { name: "Oct 2026" })).toHaveFocus();
      await user.click(screen.getByRole("button", { name: "Next year" }));
      expect(screen.getByRole("option", { name: "Aug 2027" })).toHaveAttribute(
        "aria-selected",
        "false",
      );
    });

    it("ignores Enter on a month outside the bounds", async () => {
      const user = userEvent.setup();
      render(<Calendar today={TODAY} min={d(3, 10)} />);
      await user.click(toggle());
      await user.keyboard("{Home}");
      const january = screen.getByRole("option", { name: "Jan 2026" });
      expect(january).toHaveFocus();
      expect(january).toHaveAttribute("aria-disabled", "true");
      await user.keyboard("{Enter}");
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(january).toHaveFocus();
    });

    it("moves through months with the arrows and picks one", async () => {
      const user = userEvent.setup();
      render(<Calendar today={TODAY} />);
      await user.click(toggle());
      await user.keyboard("{ArrowUp}");
      expect(screen.getByRole("option", { name: "Jul 2026" })).toHaveFocus();
      await user.keyboard("{ArrowLeft}");
      expect(screen.getByRole("option", { name: "Jun 2026" })).toHaveFocus();
      await user.keyboard("{ArrowDown}{ArrowRight}");
      expect(screen.getByRole("option", { name: "Oct 2026" })).toHaveFocus();
      await user.keyboard("{End}");
      expect(screen.getByRole("option", { name: "Dec 2026" })).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(screen.getByRole("option", { name: "Dec 2026" })).toHaveFocus();
      await user.keyboard("{Home}");
      expect(screen.getByRole("option", { name: "Jan 2026" })).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(title()).toBe("January 2026");
      expect(focusedIso()).toBe("2026-01-22");
    });

    it("swaps Left and Right in the month grid in RTL", async () => {
      const user = userEvent.setup();
      render(
        <div dir="rtl">
          <Calendar today={TODAY} />
        </div>,
      );
      await user.click(toggle());
      expect(screen.getByRole("option", { name: "Oct 2026" })).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(screen.getByRole("option", { name: "Sep 2026" })).toHaveFocus();
      await user.keyboard("{ArrowLeft}{ArrowLeft}");
      expect(screen.getByRole("option", { name: "Nov 2026" })).toHaveFocus();
      await user.keyboard("{ArrowUp}");
      expect(screen.getByRole("option", { name: "Aug 2026" })).toHaveFocus();
    });

    it("steps by year in the month grid", async () => {
      const user = userEvent.setup();
      render(<Calendar today={TODAY} />);
      await user.click(toggle());
      await user.click(screen.getByRole("button", { name: "Next year" }));
      expect(title()).toBe("October 2027");
      await user.click(screen.getByRole("option", { name: "Mar 2027" }));
      expect(title()).toBe("March 2027");
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });

    it("closes the month grid with Escape, or with the title", async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn();
      render(
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div onKeyDown={onKeyDown}>
          <Calendar today={TODAY} />
        </div>,
      );
      await user.click(toggle());
      await user.keyboard("{Escape}");
      expect(screen.getByRole("grid")).toBeInTheDocument();
      expect(focusedIso()).toBe("2026-10-22");
      expect(onKeyDown).not.toHaveBeenCalledWith(expect.objectContaining({ key: "Escape" }));
      await user.click(toggle());
      await user.click(toggle());
      expect(screen.getByRole("grid")).toBeInTheDocument();
      expect(toggle()).toHaveFocus();
    });

    it("disables months outside the bounds and the year buttons at them", async () => {
      const user = userEvent.setup();
      const onFocusedDateChange = vi.fn();
      render(
        <Calendar
          today={TODAY}
          min={d(3, 10)}
          max={d(8, 20, 2027)}
          onFocusedDateChange={onFocusedDateChange}
        />,
      );
      await user.click(toggle());
      expect(screen.getByRole("option", { name: "Feb 2026" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      expect(screen.getByRole("option", { name: "Mar 2026" })).not.toHaveAttribute("aria-disabled");
      expect(screen.getByRole("button", { name: "Previous year" })).toBeDisabled();
      await user.click(screen.getByRole("option", { name: "Feb 2026" }));
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Next year" }));
      expect(screen.getByRole("button", { name: "Next year" })).toBeDisabled();
      expect(onFocusedDateChange).toHaveBeenLastCalledWith(d(8, 20, 2027));
      expect(screen.getByRole("option", { name: "Aug 2027" })).toHaveFocus();
      expect(screen.getByRole("option", { name: "Sep 2027" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });
  });

  describe("focus handles", () => {
    it("focuses the selected day on mount with autoFocus", () => {
      // eslint-disable-next-line jsx-a11y/no-autofocus -- a picker moves focus into the grid on open
      render(<Calendar today={TODAY} defaultValue={d(10, 3)} autoFocus />);
      expect(focusedIso()).toBe("2026-10-03");
    });

    it("focuses the range start on mount with autoFocus", () => {
      render(
        <Calendar
          range
          today={TODAY}
          defaultValue={{ start: d(11, 2), end: d(11, 6) }}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- a picker moves focus into the grid on open
          autoFocus
        />,
      );
      expect(focusedIso()).toBe("2026-11-02");
    });

    it("moves focus into the grid through handleRef, from either view", async () => {
      const user = userEvent.setup();
      const handle = createRef<CalendarHandle>();
      render(<Calendar today={TODAY} handleRef={handle} />);
      act(() => {
        must(handle.current).focus();
      });
      expect(focusedIso()).toBe("2026-10-22");
      await user.click(toggle());
      act(() => {
        must(handle.current).focus();
      });
      expect(screen.getByRole("grid")).toBeInTheDocument();
      expect(focusedIso()).toBe("2026-10-22");
    });

    it("takes a controlled focusedDate and reports changes", async () => {
      const user = userEvent.setup();
      const onFocusedDateChange = vi.fn();
      const { rerender } = render(
        <Calendar
          today={TODAY}
          focusedDate={d(5, 9, 2027)}
          onFocusedDateChange={onFocusedDateChange}
        />,
      );
      expect(title()).toBe("May 2027");
      await user.click(screen.getByRole("button", { name: "Next month" }));
      expect(onFocusedDateChange).toHaveBeenCalledWith(d(6, 9, 2027));
      expect(title()).toBe("May 2027");
      rerender(<Calendar today={TODAY} focusedDate={d(6, 9, 2027)} />);
      expect(title()).toBe("June 2027");
    });

    it("starts on defaultFocusedDate", () => {
      render(<Calendar today={TODAY} defaultFocusedDate={d(2, 14, 2027)} />);
      expect(title()).toBe("February 2027");
    });
  });

  describe("locale", () => {
    it("follows the nearest Root: strings, names and week start", () => {
      render(
        <Root locale="es">
          <Calendar today={TODAY} />
        </Root>,
      );
      expect(title()).toBe("octubre de 2026");
      const headers = within(grid()).getAllByRole("columnheader");
      expect(headers[0]).toHaveAttribute("abbr", "lunes");
      expect(day("2026-10-22")).toHaveAccessibleName("jueves, 22 de octubre de 2026, hoy");
      expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeInTheDocument();
      expect(toggle()).toHaveAccessibleName("octubre 2026");
      expect(toggle()).toHaveAccessibleDescription("Elegir mes");
    });

    it("takes a locale prop over the Root's", () => {
      render(
        <Root locale="en">
          <Calendar today={TODAY} locale="ja" />
        </Root>,
      );
      expect(title()).toBe("2026年10月");
      expect(document.querySelector(".ol-cal")).toHaveAttribute("lang", "ja-JP");
      expect(document.querySelector(".ol-cal__month")).toHaveTextContent("10月");
      expect(screen.getByRole("button", { name: "次の月" })).toBeInTheDocument();
      expect(day("2026-10-22")).toHaveAccessibleName("2026年10月22日木曜日、今日");
    });

    it("joins the day marks in the locale's way", () => {
      const { unmount } = render(
        <Calendar
          today={TODAY}
          locale="es"
          value={d(10, 22)}
          isDateUnavailable={(x) => x.getDate() === 22}
        />,
      );
      expect(day("2026-10-22")).toHaveAccessibleName(
        "jueves, 22 de octubre de 2026, hoy, seleccionado, no disponible",
      );
      unmount();
      render(
        <Calendar
          today={TODAY}
          locale="ja"
          value={d(10, 22)}
          isDateUnavailable={(x) => x.getDate() === 22}
        />,
      );
      expect(day("2026-10-22")).toHaveAccessibleName(
        "2026年10月22日木曜日、今日、選択済み、選択不可",
      );
    });

    it("shows the Japanese era year under the month only in Japanese", () => {
      const { unmount } = render(<Calendar today={TODAY} locale="ja" />);
      const era = must(document.querySelector(".ol-cal__era"));
      expect(era).toHaveTextContent("令和8年");
      expect(era).toHaveAttribute("lang", "ja");
      expect(toggle()).toHaveAccessibleName("10月 2026 令和8年");
      unmount();
      render(<Calendar today={TODAY} locale="en" />);
      expect(document.querySelector(".ol-cal__era")).toBeNull();
    });

    it("accepts a regional tag and an explicit week start", () => {
      const { unmount } = render(<Calendar today={TODAY} locale="es-MX" />);
      // CLDR: Mexico starts the week on Sunday.
      expect(within(grid()).getAllByRole("columnheader")[0]).toHaveAttribute("abbr", "domingo");
      unmount();
      render(<Calendar today={TODAY} locale="en" weekStartsOn={6} />);
      expect(within(grid()).getAllByRole("columnheader")[0]).toHaveAttribute("abbr", "Saturday");
    });

    it("keeps the Root's label overrides when the locale prop matches it", () => {
      render(
        <Root locale="en" labels={{ nextMonth: "Forward" }}>
          <Calendar today={TODAY} locale="en" />
        </Root>,
      );
      expect(screen.getByRole("button", { name: "Forward" })).toBeInTheDocument();
    });
  });

  describe("motion (mokuhanga)", () => {
    it("prints a new month in the direction of travel", async () => {
      const user = userEvent.setup();
      render(<Calendar today={TODAY} />);
      const body = () => must(document.querySelector(".ol-cal__body"));
      expect(body()).not.toHaveAttribute("data-dir");
      await user.click(screen.getByRole("button", { name: "Next month" }));
      expect(body()).toHaveAttribute("data-dir", "1");
      await user.click(screen.getByRole("button", { name: "Previous month" }));
      expect(body()).toHaveAttribute("data-dir", "-1");
    });

    it("is instant inside .ol-reduce-motion", async () => {
      const user = userEvent.setup();
      render(
        <div className={REDUCE_MOTION_CLASS}>
          <Calendar today={TODAY} />
        </div>,
      );
      await user.click(screen.getByRole("button", { name: "Next month" }));
      expect(title()).toBe("November 2026");
      expect(document.querySelector(".ol-cal__body")).not.toHaveAttribute("data-dir");
    });

    it("is instant with prefers-reduced-motion", async () => {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      });
      try {
        const user = userEvent.setup();
        render(<Calendar today={TODAY} />);
        await user.click(screen.getByRole("button", { name: "Next month" }));
        expect(document.querySelector(".ol-cal__body")).not.toHaveAttribute("data-dir");
      } finally {
        Reflect.deleteProperty(window, "matchMedia");
      }
    });
  });

  it("defaults today to the current date", () => {
    render(<Calendar />);
    expect(day(toIsoDate(new Date()))).toHaveAttribute("aria-current", "date");
  });
});
