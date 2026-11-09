import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { CodeBlock } from "./CodeBlock";

const SOURCE = "const ma = 0;\n  if (ma) {\n\n    run();\n  }\n";

/** Stands in for ResizeObserver: tests call `notify()` after they have faked a layout. */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element[] = [];
  constructor(private readonly callback: () => void) {
    FakeResizeObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve = () => undefined;
  disconnect() {
    this.observed = [];
  }
  trigger() {
    this.callback();
  }
}

function notify() {
  act(() => {
    FakeResizeObserver.instances.forEach((o) => {
      o.trigger();
    });
  });
}

/** Fakes the layout of the scroller: jsdom measures every box as 0. */
function layout(pre: HTMLElement, box: { scrollWidth?: number; scrollHeight?: number }) {
  Object.defineProperty(pre, "clientWidth", { configurable: true, value: 300 });
  Object.defineProperty(pre, "clientHeight", { configurable: true, value: 100 });
  Object.defineProperty(pre, "scrollWidth", { configurable: true, value: box.scrollWidth ?? 300 });
  Object.defineProperty(pre, "scrollHeight", {
    configurable: true,
    value: box.scrollHeight ?? 100,
  });
}

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value });
}

const scroller = (container: HTMLElement): HTMLElement => {
  const pre = container.querySelector<HTMLElement>("pre");
  if (!pre) throw new Error("no pre");
  return pre;
};

const live = (container: HTMLElement): HTMLElement => {
  const el = container.querySelector<HTMLElement>(".ol-codeblock__live");
  if (!el) throw new Error("no live region");
  return el;
};

/** The visible state label of the copy button (the one not hidden from assistive tech). */
const visibleState = (button: HTMLElement): string => {
  const active = button.querySelector(".ol-codeblock__state[data-active='true']");
  return active?.textContent.replace(/\s+/g, " ").trim() ?? "";
};

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  FakeResizeObserver.instances = [];
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  writeText = vi.fn().mockResolvedValue(undefined);
  setClipboard({ writeText });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.getSelection()?.removeAllRanges();
});

async function click(el: HTMLElement) {
  await act(() => {
    fireEvent.click(el);
    return Promise.resolve();
  });
}

describe("CodeBlock rendering", () => {
  it("renders figure > pre > code with one line element per source line", () => {
    const { container } = render(<CodeBlock code={SOURCE} />);
    const figure = container.querySelector("figure");
    expect(figure).toHaveClass("ol-codeblock");
    const code = container.querySelector("pre > code.ol-codeblock__code");
    expect(code).not.toBeNull();
    // The trailing newline does not add a sixth, empty line.
    expect(container.querySelectorAll(".ol-codeblock__line")).toHaveLength(5);
    const texts = [...container.querySelectorAll(".ol-codeblock__text")].map((n) => n.textContent);
    expect(texts).toEqual(["const ma = 0;", "  if (ma) {", "", "    run();", "  }"]);
  });

  it("splits on CRLF and CR as well", () => {
    const { container } = render(<CodeBlock code={"a\r\nb\rc"} copyable={false} />);
    expect(
      [...container.querySelectorAll(".ol-codeblock__text")].map((n) => n.textContent),
    ).toEqual(["a", "b", "c"]);
  });

  it("keeps an empty line's height with a line break, and keeps interior empties", () => {
    const { container } = render(<CodeBlock code={"a\n\nb"} copyable={false} />);
    const texts = container.querySelectorAll(".ol-codeblock__text");
    expect(texts).toHaveLength(3);
    expect(texts[1]?.querySelector("br")).not.toBeNull();
    expect(texts[0]?.querySelector("br")).toBeNull();
  });

  it("renders no lines for empty code", () => {
    const { container } = render(<CodeBlock code="" copyable={false} />);
    expect(container.querySelectorAll(".ol-codeblock__line")).toHaveLength(0);
  });

  it("keeps the code, title and language left to right and untranslated, not the button", () => {
    const { container } = render(<CodeBlock code="x" title="a.ts" language="ts" />);
    for (const el of [
      scroller(container),
      screen.getByText("a.ts"),
      container.querySelector(".ol-codeblock__lang"),
    ]) {
      expect(el).toHaveAttribute("translate", "no");
    }
    expect(scroller(container)).toHaveAttribute("dir", "ltr");
    expect(screen.getByText("a.ts")).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("button")).not.toHaveAttribute("translate");
    expect(container.querySelector("figure")).not.toHaveAttribute("translate");
  });

  it("passes className and native attributes to the figure", () => {
    const { container } = render(<CodeBlock code="x" className="extra" data-testid="b" id="blk" />);
    const figure = container.querySelector("figure");
    expect(figure).toHaveClass("ol-codeblock", "extra");
    expect(figure).toHaveAttribute("id", "blk");
    expect(screen.getByTestId("b")).toBe(figure);
  });

  it("forwards the ref to the figure", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<CodeBlock code="x" ref={ref} />);
    expect(ref.current).toBe(container.querySelector("figure"));
  });

  it("adds the language class and data attribute, and shows it in the bar", () => {
    const { container } = render(<CodeBlock code="x" language="tsx" />);
    const code = container.querySelector("code");
    expect(code).toHaveClass("language-tsx");
    expect(code).toHaveAttribute("data-language", "tsx");
    expect(container.querySelector(".ol-codeblock__lang")).toHaveTextContent("tsx");
  });

  it("shows the title as the first-child figcaption", () => {
    render(<CodeBlock code="x" title="app.tsx" />);
    const figure = screen.getByRole("figure");
    expect(within(figure).getByText("app.tsx").tagName).toBe("FIGCAPTION");
    // The figcaption is the first child, as HTML requires, and holds the title only.
    expect(figure.firstElementChild).toBe(within(figure).getByText("app.tsx"));
  });

  it("wraps only on request", () => {
    const { container, rerender } = render(<CodeBlock code="x" />);
    expect(container.querySelector("figure")).not.toHaveClass("ol-codeblock--wrap");
    rerender(<CodeBlock code="x" wrap />);
    expect(container.querySelector("figure")).toHaveClass("ol-codeblock--wrap");
  });

  it("draws a bar only when there is something in it", () => {
    const { container, rerender } = render(<CodeBlock code="x" copyable={false} />);
    expect(container.querySelector("figure")).not.toHaveClass("ol-codeblock--bar");
    rerender(<CodeBlock code="x" copyable={false} title="a.txt" />);
    expect(container.querySelector("figure")).toHaveClass("ol-codeblock--bar");
    rerender(<CodeBlock code="x" />);
    expect(container.querySelector("figure")).toHaveClass("ol-codeblock--bar");
  });

  it("renders on the server without a tab stop", () => {
    const html = renderToString(<CodeBlock code={"a\nb"} title="x.ts" />);
    expect(html).toContain("ol-codeblock");
    expect(html).not.toContain("tabindex");
  });
});

describe("CodeBlock line numbers", () => {
  it("hides the numbers from assistive tech and starts at startLine", () => {
    const { container } = render(<CodeBlock code={"a\nb\nc"} lineNumbers startLine={8} />);
    expect(container.querySelector("figure")).toHaveClass("ol-codeblock--numbered");
    const numbers = [...container.querySelectorAll(".ol-codeblock__no")];
    expect(numbers.map((n) => n.textContent)).toEqual(["8", "9", "10"]);
    numbers.forEach((n) => {
      expect(n).toHaveAttribute("aria-hidden", "true");
    });
    // Two digits in the last number: the gutter is two characters wide.
    expect(container.querySelector("code")?.style.getPropertyValue("--ol-code-digits")).toBe("2");
  });

  it("starts at 1 by default and is off by default", () => {
    const { container, rerender } = render(<CodeBlock code={"a\nb"} />);
    expect(container.querySelector(".ol-codeblock__no")).toBeNull();
    rerender(<CodeBlock code={"a\nb"} lineNumbers />);
    expect(container.querySelector(".ol-codeblock__no")).toHaveTextContent("1");
  });

  it("keeps the numbers out of the text a copy reads from the lines", () => {
    const { container } = render(<CodeBlock code={"a\nb"} lineNumbers />);
    const text = [...container.querySelectorAll(".ol-codeblock__text")].map((n) => n.textContent);
    expect(text.join("\n")).toBe("a\nb");
  });

  it("ignores lineNumbers with children and warns in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { container } = render(
      <CodeBlock code="a" lineNumbers>
        <span>highlighted</span>
      </CodeBlock>,
    );
    expect(container.querySelector(".ol-codeblock__no")).toBeNull();
    expect(container.querySelector("figure")).not.toHaveClass("ol-codeblock--numbered");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("lineNumbers"));
    warn.mockRestore();
  });
});

describe("CodeBlock content slots", () => {
  it("replaces the lines with children but still copies code", async () => {
    const { container } = render(
      <CodeBlock code="real source">
        <span className="tok">coloured</span>
      </CodeBlock>,
    );
    expect(container.querySelector(".tok")).toHaveTextContent("coloured");
    expect(container.querySelector(".ol-codeblock__line")).toBeNull();
    await click(screen.getByRole("button"));
    expect(writeText).toHaveBeenCalledWith("real source");
  });

  it("calls renderLine with each line and its index", () => {
    const renderLine = vi.fn((line: string) => <b>{line.toUpperCase()}</b>);
    const { container } = render(<CodeBlock code={"ab\ncd"} renderLine={renderLine} />);
    expect(renderLine).toHaveBeenCalledWith("ab", 0);
    expect(renderLine).toHaveBeenCalledWith("cd", 1);
    expect([...container.querySelectorAll("b")].map((n) => n.textContent)).toEqual(["AB", "CD"]);
  });

  it("keeps an empty line's height when renderLine returns nothing for it", () => {
    const { container } = render(<CodeBlock code={"a\n\nb"} renderLine={() => null} />);
    expect(
      container.querySelectorAll(".ol-codeblock__text")[1]?.querySelector("br"),
    ).not.toBeNull();
  });
});

describe("CodeBlock copy button", () => {
  it("is named for what it copies and contains its visible word", () => {
    const { rerender } = render(<CodeBlock code="x" />);
    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
    rerender(<CodeBlock code="x" title="app.tsx" />);
    const button = screen.getByRole("button", { name: "Copy app.tsx" });
    // Label in name: the visible "Copy" is part of the accessible name.
    expect(visibleState(button)).toBe("Copy");
    expect(button.getAttribute("aria-label")).toContain(visibleState(button));
  });

  it("is a ghost, small, always-visible button before the code", () => {
    const { container } = render(<CodeBlock code="x" />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("ol-btn--ghost", "ol-btn--s", "ol-codeblock__copy");
    expect(button.compareDocumentPosition(scroller(container))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("is removed with copyable={false}", () => {
    render(<CodeBlock code="x" copyable={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("copies the code prop, not the rendered text", async () => {
    render(<CodeBlock code={"  indented\n\tTab"} lineNumbers />);
    await click(screen.getByRole("button"));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("  indented\n\tTab");
  });

  it("shows Copied, announces it, keeps focus, then resets", async () => {
    vi.useFakeTimers();
    const onCopy = vi.fn();
    const { container } = render(<CodeBlock code="x" title="a.ts" onCopy={onCopy} />);
    const button = screen.getByRole("button", { name: "Copy a.ts" });
    button.focus();
    expect(live(container)).toHaveAttribute("role", "status");
    expect(live(container)).toHaveTextContent("");

    await click(button);
    expect(visibleState(button)).toBe("✓ Copied");
    expect(live(container).textContent.trim()).toBe("Copied to clipboard");
    // The visible word is the name while it shows (label in name); focus stays put.
    expect(button).toHaveAccessibleName("Copied");
    expect(button).toHaveFocus();
    expect(container.querySelector("figure")).toHaveAttribute("data-state", "copied");
    expect(onCopy).toHaveBeenCalledWith("x", true);

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(visibleState(button)).toBe("✓ Copied");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(visibleState(button)).toBe("Copy");
    expect(button).toHaveAccessibleName("Copy a.ts");
    expect(live(container)).toHaveTextContent("");
    expect(container.querySelector("figure")).not.toHaveAttribute("data-state");
    expect(button).toHaveFocus();
  });

  it("holds the result for copiedFor milliseconds", async () => {
    vi.useFakeTimers();
    render(<CodeBlock code="x" copiedFor={500} />);
    const button = screen.getByRole("button");
    await click(button);
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(visibleState(button)).toBe("✓ Copied");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(visibleState(button)).toBe("Copy");
  });

  it("stacks all three labels in the button so its width never changes", () => {
    render(<CodeBlock code="x" />);
    const button = screen.getByRole("button");
    const states = button.querySelectorAll(".ol-codeblock__state");
    expect([...states].map((s) => s.textContent.replace(/\s+/g, " ").trim())).toEqual([
      "Copy",
      "✓ Copied",
      "× Copy failed",
    ]);
    expect(states[0]).not.toHaveAttribute("aria-hidden");
    expect(states[1]).toHaveAttribute("aria-hidden", "true");
    expect(states[2]).toHaveAttribute("aria-hidden", "true");
  });

  it("announces a repeated copy again", async () => {
    vi.useFakeTimers();
    const { container } = render(<CodeBlock code="x" />);
    const button = screen.getByRole("button");
    await click(button);
    const first = live(container).textContent;
    await click(button);
    const second = live(container).textContent;
    await click(button);
    const third = live(container).textContent;
    expect(first.trim()).toBe("Copied to clipboard");
    expect(second).not.toBe(first);
    expect(second.trim()).toBe("Copied to clipboard");
    expect(third).not.toBe(second);
    // Still one timer: the label resets once, 2s after the last copy.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(visibleState(button)).toBe("Copy");
  });

  it("copies with Enter and Space and keeps focus on the button", async () => {
    const user = userEvent.setup();
    // userEvent installs its own clipboard; ours goes back in afterwards.
    setClipboard({ writeText });
    render(<CodeBlock code="x" />);
    const button = screen.getByRole("button");
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(button).toHaveFocus();
    await user.keyboard(" ");
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(button).toHaveFocus();
  });

  it("does not update after unmount", async () => {
    vi.useFakeTimers();
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { unmount } = render(<CodeBlock code="x" />);
    await click(screen.getByRole("button"));
    unmount();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("CodeBlock copy failure", () => {
  it("selects the code, shows Copy failed and announces it when the clipboard rejects", async () => {
    writeText.mockRejectedValue(new DOMException("blocked", "NotAllowedError"));
    const onCopy = vi.fn();
    const { container } = render(
      <CodeBlock code={"first line\nsecond line"} lineNumbers onCopy={onCopy} />,
    );
    const button = screen.getByRole("button");
    button.focus();
    await click(button);

    expect(visibleState(button)).toBe("× Copy failed");
    expect(button).toHaveAccessibleName("Copy failed");
    expect(live(container).textContent.trim()).toBe(
      "Couldn't copy. The code is selected so you can copy it yourself.",
    );
    expect(container.querySelector("figure")).toHaveAttribute("data-state", "failed");
    const selection = window.getSelection();
    expect(selection?.rangeCount).toBe(1);
    expect(selection?.getRangeAt(0).commonAncestorContainer).toBe(container.querySelector("code"));
    expect(selection?.toString()).toContain("first line");
    expect(selection?.toString()).toContain("second line");
    expect(onCopy).toHaveBeenCalledWith("first line\nsecond line", false);
    expect(button).toHaveFocus();
  });

  it("fails the same way when there is no clipboard", async () => {
    setClipboard(undefined);
    const onCopy = vi.fn();
    const { container } = render(<CodeBlock code="alpha" onCopy={onCopy} />);
    await click(screen.getByRole("button"));
    expect(visibleState(screen.getByRole("button"))).toBe("× Copy failed");
    expect(window.getSelection()?.toString()).toContain("alpha");
    expect(live(container).textContent).toContain("Couldn't copy");
    expect(onCopy).toHaveBeenCalledWith("alpha", false);
  });

  it("resets after copiedFor and clears the announcement", async () => {
    vi.useFakeTimers();
    setClipboard(undefined);
    const { container } = render(<CodeBlock code="x" />);
    const button = screen.getByRole("button");
    await click(button);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(visibleState(button)).toBe("Copy");
    expect(live(container)).toHaveTextContent("");
  });

  it("recovers: a later successful copy shows Copied", async () => {
    vi.useFakeTimers();
    writeText.mockRejectedValueOnce(new Error("no"));
    render(<CodeBlock code="x" />);
    const button = screen.getByRole("button");
    await click(button);
    expect(visibleState(button)).toBe("× Copy failed");
    await click(button);
    expect(visibleState(button)).toBe("✓ Copied");
  });
});

describe("CodeBlock scroller", () => {
  it("is neither focusable nor a landmark while the code fits", () => {
    const { container } = render(<CodeBlock code="short" title="a.ts" />);
    layout(scroller(container), {});
    notify();
    const pre = scroller(container);
    expect(pre).not.toHaveAttribute("tabindex");
    expect(pre).not.toHaveAttribute("role");
    expect(pre).not.toHaveAttribute("aria-label");
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("stays a plain block where ResizeObserver does not exist", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const { container } = render(<CodeBlock code="a very long line" title="a.ts" />);
    layout(scroller(container), { scrollWidth: 900 });
    expect(FakeResizeObserver.instances).toHaveLength(0);
    expect(scroller(container)).not.toHaveAttribute("tabindex");
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("observes the scroller and the code", () => {
    const { container } = render(<CodeBlock code="x" />);
    const observed = FakeResizeObserver.instances.flatMap((o) => o.observed);
    expect(observed).toContain(scroller(container));
    expect(observed).toContain(container.querySelector("code"));
  });

  it("becomes a focusable, named region when it overflows sideways", () => {
    const { container } = render(<CodeBlock code="a very long line" title="app.tsx" />);
    layout(scroller(container), { scrollWidth: 900 });
    notify();
    const region = screen.getByRole("region", { name: "app.tsx" });
    expect(region).toBe(scroller(container));
    expect(region).toHaveAttribute("tabindex", "0");
  });

  it("becomes focusable when it overflows vertically", () => {
    const { container } = render(<CodeBlock code="x" />);
    layout(scroller(container), { scrollHeight: 400 });
    notify();
    expect(scroller(container)).toHaveAttribute("tabindex", "0");
  });

  it("goes back to a plain block when it stops overflowing", () => {
    const { container } = render(<CodeBlock code="x" />);
    const pre = scroller(container);
    layout(pre, { scrollWidth: 900 });
    notify();
    expect(pre).toHaveAttribute("tabindex", "0");
    layout(pre, {});
    notify();
    expect(pre).not.toHaveAttribute("tabindex");
    expect(pre).not.toHaveAttribute("role");
  });

  it("names the region by label, then title, then the locale word", () => {
    const { container, rerender } = render(<CodeBlock code="x" label="Install" title="app.tsx" />);
    layout(scroller(container), { scrollWidth: 900 });
    notify();
    expect(scroller(container)).toHaveAttribute("aria-label", "Install");
    rerender(<CodeBlock code="x" title="app.tsx" />);
    expect(scroller(container)).toHaveAttribute("aria-label", "app.tsx");
    rerender(<CodeBlock code="x" />);
    expect(scroller(container)).toHaveAttribute("aria-label", "Code");
  });

  it("puts the copy button first in the tab order, then the scroller only if it overflows", async () => {
    const user = userEvent.setup();
    const { container } = render(<CodeBlock code="x" />);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.tab();
    expect(document.body).toHaveFocus();

    layout(scroller(container), { scrollWidth: 900 });
    notify();
    screen.getByRole("button").focus();
    await user.tab();
    expect(scroller(container)).toHaveFocus();
  });

  it("scrolls natively: it adds no key handling of its own", async () => {
    const user = userEvent.setup();
    const { container } = render(<CodeBlock code="x" />);
    layout(scroller(container), { scrollWidth: 900 });
    notify();
    const pre = scroller(container);
    pre.focus();
    const down = vi.fn();
    pre.addEventListener("keydown", down);
    await user.keyboard("{ArrowRight}{Home}{End}{PageDown}");
    expect(down).toHaveBeenCalledTimes(4);
    expect(pre).toHaveFocus();
  });
});

describe("CodeBlock locales", () => {
  const cases = [
    {
      locale: "en",
      name: "Copy code",
      titled: "Copy app.tsx",
      copy: "Copy",
      copied: "Copied",
      failed: "Copy failed",
      status: "Copied to clipboard",
      region: "Code",
    },
    {
      locale: "es",
      name: "Copiar código",
      titled: "Copiar app.tsx",
      copy: "Copiar",
      copied: "Copiado",
      failed: "No se pudo copiar",
      status: "Copiado al portapapeles",
      region: "Código",
    },
    {
      locale: "ja",
      name: "コードをコピー",
      titled: "app.tsxをコピー",
      copy: "コピー",
      copied: "コピーしました",
      failed: "コピーできません",
      status: "クリップボードにコピーしました",
      region: "コード",
    },
  ] as const;

  for (const c of cases) {
    it(`speaks ${c.locale}`, async () => {
      vi.useFakeTimers();
      const { container } = render(
        <Root locale={c.locale}>
          <CodeBlock code="x" />
          <CodeBlock code="y" title="app.tsx" />
        </Root>,
      );
      expect(screen.getByRole("button", { name: c.name })).toBeInTheDocument();
      const titled = screen.getByRole("button", { name: c.titled });
      expect(visibleState(titled)).toBe(c.copy);
      // Label in name, in every language.
      expect(c.name).toContain(c.copy);
      expect(c.titled).toContain(c.copy);
      await click(titled);
      expect(visibleState(titled)).toBe(`✓ ${c.copied}`);
      expect(container.querySelectorAll(".ol-codeblock__live")[1]?.textContent.trim()).toBe(
        c.status,
      );
      const labels = [...titled.querySelectorAll(".ol-codeblock__state")].map((s) =>
        s.textContent.replace(/\s+/g, " ").trim(),
      );
      expect(labels).toEqual([c.copy, `✓ ${c.copied}`, `× ${c.failed}`]);
    });
  }

  it("names the region in the locale's word", () => {
    const { container } = render(
      <Root locale="es">
        <CodeBlock code="x" />
      </Root>,
    );
    layout(scroller(container), { scrollWidth: 900 });
    notify();
    expect(screen.getByRole("region", { name: "Código" })).toBeInTheDocument();
  });

  it("lets a label override beat the locale", () => {
    render(
      <Root locale="es" labels={{ codeCopy: "Copiar ya" }}>
        <CodeBlock code="x" />
      </Root>,
    );
    expect(visibleState(screen.getByRole("button"))).toBe("Copiar ya");
  });
});

describe("CodeBlock accessibility", () => {
  it("has no axe violations by default, titled, numbered and wrapped", async () => {
    const { container } = render(
      <div>
        <CodeBlock code={SOURCE} />
        <CodeBlock code={SOURCE} title="app.tsx" language="tsx" lineNumbers startLine={98} wrap />
        <CodeBlock code={SOURCE} copyable={false} />
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations once the overflowing scroller is a focusable region", async () => {
    // jsdom has no layout, so axe cannot detect the scroller itself; the story run in a real
    // browser covers `scrollable-region-focusable`. Here the markup of the focusable state is
    // checked for the rules that do apply (region name, tabindex on a named region).
    const { container } = render(<CodeBlock code="a very long line" title="app.tsx" />);
    layout(scroller(container), { scrollWidth: 900 });
    notify();
    expect(scroller(container)).toHaveAttribute("tabindex", "0");
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations after a successful and a failed copy", async () => {
    const { container } = render(<CodeBlock code="x" title="a.ts" />);
    await click(screen.getByRole("button"));
    expect(await runAxe(container)).toHaveNoViolations();
    writeText.mockRejectedValue(new Error("no"));
    await click(screen.getByRole("button"));
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("passes label-content-name-mismatch (WCAG 2.5.3) idle, copied and failed", async () => {
    const options = { rules: { "label-content-name-mismatch": { enabled: true } } };
    const { container } = render(<CodeBlock code="x" title="a.ts" />);
    expect(await runAxe(container, options)).toHaveNoViolations();
    await click(screen.getByRole("button"));
    expect(visibleState(screen.getByRole("button"))).toBe("✓ Copied");
    expect(await runAxe(container, options)).toHaveNoViolations();
    writeText.mockRejectedValue(new Error("no"));
    await click(screen.getByRole("button"));
    expect(visibleState(screen.getByRole("button"))).toBe("× Copy failed");
    expect(await runAxe(container, options)).toHaveNoViolations();
  });
});
