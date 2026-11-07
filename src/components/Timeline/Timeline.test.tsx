import { readFileSync } from "node:fs";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { en } from "../../locale/en";
import { es } from "../../locale/es";
import { ja } from "../../locale/ja";
import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Timeline, type TimelineItem, type TimelineStatus } from "./Timeline";

const nov3 = new Date(2026, 10, 3);

const history: TimelineItem[] = [
  {
    id: "a",
    title: "Reservation",
    description: "You pay 30 % and we hold the wood.",
    date: new Date(2026, 9, 22),
  },
  { id: "b", title: "Choosing the boards", description: "We send photos.", date: nov3 },
  {
    id: "c",
    title: "Building",
    description: "Six weeks at the bench.",
    date: new Date(2026, 11, 15),
  },
];

function nth<T>(list: readonly T[], index: number): T {
  const value = list[index];
  if (value === undefined) throw new Error(`No item at ${String(index)}`);
  return value;
}

const itemsOf = () => screen.getAllByRole("listitem");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Timeline", () => {
  describe("structure", () => {
    it("renders an ordered list of entries with className, ref and native props", () => {
      const ref = createRef<HTMLOListElement>();
      render(
        <Timeline
          ref={ref}
          items={history}
          aria-label="Order history"
          className="extra"
          id="t"
          data-x="1"
        />,
      );
      const list = screen.getByRole("list", { name: "Order history" });
      expect(list).toBe(ref.current);
      expect(list.tagName).toBe("OL");
      expect(list).toHaveClass("ol-timeline", "extra");
      expect(list).toHaveAttribute("id", "t");
      expect(list).toHaveAttribute("data-x", "1");
      expect(itemsOf()).toHaveLength(3);
      expect(itemsOf().every((li) => li.classList.contains("ol-timeline__item"))).toBe(true);
    });

    it("keeps the list role explicitly, and lets a caller override it", () => {
      const { rerender } = render(<Timeline items={history} />);
      expect(screen.getByRole("list")).toHaveAttribute("role", "list");
      rerender(<Timeline items={history} role="presentation" />);
      expect(screen.queryByRole("list")).toBeNull();
    });

    it("names the list with aria-labelledby", () => {
      render(
        <>
          <h2 id="h">Releases</h2>
          <Timeline items={history} aria-labelledby="h" />
        </>,
      );
      expect(screen.getByRole("list", { name: "Releases" })).toBeInTheDocument();
    });

    it("keeps the order of the items and never sorts", () => {
      render(<Timeline items={[...history].reverse()} />);
      expect(itemsOf().map((li) => li.querySelector(".ol-timeline__title")?.textContent)).toEqual([
        "Building",
        "Choosing the boards",
        "Reservation",
      ]);
    });

    it("renders nothing without items", () => {
      const { container } = render(<Timeline items={[]} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("shows title, meta, description and content", () => {
      render(
        <Timeline
          items={[
            {
              title: "Shipped",
              meta: "Ana",
              description: "On its way.",
              content: <button type="button">Track</button>,
            },
          ]}
        />,
      );
      const item = nth(itemsOf(), 0);
      expect(within(item).getByText("Shipped")).toHaveClass("ol-timeline__title");
      expect(within(item).getByText("Ana")).toHaveClass("ol-timeline__meta");
      expect(within(item).getByText("On its way.")).toHaveClass("ol-timeline__desc");
      expect(within(item).getByRole("button", { name: "Track" }).parentElement).toHaveClass(
        "ol-timeline__content",
      );
    });

    it("uses the id as the key and falls back to the index", () => {
      const { rerender } = render(
        <Timeline items={[{ id: "x", title: "One" }, { title: "Two" }]} />,
      );
      const first = nth(itemsOf(), 0);
      rerender(
        <Timeline
          items={[{ id: "y", title: "New" }, { id: "x", title: "One" }, { title: "Two" }]}
        />,
      );
      expect(itemsOf()).toHaveLength(3);
      // The entry keyed "x" is the same DOM node after an insertion before it.
      expect(nth(itemsOf(), 1)).toBe(first);
    });

    it("renders the title as a heading only with headingLevel", () => {
      const { rerender } = render(<Timeline items={history} />);
      expect(screen.queryAllByRole("heading")).toHaveLength(0);
      rerender(<Timeline items={history} headingLevel={3} />);
      const headings = screen.getAllByRole("heading", { level: 3 });
      expect(headings).toHaveLength(3);
      expect(nth(headings, 0)).toHaveClass("ol-timeline__title");
      rerender(<Timeline items={history} headingLevel={5} />);
      expect(screen.getAllByRole("heading", { level: 5 })).toHaveLength(3);
    });

    it("makes the title a link with href", () => {
      render(<Timeline items={[{ title: "Release notes", href: "/notes" }, { title: "Plain" }]} />);
      const link = screen.getByRole("link", { name: "Release notes" });
      expect(link).toHaveAttribute("href", "/notes");
      expect(link).toHaveClass("ol-timeline__link");
      expect(screen.getAllByRole("link")).toHaveLength(1);
    });
  });

  describe("dates", () => {
    it("formats a Date in <time> with a machine date", () => {
      render(<Timeline items={history} />);
      const times = document.querySelectorAll("time");
      expect(times).toHaveLength(3);
      expect(nth([...times], 1)).toHaveTextContent("Nov 3, 2026");
      expect(nth([...times], 1)).toHaveAttribute("datetime", "2026-11-03");
      expect(nth([...times], 1)).toHaveClass("ol-timeline__date");
    });

    it("follows the Root locale", () => {
      const view = (locale: string) =>
        render(
          <Root locale={locale}>
            <Timeline items={[{ title: "T", date: nov3 }]} />
          </Root>,
        );
      const { unmount } = view("es");
      expect(document.querySelector("time")).toHaveTextContent("3 nov 2026");
      unmount();
      const second = view("ja");
      expect(document.querySelector("time")).toHaveTextContent("2026/11/03");
      second.unmount();
      view("en-GB");
      expect(document.querySelector("time")).toHaveTextContent("3 Nov 2026");
    });

    it("writes the time with dateFormat and an ISO machine value", () => {
      const at = new Date(Date.UTC(2026, 10, 3, 14, 30));
      render(
        <Timeline
          items={[{ title: "T", date: at }]}
          dateFormat={{ dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }}
        />,
      );
      const time = document.querySelector("time");
      expect(time).toHaveAttribute("datetime", "2026-11-03T14:30:00.000Z");
      expect(time).toHaveTextContent("Nov 3, 2026");
      expect(time).toHaveTextContent("2:30");
    });

    it("takes the machine date in the zone the text uses", () => {
      const late = new Date(Date.UTC(2026, 10, 3, 23, 30));
      render(
        <Timeline
          items={[{ title: "T", date: late }]}
          dateFormat={{ dateStyle: "medium", timeZone: "Asia/Tokyo" }}
        />,
      );
      const time = document.querySelector("time");
      expect(time).toHaveTextContent("Nov 4, 2026");
      expect(time).toHaveAttribute("datetime", "2026-11-04");
    });

    it("renders a text date in <time> only when dateTime is given", () => {
      render(
        <Timeline
          items={[
            { title: "A", date: "Week 3", dateTime: "2026-W45" },
            { title: "B", date: "Week 4" },
          ]}
        />,
      );
      const timed = within(nth(itemsOf(), 0)).getByText("Week 3");
      expect(timed.tagName).toBe("TIME");
      expect(timed).toHaveAttribute("datetime", "2026-W45");
      const plain = within(nth(itemsOf(), 1)).getByText("Week 4");
      expect(plain.tagName).toBe("SPAN");
      expect(plain).toHaveClass("ol-timeline__date");
    });

    it("omits the date when there is none or it is invalid", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(<Timeline items={[{ title: "A" }, { title: "B", date: new Date("nope") }]} />);
      expect(document.querySelectorAll(".ol-timeline__date")).toHaveLength(0);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("invalid `date`"));
    });
  });

  describe("progress", () => {
    const steps: TimelineItem[] = [
      { title: "One" },
      { title: "Two" },
      { title: "Three" },
      { title: "Four" },
    ];

    it("marks only the current item with aria-current=step and derives the states", () => {
      render(<Timeline items={steps} current={2} />);
      expect(itemsOf().map((li) => li.getAttribute("data-state"))).toEqual([
        "done",
        "done",
        "current",
        "upcoming",
      ]);
      expect(itemsOf().map((li) => li.getAttribute("aria-current"))).toEqual([
        null,
        null,
        "step",
        null,
      ]);
    });

    it("has no state and no aria-current without current", () => {
      render(<Timeline items={steps} />);
      for (const li of itemsOf()) {
        expect(li).not.toHaveAttribute("data-state");
        expect(li).not.toHaveAttribute("aria-current");
      }
    });

    it("clamps an out-of-range current and ignores one that is not a number", () => {
      const { rerender } = render(<Timeline items={steps} current={9} />);
      expect(nth(itemsOf(), 3)).toHaveAttribute("aria-current", "step");
      rerender(<Timeline items={steps} current={-4} />);
      expect(nth(itemsOf(), 0)).toHaveAttribute("aria-current", "step");
      rerender(<Timeline items={steps} current={1.9} />);
      expect(nth(itemsOf(), 1)).toHaveAttribute("aria-current", "step");
      rerender(<Timeline items={steps} current={Number.NaN} />);
      expect(document.querySelector("[aria-current]")).toBeNull();
    });

    it("reads completed and upcoming after the title, and nothing for the current item", () => {
      render(<Timeline items={steps} current={1} />);
      expect(nth(itemsOf(), 0)).toHaveTextContent("One, completed");
      expect(nth(itemsOf(), 1).textContent).toBe("Two");
      expect(nth(itemsOf(), 2)).toHaveTextContent("Three, upcoming");
      expect(nth(itemsOf(), 0).querySelector(".ol-sr")).not.toBeNull();
    });

    it("reads the words in the Root locale", () => {
      const words = (locale: "es" | "ja") => {
        const { unmount } = render(
          <Root locale={locale}>
            <Timeline items={steps} current={1} />
          </Root>,
        );
        const text = [0, 2].map((i) => nth(itemsOf(), i).textContent);
        unmount();
        return text;
      };
      expect(words("es")).toEqual(["One, completado", "Three, pendiente"]);
      expect(words("ja")).toEqual(["One, 完了", "Three, 予定"]);
    });

    it("has locale entries for the words", () => {
      expect(en.timeline).toEqual({ completed: "completed", upcoming: "upcoming" });
      expect(es.timeline).toEqual({ completed: "completado", upcoming: "pendiente" });
      expect(ja.timeline).toEqual({ completed: "完了", upcoming: "予定" });
    });

    it("overrides the words with labels", () => {
      render(
        <Timeline
          items={steps}
          current={1}
          labels={{ completed: "finished", upcoming: "later" }}
        />,
      );
      expect(nth(itemsOf(), 0)).toHaveTextContent("One, finished");
      expect(nth(itemsOf(), 3)).toHaveTextContent("Four, later");
    });
  });

  describe("status and markers", () => {
    const statuses: [TimelineStatus, string | null, string][] = [
      ["info", "i", "Info"],
      ["success", "✓", "Done"],
      ["warning", "!", "Note"],
      ["danger", "×", "Error"],
      ["neutral", null, "Memo"],
    ];

    it.each(statuses)(
      "%s: glyph %s hidden from assistive tech, word %s read",
      (status, glyph, word) => {
        render(<Timeline items={[{ title: "Event", status }]} />);
        const item = nth(itemsOf(), 0);
        const marker = item.querySelector(".ol-timeline__marker");
        expect(marker).toHaveAttribute("aria-hidden", "true");
        expect(marker).toHaveAttribute("data-kind", glyph ? "glyph" : "dot");
        expect(marker?.textContent).toBe(glyph ?? "");
        expect(item).toHaveAttribute("data-status", status);
        expect(item).toHaveTextContent(`Event, ${word}`);
      },
    );

    it("reads the status words in Spanish and Japanese", () => {
      const read = (locale: "es" | "ja") => {
        const { unmount } = render(
          <Root locale={locale}>
            <Timeline items={[{ title: "E", status: "warning" }]} />
          </Root>,
        );
        const text = nth(itemsOf(), 0).textContent;
        unmount();
        return text;
      };
      expect(read("es")).toBe("!E, Aviso");
      expect(read("ja")).toBe("!E, 注意");
    });

    it("overrides a status word with labels.tags", () => {
      render(
        <Timeline
          items={[{ title: "E", status: "danger" }]}
          labels={{ tags: { danger: "Failed" } }}
        />,
      );
      expect(nth(itemsOf(), 0)).toHaveTextContent("E, Failed");
    });

    it("keeps progress and status apart: a done step can carry a warning", () => {
      render(
        <Timeline
          items={[{ title: "Shipped", status: "warning" }, { title: "Next" }]}
          current={1}
        />,
      );
      expect(nth(itemsOf(), 0)).toHaveTextContent("Shipped, completed, Note");
    });

    it("numbers the markers through a CSS counter and keeps them decorative", () => {
      render(<Timeline items={history} numbered />);
      for (const marker of document.querySelectorAll(".ol-timeline__marker")) {
        expect(marker).toHaveAttribute("data-kind", "number");
        expect(marker).toHaveAttribute("aria-hidden", "true");
        expect(marker).toBeEmptyDOMElement();
      }
    });

    it("shows a custom marker, hidden from assistive tech, over a status and a number", () => {
      render(
        <Timeline
          numbered
          items={[{ title: "Launch", marker: "★", status: "success" }, { title: "Plain" }]}
        />,
      );
      const marker = nth([...document.querySelectorAll(".ol-timeline__marker")], 0);
      expect(marker).toHaveTextContent("★");
      expect(marker).toHaveAttribute("data-kind", "custom");
      expect(marker).toHaveAttribute("aria-hidden", "true");
      expect(nth(itemsOf(), 0)).toHaveTextContent("Launch, Done");
      expect(nth([...document.querySelectorAll(".ol-timeline__marker")], 1)).toHaveAttribute(
        "data-kind",
        "number",
      );
    });

    it("uses a dot marker by default", () => {
      render(<Timeline items={history} />);
      for (const marker of document.querySelectorAll(".ol-timeline__marker"))
        expect(marker).toHaveAttribute("data-kind", "dot");
    });
  });

  describe("keyboard", () => {
    it("tabs through the title links only, in order, and Enter follows a link", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn((event: Event) => {
        event.preventDefault();
      });
      document.addEventListener("click", onClick);
      try {
        render(
          <Timeline
            current={1}
            items={[
              { title: "One", href: "#one" },
              { title: "Two" },
              { title: "Three", href: "#three" },
            ]}
          />,
        );
        await user.tab();
        expect(screen.getByRole("link", { name: /One/ })).toHaveFocus();
        await user.tab();
        expect(screen.getByRole("link", { name: /Three/ })).toHaveFocus();
        await user.keyboard("{Enter}");
        expect(onClick).toHaveBeenCalledTimes(1);
        await user.tab();
        expect(document.body).toHaveFocus();
      } finally {
        document.removeEventListener("click", onClick);
      }
    });

    it("never moves focus by itself and has no focusable entries", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Timeline items={history} />);
      await user.tab();
      expect(document.body).toHaveFocus();
      rerender(<Timeline items={[...history, { title: "Later" }]} />);
      expect(document.body).toHaveFocus();
      expect(document.querySelectorAll("[tabindex]")).toHaveLength(0);
    });
  });

  describe("entrance", () => {
    class FakeObserver {
      static all: FakeObserver[] = [];
      constructor(
        private readonly callback: (entries: Partial<IntersectionObserverEntry>[]) => void,
      ) {
        FakeObserver.all.push(this);
      }
      observe() {
        // not needed
      }
      disconnect() {
        // not needed
      }
      show() {
        this.callback([
          {
            isIntersecting: true,
            boundingClientRect: { height: 100 } as DOMRectReadOnly,
            intersectionRect: { height: 100 } as DOMRectReadOnly,
            rootBounds: { height: 800 } as DOMRectReadOnly,
          },
        ]);
      }
    }

    function stubObserver() {
      FakeObserver.all = [];
      vi.stubGlobal("IntersectionObserver", FakeObserver);
    }

    it("waits until the list is in view, then plays once", () => {
      stubObserver();
      render(<Timeline items={history} />);
      const list = screen.getByRole("list");
      expect(list).toHaveClass("ol-timeline--draw");
      expect(list).toHaveAttribute("data-enter", "wait");
      act(() => {
        nth(FakeObserver.all, FakeObserver.all.length - 1).show();
      });
      expect(list).toHaveAttribute("data-enter", "in");
    });

    it("sets no hold and no draw class with draw={false}", () => {
      stubObserver();
      render(<Timeline items={history} draw={false} />);
      const list = screen.getByRole("list");
      expect(list).not.toHaveAttribute("data-enter");
      expect(list).not.toHaveClass("ol-timeline--draw");
      expect(FakeObserver.all).toHaveLength(0);
    });

    it("stops holding and drawing when draw changes to false", () => {
      stubObserver();
      const { rerender } = render(<Timeline items={history} />);
      expect(screen.getByRole("list")).toHaveAttribute("data-enter", "wait");
      rerender(<Timeline items={history} draw={false} />);
      expect(screen.getByRole("list")).not.toHaveAttribute("data-enter");
      expect(screen.getByRole("list")).not.toHaveClass("ol-timeline--draw");
    });

    it("indexes the entries for the stagger, capped at 11, and tells the last index", () => {
      const many = Array.from({ length: 30 }, (_, i) => ({ title: `Event ${String(i)}` }));
      render(<Timeline items={many} />);
      const indexes = itemsOf().map((li) => li.style.getPropertyValue("--ol-i"));
      expect(indexes.slice(0, 3)).toEqual(["0", "1", "2"]);
      expect(indexes.at(-1)).toBe("11");
      expect(screen.getByRole("list").style.getPropertyValue("--ol-last")).toBe("11");
    });

    it("keeps a style passed by the caller", () => {
      render(<Timeline items={history} style={{ maxWidth: "40ch" }} />);
      const list = screen.getByRole("list");
      expect(list.style.maxWidth).toBe("40ch");
      expect(list.style.getPropertyValue("--ol-last")).toBe("2");
    });

    function withAnimations(states: string[], looping: string[] = []) {
      const proto = HTMLElement.prototype as unknown as { getAnimations?: unknown };
      Object.defineProperty(proto, "getAnimations", {
        configurable: true,
        value: () => [
          ...states.map((playState) => ({ playState })),
          ...looping.map((playState) => ({
            playState,
            effect: { getComputedTiming: () => ({ iterations: Infinity }) },
          })),
        ],
      });
      return () => {
        delete proto.getAnimations;
      };
    }

    it("drops the entrance class once every animation has ended, so later changes never replay it", () => {
      const restore = withAnimations(["finished", "finished"]);
      try {
        const { rerender } = render(<Timeline items={history} />);
        const list = screen.getByRole("list");
        expect(list).toHaveClass("ol-timeline--draw");
        fireEvent.animationEnd(nth(itemsOf(), 0));
        expect(list).not.toHaveClass("ol-timeline--draw");
        rerender(<Timeline items={[...history, { title: "Later" }]} />);
        expect(screen.getByRole("list")).not.toHaveClass("ol-timeline--draw");
        expect(itemsOf()).toHaveLength(4);
      } finally {
        restore();
      }
    });

    it("ignores looping animations, such as a Spinner in content, when deciding it is over", () => {
      const restore = withAnimations(["finished"], ["running"]);
      try {
        render(<Timeline items={history} />);
        fireEvent.animationEnd(nth(itemsOf(), 0));
        expect(screen.getByRole("list")).not.toHaveClass("ol-timeline--draw");
      } finally {
        restore();
      }
    });

    it("keeps the class while an animation is still running", () => {
      const restore = withAnimations(["finished", "running"]);
      try {
        render(<Timeline items={history} />);
        fireEvent.animationEnd(nth(itemsOf(), 0));
        expect(screen.getByRole("list")).toHaveClass("ol-timeline--draw");
      } finally {
        restore();
      }
    });

    it("renders the finished markup on the server, with no hold", () => {
      const html = renderToString(<Timeline items={history} current={1} />);
      expect(html).not.toContain("data-enter");
      expect(html).toContain("<time");
      expect(html).toContain('aria-current="step"');
    });

    it("keeps the same markup inside a reduced-motion subtree", () => {
      render(
        <div className="ol-reduce-motion">
          <Timeline items={history} current={1} />
        </div>,
      );
      expect(nth(itemsOf(), 1)).toHaveAttribute("aria-current", "step");
      expect(itemsOf()).toHaveLength(3);
    });
  });

  describe("CSS", () => {
    const css = readFileSync("src/components/Timeline/Timeline.css", "utf8");

    it("times every transition and animation with motion tokens only", () => {
      const timings = css.match(/(?:transition|animation(?:-delay)?):[^;]+;/g) ?? [];
      expect(timings.length).toBeGreaterThan(0);
      for (const rule of timings) {
        expect(rule).not.toMatch(/\b\d+(?:\.\d+)?m?s\b/);
        if (!rule.startsWith("animation-play-state"))
          expect(rule).toMatch(/var\(--(?:dur|stagger)/);
      }
      expect(css).not.toMatch(/cubic-bezier|steps\(|blur|bounce|overshoot/);
      expect(css).not.toMatch(/\d\s*(?:ms|s)\b/);
    });

    it("reuses the shared keyframes and moves only clip-path, colour and weight itself", () => {
      expect(css).toMatch(/animation: ol-rise /);
      expect(css).toMatch(/animation: ol-land /);
      expect(css).not.toMatch(/transform|scale\(|translate/);
      expect(css).toMatch(/var\(--ol-enter-state/);
    });

    it("uses tokens for every colour, the figure face for numbers and no uppercase", () => {
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
      expect(css).toMatch(/--text-figure-s-family/);
      expect(css).not.toMatch(/uppercase/);
      expect(css).not.toMatch(/maple|shu\b/);
      expect(css).not.toMatch(/border-radius/);
    });

    it("positions with logical properties only", () => {
      expect(css).not.toMatch(
        /\b(?:left|right|margin-left|margin-right|padding-left|padding-right):/,
      );
    });

    it("adapts to forced colours, with done and upcoming told apart", () => {
      const forced = css.slice(css.indexOf("@media (forced-colors: active)"));
      expect(forced).toMatch(/\[data-state="upcoming"\]::before \{\s*background: GrayText;/);
      expect(forced).toMatch(/\.ol-timeline__item::before \{[^}]*background: CanvasText;/);
      expect(forced).toMatch(/\[data-state="current"\]::before \{\s*background: Highlight;/);
      // The hollow dot beats the generic marker rule only with its own selector.
      expect(forced).toMatch(
        /\[data-state="upcoming"\] \.ol-timeline__marker\[data-kind="dot"\] \{\s*background: Canvas;/,
      );
      expect(forced).not.toMatch(/var\(--paper\)/);
      expect(forced).toMatch(/forced-color-adjust: none/);
    });

    it("animates no layout property and underlines a hovered link with the underline tokens", () => {
      expect(css).not.toMatch(/transition:[^;]*\bwidth\b/);
      expect(css).toMatch(/text-decoration-thickness: var\(--underline-weight\)/);
    });

    it("sizes the number and the multiplication sign for their marker", () => {
      expect(css).toMatch(/\[data-kind="number"\]::before \{[^}]*font-size: var\(--glyph-l\)/);
      expect(css).toMatch(/\[data-status="danger"\][^{]*\{[^}]*font-size: calc\(var\(--glyph-xl\)/);
    });
  });

  describe("axe", () => {
    const full: TimelineItem[] = [
      { title: "Reservation", date: nov3, description: "Paid.", href: "#r" },
      { title: "Boards", date: "Week 3", dateTime: "2026-W45", status: "success" },
      { title: "Building", meta: "Ana", status: "warning", content: <p>Extra</p> },
      { title: "Packing", marker: "◇" },
      { title: "Delivery" },
    ];

    it.each(["washi", "sumi"] as const)("has no violations in %s, history", async (theme) => {
      const { container } = render(
        <Root theme={theme}>
          <Timeline items={full} aria-label="Order history" />
        </Root>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("has no violations with all five statuses together", async () => {
      const { container } = render(
        <Timeline
          aria-label="Statuses"
          items={(["info", "success", "warning", "danger", "neutral"] as const).map((status) => ({
            title: status,
            status,
          }))}
        />,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it.each(["es", "ja"] as const)("has no violations in %s", async (locale) => {
      const { container } = render(
        <Root locale={locale}>
          <Timeline items={full} current={2} aria-label="Process" />
        </Root>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it.each(["washi", "sumi"] as const)(
      "has no violations in %s, numbered process",
      async (theme) => {
        const { container } = render(
          <Root theme={theme}>
            <Timeline items={full} current={2} numbered headingLevel={3} aria-label="Process" />
          </Root>,
        );
        expect(await runAxe(container)).toHaveNoViolations();
      },
    );
  });
});
