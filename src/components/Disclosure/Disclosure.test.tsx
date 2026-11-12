import { readFileSync } from "node:fs";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Disclosure, type DisclosureProps } from "./Disclosure";

stubNoAnimations();

const flush = () => act(() => Promise.resolve());

const trigger = () => screen.getByRole("button", { name: "Shipping and returns" });

type SetupProps = Partial<ComponentProps<typeof Disclosure>> & Record<`data-${string}`, string>;

function setup(props: SetupProps = {}) {
  return render(
    <Disclosure summary="Shipping and returns" {...props}>
      <p>Orders ship within ten days.</p>
    </Disclosure>,
  );
}

/** An exit animation the test finishes by hand, as `getAnimations` returns it. */
function holdExit(panel: HTMLElement) {
  let resolve: () => void = () => undefined;
  const finished = new Promise<void>((done) => {
    resolve = done;
  });
  const exit = { effect: { getComputedTiming: () => ({ endTime: 300 }) }, finished };
  Object.defineProperty(panel, "getAnimations", { value: () => [exit] });
  return resolve;
}

function Controlled(props: Partial<DisclosureProps>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
        }}
      >
        Parent toggle
      </button>
      <Disclosure summary="Shipping and returns" open={open} {...props}>
        <input aria-label="Postcode" />
      </Disclosure>
    </>
  );
}

describe("Disclosure", () => {
  describe("structure", () => {
    it("renders a closed root with class, className and native props", () => {
      const { container } = setup({ className: "extra", "data-x": "1", id: "ship" });
      const root = container.firstElementChild;
      if (!root) throw new Error("no root");
      expect(root).toHaveClass("ol-disclosure", "extra");
      expect(root).not.toHaveClass("ol-disclosure--bare");
      expect(root).toHaveAttribute("data-x", "1");
      expect(root).toHaveAttribute("id", "ship");
      expect(root).toHaveAttribute("data-state", "closed");
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      expect(trigger()).toHaveAttribute("type", "button");
      expect(trigger()).toHaveClass("ol-disclosure__trigger");
    });

    it("forwards the ref to the root", () => {
      const ref = createRef<HTMLDivElement>();
      setup({ ref });
      expect(ref.current).toHaveClass("ol-disclosure");
    });

    it("adds the bare modifier", () => {
      const { container } = setup({ variant: "bare" });
      expect(container.firstElementChild).toHaveClass("ol-disclosure--bare");
    });

    it("renders the sign as an aria-hidden glyph that is not part of the name", async () => {
      setup();
      const sign = trigger().querySelector(".ol-disclosure__sign");
      expect(sign).toHaveAttribute("aria-hidden", "true");
      expect(sign).toHaveTextContent("+");
      await userEvent.click(trigger());
      expect(sign).toHaveTextContent("−");
      expect(trigger()).toHaveAccessibleName("Shipping and returns");
    });

    it("does not render closed content, and leaves aria-controls off", () => {
      setup();
      expect(screen.queryByText("Orders ship within ten days.")).toBeNull();
      expect(screen.queryByRole("group")).toBeNull();
      expect(trigger()).not.toHaveAttribute("aria-controls");
    });

    it("wraps the trigger in the heading level and nothing else", () => {
      setup({ headingLevel: 4 });
      const heading = screen.getByRole("heading", { level: 4, name: "Shipping and returns" });
      expect(heading).toHaveClass("ol-disclosure__head");
      expect(heading.children).toHaveLength(1);
      expect(heading.firstElementChild).toBe(trigger());
    });

    it("renders a plain button, no heading, without headingLevel", () => {
      const { container } = setup();
      expect(screen.queryByRole("heading")).toBeNull();
      expect(trigger().parentElement).toBe(container.firstElementChild);
    });
  });

  describe("keyboard and aria", () => {
    it("toggles by click, Enter and Space, and focus stays on the trigger", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(trigger());
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
      expect(trigger()).toHaveFocus();
      await user.click(trigger());
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      trigger().focus();
      await user.keyboard("{Enter}");
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
      await user.keyboard(" ");
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      expect(trigger()).toHaveFocus();
    });

    it("ignores Escape and the arrow keys", async () => {
      const user = userEvent.setup();
      setup({ defaultOpen: true });
      trigger().focus();
      await user.keyboard("{Escape}{ArrowDown}{ArrowUp}{Home}{End}");
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
      expect(trigger()).toHaveFocus();
    });

    it("wires the open panel as a group labelled by the trigger", () => {
      setup({ defaultOpen: true });
      const panel = screen.getByRole("group", { name: "Shipping and returns" });
      expect(panel).toHaveClass("ol-disclosure__panel");
      expect(panel).toHaveAttribute("data-state", "open");
      expect(trigger()).toHaveAttribute("aria-controls", panel.id);
      expect(trigger().id).toBeTruthy();
      expect(panel).toHaveAttribute("aria-labelledby", trigger().id);
      expect(panel.firstElementChild).toHaveClass("ol-disclosure__body");
      expect(panel).toBeVisible();
    });

    it("can make the panel a region", () => {
      setup({ defaultOpen: true, panelRole: "region" });
      expect(screen.getByRole("region", { name: "Shipping and returns" })).toBeInTheDocument();
      expect(screen.queryByRole("group")).toBeNull();
    });

    it("leaves a disabled trigger out of the tab order and keeps its state", async () => {
      const user = userEvent.setup();
      setup({ disabled: true, defaultOpen: true });
      expect(trigger()).toBeDisabled();
      await user.click(trigger());
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
      await user.tab();
      expect(trigger()).not.toHaveFocus();
    });

    it("tabs from the trigger into the open panel and skips a closed one", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Disclosure summary="Shipping and returns" defaultOpen>
            <input aria-label="Postcode" />
          </Disclosure>
          <Disclosure summary="Warranty" keepMounted>
            <input aria-label="Serial number" />
          </Disclosure>
        </>,
      );
      await user.tab();
      expect(trigger()).toHaveFocus();
      await user.tab();
      expect(screen.getByLabelText("Postcode")).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "Warranty" })).toHaveFocus();
      await user.tab();
      expect(screen.getByLabelText("Serial number")).not.toHaveFocus();
    });
  });

  describe("state", () => {
    it("honours defaultOpen", () => {
      setup({ defaultOpen: true });
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText("Orders ship within ten days.")).toBeInTheDocument();
    });

    it("calls onOpenChange with the next state on user toggles", async () => {
      const onOpenChange = vi.fn();
      setup({ onOpenChange });
      await userEvent.click(trigger());
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
      await userEvent.click(trigger());
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      expect(onOpenChange).toHaveBeenCalledTimes(2);
    });

    it("does not call onOpenChange on mount", () => {
      const onOpenChange = vi.fn();
      setup({ onOpenChange, defaultOpen: true });
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("never changes a controlled state, it only reports the request", async () => {
      const onOpenChange = vi.fn();
      setup({ open: false, onOpenChange });
      await userEvent.click(trigger());
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("group")).toBeNull();
    });

    it("treats open={false} as controlled and follows the parent without onOpenChange", async () => {
      const onOpenChange = vi.fn();
      render(<Controlled onOpenChange={onOpenChange} />);
      await userEvent.click(screen.getByRole("button", { name: "Parent toggle" }));
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("group")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Parent toggle" }));
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("motion", () => {
    it("carries no animation class on first render, open or closed", () => {
      setup({ defaultOpen: true });
      const panel = screen.getByRole("group");
      expect(panel).not.toHaveClass("ol-kakejiku");
      expect(panel).toHaveAttribute("data-state", "open");
    });

    it("unrolls with the kakejiku class once it is toggled open", async () => {
      setup();
      await userEvent.click(trigger());
      expect(screen.getByRole("group")).toHaveClass("ol-kakejiku");
      expect(screen.getByRole("group")).toHaveAttribute("data-state", "open");
    });

    it("keeps the panel closing and inert while it rolls up, and flips aria-expanded at once", async () => {
      const { rerender } = render(
        <Disclosure summary="Shipping and returns" open>
          <p>Orders ship within ten days.</p>
        </Disclosure>,
      );
      const panel = screen.getByRole("group");
      const finish = holdExit(panel);
      rerender(
        <Disclosure summary="Shipping and returns" open={false}>
          <p>Orders ship within ten days.</p>
        </Disclosure>,
      );
      await flush();
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      expect(trigger().closest(".ol-disclosure")).toHaveAttribute("data-state", "closed");
      expect(screen.getByRole("group", { hidden: true })).toBe(panel);
      expect(panel).toHaveAttribute("data-state", "closing");
      expect(panel).toHaveClass("ol-kakejiku");
      expect(panel).toHaveAttribute("inert");
      finish();
      await waitFor(() => {
        expect(screen.queryByRole("group", { hidden: true })).toBeNull();
      });
      expect(trigger()).not.toHaveAttribute("aria-controls");
    });

    it("uses only motion tokens and the shared kakejiku class", () => {
      const css = readFileSync("src/components/Disclosure/Disclosure.css", "utf8");
      expect(css).not.toMatch(/@keyframes|animation|transition|prefers-reduced-motion/);
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|\d+(ms|s)\b/i);
      expect(css).not.toMatch(/(^|[^-\w])\d+px/m);
      const motion = readFileSync("src/styles/motion.css", "utf8");
      expect(motion).toMatch(
        /\.ol-kakejiku\.ol-kakejiku\[data-state="closed"\]\s*\{\s*animation: none/,
      );
    });

    it("keeps the exit when reduced motion is requested", async () => {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      });
      render(
        <div className="ol-reduce-motion">
          <Disclosure summary="Shipping and returns" defaultOpen>
            Orders ship.
          </Disclosure>
        </div>,
      );
      await userEvent.click(trigger());
      await waitFor(() => {
        expect(screen.queryByRole("group", { hidden: true })).toBeNull();
      });
      await userEvent.click(trigger());
      expect(screen.getByRole("group")).toBeInTheDocument();
    });
  });

  describe("focus", () => {
    it("returns focus to the trigger when the panel closes with focus inside", () => {
      const panel = (open: boolean) => (
        <Disclosure summary="Shipping and returns" open={open}>
          <input aria-label="Postcode" />
        </Disclosure>
      );
      const { rerender } = render(panel(true));
      screen.getByLabelText("Postcode").focus();
      expect(screen.getByLabelText("Postcode")).toHaveFocus();
      rerender(panel(false));
      expect(trigger()).toHaveFocus();
    });
  });

  describe("focus in a kept panel", () => {
    it.each([
      ["keepMounted", { keepMounted: true }],
      ["findable", { findable: true }],
    ] as const)(
      "returns focus to the trigger when a %s panel closes with focus inside",
      (_n, extra) => {
        const panel = (open: boolean) => (
          <Disclosure summary="Shipping and returns" open={open} {...extra}>
            <input aria-label="Postcode" />
          </Disclosure>
        );
        const { rerender } = render(panel(true));
        screen.getByLabelText("Postcode").focus();
        rerender(panel(false));
        expect(trigger()).toHaveFocus();
      },
    );

    it("makes a closing panel inert so Tab skips it", async () => {
      const panel = (open: boolean) => (
        <>
          <Disclosure summary="Shipping and returns" open={open}>
            <input aria-label="Postcode" />
          </Disclosure>
          <button type="button">After</button>
        </>
      );
      const { rerender } = render(panel(true));
      const input = screen.getByLabelText("Postcode");
      const finish = holdExit(screen.getByRole("group"));
      rerender(panel(false));
      await flush();
      expect(input.closest("[role=group]")).toHaveAttribute("inert");
      finish();
      await flush();
    });
  });

  describe("keepMounted", () => {
    it("keeps the closed panel in the DOM, hidden, with aria-controls", () => {
      setup({ keepMounted: true });
      const panel = screen.getByRole("group", { hidden: true });
      expect(panel).toHaveAttribute("hidden", "");
      expect(panel).not.toBeVisible();
      expect(panel).not.toHaveClass("ol-kakejiku");
      expect(trigger()).toHaveAttribute("aria-controls", panel.id);
      expect(screen.queryByRole("group")).toBeNull();
    });

    it("keeps the state of its content across a close", async () => {
      const user = userEvent.setup();
      render(
        <Disclosure summary="Shipping and returns" defaultOpen keepMounted>
          <input aria-label="Postcode" />
        </Disclosure>,
      );
      await user.type(screen.getByLabelText("Postcode"), "1500001");
      await user.click(trigger());
      await waitFor(() => {
        expect(screen.getByRole("group", { hidden: true })).toHaveAttribute("hidden");
      });
      await user.click(trigger());
      expect(screen.getByLabelText("Postcode")).toHaveValue("1500001");
    });

    it("hides the panel only after the roll-up, and plays it again on reopen", async () => {
      const user = userEvent.setup();
      setup({ keepMounted: true, defaultOpen: true });
      const panel = screen.getByRole("group");
      expect(panel).not.toHaveAttribute("hidden");
      await user.click(trigger());
      await waitFor(() => {
        expect(panel).toHaveAttribute("hidden");
      });
      expect(panel).toHaveAttribute("data-state", "closed");
      await user.click(trigger());
      expect(panel).not.toHaveAttribute("hidden");
      expect(panel).toHaveAttribute("data-state", "open");
      expect(panel).toHaveClass("ol-kakejiku");
    });

    it("does not hide the panel during the roll-up", async () => {
      const { rerender } = render(
        <Disclosure summary="Shipping and returns" open keepMounted>
          Orders ship.
        </Disclosure>,
      );
      const panel = screen.getByRole("group");
      const finish = holdExit(panel);
      rerender(
        <Disclosure summary="Shipping and returns" open={false} keepMounted>
          Orders ship.
        </Disclosure>,
      );
      await flush();
      expect(panel).toHaveAttribute("data-state", "closing");
      expect(panel).not.toHaveAttribute("hidden");
      finish();
      await waitFor(() => {
        expect(panel).toHaveAttribute("hidden");
      });
    });
  });

  describe("findable", () => {
    it("closes with hidden=until-found and stays in the DOM", () => {
      setup({ findable: true });
      const panel = screen.getByRole("group", { hidden: true });
      expect(panel).toHaveAttribute("hidden", "until-found");
      expect(trigger()).toHaveAttribute("aria-controls", panel.id);
      expect(screen.getByText("Orders ship within ten days.")).toBeInTheDocument();
    });

    it("has no hidden attribute while open", () => {
      setup({ findable: true, defaultOpen: true });
      expect(screen.getByRole("group")).not.toHaveAttribute("hidden");
    });

    it("opens on beforematch and reports it", async () => {
      const onOpenChange = vi.fn();
      setup({ findable: true, onOpenChange });
      fireEvent(screen.getByRole("group", { hidden: true }), new Event("beforematch"));
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
      await waitFor(() => {
        expect(screen.getByRole("group")).not.toHaveAttribute("hidden");
      });
    });

    it("reveals instantly: no unroll class for an open that comes from beforematch", () => {
      setup({ findable: true });
      const panel = screen.getByRole("group", { hidden: true });
      fireEvent(panel, new Event("beforematch"));
      expect(panel).toHaveAttribute("data-state", "open");
      expect(panel).not.toHaveClass("ol-kakejiku");
    });

    it("unrolls again on the next toggle after an instant reveal", async () => {
      setup({ findable: true });
      fireEvent(screen.getByRole("group", { hidden: true }), new Event("beforematch"));
      await userEvent.click(trigger());
      await waitFor(() => {
        expect(screen.getByRole("group", { hidden: true })).toHaveAttribute("hidden");
      });
      await userEvent.click(trigger());
      expect(screen.getByRole("group")).toHaveClass("ol-kakejiku");
    });

    it("reveals instantly after an earlier toggle cycle", async () => {
      const user = userEvent.setup();
      setup({ findable: true });
      await user.click(trigger());
      expect(screen.getByRole("group")).toHaveClass("ol-kakejiku");
      await user.click(trigger());
      const panel = screen.getByRole("group", { hidden: true });
      await waitFor(() => {
        expect(panel).toHaveAttribute("hidden", "until-found");
      });
      fireEvent(panel, new Event("beforematch"));
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
      expect(panel).toHaveAttribute("data-state", "open");
      expect(panel).not.toHaveClass("ol-kakejiku");
    });

    it("drops the instant reveal when a controlled parent ignores it, so a later open unrolls", () => {
      const onOpenChange = vi.fn();
      const view = (open: boolean) => (
        <Disclosure summary="Shipping and returns" findable open={open} onOpenChange={onOpenChange}>
          Orders ship.
        </Disclosure>
      );
      const { rerender } = render(view(false));
      const panel = screen.getByRole("group", { hidden: true });
      fireEvent(panel, new Event("beforematch"));
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      rerender(view(true));
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
      expect(panel).toHaveAttribute("data-state", "open");
      expect(panel).toHaveClass("ol-kakejiku");
    });

    it("warns in development when a controlled parent ignores the reveal, not when it follows", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const { unmount } = render(
        <Disclosure summary="Shipping and returns" findable open={false} onOpenChange={vi.fn()}>
          Orders ship.
        </Disclosure>,
      );
      fireEvent(screen.getByRole("group", { hidden: true }), new Event("beforematch"));
      expect(warn).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining("[olivine] Disclosure:"),
      );
      unmount();
      warn.mockClear();

      function Following() {
        const [open, setOpen] = useState(false);
        return (
          <Disclosure summary="Shipping and returns" findable open={open} onOpenChange={setOpen}>
            Orders ship.
          </Disclosure>
        );
      }
      render(<Following />);
      fireEvent(screen.getByRole("group", { hidden: true }), new Event("beforematch"));
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it("sets hidden=until-found again when a re-render closes it", async () => {
      const view = (open: boolean) => (
        <Disclosure summary="Shipping and returns" findable open={open}>
          Orders ship.
        </Disclosure>
      );
      const { rerender } = render(view(true));
      const panel = screen.getByRole("group");
      expect(panel).not.toHaveAttribute("hidden");
      rerender(view(false));
      await waitFor(() => {
        expect(panel).toHaveAttribute("hidden", "until-found");
      });
      expect(screen.getByRole("group", { hidden: true })).toBe(panel);
      expect(panel).toHaveAttribute("data-state", "closed");
    });

    it("keeps hidden=until-found across a re-render with new children while closed", () => {
      const { rerender } = render(
        <Disclosure summary="Shipping and returns" findable>
          First
        </Disclosure>,
      );
      rerender(
        <Disclosure summary="Shipping and returns" findable>
          Second
        </Disclosure>,
      );
      const panel = screen.getByRole("group", { hidden: true });
      expect(panel).toHaveAttribute("hidden", "until-found");
      expect(panel).toHaveTextContent("Second");
    });

    it("lets a controlled parent decide on beforematch", () => {
      const onOpenChange = vi.fn();
      setup({ findable: true, open: false, onOpenChange });
      fireEvent(screen.getByRole("group", { hidden: true }), new Event("beforematch"));
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
    });

    it("ignores beforematch when it is not findable", () => {
      const onOpenChange = vi.fn();
      setup({ keepMounted: true, onOpenChange });
      fireEvent(screen.getByRole("group", { hidden: true }), new Event("beforematch"));
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("keeps padding on the body, not on the panel", () => {
      const css = readFileSync("src/components/Disclosure/Disclosure.css", "utf8");
      const panelRule = /\.ol-disclosure__panel\s*\{[^}]*\}/.exec(css);
      expect(panelRule).toBeNull();
      expect(css).toMatch(/\.ol-disclosure__body\s*\{[^}]*padding-bottom/);
    });
  });

  describe("forced colours", () => {
    const css = readFileSync("src/components/Disclosure/Disclosure.css", "utf8");
    const block = css.slice(css.indexOf("@media (forced-colors: active)"));

    it("restyles the focus ring, hairlines and disabled text", () => {
      expect(block).toMatch(/outline-color: Highlight/);
      expect(block).toMatch(/border-color: CanvasText/);
      expect(block).toMatch(/\.ol-disclosure__trigger:disabled\s*\{\s*color: GrayText/);
    });

    it("also covers the bare trigger, which a more specific ink-3 rule would otherwise win", () => {
      expect(css).toMatch(
        /\.ol-disclosure--bare \.ol-disclosure__trigger:disabled\s*\{\s*color: var\(--ink-3\)/,
      );
      expect(block).toMatch(
        /\.ol-disclosure--bare \.ol-disclosure__trigger:disabled\s*\{\s*color: GrayText/,
      );
    });
  });

  describe("axe", () => {
    const cases: [string, Partial<DisclosureProps>][] = [
      ["closed", {}],
      ["open", { defaultOpen: true }],
      ["open with a heading", { defaultOpen: true, headingLevel: 3 }],
      ["closed with a heading", { headingLevel: 2 }],
      ["region", { defaultOpen: true, panelRole: "region" }],
      ["bare", { defaultOpen: true, variant: "bare" }],
      ["disabled", { disabled: true, defaultOpen: true }],
      ["keepMounted closed", { keepMounted: true }],
      ["keepMounted open", { keepMounted: true, defaultOpen: true }],
      ["bare closed", { variant: "bare" }],
      ["findable closed", { findable: true }],
      ["findable closed with a heading", { findable: true, headingLevel: 3 }],
      ["findable open", { findable: true, defaultOpen: true }],
    ];
    it.each(cases)("has no violations: %s", async (_name, props) => {
      const { container } = setup(props);
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no violations while closing", async () => {
      const { container, rerender } = render(
        <Disclosure summary="Shipping and returns" open headingLevel={3}>
          Orders ship.
        </Disclosure>,
      );
      holdExit(screen.getByRole("group"));
      rerender(
        <Disclosure summary="Shipping and returns" open={false} headingLevel={3}>
          Orders ship.
        </Disclosure>,
      );
      await flush();
      expect(screen.getByRole("group", { hidden: true })).toHaveAttribute("data-state", "closing");
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });
});
