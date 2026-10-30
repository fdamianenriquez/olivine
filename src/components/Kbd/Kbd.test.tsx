import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { locales, type OlivineLabels } from "../../locale";
import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Kbd, KbdGroup } from "./Kbd";
import {
  formatShortcut,
  type KbdKeyLabels,
  parseShortcut,
  type Shortcut,
  toAriaKeyShortcuts,
} from "./shortcut";
import { detectKbdPlatform, KbdPlatformContext, useKbdPlatform } from "./useKbdPlatform";

const KEYS: Record<"en" | "es" | "ja", KbdKeyLabels> = {
  en: {
    command: "Command",
    windows: "Windows",
    control: "Control",
    option: "Option",
    alt: "Alt",
    shift: "Shift",
    enter: "Enter",
    escape: "Escape",
    tab: "Tab",
    space: "Space",
    backspace: "Backspace",
    delete: "Delete",
    up: "Up arrow",
    down: "Down arrow",
    left: "Left arrow",
    right: "Right arrow",
    commandOrControl: "Command or Control",
    metaLegend: "Win",
    ctrlLegend: "Ctrl",
    altLegend: "Alt",
    shiftLegend: "Shift",
    enterLegend: "↵",
    escLegend: "Esc",
    tabLegend: "Tab",
    spaceLegend: "Space",
    backspaceLegend: "Backspace",
    deleteLegend: "Del",
  },
  es: {
    command: "Comando",
    windows: "Windows",
    control: "Control",
    option: "Opción",
    alt: "Alt",
    shift: "Mayúsculas",
    enter: "Intro",
    escape: "Escape",
    tab: "Tabulador",
    space: "Espacio",
    backspace: "Retroceso",
    delete: "Suprimir",
    up: "Flecha arriba",
    down: "Flecha abajo",
    left: "Flecha izquierda",
    right: "Flecha derecha",
    commandOrControl: "Comando o Control",
    metaLegend: "Win",
    ctrlLegend: "Ctrl",
    altLegend: "Alt",
    shiftLegend: "Mayús",
    enterLegend: "Intro",
    escLegend: "Esc",
    tabLegend: "Tab",
    spaceLegend: "Espacio",
    backspaceLegend: "Retroceso",
    deleteLegend: "Supr",
  },
  ja: {
    command: "コマンド",
    windows: "Windows",
    control: "コントロール",
    option: "オプション",
    alt: "Alt",
    shift: "シフト",
    enter: "エンター",
    escape: "エスケープ",
    tab: "タブ",
    space: "スペース",
    backspace: "バックスペース",
    delete: "デリート",
    up: "上矢印",
    down: "下矢印",
    left: "左矢印",
    right: "右矢印",
    commandOrControl: "コマンドまたはコントロール",
    metaLegend: "Win",
    ctrlLegend: "Ctrl",
    altLegend: "Alt",
    shiftLegend: "Shift",
    enterLegend: "↵",
    escLegend: "Esc",
    tabLegend: "Tab",
    spaceLegend: "Space",
    backspaceLegend: "Backspace",
    deleteLegend: "Del",
  },
};

/** A built-in dictionary with its key words. */
function dict(name: "en" | "es" | "ja"): OlivineLabels {
  const value = { ...locales[name], keys: KEYS[name] };
  return value;
}

function inLocale(name: "en" | "es" | "ja", ui: React.ReactNode) {
  return render(<Root locale={dict(name)}>{ui}</Root>);
}

/** Visible text of a cap, without its hidden name. */
function visible(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll(".ol-sr").forEach((node) => {
    node.remove();
  });
  return clone.textContent;
}

/** The first cap inside the element with this test id. */
function firstCap(id: string): Element {
  const cap = screen.getByTestId(id).querySelector(".ol-kbd");
  if (!cap) throw new Error(`No cap in ${id}`);
  return cap;
}

/** What assistive tech reads: hidden names, not the aria-hidden glyphs. */
function spoken(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll("[aria-hidden='true']").forEach((node) => {
    node.remove();
  });
  return Array.from(clone.querySelectorAll(".ol-kbd"))
    .map((cap) => cap.textContent)
    .concat(clone.classList.contains("ol-kbd") ? [clone.textContent] : [])
    .join(" ");
}

function stubPlatform({
  uaData,
  platform = "",
  userAgent = "",
}: {
  uaData?: string;
  platform?: string;
  userAgent?: string;
}) {
  vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
  if (uaData !== undefined) {
    Object.defineProperty(navigator, "userAgentData", {
      configurable: true,
      value: { platform: uaData },
    });
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "userAgentData");
});

describe("Kbd", () => {
  it("draws one literal cap from children", () => {
    inLocale(
      "en",
      <Kbd className="extra" data-testid="k" title="hint">
        K
      </Kbd>,
    );
    const el = screen.getByTestId("k");
    expect(el.tagName).toBe("KBD");
    expect(el).toHaveClass("ol-kbd", "extra");
    expect(el).not.toHaveClass("ol-kbd--inverse");
    expect(el).toHaveAttribute("title", "hint");
    expect(el).toHaveTextContent(/^K$/);
  });

  it("is never focusable and has no role", () => {
    inLocale("en", <Kbd keys="mod+k" platform="apple" data-testid="k" />);
    const el = screen.getByTestId("k");
    expect(el).not.toHaveAttribute("tabindex");
    expect(el).not.toHaveAttribute("role");
    el.querySelectorAll("kbd").forEach((cap) => {
      expect(cap).not.toHaveAttribute("tabindex");
      expect(cap).not.toHaveAttribute("role");
    });
  });

  it("wraps a chord in a group with one cap per key", () => {
    inLocale("en", <Kbd keys="mod+shift+p" platform="apple" data-testid="k" />);
    const group = screen.getByTestId("k");
    expect(group.tagName).toBe("KBD");
    expect(group).toHaveClass("ol-kbd-group");
    const caps = group.querySelectorAll(":scope > kbd.ol-kbd");
    expect(Array.from(caps, visible)).toEqual(["⌘", "⇧", "P"]);
    expect(group.textContent).not.toContain("+");
  });

  it("draws a single named key as one cap, not a group", () => {
    inLocale("en", <Kbd keys="esc" platform="other" data-testid="k" />);
    const el = screen.getByTestId("k");
    expect(el).toHaveClass("ol-kbd");
    expect(el).not.toHaveClass("ol-kbd-group");
    expect(visible(el)).toBe("Esc");
    expect(spoken(el)).toBe("Escape");
  });

  it("gives glyphs a hidden spoken name, never title or aria-label", () => {
    inLocale("en", <Kbd keys="mod+k" platform="apple" data-testid="k" />);
    const group = screen.getByTestId("k");
    const [cmd] = Array.from(group.querySelectorAll(".ol-kbd"));
    expect(cmd?.querySelector("[aria-hidden='true']")).toHaveTextContent("⌘");
    expect(cmd?.querySelector(".ol-sr")).toHaveTextContent("Command");
    expect(spoken(group)).toBe("Command K");
    expect(group.querySelector("[title], [aria-label]")).toBeNull();
  });

  it("adds no hidden text to plain letters and digits", () => {
    inLocale("en", <Kbd keys="mod+1" platform="other" data-testid="k" />);
    const caps = screen.getByTestId("k").querySelectorAll(".ol-kbd");
    expect(caps[1]?.querySelector(".ol-sr")).toBeNull();
    expect(caps[1]?.querySelector("[aria-hidden]")).toBeNull();
  });

  it("chooses symbols on Apple and words elsewhere", () => {
    inLocale(
      "en",
      <>
        <Kbd keys="mod+alt+shift+ctrl+enter" platform="apple" data-testid="a" />
        <Kbd keys="mod+alt+shift+ctrl+enter" platform="other" data-testid="o" />
      </>,
    );
    const caps = (id: string) => Array.from(screen.getByTestId(id).querySelectorAll(".ol-kbd"));
    expect(caps("a").map(visible)).toEqual(["⌘", "⌥", "⇧", "⌃", "↵"]);
    expect(caps("o").map(visible)).toEqual(["Ctrl", "Alt", "Shift", "Ctrl", "↵"]);
    expect(spoken(screen.getByTestId("a"))).toBe("Command Option Shift Control Enter");
    expect(spoken(screen.getByTestId("o"))).toBe("Control Alt Shift Control Enter");
  });

  it("follows the platform of the nearest provider (Root platform)", () => {
    render(
      <Root locale={dict("en")}>
        <KbdPlatformContext.Provider value="other">
          <Kbd keys="mod+k" data-testid="k" />
          <Kbd keys="mod+k" platform="apple" data-testid="own" />
        </KbdPlatformContext.Provider>
      </Root>,
    );
    expect(visible(firstCap("k"))).toBe("Ctrl");
    expect(visible(firstCap("own"))).toBe("⌘");
  });

  it("detects the platform in the browser by default", () => {
    stubPlatform({ platform: "MacIntel" });
    inLocale("en", <Kbd keys="mod+k" data-testid="k" />);
    expect(visible(firstCap("k"))).toBe("⌘");
  });

  it("shows ⌘ / Ctrl in one cap while the platform is unknown", () => {
    stubPlatform({});
    inLocale("en", <Kbd keys="mod+k" data-testid="k" />);
    const caps = screen.getByTestId("k").querySelectorAll(".ol-kbd");
    expect(caps).toHaveLength(2);
    expect(visible(firstCap("k"))).toBe("⌘ / Ctrl");
    expect(spoken(firstCap("k"))).toBe("Command or Control");
  });

  it("renders key letters uppercase through the formatter", () => {
    inLocale("en", <Kbd keys={["mod", "k"]} platform="apple" data-testid="k" />);
    expect(screen.getByTestId("k").querySelectorAll(".ol-kbd")[1]).toHaveTextContent(/^K$/);
  });

  it("reads legacy glyph data, including repeated keys", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    inLocale(
      "en",
      <>
        <Kbd keys="⇧⌘P" platform="apple" data-testid="glued" />
        <Kbd keys={["⌘", "K"]} platform="other" data-testid="array" />
        <Kbd keys={["⇧", "⇧"]} platform="apple" data-testid="twice" />
      </>,
    );
    const caps = (id: string) =>
      Array.from(screen.getByTestId(id).querySelectorAll(".ol-kbd"), visible);
    expect(caps("glued")).toEqual(["⇧", "⌘", "P"]);
    expect(caps("array")).toEqual(["Ctrl", "K"]);
    expect(caps("twice")).toEqual(["⇧", "⇧"]);
    expect(error).not.toHaveBeenCalled();
  });

  it("marks every cap inverse", () => {
    inLocale("en", <Kbd keys="mod+k" platform="apple" inverse data-testid="k" />);
    const group = screen.getByTestId("k");
    expect(group).not.toHaveClass("ol-kbd--inverse");
    group.querySelectorAll(".ol-kbd").forEach((cap) => {
      expect(cap).toHaveClass("ol-kbd--inverse");
    });
    inLocale(
      "en",
      <Kbd inverse data-testid="one">
        K
      </Kbd>,
    );
    expect(screen.getByTestId("one")).toHaveClass("ol-kbd", "ol-kbd--inverse");
  });

  it("replaces the spoken text of the whole shortcut with label", () => {
    inLocale(
      "en",
      <>
        <Kbd keys="mod+k" platform="apple" label="Open search" data-testid="k" />
        <Kbd label="Question mark" data-testid="one">
          ?
        </Kbd>
      </>,
    );
    const group = screen.getByTestId("k");
    const names = group.querySelectorAll(".ol-sr");
    expect(names).toHaveLength(1);
    expect(names[0]).toHaveTextContent("Open search");
    group.querySelectorAll(".ol-kbd").forEach((cap) => {
      expect(cap.firstElementChild).toHaveAttribute("aria-hidden", "true");
    });
    const one = screen.getByTestId("one");
    expect(one.querySelector("[aria-hidden='true']")).toHaveTextContent("?");
    expect(one.querySelector(".ol-sr")).toHaveTextContent("Question mark");
  });

  it.each([
    ["es", "other", ["Ctrl", "Mayús", "Supr"], "Control Mayúsculas Suprimir"],
    ["es", "apple", ["⌘", "⇧", "⌦"], "Comando Mayúsculas Suprimir"],
    ["ja", "apple", ["⌘", "⇧", "⌦"], "コマンド シフト デリート"],
    ["ja", "other", ["Ctrl", "Shift", "Del"], "コントロール シフト デリート"],
  ] as const)("speaks and labels keys in %s (%s)", (locale, platform, caps, names) => {
    inLocale(locale, <Kbd keys="mod+shift+delete" platform={platform} data-testid="k" />);
    const group = screen.getByTestId("k");
    expect(Array.from(group.querySelectorAll(".ol-kbd"), visible)).toEqual(caps);
    expect(spoken(group)).toBe(names);
  });

  it("draws the non-Apple legends from the dictionary", () => {
    render(
      <Root locale={locales.en}>
        <Kbd keys="mod+shift+k" platform="other" data-testid="k" />
      </Root>,
    );
    const group = screen.getByTestId("k");
    expect(Array.from(group.querySelectorAll(".ol-kbd"), visible)).toEqual(["Ctrl", "Shift", "K"]);
  });

  it("forwards its ref to the outer kbd", () => {
    const one = createRef<HTMLElement>();
    const group = createRef<HTMLElement>();
    inLocale(
      "en",
      <>
        <Kbd ref={one} data-testid="one">
          K
        </Kbd>
        <Kbd ref={group} keys="mod+k" platform="apple" data-testid="group" />
      </>,
    );
    expect(one.current).toBe(screen.getByTestId("one"));
    expect(group.current).toBe(screen.getByTestId("group"));
  });

  it.each(["washi", "sumi"] as const)("has no axe violations (%s)", async (theme) => {
    const { container } = render(
      <Root theme={theme} locale={dict("en")}>
        <p>
          Press <Kbd keys="mod+k" platform="apple" /> to search, <Kbd keys="esc" /> to close,{" "}
          <Kbd>?</Kbd> for help, <Kbd keys="up" /> to move.
        </p>
        <div style={{ background: "var(--ink)" }}>
          <Kbd keys="mod+shift+p" platform="other" inverse />
        </div>
        <Kbd keys="mod+k" label="Open search" />
        <KbdGroup>
          <Kbd keys="ctrl" />
          <Kbd>F2</Kbd>
        </KbdGroup>
      </Root>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it.each(["es", "ja"] as const)("has no axe violations in %s", async (locale) => {
    const { container } = render(
      <Root locale={dict(locale)}>
        <p>
          <Kbd keys="mod+shift+delete" platform="other" /> <Kbd keys="mod+k" platform="apple" />{" "}
          <Kbd keys="mod+k" /> <Kbd keys="esc" inverse />
        </p>
      </Root>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

describe("KbdGroup", () => {
  it("wraps hand-built caps in an outer kbd and forwards its ref", () => {
    const ref = createRef<HTMLElement>();
    render(
      <KbdGroup ref={ref} className="extra" data-testid="g">
        <Kbd>A</Kbd>
        <Kbd>B</Kbd>
      </KbdGroup>,
    );
    const group = screen.getByTestId("g");
    expect(group.tagName).toBe("KBD");
    expect(group).toHaveClass("ol-kbd-group", "extra");
    expect(ref.current).toBe(group);
    expect(group.querySelectorAll(".ol-kbd")).toHaveLength(2);
  });
});

describe("useKbdPlatform", () => {
  it.each([
    [{ uaData: "macOS" }, "apple"],
    [{ uaData: "Windows" }, "other"],
    [{ platform: "MacIntel" }, "apple"],
    [{ platform: "iPhone" }, "apple"],
    [{ platform: "Win32" }, "other"],
    [{ platform: "Linux x86_64" }, "other"],
    [{ userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)" }, "apple"],
    [{ userAgent: "Mozilla/5.0 (X11; Linux x86_64)" }, "other"],
    [{}, "unknown"],
  ] as const)("detects %o as %s", (stub, expected) => {
    stubPlatform(stub);
    expect(detectKbdPlatform()).toBe(expected);
  });

  it("renders unknown on the server and hydrates without a mismatch, then detects", async () => {
    function Probe() {
      return (
        <Root locale={dict("en")}>
          <span data-testid="p">{useKbdPlatform()}</span>
          <Kbd keys="mod+k" data-testid="k" />
        </Root>
      );
    }
    const html = renderToString(<Probe />);
    expect(html).toContain(">unknown<");
    expect(html).toContain("⌘ / Ctrl");

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    stubPlatform({ platform: "MacIntel" });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const recoverable = vi.fn();
    await act(async () => {
      hydrateRoot(container, <Probe />, { onRecoverableError: recoverable });
      await Promise.resolve();
    });
    expect(error).not.toHaveBeenCalled();
    expect(recoverable).not.toHaveBeenCalled();
    expect(screen.getByTestId("p")).toHaveTextContent("apple");
    expect(visible(firstCap("k"))).toBe("⌘");
    container.remove();
  });
});

describe("parseShortcut", () => {
  it.each<[Shortcut, string[]]>([
    ["mod+k", ["mod", "K"]],
    ["Mod+Shift+P", ["mod", "shift", "P"]],
    ["mod++", ["mod", "+"]],
    ["+", ["+"]],
    ["F5", ["F5"]],
    ["cmd+opt+return", ["meta", "alt", "enter"]],
    ["ctrl+del", ["ctrl", "delete"]],
    ["⇧⌘P", ["shift", "mod", "P"]],
    ["⌘↵", ["mod", "enter"]],
    [
      ["mod", "shift", "p"],
      ["mod", "shift", "P"],
    ],
    [
      ["⌘", "K"],
      ["mod", "K"],
    ],
    ["", []],
  ])("parses %o", (input, expected) => {
    expect(parseShortcut(input)).toEqual(expected);
  });
});

describe("formatShortcut", () => {
  const all = "mod+meta+ctrl+alt+shift+enter+esc+tab+space+backspace+delete+up+down+left+right";

  it.each([
    [
      "en",
      "apple",
      ["⌘", "⌘", "⌃", "⌥", "⇧", "↵", "esc", "⇥", "Space", "⌫", "⌦", "↑", "↓", "←", "→"],
    ],
    [
      "en",
      "other",
      ["Ctrl", "Win", "Ctrl", "Alt", "Shift", "↵", "Esc", "Tab", "Space", "Backspace", "Del"],
    ],
    [
      "es",
      "other",
      [
        "Ctrl",
        "Win",
        "Ctrl",
        "Alt",
        "Mayús",
        "Intro",
        "Esc",
        "Tab",
        "Espacio",
        "Retroceso",
        "Supr",
      ],
    ],
    ["ja", "other", ["Ctrl", "Win", "Ctrl", "Alt", "Shift", "↵", "Esc", "Tab", "Space"]],
  ] as const)("draws the legends of %s on %s", (locale, platform, expected) => {
    const texts = formatShortcut(all, { platform, labels: KEYS[locale] }).map((k) => k.text);
    expect(texts.slice(0, expected.length)).toEqual(expected);
  });

  it("names every glyph and abbreviation, and nothing that reads as itself", () => {
    const keys = formatShortcut(all, { platform: "apple", labels: KEYS.en });
    expect(keys.map((k) => k.name)).toEqual([
      "Command",
      "Command",
      "Control",
      "Option",
      "Shift",
      "Enter",
      "Escape",
      "Tab",
      undefined,
      "Backspace",
      "Delete",
      "Up arrow",
      "Down arrow",
      "Left arrow",
      "Right arrow",
    ]);
    const other = formatShortcut("meta+alt+shift+k", { platform: "other", labels: KEYS.en });
    expect(other.map((k) => k.name)).toEqual(["Windows", undefined, undefined, undefined]);
  });

  it("defaults to an unknown platform", () => {
    expect(formatShortcut("mod", { labels: KEYS.es })).toEqual([
      { token: "mod", text: "⌘ / Ctrl", name: "Comando o Control" },
    ]);
  });
});

describe("toAriaKeyShortcuts", () => {
  it.each<[Shortcut, Parameters<typeof toAriaKeyShortcuts>[1], string]>([
    ["mod+k", "apple", "Meta+K"],
    ["mod+k", "other", "Control+K"],
    ["mod+k", undefined, "Meta+K Control+K"],
    ["mod+shift+p", "unknown", "Meta+Shift+P Control+Shift+P"],
    ["alt+enter", "apple", "Alt+Enter"],
    ["esc", "other", "Escape"],
    ["shift+space", "other", "Shift+Space"],
    ["ctrl+up", "other", "Control+ArrowUp"],
    ["⇧⌘P", "apple", "Shift+Meta+P"],
    ["F5", "other", "F5"],
    ["mod++", "other", "Control+Plus"],
    ["shift+Page Up", "other", "Shift+PageUp"],
    [["ctrl", "Page Down"], "other", "Control+PageDown"],
  ])("maps %o on %s to %s", (input, platform, expected) => {
    expect(toAriaKeyShortcuts(input, platform)).toBe(expected);
  });
});
