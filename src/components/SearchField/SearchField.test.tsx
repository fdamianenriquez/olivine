import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import source from "../../tokens/tokens.json";
import { Field } from "../Field";
import { Modal } from "../Modal";
import { Root } from "../Root";
import { SearchField, type SearchFieldActions, type SearchFieldProps } from ".";
import { matchShortcut } from "./matchShortcut";
import { COMPACT_QUERY } from "./SearchField";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const FRUIT = [
  { value: "apple", label: "Apple" },
  { value: "apricot", label: "Apricot" },
  { value: "banana", label: "Banana" },
];

/** A controlled field, so tests see what the app sees. */
function Search(props: Partial<SearchFieldProps>) {
  const [value, setValue] = useState(props.defaultValue ?? "");
  return (
    <SearchField
      {...props}
      value={value}
      onChange={(next, details) => {
        setValue(next);
        props.onChange?.(next, details);
      }}
    />
  );
}

const box = () => screen.getByRole("searchbox");
const combo = () => screen.getByRole("combobox");
/** SearchField's own live region (not the Combobox's or a Spinner's). */
const status = () =>
  screen.getAllByRole("status").find((el) => el.classList.contains("ol-searchfield__status"));

/** Stubs matchMedia so `(width < 720px)` matches or not, and lets a test flip it. */
function stubViewport(compact: boolean) {
  let matches = compact;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (media: string) => ({
    media,
    get matches() {
      return media === COMPACT_QUERY ? matches : false;
    },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }));
  return (next: boolean) => {
    matches = next;
    act(() => {
      for (const fn of listeners) fn();
    });
  };
}

function inRoot(node: ReactNode, locale = "en") {
  return render(
    <Root locale={locale} platform="other">
      {node}
    </Root>,
  );
}

describe("SearchField — plain", () => {
  it("renders a search landmark around a native search input", () => {
    render(<SearchField placeholder="Search the archive" />);
    const form = screen.getByRole("search");
    expect(form.tagName).toBe("FORM");
    expect(form).not.toHaveAttribute("aria-label");
    const input = box();
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAccessibleName("Search");
    expect(input).toHaveAttribute("enterkeyhint", "search");
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(input).toHaveAttribute("spellcheck", "false");
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(form.querySelector(".ol-searchfield__glyph")).toHaveAttribute("aria-hidden", "true");
  });

  it("names the landmark with landmarkLabel and opts out with landmark={false}", () => {
    const { rerender } = render(<SearchField landmarkLabel="Catalogue" />);
    expect(screen.getByRole("search", { name: "Catalogue" })).toBeInTheDocument();
    rerender(<SearchField landmark={false} />);
    expect(screen.queryByRole("search")).toBeNull();
    expect(box().closest(".ol-searchfield")?.tagName).toBe("DIV");
  });

  it("takes its name from label, aria-label or a Field", () => {
    const { rerender } = render(<SearchField label="Find a print" />);
    expect(box()).toHaveAccessibleName("Find a print");
    rerender(
      <Field label="Archive" hint="Titles and artists">
        <SearchField />
      </Field>,
    );
    expect(box()).toHaveAccessibleName("Archive");
    expect(box()).toHaveAccessibleDescription("Titles and artists");
    expect(box()).not.toHaveAttribute("aria-label");
  });

  it("Enter submits the trimmed query and never an empty one", () => {
    const onSubmit = vi.fn();
    render(<Search onSubmit={onSubmit} />);
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(box(), { target: { value: "   " } });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(box(), { target: { value: "  hokusai　" } });
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    box().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith("hokusai", { source: "enter" });
  });

  it("submits an empty query with submitEmpty", () => {
    const onSubmit = vi.fn();
    render(<Search onSubmit={onSubmit} submitEmpty />);
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("", { source: "enter" });
  });

  it("ignores Enter while an IME composes, including Safari's late Enter", () => {
    const onSubmit = vi.fn();
    render(<Search onSubmit={onSubmit} defaultValue="とうきょう" />);
    const input = box();
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    fireEvent.keyDown(input, { key: "Process" });
    fireEvent.keyDown(input, { key: "Enter", keyCode: 229 });
    // Safari: compositionend first, then the committing Enter with isComposing false.
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Enter submits again once the composition has settled", async () => {
    const onSubmit = vi.fn();
    render(<Search onSubmit={onSubmit} defaultValue="東京" />);
    fireEvent.compositionStart(box());
    fireEvent.compositionEnd(box());
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("東京", { source: "enter" });
  });

  it("shows the clear cell only with text; it clears, keeps focus and announces", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const onChange = vi.fn();
    render(<Search onClear={onClear} onChange={onChange} />);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    await user.type(box(), "kyoto");
    const clear = screen.getByRole("button", { name: "Clear" });
    expect(clear).toHaveAttribute("tabindex", "-1");
    await user.click(clear);
    expect(box()).toHaveValue("");
    expect(box()).toHaveFocus();
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith("", { reason: "clear" });
    expect(status()).toHaveTextContent("Search cleared");
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });

  it("Escape clears the text (native clear prevented), then is left to the container", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Find">
        <Search />
      </Modal>,
    );
    await user.type(box(), "ise");
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    act(() => {
      box().dispatchEvent(escape);
    });
    expect(escape.defaultPrevented).toBe(true);
    expect(box()).toHaveValue("");
    expect(onClose).not.toHaveBeenCalled();
    expect(status()).toHaveTextContent("Search cleared");
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the text on blur", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Search />
        <button type="button">Next</button>
      </>,
    );
    await user.type(box(), "nara");
    await user.tab();
    expect(box()).toHaveValue("nara");
  });

  it("read-only: no clear cell, Escape keeps the text, Enter still submits", () => {
    const onSubmit = vi.fn();
    render(<SearchField readOnly defaultValue="ukiyo-e" onSubmit={onSubmit} />);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(box()).toHaveValue("ukiyo-e");
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("ukiyo-e", { source: "enter" });
  });

  it("disabled: no clear cell, no submit", () => {
    const onSubmit = vi.fn();
    render(<SearchField disabled defaultValue="edo" onSubmit={onSubmit} submitButton />);
    expect(box()).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("a press on the glyph focuses the input", () => {
    const { container } = render(<SearchField />);
    const glyph = container.querySelector(".ol-searchfield__icon");
    const press = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    glyph?.dispatchEvent(press);
    expect(press.defaultPrevented).toBe(true);
    expect(box()).toHaveFocus();
  });

  it("shows a spinner and aria-busy while loading", () => {
    const { container } = render(<SearchField loading />);
    expect(box()).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector(".ol-searchfield__busy")).toHaveAttribute("aria-hidden", "true");
  });

  it("calls the caller's onKeyDown for keys it leaves alone", () => {
    const onKeyDown = vi.fn();
    render(<Search onKeyDown={onKeyDown} />);
    fireEvent.keyDown(box(), { key: "a" });
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(onKeyDown).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(onKeyDown).toHaveBeenCalledTimes(2);
  });

  it("forwards ref to the input and className/style to the root", () => {
    const ref = createRef<HTMLElement>();
    render(<SearchField ref={ref} className="x" style={{ maxWidth: "10px" }} />);
    expect(ref.current).toBe(box());
    expect(screen.getByRole("search")).toHaveClass("ol-searchfield", "x");
    expect(screen.getByRole("search")).toHaveStyle({ maxWidth: "10px" });
  });
});

describe("SearchField — submit and native forms", () => {
  it("the joined button submits with source button", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Search onSubmit={onSubmit} submitButton defaultValue="sesshu" />);
    const button = screen.getByRole("button", { name: "Search" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveClass("ol-btn--solid");
    await user.click(button);
    expect(onSubmit).toHaveBeenCalledWith("sesshu", { source: "button" });
  });

  it("the button submits outside its own landmark too", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Search landmark={false} onSubmit={onSubmit} submitButton defaultValue="kano" />);
    const button = screen.getByRole("button", { name: "Search" });
    expect(button).toHaveAttribute("type", "button");
    await user.click(button);
    expect(onSubmit).toHaveBeenCalledWith("kano", { source: "button" });
  });

  it("without action the form submit is prevented", () => {
    const seen = vi.fn();
    render(<Search defaultValue="x" submitButton />);
    const form = screen.getByRole("search");
    window.addEventListener("submit", (event) => {
      seen(event.defaultPrevented);
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(seen).toHaveBeenCalledWith(true);
    expect(form).not.toHaveAttribute("action");
  });

  it("with action, Enter lets the browser submit the query by name (GET)", () => {
    const onSubmit = vi.fn();
    const submitted = vi.fn();
    render(
      <Search action="/search" method="get" name="q" onSubmit={onSubmit} defaultValue=" tea " />,
    );
    const form = screen.getByRole<HTMLFormElement>("search");
    const listener = (event: Event) => {
      submitted(event.defaultPrevented, new FormData(form).get("q"));
      event.preventDefault(); // jsdom cannot navigate
    };
    window.addEventListener("submit", listener);
    fireEvent.keyDown(box(), { key: "Enter" });
    window.removeEventListener("submit", listener);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("tea", { source: "enter" });
    expect(submitted).toHaveBeenCalledWith(false, " tea ");
  });

  it("with action, an empty query does not reach the browser", () => {
    const submitted = vi.fn();
    render(<Search action="/search" name="q" />);
    window.addEventListener("submit", submitted);
    fireEvent.keyDown(box(), { key: "Enter" });
    window.removeEventListener("submit", submitted);
    expect(submitted).not.toHaveBeenCalled();
  });
});

describe("SearchField — debounced onQueryChange", () => {
  it("fires once per pause, at once on clear, and after a composition", () => {
    vi.useFakeTimers();
    const onQueryChange = vi.fn();
    render(<Search onQueryChange={onQueryChange} />);
    const input = box();
    fireEvent.change(input, { target: { value: "h" } });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.change(input, { target: { value: "hi" } });
    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(onQueryChange).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(onQueryChange).toHaveBeenLastCalledWith("hi");

    // Clear: at once.
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onQueryChange).toHaveBeenCalledTimes(2);
    expect(onQueryChange).toHaveBeenLastCalledWith("");

    // Composition: nothing until compositionend.
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "と" } });
    fireEvent.change(input, { target: { value: "とう" } });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onQueryChange).toHaveBeenCalledTimes(2);
    fireEvent.change(input, { target: { value: "東" } });
    fireEvent.compositionEnd(input);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onQueryChange).toHaveBeenCalledTimes(3);
    expect(onQueryChange).toHaveBeenLastCalledWith("東");
  });

  it("honours a custom debounce and cancels on submit", () => {
    vi.useFakeTimers();
    const onQueryChange = vi.fn();
    render(<Search onQueryChange={onQueryChange} debounce={500} />);
    fireEvent.change(box(), { target: { value: "ink" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onQueryChange).not.toHaveBeenCalled();
    fireEvent.change(box(), { target: { value: "inks" } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onQueryChange).toHaveBeenCalledWith("inks");
  });
});

describe("SearchField — resultCount", () => {
  it("announces the count once it settles, and No results for 0", () => {
    vi.useFakeTimers();
    const { rerender } = render(<SearchField resultCount={4} />);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(status()).toHaveTextContent(/^$/);
    rerender(<SearchField resultCount={1} />);
    rerender(<SearchField resultCount={3} />);
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(status()).toHaveTextContent(/^$/);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(status()).toHaveTextContent("3 results");
    rerender(<SearchField resultCount={0} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(status()).toHaveTextContent("No results");
  });
});

describe("SearchField — suggestions", () => {
  it("composes a free-text Combobox: no trigger cell, glyph inside, type search", async () => {
    const user = userEvent.setup();
    const { container } = render(<Search options={FRUIT} />);
    const input = combo();
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAttribute("enterkeyhint", "search");
    expect(input).toHaveAccessibleName("Search");
    expect(screen.queryByRole("button", { name: "Show options" })).toBeNull();
    expect(container.querySelector(".ol-combobox__start .ol-searchfield__glyph")).not.toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
    await user.type(input, "ap");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("shows no popup and no 'No results' row without options", async () => {
    const user = userEvent.setup();
    render(<Search options={[]} />);
    await user.type(combo(), "zz");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByText("No results")).toBeNull();
  });

  it("Enter on a highlighted suggestion picks and submits it", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onChange = vi.fn();
    render(<Search options={FRUIT} onSubmit={onSubmit} onChange={onChange} />);
    await user.type(combo(), "ap");
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("Apricot", {
      source: "suggestion",
      option: FRUIT[1],
    });
    expect(combo()).toHaveValue("Apricot");
    expect(onChange).toHaveBeenLastCalledWith("Apricot", { reason: "select" });
    expect(combo()).toHaveAttribute("aria-expanded", "false");
  });

  it("a click on a suggestion submits it", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Search options={FRUIT} onSubmit={onSubmit} />);
    await user.type(combo(), "b");
    await user.click(screen.getByRole("option", { name: "Banana" }));
    expect(onSubmit).toHaveBeenCalledWith("Banana", { source: "suggestion", option: FRUIT[2] });
  });

  it("Enter with nothing highlighted submits the text, even one that names an option", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Search options={FRUIT} onSubmit={onSubmit} />);
    await user.type(combo(), "apple");
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("apple", { source: "enter" });
    expect(combo()).toHaveAttribute("aria-expanded", "false");
  });

  it("blur neither submits nor reverts", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <>
        <Search options={FRUIT} onSubmit={onSubmit} />
        <button type="button">Next</button>
      </>,
    );
    await user.type(combo(), "Apple");
    await user.tab();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(combo()).toHaveValue("Apple");
  });

  it("Escape closes the suggestions, then clears, then reaches the container", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Find">
        <Search options={FRUIT} />
      </Modal>,
    );
    await user.type(combo(), "ap");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(combo()).toHaveAttribute("aria-expanded", "false");
    expect(combo()).toHaveValue("ap");
    await user.keyboard("{Escape}");
    expect(combo()).toHaveValue("");
    expect(status()).toHaveTextContent("Search cleared");
    expect(onClose).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("the Combobox clear cell clears through the same path", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const onQueryChange = vi.fn();
    render(<Search options={FRUIT} onClear={onClear} onQueryChange={onQueryChange} debounce={0} />);
    await user.type(combo(), "ap");
    expect(onQueryChange).toHaveBeenLastCalledWith("ap");
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(combo()).toHaveValue("");
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onQueryChange).toHaveBeenLastCalledWith("");
  });

  it("ignores Enter while composing, Safari order included", () => {
    const onSubmit = vi.fn();
    render(<Search options={FRUIT} onSubmit={onSubmit} defaultValue="りんご" />);
    const input = combo();
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("openOnFocus shows the options for an empty field; filter narrows them", async () => {
    const user = userEvent.setup();
    render(
      <Search
        options={FRUIT}
        openOnFocus
        filter={(option, query) => option.value.startsWith(query.toLowerCase())}
      />,
    );
    await user.click(combo());
    expect(screen.getAllByRole("option")).toHaveLength(3);
    await user.type(combo(), "b");
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("submits the text by name in a native form", () => {
    render(<Search options={FRUIT} name="q" defaultValue="pear" />);
    const form = screen.getByRole<HTMLFormElement>("search");
    expect(new FormData(form).get("q")).toBe("pear");
  });

  it("is named by a Field label", () => {
    render(
      <Field label="Fruit search">
        <SearchField options={FRUIT} />
      </Field>,
    );
    expect(combo()).toHaveAccessibleName("Fruit search");
  });
});

describe("SearchField — shortcut", () => {
  it("shows a hint while empty and sets aria-keyshortcuts", async () => {
    const user = userEvent.setup();
    const { container } = inRoot(<Search shortcut="mod+k" />);
    expect(box()).toHaveAttribute("aria-keyshortcuts", "Control+K");
    const hint = container.querySelector(".ol-searchfield__hint");
    expect(hint).toHaveAttribute("aria-hidden", "true");
    expect(hint).toHaveTextContent("Ctrl");
    await user.type(box(), "x");
    expect(container.querySelector(".ol-searchfield__hint")).toBeNull();
  });

  it("focuses the field from anywhere on the page", () => {
    inRoot(
      <>
        <button type="button">Elsewhere</button>
        <Search shortcut="mod+k" />
      </>,
    );
    screen.getByRole("button", { name: "Elsewhere" }).focus();
    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(box()).toHaveFocus();
  });

  it("is ignored while composing, when already handled, inside inert and when disabled", () => {
    const { rerender } = inRoot(<Search shortcut="mod+k" />);
    fireEvent.keyDown(document.body, { key: "k", ctrlKey: true, isComposing: true });
    expect(box()).not.toHaveFocus();
    const handled = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, cancelable: true });
    handled.preventDefault();
    document.body.dispatchEvent(handled);
    expect(box()).not.toHaveFocus();
    rerender(
      <Root platform="other">
        <div inert>
          <Search shortcut="mod+k" />
        </div>
      </Root>,
    );
    fireEvent.keyDown(document.body, { key: "k", ctrlKey: true });
    expect(box()).not.toHaveFocus();
    rerender(
      <Root platform="other">
        <Search shortcut="mod+k" disabled />
      </Root>,
    );
    fireEvent.keyDown(document.body, { key: "k", ctrlKey: true });
    expect(box()).not.toHaveFocus();
    expect(box()).not.toHaveAttribute("aria-keyshortcuts");
  });

  it("a bare key warns in development and is ignored while typing elsewhere", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    inRoot(
      <>
        <input aria-label="Other" />
        <Search shortcut="/" />
      </>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("WCAG 2.1.4"));
    const other = screen.getByRole("textbox", { name: "Other" });
    other.focus();
    fireEvent.keyDown(other, { key: "/" });
    expect(other).toHaveFocus();
    other.blur();
    fireEvent.keyDown(document.body, { key: "/" });
    expect(box()).toHaveFocus();
  });

  it("matches chords per platform", () => {
    const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);
    expect(matchShortcut(key({ key: "k", metaKey: true }), "mod+k", "apple")).toBe(true);
    expect(matchShortcut(key({ key: "k", ctrlKey: true }), "mod+k", "apple")).toBe(false);
    expect(matchShortcut(key({ key: "k", ctrlKey: true }), "mod+k", "unknown")).toBe(true);
    expect(matchShortcut(key({ key: "k", metaKey: true }), "mod+k", "unknown")).toBe(true);
    expect(matchShortcut(key({ key: "k" }), "mod+k", "unknown")).toBe(false);
    expect(matchShortcut(key({ key: "K", ctrlKey: true, shiftKey: true }), "mod+k", "other")).toBe(
      false,
    );
    expect(matchShortcut(key({ key: "˚", code: "KeyK", altKey: true }), "alt+k", "apple")).toBe(
      true,
    );
    expect(matchShortcut(key({ key: "?", shiftKey: true }), "?", "other")).toBe(true);
    expect(matchShortcut(key({ key: "Enter", ctrlKey: true }), "ctrl+enter", "other")).toBe(true);
    expect(matchShortcut(key({ key: "a" }), "mod+shift", "other")).toBe(false);
    expect(matchShortcut(key({ key: "!", code: "Digit1", ctrlKey: true }), "ctrl+1", "other")).toBe(
      true,
    );
    expect(matchShortcut(key({ key: "/", code: "Slash", ctrlKey: true }), "ctrl+.", "other")).toBe(
      false,
    );
  });
});

describe("SearchField — full-screen view", () => {
  it("fullscreen=always: the bar is a button that opens a modal view", async () => {
    const user = userEvent.setup();
    render(
      <Search fullscreen="always" placeholder="Search prints">
        results
      </Search>,
    );
    expect(screen.queryByRole("searchbox")).toBeNull();
    const bar = screen.getByRole("button", { name: "Search Search prints" });
    expect(bar).toHaveAttribute("aria-haspopup", "dialog");
    expect(bar).toHaveAttribute("aria-expanded", "false");
    expect(bar).toHaveTextContent("Search prints");
    await user.click(bar);
    const dialog = screen.getByRole("dialog", { name: "Search" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveClass("ol-kakejiku");
    expect(bar).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getByRole("searchbox")).toHaveFocus();
    expect(within(dialog).getByText("results")).toBeInTheDocument();
    expect(screen.getByRole("search").closest("[inert]")).not.toBeNull();
  });

  it("opens with Enter and Space on the bar", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Search fullscreen="always" onOpenChange={onOpenChange} />);
    screen.getByRole("button", { name: "Search" }).focus();
    await user.keyboard("{Enter}");
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await user.keyboard(" ");
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
  });

  it("traps Tab between the back button, the input and the content", async () => {
    const user = userEvent.setup();
    render(
      <Search fullscreen="always">
        <a href="#r1">Result one</a>
      </Search>,
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    const dialog = screen.getByRole("dialog");
    const input = within(dialog).getByRole("searchbox");
    await user.tab();
    expect(within(dialog).getByRole("link", { name: "Result one" })).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByRole("button", { name: "Close search" })).toHaveFocus();
    await user.tab();
    expect(input).toHaveFocus();
  });

  it("Escape closes the view, keeps the query and returns focus to the bar", async () => {
    const user = userEvent.setup();
    render(<Search fullscreen="always" />);
    const bar = screen.getByRole("button", { name: "Search" });
    await user.click(bar);
    await user.type(within(screen.getByRole("dialog")).getByRole("searchbox"), "sharaku");
    await user.keyboard("{Escape}");
    expect(bar).toHaveFocus();
    expect(bar).toHaveTextContent("sharaku");
    expect(bar).toHaveAccessibleName("Search sharaku");
    // The view rolls up while inert, then unmounts.
    const view = screen.getByRole("dialog", { hidden: true });
    expect(view).toHaveAttribute("data-state", "closing");
    expect(view).toHaveAttribute("inert");
    fireEvent.animationEnd(view);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("ignores an Escape that ends a composition", async () => {
    const user = userEvent.setup();
    render(<Search fullscreen="always" />);
    await user.click(screen.getByRole("button", { name: "Search" }));
    const input = within(screen.getByRole("dialog")).getByRole("searchbox");
    fireEvent.compositionStart(input);
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.getByRole("dialog")).toHaveAttribute("data-state", "open");
  });

  it("the back button closes it", async () => {
    const user = userEvent.setup();
    render(<Search fullscreen="always" />);
    const bar = screen.getByRole("button", { name: "Search" });
    await user.click(bar);
    await user.click(screen.getByRole("button", { name: "Close search" }));
    expect(bar).toHaveAttribute("aria-expanded", "false");
    expect(bar).toHaveFocus();
  });

  it("Enter submits and closes (closeOnSubmit); closeOnSubmit={false} keeps it open", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender } = render(<Search fullscreen="always" onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.keyboard("hiroshige{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("hiroshige", { source: "enter" });
    const bar = screen.getByRole("button", { name: "Search hiroshige" });
    expect(bar).toHaveAttribute("aria-expanded", "false");
    expect(bar).toHaveFocus();
    rerender(<Search fullscreen="always" onSubmit={onSubmit} closeOnSubmit={false} />);
    await user.click(bar);
    await user.keyboard("{Enter}");
    expect(bar).toHaveAttribute("aria-expanded", "true");
  });

  it("suggestions in the view: picking submits and closes; Escape closes them first", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Search fullscreen="always" options={FRUIT} onSubmit={onSubmit} />);
    const bar = screen.getByRole("button", { name: "Search" });
    await user.click(bar);
    await user.keyboard("ap");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(within(screen.getByRole("dialog")).getByRole("combobox")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(bar).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("Apple", { source: "suggestion", option: FRUIT[0] });
    expect(bar).toHaveAttribute("aria-expanded", "false");
    expect(bar).toHaveTextContent("Apple");
  });

  it("compact: a bar below 720px, docked above; crossing the breakpoint closes the view", async () => {
    const user = userEvent.setup();
    const setCompact = stubViewport(true);
    const onOpenChange = vi.fn();
    render(<Search fullscreen="compact" onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    setCompact(false);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("button", { name: "Search" })).toBeNull();
    expect(within(screen.getByRole("search")).getByRole("searchbox")).toBeInTheDocument();
  });

  it("never opens when disabled", async () => {
    const user = userEvent.setup();
    render(<Search fullscreen="always" disabled />);
    const bar = screen.getByRole("button", { name: "Search" });
    expect(bar).toBeDisabled();
    await user.click(bar);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is controlled through open / onOpenChange", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <SearchField fullscreen="always" open={false} onOpenChange={onOpenChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<SearchField fullscreen="always" open onOpenChange={onOpenChange} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("a Field label names the bar, the view and its input", async () => {
    const user = userEvent.setup();
    render(
      <Field label="Prints">
        <SearchField fullscreen="always" name="q" defaultValue="wave" />
      </Field>,
    );
    const bar = screen.getByRole("button", { name: "Prints wave" });
    expect(new FormData(screen.getByRole<HTMLFormElement>("search")).get("q")).toBe("wave");
    await user.click(bar);
    const dialog = screen.getByRole("dialog", { name: "Prints" });
    expect(within(dialog).getByRole("searchbox", { name: "Prints" })).toHaveFocus();
  });

  it("the shortcut opens the view and the hint sits in the bar", () => {
    const { container } = inRoot(<Search fullscreen="always" shortcut="mod+k" />);
    const bar = screen.getByRole("button", { name: "Search" });
    expect(bar).toHaveAttribute("aria-keyshortcuts", "Control+K");
    expect(container.querySelector(".ol-searchfield__bar .ol-searchfield__hint")).not.toBeNull();
    fireEvent.keyDown(document.body, { key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("keeps the in-app reduced-motion setting on the portalled view", async () => {
    const user = userEvent.setup();
    render(
      <div className={REDUCE_MOTION_CLASS}>
        <Search fullscreen="always" />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    const view = screen.getByRole("dialog");
    expect(view.closest(".ol-portal")).toHaveClass(REDUCE_MOTION_CLASS);
  });

  it("announces in the view while it is open", async () => {
    const user = userEvent.setup();
    render(<Search fullscreen="always" defaultValue="a" />);
    await user.click(screen.getByRole("button", { name: "Search a" }));
    const dialog = screen.getByRole("dialog");
    await user.keyboard("{Escape}");
    // Escape closes the view (it does not clear); the region is back in the landmark.
    expect(dialog).toHaveAttribute("data-state", "closing");
    expect(screen.getByRole("search").querySelector("[role=status]")).not.toBeNull();
  });
});

describe("SearchField — full-screen bar naming and view details", () => {
  it("names the bar by its label and visible text, without a description", () => {
    const { rerender } = render(<SearchField fullscreen="always" placeholder="Search prints" />);
    const bar = screen.getByRole("button", { name: "Search Search prints" });
    expect(bar).not.toHaveAttribute("aria-label");
    expect(bar).not.toHaveAttribute("aria-describedby");
    // A placeholder that repeats the label is not read twice.
    rerender(<SearchField fullscreen="always" placeholder="Search" />);
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    rerender(<SearchField fullscreen="always" aria-labelledby="ext" value="wave" />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-labelledby",
      expect.stringMatching(/^ext \S+-value$/),
    );
  });

  it("puts only button attributes on the bar", () => {
    const onKeyDown = vi.fn();
    render(
      <SearchField
        fullscreen="always"
        maxLength={20}
        inputMode="search"
        pattern="[a-z]+"
        data-testid="bar"
        title="Find prints"
        onKeyDown={onKeyDown}
      />,
    );
    const bar = screen.getByTestId("bar");
    expect(bar.tagName).toBe("BUTTON");
    expect(bar).not.toHaveAttribute("maxlength");
    expect(bar).not.toHaveAttribute("inputmode");
    expect(bar).not.toHaveAttribute("pattern");
    expect(bar).toHaveAttribute("title", "Find prints");
    fireEvent.keyDown(bar, { key: "a" });
    expect(onKeyDown).toHaveBeenCalled();
  });

  it("has no axe violations with the bar closed, a placeholder and a value", async () => {
    const { container } = render(
      <>
        <SearchField fullscreen="always" placeholder="Search prints" landmarkLabel="Empty" />
        <SearchField fullscreen="always" defaultValue="wave" landmarkLabel="Filled" />
        <Field label="Prints" hint="Titles or artists">
          <SearchField fullscreen="always" placeholder="Hokusai" landmark={false} />
        </Field>
      </>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("crossing the breakpoint with the view open moves focus to the docked input", async () => {
    const user = userEvent.setup();
    const setCompact = stubViewport(true);
    render(<Search fullscreen="compact" />);
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(within(screen.getByRole("dialog")).getByRole("searchbox")).toHaveFocus();
    setCompact(false);
    expect(within(screen.getByRole("search")).getByRole("searchbox")).toHaveFocus();
  });

  it("the view input keeps the Field description and validity", async () => {
    const user = userEvent.setup();
    render(
      <Field label="Prints" hint="Titles or artists" error="Too short">
        <SearchField fullscreen="always" />
      </Field>,
    );
    await user.click(screen.getByRole("button", { name: "Prints" }));
    const input = within(screen.getByRole("dialog")).getByRole("searchbox");
    expect(input).toHaveAccessibleDescription(expect.stringContaining("Too short"));
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("the view input with suggestions keeps the Field description too", async () => {
    const user = userEvent.setup();
    render(
      <Field label="Prints" hint="Titles or artists">
        <SearchField fullscreen="always" options={FRUIT} />
      </Field>,
    );
    await user.click(screen.getByRole("button", { name: "Prints" }));
    expect(within(screen.getByRole("dialog")).getByRole("combobox")).toHaveAccessibleDescription(
      "Titles or artists",
    );
  });

  it("a message spoken in the view is not read again in the bar", async () => {
    const user = userEvent.setup();
    render(<Search fullscreen="always" defaultValue="ise" />);
    await user.click(screen.getByRole("button", { name: "Search ise" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Search cleared")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close search" }));
    expect(status()).toHaveTextContent(/^$/);
  });

  it("says No results for a count of 0 in every locale", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <Root locale="es">
        <SearchField resultCount={2} />
      </Root>,
    );
    rerender(
      <Root locale="es">
        <SearchField resultCount={0} />
      </Root>,
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(status()).toHaveTextContent("Sin resultados");
  });
});

describe("SearchField — actionRef", () => {
  it("focuses, clears, opens and closes", () => {
    const actions = createRef<SearchFieldActions>();
    const onClear = vi.fn();
    const { rerender } = render(
      <SearchField actionRef={actions} defaultValue="x" onClear={onClear} />,
    );
    act(() => {
      actions.current?.focus();
    });
    expect(box()).toHaveFocus();
    act(() => {
      actions.current?.clear();
    });
    expect(box()).toHaveValue("");
    expect(onClear).toHaveBeenCalled();
    rerender(<SearchField actionRef={actions} fullscreen="always" />);
    act(() => {
      actions.current?.open();
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    act(() => {
      actions.current?.close();
    });
    expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    act(() => {
      actions.current?.focus();
    });
    expect(screen.getByRole("button", { name: "Search" })).toHaveFocus();
  });
});

describe("SearchField — locale, tokens and accessibility", () => {
  it.each([
    ["en", "Search", "Close search"],
    ["es", "Buscar", "Cerrar búsqueda"],
    ["ja", "検索", "検索を閉じる"],
  ])("speaks %s", async (locale, search, back) => {
    const user = userEvent.setup();
    inRoot(<Search fullscreen="always" />, locale);
    await user.click(screen.getByRole("button", { name: search }));
    expect(screen.getByRole("button", { name: back })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: search })).toBeInTheDocument();
  });

  it("uses the bp-md token value for the compact query", () => {
    const bp = source.layout.tokens.find((token) => token.name === "bp-md")?.value;
    expect(bp).toBeDefined();
    expect(COMPACT_QUERY).toBe(`(width < ${String(bp)})`);
  });

  it("has no axe violations: plain, with a button, in a Field", async () => {
    const { container } = render(
      <>
        <SearchField defaultValue="kiyonaga" shortcut="mod+k" loading />
        <SearchField landmarkLabel="Catalogue" submitButton line size="l" />
        <Field label="Prints" hint="Titles or artists">
          <SearchField landmark={false} />
        </Field>
      </>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations with suggestions open", async () => {
    const user = userEvent.setup();
    render(<Search options={FRUIT} />);
    await user.type(combo(), "ap");
    // The test page has no main landmark around the portalled popup.
    expect(
      await runAxe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });

  it("has no axe violations with the view open", async () => {
    const user = userEvent.setup();
    render(
      <Search fullscreen="always" options={FRUIT}>
        <p>Recent searches</p>
      </Search>,
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.keyboard("ap");
    expect(
      await runAxe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});

describe("SearchField — review follow-ups", () => {
  stubNoAnimations();

  it("keeps the shortcut after the breakpoint is crossed with the view open", async () => {
    const user = userEvent.setup();
    const setCompact = stubViewport(true);
    inRoot(
      <>
        <button type="button">Elsewhere</button>
        <Search fullscreen="compact" shortcut="mod+k" />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    setCompact(false);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    screen.getByRole("button", { name: "Elsewhere" }).focus();
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true }),
    );
    expect(within(screen.getByRole("search")).getByRole("searchbox")).toHaveFocus();
  });

  it("an Enter that ends a composition never submits, with modifiers too", () => {
    const onSubmit = vi.fn();
    render(<Search onSubmit={onSubmit} defaultValue="kana" />);
    const notCancelled = fireEvent.keyDown(box(), { key: "Enter", shiftKey: true, keyCode: 229 });
    expect(notCancelled).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("an Escape that ends a composition does not close a Modal around the field", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Find">
        <Search defaultValue="kana" />
      </Modal>,
    );
    fireEvent.keyDown(box(), { key: "Escape", keyCode: 229 });
    expect(onClose).not.toHaveBeenCalled();
    expect(box()).toHaveValue("kana");
  });

  it("with options and resultCount only SearchField announces a count", async () => {
    const user = userEvent.setup();
    render(<Search options={FRUIT} resultCount={undefined} />);
    await user.type(combo(), "a");
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(document.querySelector(".ol-combobox__live")?.textContent ?? "").toBe("");
  });

  it("has no axe violations when disabled or read-only, plain and as a bar", async () => {
    const { container } = render(
      <>
        <SearchField disabled landmarkLabel="Disabled" />
        <SearchField readOnly defaultValue="kano" landmarkLabel="Read-only" />
        <SearchField fullscreen="always" disabled landmarkLabel="Disabled bar" />
        <SearchField fullscreen="always" readOnly landmarkLabel="Read-only bar" />
      </>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
