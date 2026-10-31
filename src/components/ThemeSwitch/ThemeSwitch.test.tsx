import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { type ThemeName, ThemeSwitch } from "./ThemeSwitch";

const html = document.documentElement;
const cell = (name: string) => screen.getByRole("radio", { name });
const press = (key: string) => fireEvent.keyDown(document.activeElement ?? document.body, { key });

beforeEach(() => {
  html.removeAttribute("data-theme");
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  html.removeAttribute("data-theme");
  window.localStorage.clear();
});

describe("ThemeSwitch — rendering", () => {
  it("renders a radiogroup named Theme with Light, Dark and Auto", () => {
    render(<ThemeSwitch className="x" data-testid="ts" />);
    const group = screen.getByRole("radiogroup", { name: "Theme" });
    expect(group).toHaveClass("ol-seg", "ol-themeswitch", "x");
    expect(group).toHaveAttribute("data-testid", "ts");
    expect(screen.getAllByRole("radio").map((r) => r.dataset.value)).toEqual([
      "washi",
      "sumi",
      "auto",
    ]);
    expect(cell("Light")).toHaveAttribute("aria-checked", "true");
    expect(group).toHaveAttribute("data-state", "washi");
  });

  it("uses size s by default and forwards size, fill, vertical and disabled", () => {
    const { rerender } = render(<ThemeSwitch />);
    expect(cell("Light")).toHaveClass("ol-btn--s");
    rerender(<ThemeSwitch size="l" fill vertical disabled />);
    const group = screen.getByRole("radiogroup");
    expect(group).toHaveClass("ol-seg--fill", "ol-seg--v");
    expect(group).toHaveAttribute("aria-disabled", "true");
    expect(cell("Light")).toHaveClass("ol-btn--l");
    expect(cell("Dark")).toBeDisabled();
  });

  it("forwards the ref to the group", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ThemeSwitch ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("radiogroup"));
  });

  it("takes a custom label or aria-labelledby", () => {
    const { rerender } = render(<ThemeSwitch label="Appearance" />);
    expect(screen.getByRole("radiogroup", { name: "Appearance" })).toBeInTheDocument();
    rerender(
      <>
        <span id="lbl">Colours</span>
        <ThemeSwitch aria-labelledby="lbl" />
      </>,
    );
    const group = screen.getByRole("radiogroup", { name: "Colours" });
    expect(group).not.toHaveAttribute("aria-label");
  });

  it("translates the words in es and ja and keeps the API values", () => {
    const { unmount } = render(
      <Root locale="es">
        <ThemeSwitch />
      </Root>,
    );
    expect(screen.getByRole("radiogroup", { name: "Tema" })).toBeInTheDocument();
    expect(cell("Claro")).toHaveAttribute("data-value", "washi");
    expect(cell("Oscuro")).toHaveAttribute("data-value", "sumi");
    expect(cell("Auto")).toHaveAttribute("data-value", "auto");
    unmount();
    render(
      <Root locale="ja">
        <ThemeSwitch />
      </Root>,
    );
    expect(screen.getByRole("radiogroup", { name: "テーマ" })).toBeInTheDocument();
    expect(cell("ライト")).toBeInTheDocument();
    expect(cell("ダーク")).toBeInTheDocument();
    expect(cell("自動")).toBeInTheDocument();
  });

  it("offers a subset of themes in the given order", () => {
    render(<ThemeSwitch themes={["sumi", "washi"]} />);
    expect(screen.getAllByRole("radio").map((r) => r.dataset.value)).toEqual(["sumi", "washi"]);
  });

  it("selects nothing when the current theme is not offered", () => {
    html.dataset.theme = "auto";
    render(<ThemeSwitch themes={["washi", "sumi"]} />);
    expect(cell("Light")).toHaveAttribute("aria-checked", "false");
    expect(cell("Dark")).toHaveAttribute("aria-checked", "false");
  });

  it("warns in development about an invalid themes list", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<ThemeSwitch themes={["washi", "washi", "nope" as ThemeName]} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ThemeSwitch"));
  });

  it("renders on the server without touching the document", () => {
    const markup = renderToString(<ThemeSwitch defaultValue="sumi" />);
    expect(markup).toContain('role="radiogroup"');
    expect(markup).toContain('data-state="sumi"');
  });

  it("has no axe violations", async () => {
    const { container } = render(<ThemeSwitch />);
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

describe("ThemeSwitch — keyboard", () => {
  it("enters on the selected cell with Tab", async () => {
    const user = userEvent.setup();
    html.dataset.theme = "sumi";
    render(
      <>
        <ThemeSwitch />
        <button>After</button>
      </>,
    );
    await user.tab();
    expect(cell("Dark")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("moves and selects with arrows (wrapping), Home and End, applying the theme at once", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitch />);
    await user.tab();
    press("ArrowRight");
    expect(cell("Dark")).toHaveFocus();
    expect(cell("Dark")).toHaveAttribute("aria-checked", "true");
    expect(html).toHaveAttribute("data-theme", "sumi");
    press("ArrowRight");
    press("ArrowRight");
    expect(cell("Light")).toHaveFocus();
    expect(html).toHaveAttribute("data-theme", "washi");
    press("ArrowLeft");
    expect(html).toHaveAttribute("data-theme", "auto");
    press("Home");
    expect(html).toHaveAttribute("data-theme", "washi");
    press("End");
    expect(cell("Auto")).toHaveFocus();
    expect(html).toHaveAttribute("data-theme", "auto");
    press("ArrowDown");
    expect(html).toHaveAttribute("data-theme", "washi");
  });

  it("selects the focused cell with Space and keeps focus on it", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitch />);
    await user.tab();
    act(() => {
      cell("Auto").focus();
    });
    await user.keyboard(" ");
    expect(cell("Auto")).toHaveAttribute("aria-checked", "true");
    expect(cell("Auto")).toHaveFocus();
    expect(html).toHaveAttribute("data-theme", "auto");
  });
});

describe("ThemeSwitch — uncontrolled", () => {
  it("adopts the theme already on <html>", () => {
    html.dataset.theme = "auto";
    render(<ThemeSwitch defaultValue="sumi" />);
    expect(cell("Auto")).toHaveAttribute("aria-checked", "true");
    expect(html).toHaveAttribute("data-theme", "auto");
  });

  it("writes defaultValue to <html> when it carries no theme", () => {
    render(<ThemeSwitch defaultValue="sumi" />);
    expect(cell("Dark")).toHaveAttribute("aria-checked", "true");
    expect(html).toHaveAttribute("data-theme", "sumi");
  });

  it("leaves <html> alone when nothing was chosen", () => {
    render(<ThemeSwitch />);
    expect(html).not.toHaveAttribute("data-theme");
  });

  it("writes data-theme on click and reports the theme", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ThemeSwitch onChange={onChange} />);
    await user.click(cell("Dark"));
    expect(html).toHaveAttribute("data-theme", "sumi");
    expect(onChange).toHaveBeenCalledWith("sumi");
  });

  it("drives a target element instead of <html>, given directly or as a ref", async () => {
    const user = userEvent.setup();
    function WithRef() {
      const ref = useRef<HTMLDivElement>(null);
      return (
        <div ref={ref} data-testid="box" data-theme="sumi">
          <ThemeSwitch target={ref} />
        </div>
      );
    }
    const { unmount } = render(<WithRef />);
    const box = screen.getByTestId("box");
    expect(cell("Dark")).toHaveAttribute("aria-checked", "true");
    await user.click(cell("Auto"));
    expect(box).toHaveAttribute("data-theme", "auto");
    expect(html).not.toHaveAttribute("data-theme");
    unmount();

    const element = document.createElement("section");
    document.body.append(element);
    render(<ThemeSwitch target={element} />);
    await user.click(cell("Dark"));
    expect(element).toHaveAttribute("data-theme", "sumi");
    element.remove();
  });

  it("does nothing to the page with a null target", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitch target={null} />);
    await user.click(cell("Dark"));
    expect(cell("Dark")).toHaveAttribute("aria-checked", "true");
    expect(html).not.toHaveAttribute("data-theme");
  });

  it("keeps two switches on the same page in sync", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ThemeSwitch label="Header theme" />
        <ThemeSwitch label="Footer theme" />
      </>,
    );
    const header = screen.getByRole("radiogroup", { name: "Header theme" });
    const footer = screen.getByRole("radiogroup", { name: "Footer theme" });
    await user.click(within(header).getByRole("radio", { name: "Dark" }));
    await waitFor(() => {
      expect(within(footer).getByRole("radio", { name: "Dark" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });
    await user.click(within(footer).getByRole("radio", { name: "Auto" }));
    await waitFor(() => {
      expect(within(header).getByRole("radio", { name: "Auto" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });
    expect(html).toHaveAttribute("data-theme", "auto");
  });

  it("follows a change the app makes to the attribute and ignores invalid values", async () => {
    render(<ThemeSwitch />);
    act(() => {
      html.dataset.theme = "sumi";
    });
    await waitFor(() => {
      expect(cell("Dark")).toHaveAttribute("aria-checked", "true");
    });
    act(() => {
      html.dataset.theme = "neon";
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(cell("Dark")).toHaveAttribute("aria-checked", "true");
  });
});

describe("ThemeSwitch — controlled", () => {
  it("shows value, reports changes and never writes the attribute", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ThemeSwitch value="auto" onChange={onChange} />);
    expect(cell("Auto")).toHaveAttribute("aria-checked", "true");
    await user.click(cell("Dark"));
    expect(onChange).toHaveBeenCalledWith("sumi");
    expect(cell("Auto")).toHaveAttribute("aria-checked", "true");
    expect(html).not.toHaveAttribute("data-theme");
  });

  it("drives Root theme through the app's state", async () => {
    const user = userEvent.setup();
    function App() {
      const [theme, setTheme] = useState<ThemeName>("auto");
      return (
        <Root theme={theme} data-testid="app">
          <ThemeSwitch value={theme} onChange={setTheme} />
        </Root>
      );
    }
    render(<App />);
    await user.click(cell("Dark"));
    expect(screen.getByTestId("app")).toHaveAttribute("data-theme", "sumi");
    expect(cell("Dark")).toHaveAttribute("aria-checked", "true");
  });

  it("ignores html changes while controlled", () => {
    render(<ThemeSwitch value="washi" />);
    act(() => {
      html.dataset.theme = "sumi";
    });
    expect(cell("Light")).toHaveAttribute("aria-checked", "true");
  });
});

describe("ThemeSwitch — storage", () => {
  it("restores a stored choice before the attribute and the default", () => {
    window.localStorage.setItem("theme", "sumi");
    html.dataset.theme = "washi";
    render(<ThemeSwitch storageKey="theme" defaultValue="auto" />);
    expect(cell("Dark")).toHaveAttribute("aria-checked", "true");
    expect(html).toHaveAttribute("data-theme", "sumi");
  });

  it("saves the choice under the key", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitch storageKey="theme" />);
    await user.click(cell("Auto"));
    expect(window.localStorage.getItem("theme")).toBe("auto");
  });

  it("does not touch storage without a key", async () => {
    const user = userEvent.setup();
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    render(<ThemeSwitch />);
    await user.click(cell("Dark"));
    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
  });

  it("ignores an invalid stored value", () => {
    window.localStorage.setItem("theme", "neon");
    render(<ThemeSwitch storageKey="theme" defaultValue="auto" />);
    expect(cell("Auto")).toHaveAttribute("aria-checked", "true");
  });

  it("keeps working when storage throws on read and write", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const onChange = vi.fn();
    render(<ThemeSwitch storageKey="theme" defaultValue="auto" onChange={onChange} />);
    expect(cell("Auto")).toHaveAttribute("aria-checked", "true");
    await user.click(cell("Dark"));
    expect(html).toHaveAttribute("data-theme", "sumi");
    expect(onChange).toHaveBeenCalledWith("sumi");
  });

  it("keeps working when localStorage itself cannot be reached", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    render(<ThemeSwitch storageKey="theme" />);
    await user.click(cell("Dark"));
    expect(html).toHaveAttribute("data-theme", "sumi");
  });

  it("hands a stored choice to a controlled owner on mount, once", () => {
    window.localStorage.setItem("theme", "sumi");
    const onChange = vi.fn();
    render(<ThemeSwitch storageKey="theme" value="washi" onChange={onChange} />);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("sumi");
  });

  it("saves the choice when controlled and stays quiet when storage matches", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("theme", "washi");
    const onChange = vi.fn();
    render(<ThemeSwitch storageKey="theme" value="washi" onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
    await user.click(cell("Auto"));
    expect(window.localStorage.getItem("theme")).toBe("auto");
    expect(onChange).toHaveBeenCalledWith("auto");
  });
});
