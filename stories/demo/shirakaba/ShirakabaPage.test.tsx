import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { runAxe } from "../../../src/test/axe";
import { ShirakabaPage } from "./ShirakabaPage";

describe("ShirakabaPage", () => {
  it("renders the demo banner, the legal footer note and one drawing per model", () => {
    render(<ShirakabaPage />);
    expect(screen.getByText("Demonstration site")).toBeInTheDocument();
    expect(screen.getByText(/No personal data is collected/)).toBeInTheDocument();
    // Three model cards, the configurator preview and its headstock crop, and the bench drawing.
    expect(screen.getAllByRole("img", { name: /pickups$/ }).length).toBeGreaterThanOrEqual(5);
  });

  it("has no axe violations", async () => {
    const { container } = render(<ShirakabaPage />);
    const results = await runAxe(container);
    expect(results.violations).toEqual([]);
    // axe walks the whole page, which can pass the 5 s default on a busy CI runner.
  }, 30_000);

  it("updates the total and the drawing when an option changes", () => {
    render(<ShirakabaPage />);
    const preview = screen.getByRole("complementary", { name: "Preview" });
    expect(within(preview).getByText("¥503,800")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Body/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Mahogany/ }));
    // Mahogany adds 45,000 before tax: 503,800 + 49,500.
    expect(within(preview).getByText("¥553,300")).toBeInTheDocument();
    expect(within(preview).getAllByRole("img")[0]).toHaveAccessibleName(/over mahogany/);
  });

  it("validates the order form after a submit attempt and records the reservation in memory", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<ShirakabaPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Order/ }));
    expect(screen.queryByText("Enter your name.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Reserve my guitar/ }));
    expect(screen.getByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText(/Enter a full address/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.change(screen.getByRole("textbox", { name: /Name/ }), { target: { value: "Hana" } });
    fireEvent.change(screen.getByRole("textbox", { name: /Email/ }), {
      target: { value: "hana@mail.jp" },
    });
    fireEvent.click(screen.getByLabelText(/I understand this is a demo/));
    fireEvent.click(screen.getByRole("button", { name: /Reserve my guitar/ }));
    const dialog = screen.getByRole("dialog", { name: "Reserve this guitar?" });
    fireEvent.click(within(dialog).getByRole("button", { name: /Yes, reserve/ }));

    expect(await screen.findByText("Reservation recorded")).toBeInTheDocument();
    expect(screen.getByText(/SG-2026-0142 · Norikura/)).toBeInTheDocument();
    // Nothing leaves the page and nothing is persisted.
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000);
    });
    vi.useRealTimers();
    fetchSpy.mockRestore();
  }, 30_000);
});
