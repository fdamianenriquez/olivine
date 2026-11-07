import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { createRef, Profiler } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocaleContext } from "../../locale";
import { en } from "../../locale/en";
import { TableOfContents } from "./TableOfContents";
import type { TableOfContentsItem } from "./tree";
import { useHeadings } from "./useHeadings";

function Article() {
  return (
    <article>
      <h1 id="title">Title</h1>
      <h2 id="install">Install</h2>
      <h3 id="npm">npm</h3>
      <h2 id="usage"> Usage </h2>
      <h4 id="deep">Deep</h4>
    </article>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useHeadings", () => {
  it("returns an empty list on the server", () => {
    function Probe() {
      return <p>{useHeadings().length}</p>;
    }
    expect(renderToString(<Probe />)).toContain("0");
  });

  it("returns an empty list on the first client render, then the headings", () => {
    const seen: TableOfContentsItem[][] = [];
    function Probe() {
      seen.push(useHeadings());
      return null;
    }
    render(
      <>
        <Article />
        <Probe />
      </>,
    );
    expect(seen[0]).toEqual([]);
    expect(seen.at(-1)).toHaveLength(3);
  });

  it("reads h2 and h3 by default, with trimmed text and levels from the tag", () => {
    render(<Article />);
    const { result } = renderHook(() => useHeadings());
    expect(result.current).toEqual([
      { id: "install", label: "Install", level: 2 },
      { id: "npm", label: "npm", level: 3 },
      { id: "usage", label: "Usage", level: 2 },
    ]);
  });

  it("takes a selector, or levels as a shorthand, and the selector wins", () => {
    render(<Article />);
    const byLevels = renderHook(() => useHeadings({ levels: [1, 4] })).result.current;
    expect(byLevels.map((i) => i.id)).toEqual(["title", "deep"]);
    const bySelector = renderHook(() => useHeadings({ selector: "h4", levels: [2] })).result
      .current;
    expect(bySelector.map((i) => i.id)).toEqual(["deep"]);
  });

  it("reads the level from data-toc-level, and 1 for other elements", () => {
    render(
      <div>
        <h2 id="a" data-toc-level="3">
          A
        </h2>
        <p id="b" className="fake">
          B
        </p>
      </div>,
    );
    const { result } = renderHook(() => useHeadings({ selector: "h2, .fake" }));
    expect(result.current).toEqual([
      { id: "a", label: "A", level: 3 },
      { id: "b", label: "B", level: 1 },
    ]);
  });

  it("skips headings without an id, warning once per heading in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <div>
        <h2>No id</h2>
        <h2 id="ok">Ok</h2>
      </div>,
    );
    const { result, rerender } = renderHook(() => useHeadings());
    rerender();
    expect(result.current.map((i) => i.id)).toEqual(["ok"]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/useHeadings/);
  });

  it("skips headings that are marked, or inside a marked element, with data-toc-ignore", () => {
    render(
      <div>
        <h2 id="a" data-toc-ignore="">
          A
        </h2>
        <aside data-toc-ignore="">
          <h2 id="b">B</h2>
        </aside>
        <h2 id="c">C</h2>
      </div>,
    );
    const { result } = renderHook(() => useHeadings());
    expect(result.current.map((i) => i.id)).toEqual(["c"]);
  });

  it("limits the scan to a root given as an element, a ref or a selector", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <>
        <h2 id="outside">Outside</h2>
        <div ref={ref} className="scope" data-testid="scope">
          <h2 id="inside">Inside</h2>
        </div>
      </>,
    );
    const el = screen.getByTestId("scope");
    expect(renderHook(() => useHeadings({ root: el })).result.current.map((i) => i.id)).toEqual([
      "inside",
    ]);
    expect(renderHook(() => useHeadings({ root: ref })).result.current.map((i) => i.id)).toEqual([
      "inside",
    ]);
    expect(
      renderHook(() => useHeadings({ root: ".scope" })).result.current.map((i) => i.id),
    ).toEqual(["inside"]);
    expect(renderHook(() => useHeadings({ root: ".missing" })).result.current).toEqual([]);
  });

  it("keeps the list in step with changes to the page", async () => {
    const { container } = render(
      <div>
        <h2 id="a">A</h2>
      </div>,
    );
    const { result } = renderHook(() => useHeadings());
    expect(result.current.map((i) => i.id)).toEqual(["a"]);

    const added = document.createElement("h2");
    added.id = "b";
    added.textContent = "B";
    act(() => {
      container.firstElementChild?.append(added);
    });
    await waitFor(() => {
      expect(result.current.map((i) => i.id)).toEqual(["a", "b"]);
    });

    act(() => {
      added.textContent = "Renamed";
    });
    await waitFor(() => {
      expect(result.current[1]?.label).toBe("Renamed");
    });
    act(() => {
      added.remove();
    });
    await waitFor(() => {
      expect(result.current.map((i) => i.id)).toEqual(["a"]);
    });
  });

  it("does not hand out a new list when nothing changed", async () => {
    render(
      <div>
        <h2 id="a">A</h2>
      </div>,
    );
    const { result } = renderHook(() => useHeadings());
    const first = result.current;
    document.body.append(document.createElement("div"));
    await Promise.resolve();
    expect(result.current).toBe(first);
  });

  it("never edits the page", () => {
    const { container } = render(<Article />);
    const before = container.innerHTML;
    renderHook(() => useHeadings());
    expect(container.innerHTML).toBe(before);
  });

  it("skips headings inside hidden, aria-hidden or inert elements", () => {
    render(
      <div>
        <section hidden>
          <h2 id="a">A</h2>
        </section>
        <section aria-hidden="true">
          <h2 id="b">B</h2>
        </section>
        <section
          ref={(node) => {
            node?.setAttribute("inert", "");
          }}
        >
          <h2 id="c">C</h2>
        </section>
        <h2 id="d" hidden>
          D
        </h2>
        <h2 id="e">E</h2>
      </div>,
    );
    const { result } = renderHook(() => useHeadings());
    expect(result.current.map((i) => i.id)).toEqual(["e"]);
  });

  it("leaves decorative and ignored parts out of the label, without editing the page", () => {
    const { container } = render(
      <h2 id="a">
        <span aria-hidden="true">#</span> Install <span data-toc-ignore="">beta</span>
        <svg aria-hidden="true">
          <title>icon</title>
        </svg>
      </h2>,
    );
    const before = container.innerHTML;
    const { result } = renderHook(() => useHeadings());
    expect(result.current[0]?.label).toBe("Install");
    expect(container.innerHTML).toBe(before);
  });

  it("scans once for a burst of changes", async () => {
    const { container } = render(
      <div>
        <h2 id="a">A</h2>
      </div>,
    );
    const query = vi.spyOn(Document.prototype, "querySelectorAll");
    const { result } = renderHook(() => useHeadings());
    query.mockClear();
    act(() => {
      for (const id of ["b", "c", "d"]) {
        const h = document.createElement("h2");
        h.id = id;
        h.textContent = id;
        container.firstElementChild?.append(h);
      }
    });
    await waitFor(() => {
      expect(result.current.map((i) => i.id)).toEqual(["a", "b", "c", "d"]);
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("does not loop when the index it feeds is rendered in the page it scans", async () => {
    let commits = 0;
    function App() {
      const items = useHeadings();
      return (
        <LocaleContext.Provider value={en}>
          <TableOfContents items={items} spy={false} />
          <article>
            <h2 id="a">A</h2>
            <h2 id="b">B</h2>
          </article>
        </LocaleContext.Provider>
      );
    }
    render(
      <Profiler
        id="toc"
        onRender={() => {
          commits += 1;
        }}
      >
        <App />
      </Profiler>,
    );
    await waitFor(() => {
      expect(screen.getAllByRole("link")).toHaveLength(2);
    });
    const settled = commits;
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(commits).toBe(settled);
    expect(settled).toBeLessThanOrEqual(3);
  });
});
