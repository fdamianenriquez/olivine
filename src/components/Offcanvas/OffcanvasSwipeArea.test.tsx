import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SLOP } from "../../hooks/gesture";
import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Offcanvas } from "./Offcanvas";
import { SWIPE_OPEN_DISTANCE } from "./OffcanvasSwipeArea";

/** jsdom has no layout: the probe that reads the band's depth measures this. */
const BAND = 24;
/** The window is 1024 × 768 in jsdom. */
const W = window.innerWidth;
const H = window.innerHeight;

/** A point inside the band of each edge, and the inward direction there. */
const EDGE = {
  left: { x: 10, y: 400, dx: 1, dy: 0 },
  right: { x: W - 10, y: 400, dx: -1, dy: 0 },
  bottom: { x: 500, y: H - 10, dx: 0, dy: -1 },
} as const;

interface Options {
  pointerType?: string;
  steps?: number;
  stepMs?: number;
  holdMs?: number;
  target?: Element;
}

/**
 * A press at (x, y) that moves by (dx, dy) in `steps` moves `stepMs` apart, then lifts. Each move
 * is a pointermove and, for touch, a touchmove; returns whether each touchmove was let through.
 */
function swipe(
  x: number,
  y: number,
  dx: number,
  dy: number,
  {
    pointerType = "touch",
    steps = 4,
    stepMs = 50,
    holdMs = 0,
    target = document.body,
  }: Options = {},
) {
  const at = (i: number) => ({
    pointerId: 1,
    pointerType,
    clientX: x + (dx * i) / steps,
    clientY: y + (dy * i) / steps,
  });
  const allowed: boolean[] = [];
  fireEvent.pointerDown(target, { ...at(0), button: 0 });
  for (let i = 1; i <= steps; i += 1) {
    vi.advanceTimersByTime(stepMs);
    fireEvent.pointerMove(target, at(i));
    if (pointerType === "touch") {
      const { clientX, clientY } = at(i);
      allowed.push(fireEvent.touchMove(target, { touches: [{ clientX, clientY }] }));
    }
  }
  vi.advanceTimersByTime(holdMs);
  fireEvent.pointerUp(target, at(steps));
  return allowed;
}

describe("Offcanvas.SwipeArea", () => {
  stubNoAnimations();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ width: BAND, height: BAND }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.removeAttribute("dir");
  });

  it("is the SwipeArea part of Offcanvas and renders nothing", () => {
    const { container } = render(<Offcanvas.SwipeArea onOpen={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
    expect(document.body.children).toHaveLength(1);
  });

  it.each([
    ["end", "ltr", "right"],
    ["start", "ltr", "left"],
    ["end", "rtl", "left"],
    ["start", "rtl", "right"],
    ["bottom", "ltr", "bottom"],
    ["bottom", "rtl", "bottom"],
  ] as const)("opens %s (%s) on a swipe inward from the %s edge", (placement, dir, side) => {
    document.documentElement.setAttribute("dir", dir);
    const onOpen = vi.fn();
    render(<Offcanvas.SwipeArea placement={placement} onOpen={onOpen} />);
    const { x, y, dx, dy } = EDGE[side];
    // From the other edges: nothing.
    for (const other of Object.values(EDGE).filter((e) => e !== EDGE[side])) {
      act(() => {
        swipe(other.x, other.y, other.dx * 80, other.dy * 80);
      });
    }
    expect(onOpen).not.toHaveBeenCalled();
    let allowed: boolean[] = [];
    act(() => {
      allowed = swipe(x, y, dx * 80, dy * 80);
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
    // Claimed once past the slop: the page does not scroll under the swipe.
    expect(allowed).toEqual([false, false, false, false]);
  });

  it("ignores presses that start outside the band", () => {
    const onOpen = vi.fn();
    render(<Offcanvas.SwipeArea onOpen={onOpen} />);
    let allowed: boolean[] = [];
    act(() => {
      allowed = swipe(W - BAND - 2, 400, -120, 0);
    });
    expect(onOpen).not.toHaveBeenCalled();
    expect(allowed.every(Boolean)).toBe(true);
  });

  it("widens the band with depth", () => {
    const onOpen = vi.fn();
    render(<Offcanvas.SwipeArea onOpen={onOpen} depth="var(--space-12)" />);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ width: 48, height: 48 }),
    );
    act(() => {
      swipe(W - 40, 400, -80, 0);
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("opens as soon as the swipe passes the distance, once", () => {
    const onOpen = vi.fn();
    render(<Offcanvas.SwipeArea onOpen={onOpen} />);
    const move = (clientX: number) => {
      vi.advanceTimersByTime(200);
      fireEvent.pointerMove(document.body, { pointerId: 1, pointerType: "pen", clientX });
    };
    fireEvent.pointerDown(document.body, {
      pointerId: 1,
      pointerType: "pen",
      button: 0,
      clientX: W - 5,
    });
    move(W - 5 - SLOP - 4);
    expect(onOpen).not.toHaveBeenCalled();
    move(W - 5 - SWIPE_OPEN_DISTANCE);
    expect(onOpen).toHaveBeenCalledTimes(1);
    move(200);
    fireEvent.pointerUp(document.body, { pointerId: 1, pointerType: "pen", clientX: 200 });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("opens on the release of a short flick, not of a slow or stopped one", () => {
    const onOpen = vi.fn();
    render(<Offcanvas.SwipeArea onOpen={onOpen} />);
    act(() => {
      swipe(W - 5, 400, -30, 0, { steps: 3, stepMs: 200 });
    });
    act(() => {
      swipe(W - 5, 400, -30, 0, { steps: 3, stepMs: 10, holdMs: 300 });
    });
    expect(onOpen).not.toHaveBeenCalled();
    act(() => {
      swipe(W - 5, 400, -30, 0, { steps: 3, stepMs: 10 });
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("never swipes with a mouse", () => {
    const onOpen = vi.fn();
    render(<Offcanvas.SwipeArea onOpen={onOpen} />);
    act(() => {
      swipe(W - 5, 400, -200, 0, { pointerType: "mouse" });
      swipe(W - 5, 400, -30, 0, { pointerType: "mouse", steps: 3, stepMs: 10 });
    });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it.each([
    ["outward", 6, 0],
    ["across the axis", -2, 40],
  ])("lets go of a move %s and never cancels it, even if it turns inward", (_, dx, dy) => {
    const onOpen = vi.fn();
    render(<Offcanvas.SwipeArea onOpen={onOpen} />);
    const touch = (clientX: number, clientY: number) => {
      fireEvent.pointerMove(document.body, {
        pointerId: 1,
        pointerType: "touch",
        clientX,
        clientY,
      });
      return fireEvent.touchMove(document.body, { touches: [{ clientX, clientY }] });
    };
    fireEvent.pointerDown(document.body, {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: W - 10,
      clientY: 400,
    });
    expect(touch(W - 10 + dx * 2, 400 + dy)).toBe(true);
    expect(touch(W - 200, 400 + dy)).toBe(true);
    fireEvent.pointerUp(document.body, { pointerId: 1, pointerType: "touch" });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("forgets a press the browser cancelled", () => {
    const onOpen = vi.fn();
    render(<Offcanvas.SwipeArea onOpen={onOpen} />);
    fireEvent.pointerDown(document.body, {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: W - 5,
    });
    fireEvent.pointerCancel(document.body, { pointerId: 1, pointerType: "touch" });
    fireEvent.pointerMove(document.body, { pointerId: 1, pointerType: "touch", clientX: 200 });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("leaves a tap in the band to the page: nothing is prevented and the click lands", () => {
    const onOpen = vi.fn();
    const onClick = vi.fn();
    render(
      <>
        <button onClick={onClick}>Under</button>
        <Offcanvas.SwipeArea onOpen={onOpen} />
      </>,
    );
    const under = screen.getByRole("button", { name: "Under" });
    const at = { pointerId: 1, pointerType: "touch", clientX: W - 5, clientY: 400 };
    expect(fireEvent.pointerDown(under, { ...at, button: 0 })).toBe(true);
    expect(fireEvent.touchMove(under, { touches: [{ clientX: W - 6, clientY: 401 }] })).toBe(true);
    expect(fireEvent.pointerUp(under, at)).toBe(true);
    expect(fireEvent.click(under)).toBe(true);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("does nothing while disabled", () => {
    const onOpen = vi.fn();
    render(<Offcanvas.SwipeArea onOpen={onOpen} disabled />);
    let allowed: boolean[] = [];
    act(() => {
      allowed = swipe(W - 5, 400, -120, 0);
    });
    expect(onOpen).not.toHaveBeenCalled();
    expect(allowed.every(Boolean)).toBe(true);
  });

  it("ignores presses that start inside an open panel", () => {
    const onOpen = vi.fn();
    render(
      <>
        <Offcanvas open title="Cart" modal={false} onClose={() => undefined}>
          <p>Inside</p>
        </Offcanvas>
        <Offcanvas.SwipeArea onOpen={onOpen} />
      </>,
    );
    act(() => {
      swipe(W - 5, 400, -120, 0, { target: screen.getByText("Inside") });
    });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("leaves a drag that starts on a slider, a separator or a control to it", () => {
    const onOpen = vi.fn();
    render(
      <>
        <div role="slider" aria-label="Volume" aria-valuenow={100} tabIndex={0}>
          Thumb
        </div>
        <div role="separator" aria-label="Resize">
          Handle
        </div>
        <button type="button">Edge button</button>
        <Offcanvas.SwipeArea onOpen={onOpen} />
      </>,
    );
    for (const name of ["Thumb", "Handle", "Edge button"]) {
      act(() => {
        swipe(W - 5, 400, -120, 0, { target: screen.getByText(name) });
      });
    }
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("gives up a press that a component claims with preventDefault", () => {
    const onOpen = vi.fn();
    render(
      <>
        <div
          onPointerDown={(event) => {
            event.preventDefault();
          }}
        >
          Custom drag
        </div>
        <Offcanvas.SwipeArea onOpen={onOpen} />
      </>,
    );
    act(() => {
      swipe(W - 5, 400, -120, 0, { target: screen.getByText("Custom drag") });
    });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("reads start and end from the direction where the press starts", () => {
    const onOpen = vi.fn();
    render(
      <>
        <div dir="rtl">RTL island</div>
        <Offcanvas.SwipeArea placement="start" onOpen={onOpen} />
      </>,
    );
    act(() => {
      swipe(W - 5, 400, -120, 0, { target: screen.getByText("RTL island") });
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("removes its listeners on unmount", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const onOpen = vi.fn();
    const { unmount } = render(<Offcanvas.SwipeArea onOpen={onOpen} />);
    const added = add.mock.calls.map(([type, fn]) => [type, fn]);
    expect(added.map(([type]) => type)).toEqual(
      expect.arrayContaining([
        "pointerdown",
        "pointermove",
        "pointerup",
        "pointercancel",
        "touchmove",
      ]),
    );
    unmount();
    for (const [type, fn] of added) {
      expect(remove).toHaveBeenCalledWith(type, fn, expect.anything());
    }
    act(() => {
      swipe(W - 5, 400, -120, 0);
    });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("opens the panel it is paired with", () => {
    function App() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Offcanvas.SwipeArea
            placement="start"
            disabled={open}
            onOpen={() => {
              setOpen(true);
            }}
          />
          <Offcanvas
            open={open}
            placement="start"
            title="Filters"
            onClose={() => {
              setOpen(false);
            }}
          />
        </>
      );
    }
    render(<App />);
    act(() => {
      swipe(5, 400, 80, 0);
    });
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
  });

  it("adds nothing for axe to find", async () => {
    vi.useRealTimers();
    render(
      <main>
        <button>Filters</button>
        <Offcanvas.SwipeArea onOpen={() => undefined} />
      </main>,
    );
    expect(await runAxe(document.body)).toHaveNoViolations();
  });
});
