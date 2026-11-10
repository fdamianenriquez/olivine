import { readFileSync } from "node:fs";

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Button } from "../Button";
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
      expect(css).not.toMatch(/(^|[^-\w])\d+px/m);
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

    it("stacks below 40rem of its own width and is never sticky", () => {
      expect(css).toMatch(/container-type: inline-size/);
      expect(css).toMatch(/@container \(min-width: 40rem\)/);
      expect(css).not.toMatch(/position:\s*(sticky|fixed)/);
    });

    it("keeps the tag a bordered word in forced colours", () => {
      const forced = css.slice(css.indexOf("@media (forced-colors: active)"));
      expect(forced).toMatch(
        /\.ol-banner__tag \{[^}]*border: var\(--stroke-hair\) solid CanvasText/,
      );
      expect(css).not.toMatch(/maple|shu/);
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
