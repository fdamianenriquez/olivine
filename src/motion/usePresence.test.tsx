import { act, fireEvent, render, screen } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../test/axe";
import { type PresenceOptions, usePresence } from "./usePresence";

function Panel({
  open,
  attach = true,
  ...options
}: { open: boolean; attach?: boolean } & PresenceOptions) {
  const presence = usePresence<HTMLDivElement>(open, options);
  if (!presence.mounted) return null;
  return (
    <div
      ref={attach ? presence.setElement : undefined}
      data-testid="panel"
      data-state={presence.state}
    >
      <button type="button">Inside</button>
    </div>
  );
}

const flush = () => act(() => Promise.resolve());

/** A finished-able animation as getAnimations() returns it. */
function animation(endTime: number) {
  let resolve: () => void = () => undefined;
  const finished = new Promise<void>((done) => {
    resolve = done;
  });
  return {
    value: { effect: { getComputedTiming: () => ({ endTime }) }, finished } as unknown as Animation,
    resolve,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("usePresence", () => {
  it("mounts open and unmounts when closed with nothing animating", async () => {
    const { rerender } = render(<Panel open={false} />);
    expect(screen.queryByTestId("panel")).toBeNull();

    rerender(<Panel open />);
    expect(screen.getByTestId("panel")).toHaveAttribute("data-state", "open");

    const getAnimations = vi.fn((): Animation[] => []);
    Object.defineProperty(screen.getByTestId("panel"), "getAnimations", { value: getAnimations });
    rerender(<Panel open={false} />);
    expect(screen.getByTestId("panel")).toHaveAttribute("data-state", "closing");
    await flush();
    expect(getAnimations).toHaveBeenCalledWith({ subtree: true });
    expect(screen.queryByTestId("panel")).toBeNull();
  });

  it("stays mounted and inert until every finite animation has finished", async () => {
    const onExited = vi.fn();
    const { rerender } = render(<Panel open onExited={onExited} />);
    const panel = screen.getByTestId("panel");
    const exit = animation(300);
    const loop = animation(Number.POSITIVE_INFINITY);
    Object.defineProperty(panel, "getAnimations", { value: () => [exit.value, loop.value] });

    rerender(<Panel open={false} onExited={onExited} />);
    await flush();
    expect(panel).toHaveAttribute("inert");
    expect(screen.getByTestId("panel")).toBe(panel);
    expect(onExited).not.toHaveBeenCalled();

    exit.resolve();
    await flush();
    expect(screen.queryByTestId("panel")).toBeNull();
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it("falls back to animationend on the element when getAnimations is missing", async () => {
    const { rerender } = render(<Panel open />);
    rerender(<Panel open={false} />);
    const panel = screen.getByTestId("panel");
    expect(panel).toHaveAttribute("inert");

    // An animation that ends on a child does not count.
    fireEvent.animationEnd(screen.getByRole("button", { hidden: true }));
    expect(screen.getByTestId("panel")).toBe(panel);

    fireEvent.animationEnd(panel);
    await flush();
    expect(screen.queryByTestId("panel")).toBeNull();
  });

  it("also accepts transitionend", async () => {
    const { rerender } = render(<Panel open />);
    rerender(<Panel open={false} />);
    fireEvent.transitionEnd(screen.getByTestId("panel"));
    await flush();
    expect(screen.queryByTestId("panel")).toBeNull();
  });

  it("unmounts after the timeout when the exit never reports an end", () => {
    vi.useFakeTimers();
    const { rerender } = render(<Panel open timeout={400} />);
    rerender(<Panel open={false} timeout={400} />);
    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(screen.getByTestId("panel")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId("panel")).toBeNull();
  });

  it("derives the default timeout from --dur-xl, or 1000ms without it", () => {
    vi.useFakeTimers();
    const { rerender } = render(<Panel open />);
    rerender(<Panel open={false} />);
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(screen.getByTestId("panel")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId("panel")).toBeNull();

    rerender(<Panel open />);
    screen.getByTestId("panel").style.setProperty("--dur-xl", "650ms");
    rerender(<Panel open={false} />);
    act(() => {
      vi.advanceTimersByTime(1299);
    });
    expect(screen.getByTestId("panel")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId("panel")).toBeNull();
  });

  it("reopens while closing and lifts inert", () => {
    const { rerender } = render(<Panel open />);
    rerender(<Panel open={false} />);
    const panel = screen.getByTestId("panel");
    expect(panel).toHaveAttribute("inert");

    rerender(<Panel open />);
    expect(panel).toHaveAttribute("data-state", "open");
    expect(panel).not.toHaveAttribute("inert");
  });

  it("moves focus to returnFocus before going inert", () => {
    function WithTrigger({ open, fn }: { open: boolean; fn?: () => void }) {
      const trigger = document.getElementById("trigger");
      return (
        <>
          <button id="trigger" type="button">
            Trigger
          </button>
          <Panel open={open} returnFocus={fn ?? trigger} />
        </>
      );
    }
    const { rerender } = render(<WithTrigger open />);
    rerender(<WithTrigger open />);
    screen.getByRole("button", { name: "Inside" }).focus();
    rerender(<WithTrigger open={false} />);
    expect(screen.getByTestId("panel")).toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Trigger" })).toHaveFocus();

    const fn = vi.fn(() => {
      screen.getByRole("button", { name: "Trigger" }).focus();
    });
    rerender(<WithTrigger open fn={fn} />);
    screen.getByRole("button", { name: "Inside" }).focus();
    rerender(<WithTrigger open={false} fn={fn} />);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Trigger" })).toHaveFocus();
  });

  it("falls back to the opener when returnFocus cannot take focus, and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const opener = document.createElement("button");
    opener.textContent = "Opener";
    document.body.append(opener);
    const removed = document.createElement("button");
    opener.focus();
    const { rerender } = render(<Panel open={false} returnFocus={removed} />);
    rerender(<Panel open returnFocus={removed} />);
    screen.getByRole("button", { name: "Inside" }).focus();
    rerender(<Panel open={false} returnFocus={removed} />);
    expect(screen.getByTestId("panel")).toHaveAttribute("inert");
    expect(opener).toHaveFocus();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("returnFocus"));
    opener.remove();
  });

  it("leaves focus alone when it is outside the closing element", () => {
    const outside = document.createElement("button");
    document.body.append(outside);
    const fn = vi.fn();
    const { rerender } = render(<Panel open returnFocus={fn} />);
    outside.focus();
    rerender(<Panel open={false} returnFocus={fn} />);
    expect(fn).not.toHaveBeenCalled();
    expect(outside).toHaveFocus();
    outside.remove();
  });

  it("is inert in the same commit that starts closing (layout effect)", () => {
    const seen: (string | null)[] = [];
    // Layout effects of a later sibling run after the panel's, before any passive effect.
    function Witness({ open }: { open: boolean }) {
      useLayoutEffect(() => {
        if (!open)
          seen.push(document.querySelector("[data-testid=panel]")?.getAttribute("inert") ?? "none");
      }, [open]);
      return null;
    }
    const { rerender } = render(
      <>
        <Panel open />
        <Witness open />
      </>,
    );
    rerender(
      <>
        <Panel open={false} />
        <Witness open={false} />
      </>,
    );
    expect(seen).toEqual([""]);
  });

  it("has no axe violations while closing", async () => {
    const { container, rerender } = render(
      <main>
        <Panel open />
      </main>,
    );
    rerender(
      <main>
        <Panel open={false} />
      </main>,
    );
    expect(screen.getByTestId("panel")).toHaveAttribute("data-state", "closing");
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("closes at once when no element is attached", async () => {
    const { rerender } = render(<Panel open attach={false} />);
    rerender(<Panel open={false} attach={false} />);
    await flush();
    expect(screen.queryByTestId("panel")).toBeNull();
  });

  it("does not finish twice when the timeout and the animation both report", async () => {
    vi.useFakeTimers();
    const onExited = vi.fn();
    const { rerender } = render(<Panel open timeout={10} onExited={onExited} />);
    const exit = animation(300);
    Object.defineProperty(screen.getByTestId("panel"), "getAnimations", {
      value: () => [exit.value],
    });
    rerender(<Panel open={false} timeout={10} onExited={onExited} />);
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(screen.queryByTestId("panel")).toBeNull();
    exit.resolve();
    await flush();
    expect(onExited).toHaveBeenCalledTimes(1);
  });
});
