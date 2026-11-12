import { readFileSync } from "node:fs";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleContext, type OlivineLabels } from "../../locale";
import { en } from "../../locale/en";
import { es } from "../../locale/es";
import { ja } from "../../locale/ja";
import { runAxe } from "../../test/axe";
import { TableOfContents, type TableOfContentsItem } from "./TableOfContents";

// jsdom has neither observer. These stubs let a test fire the crossings and the resizes.
class FakeIntersectionObserver {
  static all: FakeIntersectionObserver[] = [];
  disconnected = false;
  observed: Element[] = [];
  constructor(
    private readonly callback: () => void,
    readonly options: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.all.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve() {
    // not needed
  }
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
  fire() {
    this.callback();
  }
  static get live() {
    return FakeIntersectionObserver.all.filter((o) => !o.disconnected);
  }
}

class FakeResizeObserver {
  static all: FakeResizeObserver[] = [];
  constructor(private readonly callback: () => void) {
    FakeResizeObserver.all.push(this);
  }
  observe() {
    // not needed
  }
  unobserve() {
    // not needed
  }
  disconnect() {
    // not needed
  }
  fire() {
    this.callback();
  }
}

/** Fires the crossing of the newest observer, as the browser does when a heading moves. */
function cross() {
  act(() => {
    FakeIntersectionObserver.live.at(-1)?.fire();
  });
}

const css = readFileSync("src/components/TableOfContents/TableOfContents.css", "utf8");

const labels = (base: OlivineLabels, tocLabel: string): OlivineLabels =>
  Object.assign({}, base, { tocLabel });
const dictionary = {
  en: labels(en, "On this page"),
  es: labels(es, "En esta página"),
  ja: labels(ja, "このページの内容"),
};

function Labelled({
  children,
  locale = "en",
}: {
  children: ReactNode;
  locale?: "en" | "es" | "ja";
}) {
  return <LocaleContext.Provider value={dictionary[locale]}>{children}</LocaleContext.Provider>;
}

const items: TableOfContentsItem[] = [
  { id: "overview", label: "Overview", level: 2 },
  { id: "install", label: "Install", level: 2 },
  { id: "npm", label: "npm", level: 3 },
  { id: "pnpm", label: "pnpm", level: 3 },
  { id: "usage", label: "Usage", level: 2 },
];

/** The headings of the page, positioned by `tops` (px from the top of the viewport). */
const tops: Record<string, number> = {};

/** Ids of headings the test has taken out of the layout (display: none). */
const noBox = new Set<string>();

function Page({ ids = items.map((i) => i.id) }: { ids?: string[] | undefined }) {
  return (
    <main>
      {ids.map((id) => (
        <h2 key={id} id={id} data-nolayout={noBox.has(id) ? "" : undefined}>
          {id}
        </h2>
      ))}
    </main>
  );
}

function scene(props: Partial<React.ComponentProps<typeof TableOfContents>> = {}, ids?: string[]) {
  return render(
    <Labelled>
      <TableOfContents items={items} {...props} />
      <Page ids={ids} />
    </Labelled>,
  );
}

function place(next: Record<string, number>) {
  for (const key of Object.keys(tops)) Reflect.deleteProperty(tops, key);
  Object.assign(tops, next);
}

const current = () => document.querySelector<HTMLElement>('[aria-current="location"]');

beforeEach(() => {
  FakeIntersectionObserver.all = [];
  FakeResizeObserver.all = [];
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  place({});
  noBox.clear();
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const top = tops[this.id] ?? (items.some((i) => i.id === this.id) ? 10000 : 0);
    return {
      top,
      bottom: top + 20,
      left: 0,
      right: 100,
      width: 100,
      height: 20,
      x: 0,
      y: top,
      toJSON: () => ({}),
    };
  });
  // jsdom has no layout: every element has a box unless it is marked `data-nolayout`.
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (this: Element) {
    return (this.hasAttribute("data-nolayout") ? [] : [{}]) as unknown as DOMRectList;
  });
  window.history.replaceState(null, "", window.location.pathname);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("TableOfContents structure", () => {
  it("renders a nav named by the locale, with className, id and native props", () => {
    const ref = createRef<HTMLElement>();
    scene({ ref, className: "extra", id: "toc", "data-x": "1" } as never);
    const nav = screen.getByRole("navigation", { name: "On this page" });
    expect(nav).toHaveClass("ol-toc", "extra");
    expect(nav).toHaveAttribute("id", "toc");
    expect(nav).toHaveAttribute("data-x", "1");
    expect(ref.current).toBe(nav);
  });

  it.each([
    ["es", "En esta página"],
    ["ja", "このページの内容"],
  ] as const)("names the landmark in %s", (locale, name) => {
    render(
      <Labelled locale={locale}>
        <TableOfContents items={items} />
      </Labelled>,
    );
    expect(screen.getByRole("navigation", { name })).toBeInTheDocument();
  });

  it("takes the name from label", () => {
    scene({ label: "Contents of the guide" });
    expect(screen.getByRole("navigation", { name: "Contents of the guide" })).toBeInTheDocument();
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(
      <Labelled>
        <TableOfContents items={[]} />
      </Labelled>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("links to #id by default and to href when given", () => {
    render(
      <Labelled>
        <TableOfContents
          items={[
            { id: "a", label: "A" },
            { id: "b", label: "B", href: "/docs/guide#b" },
          ]}
        />
      </Labelled>,
    );
    expect(screen.getByRole("link", { name: "A" })).toHaveAttribute("href", "#a");
    expect(screen.getByRole("link", { name: "B" })).toHaveAttribute("href", "/docs/guide#b");
  });

  it("nests the lists by level, relative to the smallest one", () => {
    render(
      <Labelled>
        <TableOfContents
          maxDepth={3}
          items={[
            { id: "a", label: "A", level: 2 },
            { id: "b", label: "B", level: 3 },
            { id: "c", label: "C", level: 3 },
            { id: "d", label: "D", level: 2 },
            { id: "e", label: "E", level: 4 },
          ]}
        />
      </Labelled>,
    );
    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(3);
    const [top, firstNested] = lists;
    if (!top || !firstNested) throw new Error("expected nested lists");
    expect(top).not.toHaveClass("ol-toc__list--nested");
    expect(within(top).getAllByRole("listitem", { hidden: false }).length).toBe(5);
    expect(firstNested).toHaveClass("ol-toc__list--nested");
    expect(
      within(firstNested)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(["B", "C"]);
    expect(screen.getByRole("link", { name: "A" })).toHaveAttribute("data-level", "1");
    expect(screen.getByRole("link", { name: "B" })).toHaveAttribute("data-level", "2");
    expect(screen.getByRole("link", { name: "E" })).toHaveAttribute("data-level", "2");
  });

  it("drops entries deeper than maxDepth", () => {
    const deep = [
      { id: "a", label: "A", level: 2 },
      { id: "b", label: "B", level: 3 },
      { id: "c", label: "C", level: 4 },
    ];
    const { rerender } = render(
      <Labelled>
        <TableOfContents items={deep} />
      </Labelled>,
    );
    expect(screen.queryByRole("link", { name: "C" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "B" })).toBeInTheDocument();
    rerender(
      <Labelled>
        <TableOfContents items={deep} maxDepth={1} />
      </Labelled>,
    );
    expect(screen.queryByRole("link", { name: "B" })).not.toBeInTheDocument();
    rerender(
      <Labelled>
        <TableOfContents items={deep} maxDepth={3} />
      </Labelled>,
    );
    expect(screen.getByRole("link", { name: "C" })).toHaveAttribute("data-level", "3");
  });

  it("adds the sticky modifier", () => {
    scene({ sticky: true });
    expect(screen.getByRole("navigation")).toHaveClass("ol-toc--sticky");
  });

  it("draws the stroke as an aria-hidden block indicator", () => {
    scene({ active: "install" });
    const mark = document.querySelector(".ol-indicator");
    expect(mark).toHaveClass("ol-indicator--block");
    expect(mark).toHaveAttribute("aria-hidden", "true");
    expect(mark?.closest(".ol-toc__track")).not.toBeNull();
  });
});

describe("TableOfContents title", () => {
  it("shows the locale's title for true and uses it as the name", () => {
    scene({ title: true });
    const nav = screen.getByRole("navigation", { name: "On this page" });
    const title = screen.getByText("On this page");
    expect(title.tagName).toBe("P");
    expect(nav).toHaveAttribute("aria-labelledby", title.id);
    expect(nav).not.toHaveAttribute("aria-label");
    expect(within(nav).queryByRole("heading")).not.toBeInTheDocument();
  });

  it("renders a custom title", () => {
    scene({ title: <em>Contents</em> });
    expect(screen.getByRole("navigation", { name: "Contents" })).toBeInTheDocument();
  });

  it("shows no title by default or for false", () => {
    scene();
    expect(document.querySelector(".ol-toc__title")).toBeNull();
    expect(screen.getByRole("navigation")).toHaveAttribute("aria-label", "On this page");
  });
});

describe("TableOfContents current entry", () => {
  it("marks the leaf with aria-current location and its ancestors with data-within", () => {
    scene({ active: "npm" });
    const link = screen.getByRole("link", { name: "npm" });
    expect(link).toHaveAttribute("aria-current", "location");
    expect(link).toHaveClass("ol-toc__link--active");
    expect(link).not.toHaveAttribute("data-within");
    const parent = screen.getByRole("link", { name: "Install" });
    expect(parent).toHaveAttribute("data-within");
    expect(parent).not.toHaveAttribute("aria-current");
    expect(document.querySelectorAll("[aria-current]")).toHaveLength(1);
    expect(document.querySelectorAll("[data-within]")).toHaveLength(1);
  });

  it("never uses aria-current page", () => {
    scene({ active: "usage" });
    expect(document.querySelector('[aria-current="page"]')).toBeNull();
  });

  it("marks nothing when no entry is active", () => {
    scene({ active: null });
    expect(document.querySelector("[aria-current]")).toBeNull();
    expect(document.querySelector("[data-within]")).toBeNull();
  });

  it("maps an entry that maxDepth hides to the closest visible one above", () => {
    render(
      <Labelled>
        <TableOfContents
          active="deep"
          items={[
            { id: "a", label: "A", level: 2 },
            { id: "b", label: "B", level: 3 },
            { id: "deep", label: "Deep", level: 4 },
          ]}
        />
      </Labelled>,
    );
    expect(screen.getByRole("link", { name: "B" })).toHaveAttribute("aria-current", "location");
  });

  it("starts at defaultActive when uncontrolled", () => {
    scene({ defaultActive: "usage" });
    expect(current()).toHaveTextContent("Usage");
  });

  it("follows the active prop when controlled and does not move on its own", async () => {
    const onActiveChange = vi.fn();
    scene({ active: "overview", onActiveChange, spy: false });
    await userEvent.click(screen.getByRole("link", { name: "Usage" }));
    expect(onActiveChange).toHaveBeenCalledWith("usage");
    expect(current()).toHaveTextContent("Overview");
  });

  it("moves to the clicked entry at once when uncontrolled", async () => {
    const onActiveChange = vi.fn();
    scene({ onActiveChange, spy: false });
    await userEvent.click(screen.getByRole("link", { name: "Install" }));
    expect(current()).toHaveTextContent("Install");
    expect(onActiveChange).toHaveBeenCalledTimes(1);
    expect(onActiveChange).toHaveBeenCalledWith("install");
  });

  it("measures the stroke onto the current link and leaves the fallback edge until it is ready", () => {
    scene({ active: "install" });
    const track = document.querySelector<HTMLElement>(".ol-toc__track");
    expect(track?.style.getPropertyValue("--ol-indicator-h")).toBe("20px");
    expect(track?.style.getPropertyValue("--ol-indicator-y")).not.toBe("");
  });
});

describe("TableOfContents links", () => {
  it("calls onSelect with the id and the event, and lets preventDefault stop the jump", async () => {
    const onSelect = vi.fn((_id: string, event: React.MouseEvent) => {
      event.preventDefault();
    });
    scene({ onSelect });
    await userEvent.click(screen.getByRole("link", { name: "pnpm" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0]).toBe("pnpm");
    expect(window.location.hash).toBe("");
    expect(current()).toHaveTextContent("pnpm");
  });

  it("follows the link natively when onSelect does not prevent it", async () => {
    scene();
    await userEvent.click(screen.getByRole("link", { name: "Usage" }));
    expect(window.location.hash).toBe("#usage");
  });

  it("ignores modified clicks, which open a tab", () => {
    const onSelect = vi.fn();
    const onActiveChange = vi.fn();
    scene({ onSelect, onActiveChange, spy: false });
    const link = screen.getByRole("link", { name: "Usage" });
    fireEvent.click(link, { ctrlKey: true });
    fireEvent.click(link, { metaKey: true });
    fireEvent.click(link, { button: 1 });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onActiveChange).not.toHaveBeenCalled();
  });
});

describe("TableOfContents keyboard", () => {
  it("tabs through every link in document order, nested ones included", async () => {
    scene();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Install" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "npm" })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole("link", { name: "Install" })).toHaveFocus();
  });

  it("follows the focused link with Enter", async () => {
    const onSelect = vi.fn();
    scene({ onSelect });
    screen.getByRole("link", { name: "Install" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("install", expect.anything());
    expect(window.location.hash).toBe("#install");
  });

  it("has no arrow-key, Home or End handling and never moves focus by itself", async () => {
    scene();
    const first = screen.getByRole("link", { name: "Overview" });
    first.focus();
    await userEvent.keyboard("{ArrowDown}{End}{Home}{ArrowRight}");
    expect(first).toHaveFocus();
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("tree")).toBeNull();
  });

  it("announces nothing: no live region", () => {
    scene({ active: "install" });
    expect(document.querySelector("[aria-live], [role='status'], [role='alert']")).toBeNull();
  });
});

describe("TableOfContents scroll spy", () => {
  it("does nothing without IntersectionObserver but still renders", () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    scene();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("watches the headings and follows the reading line", () => {
    place({ overview: 300, install: 700, npm: 900, pnpm: 1100, usage: 1500 });
    scene({ offset: 80 });
    const observer = FakeIntersectionObserver.live.at(-1);
    expect(observer?.observed.map((el) => el.id)).toEqual(items.map((i) => i.id));
    expect(observer?.options).toMatchObject({ rootMargin: "-80px 0px 0px 0px", threshold: [0, 1] });
    // Above the first heading nothing is current.
    expect(current()).toBeNull();

    place({ overview: 60, install: 460, npm: 660, pnpm: 860, usage: 1260 });
    cross();
    expect(current()).toHaveTextContent("Overview");

    place({ overview: -300, install: 70, npm: 270, pnpm: 470, usage: 870 });
    cross();
    expect(current()).toHaveTextContent("Install");

    place({ overview: -600, install: -230, npm: 60, pnpm: 160, usage: 570 });
    cross();
    expect(current()).toHaveTextContent("npm");
    expect(screen.getByRole("link", { name: "Install" })).toHaveAttribute("data-within");
    expect(document.querySelectorAll("[aria-current]")).toHaveLength(1);

    // Back above the first heading.
    place({ overview: 300, install: 700, npm: 900, pnpm: 1100, usage: 1500 });
    cross();
    expect(current()).toBeNull();
  });

  it("reports changes once", () => {
    const onActiveChange = vi.fn();
    place({ overview: 10, install: 400 });
    scene({ offset: 80, onActiveChange });
    cross();
    cross();
    expect(onActiveChange).toHaveBeenCalledTimes(1);
    expect(onActiveChange).toHaveBeenCalledWith("overview");
  });

  it("keeps defaultActive until the reader reaches a heading", () => {
    place({ overview: 300, install: 700 });
    scene({ offset: 80, defaultActive: "usage" });
    expect(current()).toHaveTextContent("Usage");
    cross();
    expect(current()).toHaveTextContent("Usage");
    place({ overview: 20, install: 420 });
    cross();
    expect(current()).toHaveTextContent("Overview");
  });

  it("skips headings that do not exist in the page", () => {
    place({ overview: 10 });
    scene({ offset: 80 }, ["overview"]);
    expect(FakeIntersectionObserver.live.at(-1)?.observed.map((el) => el.id)).toEqual(["overview"]);
    expect(current()).toHaveTextContent("Overview");
  });

  it("ignores the headings that maxDepth drops, so their section belongs to the entry above", () => {
    place({ overview: -400, install: -100, npm: 20, pnpm: 300, usage: 700 });
    scene({ offset: 80, maxDepth: 1 });
    expect(FakeIntersectionObserver.live.at(-1)?.observed.map((el) => el.id)).toEqual([
      "overview",
      "install",
      "usage",
    ]);
    expect(current()).toHaveTextContent("Install");
  });

  it("takes the default reading line from the scroll margin of the first heading", () => {
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((el, pseudo) => {
      const style = real(el, pseudo);
      return el.id === "overview"
        ? ({
            getPropertyValue: (name: string) =>
              name === "scroll-margin-block-start" ? "72px" : "",
          } as CSSStyleDeclaration)
        : style;
    });
    place({ overview: 50, install: 400 });
    scene();
    expect(FakeIntersectionObserver.live.at(-1)?.options.rootMargin).toBe("-72px 0px 0px 0px");
    expect(current()).toHaveTextContent("Overview");
    place({ overview: -300, install: 100 });
    cross();
    expect(current()).toHaveTextContent("Overview");
    place({ overview: -400, install: 70 });
    cross();
    expect(current()).toHaveTextContent("Install");
  });

  it("lets an explicit offset win over the scroll margin", () => {
    place({ overview: 50 });
    scene({ offset: 10 });
    expect(FakeIntersectionObserver.live.at(-1)?.options.rootMargin).toBe("-10px 0px 0px 0px");
    expect(current()).toBeNull();
  });

  it("rebuilds the observer when offset changes", () => {
    const view = (offset: number) => (
      <Labelled>
        <TableOfContents items={items} offset={offset} />
        <Page />
      </Labelled>
    );
    const { rerender } = render(view(80));
    const first = FakeIntersectionObserver.live.at(-1);
    rerender(view(40));
    expect(first?.disconnected).toBe(true);
    expect(FakeIntersectionObserver.live).toHaveLength(1);
    expect(FakeIntersectionObserver.live[0]?.options.rootMargin).toBe("-40px 0px 0px 0px");
  });

  it("rebuilds the observer when the viewport height changes, and only checks otherwise", () => {
    scene({ offset: 80 });
    const first = FakeIntersectionObserver.live.at(-1);
    act(() => {
      for (const observer of FakeResizeObserver.all) observer.fire();
    });
    expect(FakeIntersectionObserver.live.at(-1)).toBe(first);
    const height = window.innerHeight;
    Object.defineProperty(window, "innerHeight", { configurable: true, value: height + 100 });
    act(() => {
      for (const observer of FakeResizeObserver.all) observer.fire();
    });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
    expect(first?.disconnected).toBe(true);
  });

  it("is idle with spy={false}", () => {
    place({ overview: 10 });
    scene({ spy: false, offset: 80 });
    expect(FakeIntersectionObserver.all).toHaveLength(0);
    expect(current()).toBeNull();
  });

  it("watches inside a scrollRoot, given as an element or as a ref", () => {
    function Panel({ useRefProp }: { useRefProp: boolean }) {
      const panel = useRef<HTMLDivElement | null>(null);
      const [el, setEl] = useState<HTMLDivElement | null>(null);
      return (
        <Labelled>
          <TableOfContents items={items} offset={0} scrollRoot={useRefProp ? panel : el} />
          <div
            data-testid="panel"
            ref={(node) => {
              panel.current = node;
              if (node !== el) setEl(node);
            }}
          >
            <Page />
          </div>
        </Labelled>
      );
    }
    const { unmount } = render(<Panel useRefProp={false} />);
    const panel = screen.getByTestId("panel");
    expect(FakeIntersectionObserver.live.at(-1)?.options.root).toBe(panel);
    unmount();
    render(<Panel useRefProp />);
    expect(FakeIntersectionObserver.live.at(-1)?.options.root).toBe(screen.getByTestId("panel"));
  });

  it("selects the last visible heading when the end of the page is reached", () => {
    const root = document.documentElement;
    Object.defineProperty(root, "scrollHeight", { configurable: true, value: 3000 });
    Object.defineProperty(root, "clientHeight", { configurable: true, value: 700 });
    Object.defineProperty(root, "scrollTop", { configurable: true, value: 2300 });
    place({ overview: -2000, install: -1500, npm: -1000, pnpm: -300, usage: 500 });
    try {
      scene({ offset: 80 });
      // `usage` is in view but never reaches the line: the page cannot scroll further.
      expect(current()).toHaveTextContent("Usage");
      Object.defineProperty(root, "scrollTop", { configurable: true, value: 2000 });
      cross();
      expect(current()).toHaveTextContent("pnpm");
    } finally {
      Reflect.deleteProperty(root, "scrollHeight");
      Reflect.deleteProperty(root, "clientHeight");
      Reflect.deleteProperty(root, "scrollTop");
    }
  });

  it("does not write the hash while scrolling", () => {
    const replace = vi.spyOn(window.history, "replaceState");
    const push = vi.spyOn(window.history, "pushState");
    place({ overview: 10, install: 400 });
    scene({ offset: 80 });
    place({ overview: -400, install: 20 });
    cross();
    expect(current()).toHaveTextContent("Install");
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");
  });

  it("pins a clicked entry until the reader scrolls", async () => {
    place({ overview: 10, install: 400, npm: 600, pnpm: 800, usage: 1200 });
    scene({ offset: 80 });
    expect(current()).toHaveTextContent("Overview");
    await userEvent.click(screen.getByRole("link", { name: "Usage" }));
    expect(current()).toHaveTextContent("Usage");

    // The smooth scroll passes other headings: the stroke stays on the clicked entry.
    place({ overview: -400, install: 20, npm: 220, pnpm: 420, usage: 820 });
    cross();
    expect(current()).toHaveTextContent("Usage");
    place({ overview: -800, install: -400, npm: -200, pnpm: 20, usage: 420 });
    cross();
    expect(current()).toHaveTextContent("Usage");

    // The reader takes over.
    act(() => {
      document.dispatchEvent(new WheelEvent("wheel"));
    });
    cross();
    expect(current()).toHaveTextContent("pnpm");
  });

  it.each([
    ["touchmove", () => new Event("touchmove")],
    ["pointerdown", () => new Event("pointerdown")],
    ["PageDown", () => new KeyboardEvent("keydown", { key: "PageDown" })],
    ["Space", () => new KeyboardEvent("keydown", { key: " " })],
  ])("releases the pin on %s", async (_name, make) => {
    place({ overview: 10, install: 400 });
    scene({ offset: 80 });
    await userEvent.click(screen.getByRole("link", { name: "Usage" }));
    place({ overview: -400, install: 20 });
    cross();
    expect(current()).toHaveTextContent("Usage");
    act(() => {
      document.dispatchEvent(make());
    });
    cross();
    expect(current()).toHaveTextContent("Install");
  });

  it("keeps the pin on Enter, which follows a link", async () => {
    place({ overview: 10, install: 400 });
    scene({ offset: 80 });
    screen.getByRole("link", { name: "Usage" }).focus();
    await userEvent.keyboard("{Enter}");
    place({ overview: -400, install: 20 });
    cross();
    expect(current()).toHaveTextContent("Usage");
  });

  it("skips headings that have no box on the page", () => {
    place({ overview: 10, install: 20, npm: 400 });
    noBox.add("install");
    scene({ offset: 80, maxDepth: 3 });
    expect(FakeIntersectionObserver.live.at(-1)?.observed.map((el) => el.id)).not.toContain(
      "install",
    );
    // The hidden heading is at the line, but it does not count as read.
    expect(current()).toHaveTextContent("Overview");
  });

  it("does not pin a click whose heading is not in the page", async () => {
    place({ overview: 10, install: 400, npm: 600, pnpm: 800, usage: 1200 });
    scene({ offset: 80 }, ["overview", "install", "npm", "pnpm"]);
    await userEvent.click(screen.getByRole("link", { name: "Usage" }));
    expect(current()).toHaveTextContent("Usage");
    // Nothing to scroll to: the spy goes on reading the page.
    place({ overview: -400, install: 20, npm: 220, pnpm: 420 });
    cross();
    expect(current()).toHaveTextContent("Install");
  });

  it("releases the pin when Back leads to an address with no entry, and reads the page again", async () => {
    place({ overview: 10, install: 400, npm: 600, pnpm: 800, usage: 1200 });
    scene({ offset: 80 });
    await userEvent.click(screen.getByRole("link", { name: "Usage" }));
    expect(current()).toHaveTextContent("Usage");
    place({ overview: -400, install: 20, npm: 220, pnpm: 420, usage: 820 });
    cleanupHash("#");
    expect(current()).toHaveTextContent("Install");
    // The pin is gone for good: later crossings move the stroke.
    place({ overview: -800, install: -400, npm: -200, pnpm: 20, usage: 420 });
    cross();
    expect(current()).toHaveTextContent("pnpm");
  });

  it("treats a hash that matches no entry like an empty one", async () => {
    place({ overview: 10, install: 400, npm: 600, pnpm: 800, usage: 1200 });
    scene({ offset: 80 });
    await userEvent.click(screen.getByRole("link", { name: "Usage" }));
    place({ overview: -400, install: 20, npm: 220, pnpm: 420, usage: 820 });
    cleanupHash("#somewhere-else");
    expect(current()).toHaveTextContent("Install");
  });

  it("starts at the hash of the address and keeps it against the spy", () => {
    window.history.replaceState(null, "", "#usage");
    place({ overview: 10, install: 400 });
    const onActiveChange = vi.fn();
    scene({ offset: 80, onActiveChange });
    expect(current()).toHaveTextContent("Usage");
    expect(onActiveChange).toHaveBeenCalledWith("usage");
    cross();
    expect(current()).toHaveTextContent("Usage");
  });

  it("decodes the hash and ignores one that matches no entry", () => {
    window.history.replaceState(null, "", "#caf%C3%A9");
    render(
      <Labelled>
        <TableOfContents
          spy={false}
          items={[
            { id: "café", label: "Café" },
            { id: "b", label: "B" },
          ]}
        />
      </Labelled>,
    );
    expect(current()).toHaveTextContent("Café");
    cleanupHash("#nothing");
    expect(current()).toHaveTextContent("Café");
  });

  it("follows the hash on Back and Forward", () => {
    scene({ spy: false });
    expect(current()).toBeNull();
    cleanupHash("#npm");
    expect(current()).toHaveTextContent("npm");
    cleanupHash("#overview");
    expect(current()).toHaveTextContent("Overview");
  });

  it("stops listening to the hash when it unmounts", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = scene({ spy: false });
    unmount();
    expect(remove).toHaveBeenCalledWith("hashchange", expect.any(Function));
  });
});

function cleanupHash(hash: string) {
  act(() => {
    window.history.replaceState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

describe("TableOfContents items that change", () => {
  it("picks up a list that arrives later and reads the hash then", () => {
    window.history.replaceState(null, "", "#install");
    const view = (list: TableOfContentsItem[]) => (
      <Labelled>
        <TableOfContents items={list} spy={false} />
      </Labelled>
    );
    const { rerender, container } = render(view([]));
    expect(container).toBeEmptyDOMElement();
    rerender(view(items));
    expect(current()).toHaveTextContent("Install");
  });
});

describe("TableOfContents styling contract", () => {
  it("draws the rail with logical properties so it follows the writing direction", () => {
    expect(css).toMatch(/border-inline-start: var\(--stroke-hair\) solid var\(--rule\)/);
    expect(css).not.toMatch(
      /\b(left|right|margin-left|margin-right|padding-left|padding-right)\s*:/,
    );
  });

  it("sets the stroke to the heavy weight", () => {
    expect(css).toMatch(/--ol-indicator-size: var\(--stroke-heavy\)/);
  });

  it("uses only motion tokens for transitions, so reduced motion shortens them", () => {
    const transitions = css.match(/transition[^;]*;/g) ?? [];
    expect(transitions.length).toBeGreaterThan(0);
    for (const t of transitions) {
      expect(t).toMatch(/var\(--dur-[sml]\)/);
      expect(t).toMatch(/var\(--ease-[a-z]+\)/);
      expect(t).not.toMatch(/\d+m?s\b/);
    }
  });

  it("uses no ink-3 text, no uppercase, and hovers only under (hover: hover)", () => {
    expect(css).not.toMatch(/ink-3/);
    expect(css).not.toMatch(/text-transform/);
    expect(css).toMatch(/@media \(hover: hover\) \{\s*\.ol-toc__link:hover/);
  });

  it("maps the rail, the labels and the stroke to system colours in forced-colors mode", () => {
    const block = css.slice(css.indexOf("@media (forced-colors: active)"));
    expect(block).toMatch(/border-inline-start-color: CanvasText/);
    expect(block).toMatch(/color: ButtonText/);
    expect(block).toMatch(
      /\[aria-current="location"\]::before \{[^}]*forced-color-adjust: none[^}]*background: Highlight/s,
    );
    expect(block).not.toMatch(/var\(--/);
  });

  it("shares the sticky offset with the headings and falls back to a space token", () => {
    expect(css).toContain(
      "var(--ol-toc-top, var(--ol-anchor-offset, var(--ol-sticky-offset, var(--space-6))))",
    );
  });

  it("has no class of its own for the stroke: it is the shared block indicator", () => {
    expect(css).not.toContain("ol-toc__mark");
  });

  it("keeps the focus ring inside the row", () => {
    expect(css).toMatch(
      /\.ol-toc__link:focus-visible \{\s*outline-offset: calc\(var\(--focus-offset\) \* -1\)/,
    );
  });
});

describe("TableOfContents accessibility", () => {
  it.each(["washi", "sumi"] as const)("has no axe violations in the %s theme", async (theme) => {
    const { container } = render(
      <div className="ol" data-theme={theme}>
        <Labelled>
          <TableOfContents items={items} active="npm" title />
          <Page />
        </Labelled>
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations in right-to-left text, sticky, without a current entry", async () => {
    const { container } = render(
      <div className="ol" dir="rtl" lang="ar">
        <Labelled>
          <TableOfContents
            sticky
            items={[
              { id: "a", label: "نظرة عامة" },
              { id: "b", label: "التثبيت", level: 2 },
            ]}
          />
        </Labelled>
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations at maxDepth 3", async () => {
    const { container } = render(
      <div className="ol">
        <Labelled>
          <TableOfContents
            maxDepth={3}
            active="c"
            items={[
              { id: "a", label: "A", level: 2 },
              { id: "b", label: "B", level: 3 },
              { id: "c", label: "C", level: 4 },
            ]}
          />
        </Labelled>
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations when the current entry is hidden by maxDepth", async () => {
    const { container } = render(
      <div className="ol">
        <Labelled>
          <TableOfContents
            active="c"
            items={[
              { id: "a", label: "A", level: 2 },
              { id: "b", label: "B", level: 3 },
              { id: "c", label: "C", level: 4 },
            ]}
          />
        </Labelled>
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
    expect(screen.getByRole("link", { name: "B" })).toHaveAttribute("aria-current", "location");
  });

  it("has no axe violations with a custom title", async () => {
    const { container } = render(
      <div className="ol">
        <Labelled>
          <TableOfContents items={items} title={<em>Contents</em>} />
        </Labelled>
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations in Japanese", async () => {
    const { container } = render(
      <div className="ol" lang="ja">
        <Labelled locale="ja">
          <TableOfContents
            title
            active="b"
            items={[
              { id: "a", label: "概要", level: 2 },
              { id: "b", label: "使い方", level: 2 },
            ]}
          />
        </Labelled>
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
    expect(screen.getByRole("navigation", { name: "このページの内容" })).toBeInTheDocument();
  });

  it("has no axe violations after a click has pinned an entry", async () => {
    const { container } = render(
      <div className="ol">
        <Labelled>
          <TableOfContents items={items} />
          <Page />
        </Labelled>
      </div>,
    );
    await userEvent.click(screen.getByRole("link", { name: "Usage" }));
    expect(current()).toHaveTextContent("Usage");
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations with a custom label and no title", async () => {
    const { container } = render(
      <div className="ol">
        <Labelled>
          <TableOfContents items={items} label="Guide contents" />
        </Labelled>
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("gives two indexes on one page distinct names and passes the landmark checks", async () => {
    const { container } = render(
      <div className="ol">
        <Labelled>
          <nav aria-label="Main">
            <a href="#overview">Home</a>
          </nav>
          <TableOfContents items={items} />
          <TableOfContents items={items} label="Chapter contents" />
        </Labelled>
      </div>,
    );
    expect(screen.getByRole("navigation", { name: "On this page" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Chapter contents" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

describe("TableOfContents server markup", () => {
  it("carries the current entry in the HTML, before any script has run", () => {
    const html = renderToString(
      <Labelled>
        <TableOfContents items={items} defaultActive="install" />
      </Labelled>,
    );
    expect(html).toContain('aria-current="location"');
    expect(html).toMatch(/<a[^>]*aria-current="location"[^>]*>Install<\/a>/);
    // The travelling stroke is not measured yet: the link draws its own edge.
    expect(html).not.toContain("data-indicator");
    expect(css).toMatch(/\.ol-toc__link\[aria-current="location"\]::before \{/);
    expect(css).toMatch(
      /\.ol-toc__track\[data-indicator="ready"\] \.ol-toc__link::before \{\s*display: none/,
    );
  });

  it("names the landmark in the HTML and renders nothing for no items", () => {
    expect(
      renderToString(
        <Labelled>
          <TableOfContents items={items} />
        </Labelled>,
      ),
    ).toContain('aria-label="On this page"');
    expect(renderToString(<TableOfContents items={[]} />)).toBe("");
  });
});
