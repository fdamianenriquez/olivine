import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Modal } from "../Modal";
import { Root } from "../Root";
import { Tour, type TourProps, type TourStep } from "./Tour";
import { resolveTarget } from "./useTourTarget";

stubNoAnimations();

/** jsdom lays nothing out: give every connected element a box, except `data-empty` ones. */
beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const empty = !this.isConnected || this.hasAttribute("data-empty");
    const box = empty
      ? { x: 0, y: 0, width: 0, height: 0 }
      : { x: 100, y: 120, width: 80, height: 40 };
    return {
      ...box,
      left: box.x,
      top: box.y,
      right: box.x + box.width,
      bottom: box.y + box.height,
      toJSON: () => box,
    };
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

const WOOD: TourStep = {
  target: "#wood",
  title: "Pick a wood",
  content: "The Wood list sets the body.",
};
const FINISH: TourStep = {
  target: "#finish",
  title: "Choose a finish",
  content: "The Finish button picks oil or lacquer.",
};
const ORDER: TourStep = {
  target: "#order",
  title: "Place the order",
  content: "The Order button sends it.",
};
const STEPS: TourStep[] = [WOOD, FINISH, ORDER];

/** The element matching `selector`; throws when it is missing. */
function el(selector: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(selector);
  if (!node) throw new Error(`no ${selector}`);
  return node;
}

function Page({ children }: { children?: ReactNode }) {
  return (
    <main>
      <button type="button">Opener</button>
      <select id="wood" aria-label="Wood">
        <option>Oak</option>
      </select>
      <button type="button" id="finish">
        Finish
      </button>
      <button type="button" id="order">
        Order
      </button>
      {children}
    </main>
  );
}

const setup = (props: Partial<TourProps> = {}) =>
  render(
    <Root>
      <Page />
      <Tour steps={STEPS} defaultOpen {...props} />
    </Root>,
  );

const dialog = () => screen.getByRole("dialog");
const button = (name: string | RegExp) => screen.getByRole("button", { name });
const live = () => el(".ol-tour__live");

describe("Tour", () => {
  it("renders nothing while closed", () => {
    render(<Tour steps={STEPS} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector(".ol-tour-layer")).toBeNull();
  });

  it("is a modal dialog named by the title and described by the body", async () => {
    setup({ className: "x", "data-testid": "t" } as Partial<TourProps>);
    const card = dialog();
    expect(card).toHaveAccessibleName("Pick a wood");
    expect(card).toHaveAccessibleDescription("The Wood list sets the body.");
    expect(card).toHaveAttribute("aria-modal", "true");
    expect(card).toHaveAttribute("tabindex", "-1");
    expect(card).toHaveClass("ol-floating", "ol-popover", "ol-tour", "x");
    expect(card).toHaveAttribute("data-testid", "t");
    expect(screen.getByRole("heading", { level: 2, name: "Pick a wood" })).toBeInTheDocument();
    await waitFor(() => {
      expect(card).toHaveAttribute("data-state", "open");
    });
  });

  it("shows the counter in figures and reads it with the stepper words", () => {
    setup();
    const count = el(".ol-tour__count");
    expect(count.textContent).toBe("Step 01 /  of 03");
    expect(count.querySelector("b")).toHaveTextContent("01");
  });

  it("forwards the ref to the card", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Tour ref={ref} steps={[{ title: "Hello" }]} defaultOpen />);
    expect(ref.current).toBe(dialog());
  });

  it("focuses Next on open and hides Back on the first step", () => {
    setup();
    expect(button("Next")).toHaveFocus();
    expect(button("Next")).toHaveClass("ol-btn--accent");
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(button("Skip tour")).toBeInTheDocument();
  });

  it("keeps focus on Next, announces the new step and is silent on open", async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    setup({ onStepChange });
    expect(live()).toHaveAttribute("aria-live", "polite");
    expect(live()).toHaveAttribute("aria-atomic", "true");
    expect(live()).toBeEmptyDOMElement();
    await user.keyboard("{Enter}");
    expect(onStepChange).toHaveBeenCalledWith(1, "next");
    expect(dialog()).toHaveAccessibleName("Choose a finish");
    expect(button("Next")).toHaveFocus();
    expect(live()).toHaveTextContent(
      "Step 02 of 03: Choose a finish. The Finish button picks oil or lacquer.",
    );
    expect(button("Back")).toBeInTheDocument();
  });

  it("replaces Next with Done and drops Skip on the last step", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    setup({ defaultStep: 2, onOpenChange });
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Skip tour" })).toBeNull();
    expect(button("Done")).toHaveFocus();
    await user.click(button("Done"));
    expect(onOpenChange).toHaveBeenCalledWith(false, "finish");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("Next becomes Done in place, so focus is not lost", async () => {
    const user = userEvent.setup();
    setup({ defaultStep: 1 });
    const next = button("Next");
    await user.click(next);
    expect(button("Done")).toBe(next);
    expect(next).toHaveFocus();
  });

  it("moves focus to Next when Back disappears on the first step", async () => {
    const user = userEvent.setup();
    setup({ defaultStep: 1 });
    await user.click(button("Back"));
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(button("Next")).toHaveFocus();
    expect(dialog()).toHaveAccessibleName("Pick a wood");
  });

  it("keeps focus on Back when it stays", async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    setup({ defaultStep: 2, onStepChange });
    await user.click(button("Back"));
    expect(onStepChange).toHaveBeenCalledWith(1, "prev");
    expect(button("Back")).toHaveFocus();
    expect(live()).toHaveTextContent("Step 02 of 03: Choose a finish.");
  });

  it("goes forward and back with the arrow keys", async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    setup({ onStepChange });
    await user.keyboard("{ArrowLeft}");
    expect(onStepChange).not.toHaveBeenCalled();
    await user.keyboard("{ArrowRight}");
    expect(onStepChange).toHaveBeenLastCalledWith(1, "key");
    await user.keyboard("{ArrowRight}");
    expect(dialog()).toHaveAccessibleName("Place the order");
    await user.keyboard("{ArrowRight}");
    expect(onStepChange).toHaveBeenCalledTimes(2);
    expect(dialog()).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(onStepChange).toHaveBeenLastCalledWith(1, "key");
    expect(dialog().contains(document.activeElement)).toBe(true);
    expect(live()).toHaveTextContent("Step 02 of 03");
  });

  it("swaps the arrow keys under rtl", async () => {
    const user = userEvent.setup();
    setup({ style: { direction: "rtl" } });
    await user.keyboard("{ArrowLeft}");
    expect(dialog()).toHaveAccessibleName("Choose a finish");
    await user.keyboard("{ArrowRight}");
    expect(dialog()).toHaveAccessibleName("Pick a wood");
  });

  it("ignores arrows with modifiers, in text fields and during IME composition", () => {
    setup({
      steps: [{ title: "Name it", content: <input aria-label="Name" /> }, { title: "Second" }],
    });
    fireEvent.keyDown(button("Next"), { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(button("Next"), { key: "ArrowRight", isComposing: true });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Name" }), { key: "ArrowRight" });
    expect(dialog()).toHaveAccessibleName("Name it");
    fireEvent.keyDown(button("Next"), { key: "ArrowRight" });
    expect(dialog()).toHaveAccessibleName("Second");
  });

  it("ends on Escape and returns focus to the opener", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <Root>
          <Page />
          <button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
          >
            Take the tour
          </button>
          <Tour
            steps={STEPS}
            open={open}
            onOpenChange={(next, reason) => {
              onOpenChange(next, reason);
              setOpen(next);
            }}
          />
        </Root>
      );
    }
    render(<Harness />);
    await user.click(button("Take the tour"));
    expect(button("Next")).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false, "escape");
    expect(button("Take the tour")).toHaveFocus();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("ignores Escape during IME composition", () => {
    const onOpenChange = vi.fn();
    setup({ onOpenChange });
    fireEvent.keyDown(button("Next"), { key: "Escape", isComposing: true });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("ends on Skip", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    setup({ onOpenChange });
    await user.click(button("Skip tour"));
    expect(onOpenChange).toHaveBeenCalledWith(false, "skip");
  });

  it("hides Skip when not skippable or with one step", () => {
    const { unmount } = setup({ skippable: false });
    expect(screen.queryByRole("button", { name: "Skip tour" })).toBeNull();
    unmount();
    setup({ steps: [{ title: "Only" }] });
    expect(screen.queryByRole("button", { name: "Skip tour" })).toBeNull();
    expect(button("Done")).toHaveFocus();
  });

  it("adds a close button on request", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { unmount } = setup();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    unmount();
    setup({ closeButton: true, onOpenChange });
    await user.click(button("Close"));
    expect(onOpenChange).toHaveBeenCalledWith(false, "close");
  });

  it("does nothing on a scrim click unless closeOnScrim", () => {
    const onOpenChange = vi.fn();
    const { unmount } = setup({ onOpenChange });
    const mask = el(".ol-tour__mask");
    expect(mask).toHaveAttribute("aria-hidden", "true");
    fireEvent.click(mask);
    expect(onOpenChange).not.toHaveBeenCalled();
    unmount();
    setup({ onOpenChange, closeOnScrim: true });
    fireEvent.click(el(".ol-tour__mask"));
    expect(onOpenChange).toHaveBeenCalledWith(false, "scrim");
  });

  it("makes the page, target included, inert while modal", () => {
    render(
      <>
        <div id="app">
          <Page />
        </div>
        <Tour steps={STEPS} defaultOpen />
      </>,
    );
    expect(document.getElementById("app")?.closest("[inert]")).not.toBeNull();
    expect(document.getElementById("wood")?.closest("[inert]")).not.toBeNull();
    expect(dialog().closest("[inert]")).toBeNull();
  });

  it("keeps a toast region reachable", () => {
    const toasts = document.createElement("div");
    toasts.setAttribute("data-ol-keep-active", "");
    document.body.append(toasts);
    setup();
    expect(toasts).not.toHaveAttribute("inert");
    toasts.remove();
  });

  it("answers Escape only as the topmost layer over a Modal", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onOpenChange = vi.fn();
    const page = (tour: boolean) => (
      <Root>
        <Modal open onClose={onClose} title="Settings">
          <button type="button" id="in-modal">
            Save
          </button>
        </Modal>
        {tour ? (
          <Tour
            steps={[{ target: "#in-modal", title: "Save here" }]}
            defaultOpen
            onOpenChange={onOpenChange}
          />
        ) : null}
      </Root>
    );
    const { rerender } = render(page(false));
    await screen.findByRole("button", { name: "Save" });
    rerender(page(true));
    expect(button("Done")).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false, "escape");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("wraps Tab inside the card while modal", async () => {
    const user = userEvent.setup();
    setup({ defaultStep: 1 });
    expect(button("Next")).toHaveFocus();
    await user.tab();
    expect(button("Skip tour")).toHaveFocus();
    await user.tab({ shift: true });
    expect(button("Next")).toHaveFocus();
  });

  it("writes the padded hole on the mask and slides it between steps", async () => {
    const user = userEvent.setup();
    setup();
    const mask = el(".ol-tour__mask");
    expect(mask.style.getPropertyValue("--ol-tour-x1")).toBe("92px");
    expect(mask.style.getPropertyValue("--ol-tour-y1")).toBe("112px");
    expect(mask.style.getPropertyValue("--ol-tour-x2")).toBe("188px");
    expect(mask.style.getPropertyValue("--ol-tour-y2")).toBe("168px");
    expect(mask).not.toHaveAttribute("data-moving");
    await user.click(button("Next"));
    expect(mask).toHaveAttribute("data-moving");
    fireEvent.transitionEnd(mask);
    expect(mask).not.toHaveAttribute("data-moving");
  });

  it("collapses the hole and centres the card for a step without target", () => {
    setup({ steps: [{ title: "Welcome", content: "Three things to see." }, ...STEPS] });
    const mask = el(".ol-tour__mask");
    expect(mask.style.getPropertyValue("--ol-tour-x1")).toBe(
      mask.style.getPropertyValue("--ol-tour-x2"),
    );
    expect(dialog()).toHaveClass("ol-tour--center");
    expect(dialog()).toHaveAttribute("data-placement", "center");
    expect(dialog()).toHaveAttribute("data-state", "open");
  });

  it("centres the card with placement center even with a target", () => {
    setup({ placement: "center" });
    expect(dialog()).toHaveClass("ol-tour--center");
    expect(el(".ol-tour__mask").style.getPropertyValue("--ol-tour-x1")).toBe("92px");
  });

  it("places the card on the step's side", async () => {
    setup({ steps: [{ target: "#wood", title: "Top", placement: "top" }] });
    await waitFor(() => {
      expect(dialog()).toHaveAttribute("data-state", "open");
    });
    expect(["top", "bottom"]).toContain(dialog().getAttribute("data-placement"));
    expect(dialog()).not.toHaveClass("ol-tour--center");
  });

  describe("targets", () => {
    it("resolves selectors, elements, refs and functions", () => {
      render(<Page />);
      const wood = el("#wood");
      expect(resolveTarget("#wood")).toBe(wood);
      expect(resolveTarget(wood)).toBe(wood);
      expect(resolveTarget({ current: wood })).toBe(wood);
      expect(resolveTarget(() => wood)).toBe(wood);
      expect(resolveTarget("#nope")).toBeNull();
      expect(resolveTarget("[[bad")).toBeNull();
      expect(resolveTarget({ current: null })).toBeNull();
      expect(resolveTarget(document.createElement("div"))).toBeNull();
      expect(resolveTarget(undefined)).toBeNull();
    });

    it("points at a ref and a function target", async () => {
      const user = userEvent.setup();
      function Harness() {
        const ref = useRef<HTMLButtonElement>(null);
        return (
          <>
            <button type="button" ref={ref}>
              By ref
            </button>
            <span id="fn">By function</span>
            <Tour
              defaultOpen
              steps={[
                { target: ref, title: "Ref" },
                { target: () => document.getElementById("fn"), title: "Function" },
              ]}
            />
          </>
        );
      }
      render(<Harness />);
      expect(dialog()).toHaveAccessibleName("Ref");
      await user.click(button("Next"));
      expect(dialog()).toHaveAccessibleName("Function");
    });

    it("skips a missing target forward with a warning", async () => {
      const user = userEvent.setup();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const onStepChange = vi.fn();
      setup({
        onStepChange,
        steps: [WOOD, { target: "#gone", title: "Gone" }, ORDER],
      });
      await user.click(button("Next"));
      expect(onStepChange).toHaveBeenNthCalledWith(1, 1, "next");
      expect(onStepChange).toHaveBeenNthCalledWith(2, 2, "skipped");
      expect(dialog()).toHaveAccessibleName("Place the order");
      expect(document.querySelector(".ol-tour__count b")).toHaveTextContent("03");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("step 2 is not on the page"));
      expect(live()).toHaveTextContent("Step 03 of 03: Place the order.");
      expect(button("Done")).toHaveFocus();
    });

    it("skips a missing target backward", async () => {
      const user = userEvent.setup();
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      setup({
        defaultStep: 2,
        steps: [WOOD, { target: "#gone", title: "Gone" }, ORDER],
      });
      await user.click(button("Back"));
      expect(dialog()).toHaveAccessibleName("Pick a wood");
    });

    it("treats a zero-size target as missing", () => {
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <>
          <span id="empty" data-empty="" />
          <Page />
          <Tour defaultOpen steps={[{ target: "#empty", title: "Empty" }, FINISH]} />
        </>,
      );
      expect(dialog()).toHaveAccessibleName("Choose a finish");
    });

    it("ends the tour when every target is missing", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const onOpenChange = vi.fn();
      render(
        <Tour
          defaultOpen
          onOpenChange={onOpenChange}
          steps={[
            { target: "#a", title: "A" },
            { target: "#b", title: "B" },
          ]}
        />,
      );
      expect(onOpenChange).toHaveBeenCalledWith(false, "missing");
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });
    });

    it("skips the step when its target is removed while shown", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      function Harness() {
        const [shown, setShown] = useState(true);
        return (
          <>
            {shown ? <span id="temp">Temporary</span> : null}
            <Page />
            <button
              type="button"
              id="remove"
              onClick={() => {
                setShown(false);
              }}
            >
              Remove
            </button>
            <Tour defaultOpen modal={false} steps={[{ target: "#temp", title: "Temp" }, FINISH]} />
          </>
        );
      }
      render(<Harness />);
      expect(dialog()).toHaveAccessibleName("Temp");
      fireEvent.click(button("Remove"));
      await waitFor(() => {
        expect(dialog()).toHaveAccessibleName("Choose a finish");
      });
    });

    it("scrolls a target out of view into the centre, instantly under reduced motion", () => {
      const scroll = vi.fn();
      Element.prototype.scrollIntoView = scroll;
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
        this: Element,
      ) {
        const box = { x: 0, y: 2000, width: 80, height: 40 };
        return {
          ...box,
          left: 0,
          top: 2000,
          right: 80,
          bottom: 2040,
          toJSON: () => box,
        };
      });
      const { unmount } = setup();
      expect(scroll).toHaveBeenCalledWith({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
      unmount();
      scroll.mockClear();
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: (query: string) => ({
          matches: query.includes("reduce"),
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }),
      });
      setup();
      expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
      unmount();
      scroll.mockClear();
      setup({ scrollIntoView: false });
      expect(scroll).not.toHaveBeenCalled();
      Reflect.deleteProperty(window, "matchMedia");
      Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    });

    it("counts the root's scroll-padding and the target's scroll-margin as out of view", () => {
      const scroll = vi.fn();
      Element.prototype.scrollIntoView = scroll;
      document.documentElement.style.setProperty("scroll-padding-top", "200px");
      const { unmount } = setup();
      expect(scroll).toHaveBeenCalledTimes(1);
      unmount();
      document.documentElement.style.removeProperty("scroll-padding-top");
      scroll.mockClear();
      render(
        <>
          <span id="margined" style={{ scrollMarginTop: "200px" }}>
            Margined
          </span>
          <Tour steps={[{ target: "#margined", title: "Margined" }]} defaultOpen />
        </>,
      );
      expect(scroll).toHaveBeenCalledTimes(1);
      Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    });

    it("reads the scroll-padding of the target's nearest scroller, not only the root's", () => {
      const scroll = vi.fn();
      Element.prototype.scrollIntoView = scroll;
      render(
        <div style={{ overflow: "auto", scrollPaddingTop: "200px" }}>
          <span id="inner">Inner</span>
          <Tour steps={[{ target: "#inner", title: "Inner" }]} defaultOpen />
        </div>,
      );
      expect(scroll).toHaveBeenCalledTimes(1);
      Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    });

    it("does not scroll a target already in view", () => {
      const scroll = vi.fn();
      Element.prototype.scrollIntoView = scroll;
      setup();
      expect(scroll).not.toHaveBeenCalled();
      Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    });
  });

  describe("controlled", () => {
    it("follows `open` and `step`", () => {
      const onStepChange = vi.fn();
      const { rerender } = render(
        <>
          <Page />
          <Tour steps={STEPS} open={false} step={1} onStepChange={onStepChange} />
        </>,
      );
      expect(screen.queryByRole("dialog")).toBeNull();
      rerender(
        <>
          <Page />
          <Tour steps={STEPS} open step={1} onStepChange={onStepChange} />
        </>,
      );
      expect(dialog()).toHaveAccessibleName("Choose a finish");
      fireEvent.click(button("Next"));
      expect(onStepChange).toHaveBeenCalledWith(2, "next");
      expect(dialog()).toHaveAccessibleName("Choose a finish");
      rerender(
        <>
          <Page />
          <Tour steps={STEPS} open step={2} onStepChange={onStepChange} />
        </>,
      );
      expect(dialog()).toHaveAccessibleName("Place the order");
    });

    it("clamps an out-of-range step", () => {
      render(
        <>
          <Page />
          <Tour steps={STEPS} open step={9} />
        </>,
      );
      expect(dialog()).toHaveAccessibleName("Place the order");
    });

    it("starts an uncontrolled tour from defaultStep each time it opens", () => {
      const { rerender } = render(
        <>
          <Page />
          <Tour steps={STEPS} open />
        </>,
      );
      fireEvent.click(button("Next"));
      expect(dialog()).toHaveAccessibleName("Choose a finish");
      rerender(
        <>
          <Page />
          <Tour steps={STEPS} open={false} />
        </>,
      );
      rerender(
        <>
          <Page />
          <Tour steps={STEPS} open />
        </>,
      );
      expect(dialog()).toHaveAccessibleName("Pick a wood");
      expect(live()).toBeEmptyDOMElement();
    });
  });

  describe("focus return", () => {
    function Harness({ modal }: { modal: boolean }) {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Page />
          <button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
          >
            Take the tour
          </button>
          <Tour
            steps={[WOOD, FINISH]}
            modal={modal}
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
            }}
          />
        </>
      );
    }

    for (const modal of [true, false]) {
      it(`returns focus to the opener after Skip and after Done (${modal ? "modal" : "non-modal"})`, async () => {
        const user = userEvent.setup();
        render(<Harness modal={modal} />);
        await user.click(button("Take the tour"));
        await user.click(button("Skip tour"));
        expect(button("Take the tour")).toHaveFocus();
        await waitFor(() => {
          expect(screen.queryByRole("dialog")).toBeNull();
        });
        await user.click(button("Take the tour"));
        await user.click(button("Next"));
        await user.click(button("Done"));
        expect(button("Take the tour")).toHaveFocus();
      });
    }
  });

  describe("non-modal", () => {
    it("leaves the page usable and frames the target", () => {
      render(
        <>
          <div id="app">
            <Page />
          </div>
          <Tour steps={STEPS} defaultOpen modal={false} />
        </>,
      );
      expect(dialog()).not.toHaveAttribute("aria-modal");
      expect(document.getElementById("app")).not.toHaveAttribute("inert");
      expect(document.querySelector(".ol-tour__mask")).toBeNull();
      const spot = el(".ol-tour__spot");
      expect(spot).toHaveClass("ol-draw");
      expect(spot).toHaveAttribute("aria-hidden", "true");
      expect(spot).not.toHaveAttribute("hidden");
      expect(spot.style.getPropertyValue("--ol-tour-x1")).toBe("92px");
      expect(button("Next")).toHaveFocus();
    });

    it("hides the frame on a centred step", () => {
      render(<Tour steps={[{ title: "Welcome" }]} defaultOpen modal={false} />);
      expect(document.querySelector(".ol-tour__spot")).toHaveAttribute("hidden");
    });

    it("hands Tab past either end to the target", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Page />
          <Tour steps={STEPS} defaultOpen defaultStep={1} modal={false} />
        </>,
      );
      expect(button("Next")).toHaveFocus();
      await user.tab();
      expect(button("Finish")).toHaveFocus();
      button("Next").focus();
      await user.tab({ shift: true });
      expect(button("Back")).toHaveFocus();
      await user.tab({ shift: true });
      expect(button("Skip tour")).toHaveFocus();
      await user.tab({ shift: true });
      expect(button("Finish")).toHaveFocus();
    });

    it("hands Tab to the first tabbable inside the target, else wraps", async () => {
      const user = userEvent.setup();
      const { unmount } = render(
        <>
          <div id="group">
            <span>Label</span>
            <button type="button">Inner</button>
          </div>
          <Tour steps={[{ target: "#group", title: "Group" }]} defaultOpen modal={false} />
        </>,
      );
      await user.tab();
      expect(button("Inner")).toHaveFocus();
      unmount();
      render(
        <>
          <p id="text">Plain text</p>
          <Tour steps={[{ target: "#text", title: "Text" }, WOOD]} defaultOpen modal={false} />
        </>,
      );
      expect(button("Next")).toHaveFocus();
      await user.tab();
      expect(button("Skip tour")).toHaveFocus();
    });

    it("ends on Escape after Tab handed focus to the target, leaving focus there", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <>
          <Page />
          <Tour
            steps={STEPS}
            defaultOpen
            defaultStep={1}
            modal={false}
            onOpenChange={onOpenChange}
          />
        </>,
      );
      await user.tab();
      expect(button("Finish")).toHaveFocus();
      await user.keyboard("{Escape}");
      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false, "escape");
      expect(button("Finish")).toHaveFocus();
    });

    it("leaves Escape to another layer that holds focus, and ignores IME and handled keys", () => {
      const onOpenChange = vi.fn();
      render(
        <>
          <Page />
          <Tour steps={STEPS} defaultOpen modal={false} onOpenChange={onOpenChange} />
        </>,
      );
      const other = document.createElement("div");
      other.className = "ol-portal";
      const inner = document.createElement("button");
      other.append(inner);
      document.body.append(other);
      inner.focus();
      fireEvent.keyDown(inner, { key: "Escape" });
      other.remove();
      const page = button("Order");
      page.focus();
      fireEvent.keyDown(page, { key: "Escape", isComposing: true });
      page.addEventListener("keydown", (event) => {
        event.preventDefault();
      });
      fireEvent.keyDown(page, { key: "Escape" });
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("ends on Escape only while focus is in the card", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <>
          <Page />
          <Tour steps={STEPS} defaultOpen modal={false} onOpenChange={onOpenChange} />
        </>,
      );
      await user.keyboard("{Escape}");
      expect(onOpenChange).toHaveBeenCalledWith(false, "escape");
    });
  });

  describe("labels", () => {
    it("takes overrides and per-step words", () => {
      setup({
        labels: { next: "Onward", skip: "Leave" },
        steps: [{ ...WOOD, nextLabel: "Show me" }, ...STEPS.slice(1)],
      });
      expect(button("Show me")).toBeInTheDocument();
      expect(button("Leave")).toBeInTheDocument();
      fireEvent.click(button("Show me"));
      expect(button("Onward")).toBeInTheDocument();
    });

    it("uses the per-step back word", () => {
      setup({
        defaultStep: 1,
        steps: [WOOD, { ...FINISH, prevLabel: "Earlier" }],
      });
      expect(button("Earlier")).toBeInTheDocument();
    });

    it("reads the locale", () => {
      render(
        <Root locale="es">
          <Page />
          <Tour steps={STEPS} defaultOpen />
        </Root>,
      );
      expect(button("Siguiente")).toBeInTheDocument();
      expect(button("Omitir recorrido")).toBeInTheDocument();
      expect(document.querySelector(".ol-tour__count")).toHaveTextContent("Paso 01 / de 03");
    });

    it("reads ja words and announces in es", async () => {
      const user = userEvent.setup();
      const { unmount } = render(
        <Root locale="ja">
          <Page />
          <Tour steps={STEPS} defaultOpen />
        </Root>,
      );
      expect(button("次へ")).toBeInTheDocument();
      expect(button("ツアーをスキップ")).toBeInTheDocument();
      expect(el(".ol-tour__count")).toHaveTextContent("ステップ 01 / / 03");
      unmount();
      render(
        <Root locale="es">
          <Page />
          <Tour steps={STEPS} defaultOpen />
        </Root>,
      );
      await user.click(button("Siguiente"));
      expect(live()).toHaveTextContent("Paso 02 de 03: Choose a finish.");
    });

    it("falls back to the tour label when a step has no title, with a warning", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(<Tour steps={[{ title: "" }]} defaultOpen />);
      expect(dialog()).toHaveAccessibleName("Tour");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("has no `title`"));
    });

    it("keeps a user-given name", () => {
      render(<Tour steps={[{ title: "Hello" }]} defaultOpen aria-label="Guide" />);
      expect(dialog()).toHaveAccessibleName("Guide");
    });
  });

  it("warns and renders nothing for an empty tour", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Tour steps={[]} defaultOpen />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("`steps` is empty"));
  });

  it("chains a user onKeyDown and honours preventDefault", () => {
    const onKeyDown = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    setup({ onKeyDown });
    fireEvent.keyDown(button("Next"), { key: "ArrowRight" });
    expect(onKeyDown).toHaveBeenCalled();
    expect(dialog()).toHaveAccessibleName("Pick a wood");
  });

  it("fades out, inert, when it closes", () => {
    const { rerender } = render(<Tour steps={STEPS} open />);
    rerender(<Tour steps={STEPS} open={false} />);
    const layer = document.querySelector(".ol-tour-layer");
    if (layer) {
      expect(layer).toHaveAttribute("data-state", "closing");
    }
  });

  it("leaves from its target, not from the centre, when it closes", async () => {
    const tour = (open: boolean) => (
      <Root>
        <Page />
        <Tour steps={[WOOD]} open={open} />
      </Root>
    );
    const { rerender } = render(tour(true));
    await waitFor(() => {
      expect(dialog()).toHaveAttribute("data-state", "open");
    });
    rerender(tour(false));
    const card = el(".ol-tour");
    expect(card).toHaveAttribute("data-state", "closing");
    expect(card).not.toHaveAttribute("data-placement", "center");
    expect(card).not.toHaveClass("ol-tour--center");
  });

  it("keeps the theme of the island it was rendered in", async () => {
    render(
      <Root theme="sumi">
        <div data-theme="sumi">
          <Page />
          <Tour steps={STEPS} defaultOpen />
        </div>
      </Root>,
    );
    await waitFor(() => {
      expect(dialog().closest(".ol-portal")).toHaveAttribute("data-theme", "sumi");
    });
  });

  it("has no axe violations, modal and non-modal", async () => {
    const { container, unmount } = setup({ defaultStep: 1, closeButton: true });
    await waitFor(() => {
      expect(dialog()).toHaveAttribute("data-state", "open");
    });
    expect(await runAxe(dialog())).toHaveNoViolations();
    expect(await runAxe(container)).toHaveNoViolations();
    unmount();
    render(
      <>
        <Page />
        <Tour steps={STEPS} defaultOpen modal={false} />
      </>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(await runAxe(document.body)).toHaveNoViolations();
  });

  it("has no axe violations in the sumi theme", async () => {
    render(
      <Root theme="sumi">
        <Page />
        <Tour steps={STEPS} defaultOpen defaultStep={1} />
      </Root>,
    );
    await waitFor(() => {
      expect(dialog()).toHaveAttribute("data-state", "open");
    });
    expect(await runAxe(document.body)).toHaveNoViolations();
  });

  it("outlines the hole for forced colours on a sibling of the mask", () => {
    setup();
    const edge = el(".ol-tour__edge");
    expect(edge).toHaveAttribute("aria-hidden", "true");
    expect(edge).not.toHaveAttribute("hidden");
    expect(edge.style.getPropertyValue("--ol-tour-x1")).toBe("92px");
    expect(edge).not.toHaveAttribute("data-moving");
  });

  describe("styles", () => {
    const css = readFileSync(join(__dirname, "Tour.css"), "utf8");

    it("cuts the hole with an even-odd clip-path and slides it only between steps", () => {
      expect(css).toMatch(/\.ol-tour__mask \{[^}]*clip-path: polygon\(\s*evenodd/);
      expect(css).toMatch(
        /\.ol-tour__mask\[data-moving\] \{[^}]*--ol-tour-x1 var\(--dur-m\) var\(--ease-move\)/,
      );
      expect(css).toMatch(/@property --ol-tour-x1 \{[^}]*syntax: "<length>"/);
    });

    it("uses motion tokens only", () => {
      expect(css).not.toMatch(/\d+m?s\b(?![^(]*\))/);
      expect(css).toMatch(/ol-fade-in var\(--dur-s\) var\(--ease-effect\)/);
      expect(css).toMatch(/ol-settle var\(--dur-m\) var\(--ease-effect\) var\(--dur-s\)/);
      expect(css).toMatch(/ol-fade-out var\(--dur-s\) var\(--ease-effect\)/);
    });

    it("outlines the hole in forced colours and keeps figure tracking on the counter", () => {
      expect(css).toMatch(
        /forced-colors: active\)[\s\S]*\.ol-tour__edge:not\(\[hidden\]\) \{[^}]*outline: var\(--stroke-hair\) solid CanvasText/,
      );
      expect(css).toMatch(
        /\.ol-tour__count \{[^}]*letter-spacing: var\(--text-figure-xs-tracking\)/,
      );
    });

    it("draws the non-modal frame in ink at space-2", () => {
      expect(css).toMatch(/\.ol-tour__spot \{[^}]*--ol-draw-color: var\(--ink\)/);
      expect(css).toMatch(/--ol-tour-pad: var\(--space-2\)/);
    });
  });
});

describe("Tour progress", () => {
  const FIVE: TourStep[] = [WOOD, FINISH, ORDER, { title: "Four" }, { title: "Five" }];
  const segs = () => [...document.querySelectorAll(".ol-tour__seg")];
  const lit = () => segs().filter((s) => s.classList.contains("ol-tour__seg--on")).length;
  const printing = () =>
    segs()
      .map((s, k) => (s.classList.contains("ol-print-block") ? k : -1))
      .filter((k) => k >= 0);

  it("shows the counter alone by default", () => {
    setup();
    expect(document.querySelector(".ol-tour__segments")).toBeNull();
    expect(el(".ol-tour__count")).toBeInTheDocument();
  });

  it("adds one hidden block per step under the counter, lit up to the current one", () => {
    setup({ progress: "segments", steps: FIVE, defaultStep: 1 });
    const row = el(".ol-tour__segments");
    expect(row).toHaveAttribute("aria-hidden", "true");
    expect(row.previousElementSibling).toHaveClass("ol-tour__count");
    expect(row.style.getPropertyValue("--ol-seg")).toBe("5");
    expect(segs()).toHaveLength(5);
    expect(lit()).toBe(2);
    // The counter is what is spoken.
    expect(el(".ol-tour__count").textContent).toBe("Step 02 /  of 05");
  });

  it("prints nothing on open, prints the newly lit block going forward and none going back", async () => {
    const user = userEvent.setup();
    setup({ progress: "segments", steps: FIVE });
    expect(printing()).toEqual([]);
    await user.click(button("Next"));
    await waitFor(() => {
      expect(lit()).toBe(2);
    });
    expect(printing()).toEqual([1]);
    await user.click(button("Back"));
    await waitFor(() => {
      expect(lit()).toBe(1);
    });
    expect(printing()).toEqual([]);
    await user.keyboard("{ArrowRight}");
    await waitFor(() => {
      expect(lit()).toBe(2);
    });
    expect(printing()).toEqual([1]);
  });

  it("prints a skipped step's block too, one after another", async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    setup({
      progress: "segments",
      steps: [WOOD, { target: "#nowhere", title: "Gone" }, ORDER],
    });
    await user.click(button("Next"));
    await waitFor(() => {
      expect(dialog()).toHaveAccessibleName("Place the order");
    });
    expect(lit()).toBe(3);
    expect(printing()).toEqual([1, 2]);
    const blocks = segs() as HTMLElement[];
    expect(blocks[1]?.style.getPropertyValue("--ol-i")).toBe("0");
    expect(blocks[2]?.style.getPropertyValue("--ol-i")).toBe("1");
    warn.mockRestore();
  });

  it("starts unprinted when reopened on a later step", async () => {
    const user = userEvent.setup();
    function App() {
      const [open, setOpen] = useState(true);
      const [step, setStep] = useState(0);
      return (
        <Root>
          <Page />
          <button
            type="button"
            onClick={() => {
              setStep(3);
              setOpen(true);
            }}
          >
            Reopen
          </button>
          <Tour
            steps={FIVE}
            progress="segments"
            open={open}
            step={step}
            onOpenChange={setOpen}
            onStepChange={setStep}
          />
        </Root>
      );
    }
    render(<App />);
    await user.click(button("Skip tour"));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    await user.click(button("Reopen"));
    await waitFor(() => {
      expect(lit()).toBe(4);
    });
    expect(printing()).toEqual([]);
  });

  it("falls back to the counter above twelve steps, with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const many = Array.from({ length: 13 }, (_, k): TourStep => ({ title: `Step ${String(k)}` }));
    setup({ progress: "segments", steps: many });
    expect(document.querySelector(".ol-tour__segments")).toBeNull();
    expect(el(".ol-tour__count")).toHaveTextContent("13");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("at most 12 steps"));
    warn.mockRestore();
  });

  it("keeps twelve steps as blocks", () => {
    const many = Array.from({ length: 12 }, (_, k): TourStep => ({ title: `Step ${String(k)}` }));
    setup({ progress: "segments", steps: many });
    expect(segs()).toHaveLength(12);
  });

  it("has no axe violations with segments, in washi and sumi", async () => {
    const { unmount } = setup({ progress: "segments", steps: FIVE, defaultStep: 2 });
    await waitFor(() => {
      expect(dialog()).toHaveAttribute("data-state", "open");
    });
    expect(await runAxe(document.body)).toHaveNoViolations();
    unmount();
    render(
      <Root theme="sumi">
        <Page />
        <Tour steps={FIVE} progress="segments" defaultOpen defaultStep={2} />
      </Root>,
    );
    await waitFor(() => {
      expect(dialog()).toHaveAttribute("data-state", "open");
    });
    expect(await runAxe(document.body)).toHaveNoViolations();
  });

  describe("styles", () => {
    const css = readFileSync(join(__dirname, "Tour.css"), "utf8");
    const motion = readFileSync(join(__dirname, "../../styles/motion.css"), "utf8");

    it("lights blocks in olivo over hairline rule blocks, square, from tokens", () => {
      expect(css).toMatch(/\.ol-tour__seg \{[^}]*border: var\(--stroke-hair\) solid var\(--rule\)/);
      expect(css).toMatch(/\.ol-tour__seg--on \{[^}]*background: var\(--olivo\)/);
      expect(css).not.toMatch(/\.ol-tour__seg[^{]*\{[^}]*border-radius/);
    });

    it("staggers printed blocks with the stagger token, collapsed under reduced motion", () => {
      expect(css).toMatch(
        /\.ol-tour__seg\.ol-print-block \{[^}]*animation-delay: calc\(var\(--ol-i, 0\) \* var\(--stagger\)\)/,
      );
      expect(motion).toMatch(/\.ol-print-block \{[^}]*var\(--dur-s\) var\(--ease-print\)/);
      expect(motion).toMatch(
        /prefers-reduced-motion: reduce\)\s*\{\s*:root \{[^}]*--dur-s: 1ms;[^}]*--stagger: 0ms/,
      );
    });

    it("lights blocks with Highlight in forced colours", () => {
      expect(css).toMatch(
        /forced-colors: active\)[\s\S]*\.ol-tour__seg--on \{[^}]*background: Highlight;[^}]*forced-color-adjust: none/,
      );
    });
  });
});
