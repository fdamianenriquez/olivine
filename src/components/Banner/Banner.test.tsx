import { readFileSync } from "node:fs";

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, StrictMode, useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Button } from "../Button";
import { Navbar } from "../Navbar";
import { Root } from "../Root";
import { Banner, type BannerProps, type BannerTone } from "./Banner";

stubNoAnimations();

afterEach(() => {
  vi.restoreAllMocks();
});

const flush = () => act(() => Promise.resolve());
const noop = () => undefined;
const TONES = ["neutral", "info", "success", "warning", "danger"] as const;

/** An exit animation the test finishes by hand, as `getAnimations` returns it. */
function holdExit(node: HTMLElement) {
  let resolve: () => void = () => undefined;
  const finished = new Promise<void>((done) => {
    resolve = done;
  });
  const exit = { effect: { getComputedTiming: () => ({ endTime: 300 }) }, finished };
  Object.defineProperty(node, "getAnimations", { value: () => [exit] });
  return resolve;
}

function Controlled(props: Partial<BannerProps>) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Banner
        title="Maintenance"
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        {...props}
      >
        Read-only on Sunday.
      </Banner>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Show again
      </button>
    </>
  );
}

const css = readFileSync("src/components/Banner/Banner.css", "utf8");

describe("Banner", () => {
  describe("structure", () => {
    it("renders a named region with root class, className and native props", () => {
      render(
        <Banner className="x" data-testid="b" id="notice">
          Body
        </Banner>,
      );
      const el = screen.getByRole("region", { name: "Announcement" });
      expect(el).toBe(screen.getByTestId("b"));
      expect(el).toHaveClass("ol-banner", "ol-banner--neutral", "ol-banner--untagged", "x");
      expect(el).toHaveAttribute("id", "notice");
      expect(el).toHaveAttribute("data-state", "open");
      expect(el).toHaveAttribute("data-tone", "neutral");
      expect(el).toHaveTextContent("Body");
    });

    it("forwards the ref to the root element", () => {
      const ref = createRef<HTMLDivElement>();
      render(<Banner ref={ref}>Body</Banner>);
      expect(ref.current).toBe(screen.getByRole("region"));
    });

    it("renders the title as a run-in heading that names the region", () => {
      render(
        <Banner tone="info" title="Maintenance" label="Ignored">
          Read-only on Sunday.
        </Banner>,
      );
      const region = screen.getByRole("region", { name: "Maintenance" });
      const title = screen.getByText("Maintenance");
      expect(title).toHaveClass("ol-banner__title");
      expect(region).toHaveAttribute("aria-labelledby", title.id);
      expect(region).not.toHaveAttribute("aria-label");
      expect(region).toHaveTextContent("Maintenance Read-only on Sunday.");
    });

    it("uses label as the region's name when there is no title", () => {
      render(<Banner label="Site notice">Body</Banner>);
      expect(screen.getByRole("region", { name: "Site notice" })).toBeInTheDocument();
    });

    it("falls back to the localised name when label is empty", () => {
      render(<Banner label="">Body</Banner>);
      expect(screen.getByRole("region", { name: "Announcement" })).toBeInTheDocument();
    });

    it("renders the actions slot", () => {
      render(
        <Banner
          actions={
            <>
              <Button size="s">Update</Button>
              <Button size="s" variant="ghost">
                Later
              </Button>
            </>
          }
        >
          A new version is ready.
        </Banner>,
      );
      const update = screen.getByRole("button", { name: "Update" });
      expect(update.closest(".ol-banner__actions")).not.toBeNull();
      expect(screen.getByRole("button", { name: "Later" })).toBeInTheDocument();
    });

    it("warns in development when more than two actions are given", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(noop);
      render(
        <Banner
          actions={
            <>
              <Button size="s">One</Button>
              <Button size="s">Two</Button>
              <a href="#three">Three</a>
            </>
          }
        >
          Body
        </Banner>,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("Banner: 3 actions"));
    });

    it("does not warn for two actions", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(noop);
      render(
        <Banner
          actions={
            <>
              <Button size="s">One</Button>
              <a href="#two">Two</a>
            </>
          }
        >
          Body
        </Banner>,
      );
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe("tone and tag", () => {
    it("shows no tag for neutral", () => {
      const { container } = render(<Banner>Body</Banner>);
      expect(container.querySelector(".ol-banner__tag")).toBeNull();
      expect(screen.getByRole("region")).not.toHaveTextContent("Memo");
    });

    it.each([
      ["info", "Info"],
      ["success", "Done"],
      ["warning", "Note"],
      ["danger", "Error"],
    ] as [BannerTone, string][])("shows the %s word tag", (tone, word) => {
      const { container } = render(<Banner tone={tone}>Body</Banner>);
      const region = screen.getByRole("region");
      expect(region).toHaveClass(`ol-banner--${tone}`);
      expect(region).not.toHaveClass("ol-banner--untagged");
      expect(container.querySelector(".ol-banner__tag")).toHaveTextContent(word);
    });

    it("lets tag override the word, and adds one to neutral", () => {
      const { rerender, container } = render(
        <Banner tone="danger" tag="Offline">
          Body
        </Banner>,
      );
      expect(container.querySelector(".ol-banner__tag")).toHaveTextContent("Offline");
      expect(screen.getByRole("region")).not.toHaveTextContent("Error");
      rerender(<Banner tag="Demo">Body</Banner>);
      expect(container.querySelector(".ol-banner__tag")).toHaveTextContent("Demo");
      expect(screen.getByRole("region")).not.toHaveClass("ol-banner--untagged");
    });

    it.each(TONES)("never derives the role from tone %s", (tone) => {
      render(<Banner tone={tone}>Body</Banner>);
      expect(screen.getByRole("region")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
    });
  });

  describe("roles and announcements", () => {
    it("is silent by default: a region with no live semantics", () => {
      render(<Banner tone="danger">Body</Banner>);
      const region = screen.getByRole("region");
      expect(region).not.toHaveAttribute("aria-live");
      expect(screen.queryByRole("status")).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("is a status with live='polite'", () => {
      render(
        <Banner live="polite" title="Back online">
          Changes will sync.
        </Banner>,
      );
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("Back online Changes will sync.");
      expect(status).not.toHaveAttribute("aria-label");
      expect(screen.queryByRole("region")).toBeNull();
    });

    it("is an alert with live='assertive'", () => {
      render(<Banner live="assertive">Your session ends in one minute.</Banner>);
      expect(screen.getByRole("alert")).toHaveTextContent("Your session ends in one minute.");
    });

    it.each(["off", "polite", "assertive"] as const)(
      "never uses the banner landmark (live=%s)",
      (live) => {
        const { container } = render(<Banner live={live}>Body</Banner>);
        expect(screen.queryByRole("banner")).toBeNull();
        expect(container.querySelector("header")).toBeNull();
      },
    );
  });

  describe("dismiss", () => {
    it("shows a dismiss button only with onClose", () => {
      const { rerender } = render(<Banner>Body</Banner>);
      expect(screen.queryByRole("button")).toBeNull();
      rerender(<Banner onClose={noop}>Body</Banner>);
      expect(screen.getByRole("button", { name: "Dismiss" })).toHaveClass("ol-banner__close");
    });

    it("calls onClose and unmounts an uncontrolled banner after the exit", async () => {
      const onClose = vi.fn();
      const onExited = vi.fn();
      render(
        <Banner onClose={onClose} onExited={onExited}>
          Body
        </Banner>,
      );
      await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(onClose).toHaveBeenCalledOnce();
      await waitFor(() => {
        expect(screen.queryByRole("region", { hidden: true })).toBeNull();
      });
      expect(onExited).toHaveBeenCalledOnce();
    });

    it.each([
      ["Enter", "{Enter}"],
      ["Space", " "],
    ])("activates the dismiss button with %s", async (_key, keys) => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <Banner open onClose={onClose}>
          Body
        </Banner>,
      );
      screen.getByRole("button", { name: "Dismiss" }).focus();
      await user.keyboard(keys);
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("stays open while controlled until the parent changes open", async () => {
      const onClose = vi.fn();
      const { rerender } = render(
        <Banner open onClose={onClose}>
          Body
        </Banner>,
      );
      await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      await flush();
      expect(onClose).toHaveBeenCalledOnce();
      expect(screen.getByRole("region")).toHaveAttribute("data-state", "open");
      rerender(
        <Banner open={false} onClose={onClose}>
          Body
        </Banner>,
      );
      await waitFor(() => {
        expect(screen.queryByRole("region", { hidden: true })).toBeNull();
      });
    });

    it("renders nothing when it starts closed", () => {
      const { container, rerender } = render(<Banner defaultOpen={false}>Body</Banner>);
      expect(container).toBeEmptyDOMElement();
      rerender(<Banner open={false}>Body</Banner>);
      expect(container).toBeEmptyDOMElement();
    });

    it("does not handle Escape", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Banner onClose={onClose}>Body</Banner>);
      screen.getByRole("button", { name: "Dismiss" }).focus();
      await user.keyboard("{Escape}");
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole("region")).toBeInTheDocument();
    });
  });

  describe("keyboard and focus", () => {
    it("is not a tab stop; Tab moves through the actions, then dismiss", async () => {
      const user = userEvent.setup();
      render(
        <Banner
          onClose={noop}
          actions={
            <>
              <Button size="s">Update</Button>
              <Button size="s" variant="ghost">
                Later
              </Button>
            </>
          }
        >
          A new version is ready.
        </Banner>,
      );
      expect(screen.getByRole("region")).not.toHaveAttribute("tabindex");
      await user.tab();
      expect(screen.getByRole("button", { name: "Update" })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "Later" })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "Dismiss" })).toHaveFocus();
      await user.tab({ shift: true });
      expect(screen.getByRole("button", { name: "Later" })).toHaveFocus();
    });

    it("never takes focus when it appears", async () => {
      const { rerender } = render(
        <>
          <button type="button">Before</button>
          <Banner open={false} onClose={noop}>
            Body
          </Banner>
        </>,
      );
      screen.getByRole("button", { name: "Before" }).focus();
      rerender(
        <>
          <button type="button">Before</button>
          <Banner open onClose={noop}>
            Body
          </Banner>
        </>,
      );
      await flush();
      expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
    });

    it("moves focus to the next focusable element after the banner on dismiss", async () => {
      render(
        <>
          <a href="#top">Top</a>
          <Banner onClose={noop}>Body</Banner>
          <button type="button" disabled>
            Disabled
          </button>
          <div hidden>
            <button type="button">Hidden</button>
          </div>
          <span tabIndex={-1}>Not tabbable</span>
          <a href="#main">Main content</a>
        </>,
      );
      await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(screen.getByRole("link", { name: "Main content" })).toHaveFocus();
    });

    it("skips elements hidden by CSS and focuses the next one that can take focus", async () => {
      render(
        <>
          <Banner onClose={noop}>Body</Banner>
          <button type="button" style={{ display: "none" }}>
            Undisplayed
          </button>
          <div style={{ display: "none" }}>
            <a href="#inside">Inside a hidden block</a>
          </div>
          <a href="#main">Main content</a>
        </>,
      );
      await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(screen.getByRole("link", { name: "Main content" })).toHaveFocus();
    });

    it("falls back to a focusable main when nothing follows", async () => {
      render(
        <>
          <Banner onClose={noop}>Body</Banner>
          <main tabIndex={-1}>Content</main>
        </>,
      );
      await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(screen.getByRole("main")).toHaveFocus();
    });

    it("moves focus to returnFocus when given an element", async () => {
      function WithTarget() {
        const [target, setTarget] = useState<HTMLButtonElement | null>(null);
        return (
          <>
            <button ref={setTarget} type="button">
              Settings
            </button>
            <Banner onClose={noop} returnFocus={target}>
              Body
            </Banner>
            <a href="#next">Next</a>
          </>
        );
      }
      render(<WithTarget />);
      await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(screen.getByRole("button", { name: "Settings" })).toHaveFocus();
    });

    it("calls returnFocus when given a function", async () => {
      const returnFocus = vi.fn(() => {
        screen.getByRole("link", { name: "Elsewhere" }).focus();
      });
      render(
        <>
          <a href="#elsewhere">Elsewhere</a>
          <Banner onClose={noop} returnFocus={returnFocus}>
            Body
          </Banner>
        </>,
      );
      await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(returnFocus).toHaveBeenCalledOnce();
      expect(screen.getByRole("link", { name: "Elsewhere" })).toHaveFocus();
    });

    it("leaves focus alone when it closes without focus inside", async () => {
      render(<Controlled />);
      const again = screen.getByRole("button", { name: "Show again" });
      again.focus();
      act(() => {
        screen.getByRole("button", { name: "Dismiss" }).click();
      });
      await flush();
      expect(again).toHaveFocus();
    });
  });

  describe("motion", () => {
    it("carries no unroll class on first render", () => {
      render(<Banner onClose={noop}>Body</Banner>);
      expect(screen.getByRole("region")).not.toHaveClass("ol-kakejiku");
    });

    it("appears without the unroll when mounted late", () => {
      const { rerender } = render(<div />);
      rerender(
        <div>
          <Banner>Body</Banner>
        </div>,
      );
      expect(screen.getByRole("region")).not.toHaveClass("ol-kakejiku");
    });

    it("unrolls once open turns true after the first render", async () => {
      const user = userEvent.setup();
      render(<Controlled />);
      await user.click(screen.getByRole("button", { name: "Dismiss" }));
      await waitFor(() => {
        expect(screen.queryByRole("region", { hidden: true })).toBeNull();
      });
      await user.click(screen.getByRole("button", { name: "Show again" }));
      const region = screen.getByRole("region");
      expect(region).toHaveClass("ol-kakejiku");
      expect(region).toHaveAttribute("data-state", "open");
    });

    it("rolls up with the kakejiku class, inert, before it unmounts", async () => {
      const onExited = vi.fn();
      const { rerender } = render(
        <Banner open onClose={noop} onExited={onExited}>
          Body
        </Banner>,
      );
      const region = screen.getByRole("region");
      const finish = holdExit(region);
      rerender(
        <Banner open={false} onClose={noop} onExited={onExited}>
          Body
        </Banner>,
      );
      await flush();
      expect(region).toHaveAttribute("data-state", "closing");
      expect(region).toHaveClass("ol-kakejiku");
      expect(region).toHaveAttribute("inert");
      expect(onExited).not.toHaveBeenCalled();
      finish();
      await waitFor(() => {
        expect(screen.queryByRole("region", { hidden: true })).toBeNull();
      });
      expect(onExited).toHaveBeenCalledOnce();
    });

    it("never animates with animated={false} and unmounts at once", async () => {
      const user = userEvent.setup();
      render(<Controlled animated={false} />);
      const region = screen.getByRole("region");
      await user.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(region).not.toHaveClass("ol-kakejiku");
      await waitFor(() => {
        expect(screen.queryByRole("region", { hidden: true })).toBeNull();
      });
      await user.click(screen.getByRole("button", { name: "Show again" }));
      expect(screen.getByRole("region")).not.toHaveClass("ol-kakejiku");
    });

    it("still closes and reopens under reduced motion", async () => {
      const user = userEvent.setup();
      render(
        <div className="ol-reduce-motion">
          <Controlled />
        </div>,
      );
      await user.click(screen.getByRole("button", { name: "Dismiss" }));
      await waitFor(() => {
        expect(screen.queryByRole("region", { hidden: true })).toBeNull();
      });
      await user.click(screen.getByRole("button", { name: "Show again" }));
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("uses only tokens and the shared kakejiku class", () => {
      expect(css).not.toMatch(/@keyframes|animation|transition|prefers-reduced-motion/);
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|\d+(ms|s)\b/i);
      // The only px literals are the breakpoint values of the sticky media query (and its comment).
      const noQueries = css
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/@media \(width >= 720px\) and \(height >= 480px\)/, "");
      expect(noQueries).not.toMatch(/(^|[^-\w])\d+px/m);
      expect(css).toMatch(/--ol-motion-overhang: var\(--space-2\)/);
      const motion = readFileSync("src/styles/motion.css", "utf8");
      expect(motion).toMatch(/\.ol-kakejiku\[data-state="closing"\]/);
    });
  });

  describe("CSS", () => {
    it("rules only the bottom edge, so stacked banners share one line", () => {
      const root = /\.ol-banner \{[^}]*\}/.exec(css)?.[0] ?? "";
      expect(root).toMatch(/border-bottom: var\(--stroke-hair\) solid currentcolor/);
      const screenCss = css.slice(0, css.indexOf("@media (forced-colors: active)"));
      expect(screenCss).not.toMatch(/border-(top|block|inline)|(^|\s)border:\s*var/m);
    });

    it("stacks below 40rem of its own width and is never fixed", () => {
      expect(css).toMatch(/container-type: inline-size/);
      expect(css).toMatch(/@container \(min-width: 40rem\)/);
      expect(css).not.toMatch(/position:\s*fixed/);
    });

    it("is sticky only in a viewport at least 720 wide and 480 tall", () => {
      const query = "@media (width >= 720px) and (height >= 480px) {";
      expect(css).toContain(query);
      const block = css.slice(css.indexOf(query), css.indexOf("}\n}", css.indexOf(query)) + 3);
      expect(block).toMatch(
        /\.ol-banner--sticky \{\s*position: sticky;\s*top: var\(--ol-sticky-top, 0\);\s*z-index: var\(--z-sticky\);\s*\}/,
      );
      // Nowhere else: under the query the strip is static and scrolls away.
      const outside = css.replace(block, "");
      expect(outside).not.toMatch(/position:\s*sticky|ol-banner--sticky/);
      // Opaque, bottom hairline only, no shadow.
      expect(css).not.toMatch(/box-shadow|shadow-block/);
      expect(/\.ol-banner \{[^}]*\}/.exec(css)?.[0]).toMatch(/background: var\(--paper-2\)/);
    });

    it("lets the sticky position win over the zero-specificity kakejiku position", () => {
      const motion = readFileSync("src/styles/motion.css", "utf8");
      expect(motion).toMatch(/:where\(\.ol-kakejiku\) \{\s*position: relative;/);
    });

    it("keeps the tag a bordered word in forced colours", () => {
      const forced = css.slice(css.indexOf("@media (forced-colors: active)"));
      expect(forced).toMatch(
        /\.ol-banner__tag \{[^}]*border: var\(--stroke-hair\) solid CanvasText/,
      );
      expect(css).not.toMatch(/maple|shu/);
    });
  });

  describe("sticky", () => {
    const root = () => document.documentElement;
    const top = (el: Element | null) =>
      (el as HTMLElement | null)?.style.getPropertyValue("--ol-sticky-top");
    // jsdom has no layout and does not load the stylesheets: stand in for the media query with an
    // inline `position: sticky`, and give each strip a height.
    const stuck = { position: "sticky" } as const;
    function mockHeights(heights: Record<string, number>) {
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
        this: HTMLElement,
      ) {
        const key = Object.keys(heights).find((cls) => this.classList.contains(cls));
        return { height: key ? heights[key] : 0 } as DOMRect;
      });
    }

    it("adds the sticky modifier only with sticky", () => {
      const { container, rerender } = render(<Banner>Body</Banner>);
      expect(container.querySelector(".ol-banner")).not.toHaveClass("ol-banner--sticky");
      rerender(<Banner sticky>Body</Banner>);
      expect(container.querySelector(".ol-banner")).toHaveClass("ol-banner--sticky");
    });

    it("stacks under a sticky Navbar and publishes the total offset", () => {
      mockHeights({ "ol-navbar": 56, "ol-banner": 72 });
      const { container, unmount } = render(
        <>
          <Navbar brand="Shirakaba" sticky style={stuck} />
          <Banner sticky style={stuck} title="Connection lost">
            Body
          </Banner>
        </>,
      );
      expect(top(container.querySelector(".ol-navbar"))).toBe("0px");
      expect(top(container.querySelector(".ol-banner"))).toBe("56px");
      expect(root().style.getPropertyValue("--ol-sticky-offset")).toBe("128px");
      unmount();
      expect(root().style.getPropertyValue("--ol-sticky-offset")).toBe("");
    });

    it("stacks above a sticky Navbar when it comes first", () => {
      mockHeights({ "ol-navbar": 56, "ol-banner": 72 });
      const { container, unmount } = render(
        <>
          <Banner sticky style={stuck} title="Site notice">
            Body
          </Banner>
          <Navbar brand="Shirakaba" sticky style={stuck} />
        </>,
      );
      expect(top(container.querySelector(".ol-banner"))).toBe("0px");
      expect(top(container.querySelector(".ol-navbar"))).toBe("72px");
      expect(root().style.getPropertyValue("--ol-sticky-offset")).toBe("128px");
      unmount();
    });

    it("adds nothing while static (a small viewport)", () => {
      mockHeights({ "ol-navbar": 56, "ol-banner": 72 });
      const { unmount } = render(
        <>
          <Navbar brand="Shirakaba" sticky style={stuck} />
          <Banner sticky title="Connection lost">
            Body
          </Banner>
        </>,
      );
      expect(root().style.getPropertyValue("--ol-sticky-offset")).toBe("56px");
      unmount();
    });

    it("keeps its space during the roll-up, then unregisters and cleans the root variable", async () => {
      mockHeights({ "ol-banner": 72 });
      const { rerender } = render(
        <Banner sticky style={stuck} open onClose={noop}>
          Body
        </Banner>,
      );
      expect(root().style.getPropertyValue("--ol-sticky-offset")).toBe("72px");
      const finish = holdExit(screen.getByRole("region"));
      rerender(
        <Banner sticky style={stuck} open={false} onClose={noop}>
          Body
        </Banner>,
      );
      await flush();
      expect(screen.getByRole("region", { hidden: true })).toHaveAttribute("data-state", "closing");
      expect(root().style.getPropertyValue("--ol-sticky-offset")).toBe("72px");
      finish();
      await waitFor(() => {
        expect(screen.queryByRole("region", { hidden: true })).toBeNull();
      });
      expect(root().style.getPropertyValue("--ol-sticky-offset")).toBe("");
    });

    it("does not register without sticky", () => {
      mockHeights({ "ol-banner": 72 });
      const { container, unmount } = render(<Banner style={stuck}>Body</Banner>);
      expect(top(container.querySelector(".ol-banner"))).toBe("");
      expect(root().style.getPropertyValue("--ol-sticky-offset")).toBe("");
      unmount();
    });

    it("keeps the kakejiku unroll on a sticky strip", async () => {
      const user = userEvent.setup();
      render(<Controlled sticky />);
      await user.click(screen.getByRole("button", { name: "Dismiss" }));
      await waitFor(() => {
        expect(screen.queryByRole("region", { hidden: true })).toBeNull();
      });
      await user.click(screen.getByRole("button", { name: "Show again" }));
      const banner = screen.getByRole("region");
      expect(banner).toHaveClass("ol-banner--sticky", "ol-kakejiku");
    });
  });

  describe("appear", () => {
    it("unrolls on a client-only first mount", () => {
      render(<Banner appear>Body</Banner>);
      expect(screen.getByRole("region")).toHaveClass("ol-kakejiku");
    });

    it("keeps the old behaviour without appear", () => {
      render(<Banner>Body</Banner>);
      expect(screen.getByRole("region")).not.toHaveClass("ol-kakejiku");
    });

    it("is turned off by animated={false}", () => {
      render(
        <Banner appear animated={false}>
          Body
        </Banner>,
      );
      expect(screen.getByRole("region")).not.toHaveClass("ol-kakejiku");
    });

    it("unrolls under StrictMode's double render", () => {
      render(
        <StrictMode>
          <Banner appear>Body</Banner>
        </StrictMode>,
      );
      expect(screen.getByRole("region")).toHaveClass("ol-kakejiku");
    });

    it("never unrolls a banner in server markup, during or after hydration", async () => {
      const page = (
        <Banner appear sticky title="Connection lost">
          Body
        </Banner>
      );
      const html = renderToString(page);
      expect(html).not.toContain("ol-kakejiku");
      expect(html).toContain("ol-banner--sticky");

      const container = document.createElement("div");
      container.innerHTML = html;
      document.body.append(container);
      const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const recoverable = vi.fn();
      let hydrated: ReturnType<typeof hydrateRoot> | undefined;
      await act(async () => {
        hydrated = hydrateRoot(container, page, { onRecoverableError: recoverable });
        await Promise.resolve();
      });
      expect(error).not.toHaveBeenCalled();
      expect(recoverable).not.toHaveBeenCalled();
      const banner = container.querySelector(".ol-banner");
      expect(banner).not.toHaveClass("ol-kakejiku");
      // A later render (snapshot now on the client value) still does not start the unroll.
      await act(async () => {
        hydrated?.render(
          <Banner appear sticky title="Connection lost">
            Body changed
          </Banner>,
        );
        await Promise.resolve();
      });
      expect(container.querySelector(".ol-banner")).not.toHaveClass("ol-kakejiku");
      act(() => {
        hydrated?.unmount();
      });
      container.remove();
    });

    it("unrolls in 1ms under reduced motion: the unroll runs on --dur-l, which both switches zero", () => {
      render(
        <div className="ol-reduce-motion">
          <Banner appear>Body</Banner>
        </div>,
      );
      const banner = screen.getByRole("region");
      expect(banner).toBeVisible();
      expect(banner).toHaveClass("ol-kakejiku");
      const motion = readFileSync("src/styles/motion.css", "utf8");
      expect(motion).toMatch(
        /\.ol-kakejiku:not\(\[data-state="closing"\]\) \{\s*animation: ol-unroll-down var\(--dur-l\)/,
      );
      expect(motion).toMatch(/\.ol-reduce-motion \{[^}]*--dur-l: 1ms;/);
      const media = motion.slice(motion.indexOf("@media (prefers-reduced-motion: reduce)"));
      expect(media).toMatch(
        /^@media \(prefers-reduced-motion: reduce\) \{\s*:root \{[^}]*--dur-l: 1ms;/,
      );
    });
  });

  describe("locale", () => {
    it.each([
      ["en", "Error", "Dismiss", "Announcement"],
      ["es", "Error", "Descartar", "Anuncio"],
      ["ja", "エラー", "閉じる", "お知らせ"],
    ] as const)("localises tag, dismiss and label in %s", (locale, word, dismiss, label) => {
      const { container } = render(
        <Root locale={locale}>
          <Banner tone="danger" onClose={noop}>
            Body
          </Banner>
        </Root>,
      );
      expect(container.querySelector(".ol-banner__tag")).toHaveTextContent(word);
      expect(screen.getByRole("button", { name: dismiss })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: label })).toBeInTheDocument();
    });
  });

  describe("axe", () => {
    it("has no violations in each tone", async () => {
      const { container } = render(
        <main>
          {TONES.map((tone) => (
            <Banner
              key={tone}
              tone={tone}
              title={`Title ${tone}`}
              onClose={noop}
              actions={
                <>
                  <Button size="s">Go</Button>
                  <a href="#more">Learn more</a>
                </>
              }
            >
              Body text
            </Banner>
          ))}
        </main>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it.each(["off", "polite", "assertive"] as const)(
      "has no violations as live=%s",
      async (live) => {
        const { container } = render(
          <Banner live={live} tone="warning" onClose={noop}>
            Body text
          </Banner>,
        );
        expect(await runAxe(container)).toHaveNoViolations();
      },
    );

    it.each(["washi", "sumi"] as const)(
      "has no violations sticky under a sticky Navbar, with appear, in %s",
      async (theme) => {
        const { container } = render(
          <div data-theme={theme}>
            <Navbar brand="Shirakaba" sticky links={[{ label: "Shop", href: "#shop" }]} />
            <Banner sticky appear tone="danger" title="Connection lost" onClose={noop}>
              Body text
            </Banner>
            <main>Content</main>
          </div>,
        );
        expect(await runAxe(container)).toHaveNoViolations();
      },
    );

    it("has no violations while closing (inert)", async () => {
      const { container, rerender } = render(
        <main>
          <Banner open tone="info" title="Closing" onClose={noop}>
            Body text
          </Banner>
        </main>,
      );
      const finish = holdExit(screen.getByRole("region"));
      rerender(
        <main>
          <Banner open={false} tone="info" title="Closing" onClose={noop}>
            Body text
          </Banner>
        </main>,
      );
      await flush();
      expect(container.querySelector(".ol-banner")).toHaveAttribute("inert");
      expect(await runAxe(container)).toHaveNoViolations();
      finish();
      await flush();
    });
  });
});
