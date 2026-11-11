import { readFileSync } from "node:fs";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Button } from "../Button";
import { Modal } from "../Modal";
import { Root } from "../Root";
import { Tooltip } from "./Tooltip";
import { TooltipProvider } from "./TooltipProvider";

const btn = () => screen.getByRole("button", { name: "Copy" });
const tip = () => screen.queryByRole("tooltip");
const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};
const hover = () => void fireEvent.pointerEnter(btn(), { pointerType: "mouse" });
const unhover = () => void fireEvent.pointerLeave(btn(), { pointerType: "mouse" });

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Tooltip", () => {
  it("renders nothing but the child while closed", () => {
    render(
      <Tooltip content="Copy link">
        <Button>Copy</Button>
      </Tooltip>,
    );
    expect(tip()).toBeNull();
    expect(btn()).not.toHaveAttribute("aria-describedby");
  });

  it("opens after the open delay on hover and closes on leave", () => {
    render(
      <Tooltip content="Copy link" openDelay={300}>
        <Button>Copy</Button>
      </Tooltip>,
    );
    hover();
    advance(299);
    expect(tip()).toBeNull();
    advance(1);
    expect(tip()).toHaveTextContent("Copy link");
    expect(tip()).toHaveClass("ol-tooltip", "ol-floating");
    unhover();
    advance(200);
    expect(tip()).toBeNull();
  });

  it("cancels a pending open when the pointer leaves early", () => {
    render(
      <Tooltip content="Copy link">
        <Button>Copy</Button>
      </Tooltip>,
    );
    hover();
    advance(100);
    unhover();
    advance(1000);
    expect(tip()).toBeNull();
  });

  it("keeps the tooltip open while the pointer is over it", () => {
    render(
      <Tooltip content="Copy link" closeDelay={0}>
        <Button>Copy</Button>
      </Tooltip>,
    );
    hover();
    advance(300);
    unhover();
    advance(50);
    fireEvent.pointerEnter(screen.getByRole("tooltip"), { pointerType: "mouse" });
    advance(1000);
    expect(tip()).not.toBeNull();
    fireEvent.pointerLeave(screen.getByRole("tooltip"), { pointerType: "mouse" });
    advance(100);
    expect(tip()).toBeNull();
  });

  it("honours closeDelay", () => {
    render(
      <Tooltip content="Copy link" closeDelay={400}>
        <Button>Copy</Button>
      </Tooltip>,
    );
    hover();
    advance(300);
    unhover();
    advance(399);
    expect(tip()).not.toBeNull();
    advance(1);
    expect(tip()).toBeNull();
  });

  it("opens at once on keyboard focus and closes on blur", () => {
    render(
      <Tooltip content="Copy link">
        <Button>Copy</Button>
      </Tooltip>,
    );
    act(() => {
      btn().focus();
    });
    expect(tip()).not.toBeNull();
    act(() => {
      btn().blur();
    });
    expect(tip()).toBeNull();
  });

  it("links the child to the tooltip with aria-describedby and merges an existing one", () => {
    render(
      <Tooltip content="Copy link" defaultOpen>
        <Button aria-describedby="other">Copy</Button>
      </Tooltip>,
    );
    const id = tip()?.id;
    expect(id).toBeTruthy();
    expect(btn().getAttribute("aria-describedby")).toBe(`other ${id ?? ""}`);
  });

  it("doesn't describe a trigger whose name the tooltip only repeats", () => {
    render(
      <Tooltip content="Copy link" defaultOpen>
        <Button square aria-label="copy  link" aria-describedby="other">
          ⧉
        </Button>
      </Tooltip>,
    );
    expect(tip()).not.toBeNull();
    expect(screen.getByRole("button", { name: "copy link" })).toHaveAttribute(
      "aria-describedby",
      "other",
    );
  });

  it("closes on Escape without closing an enclosing modal", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Dialog">
        <Tooltip content="Copy link">
          <Button>Copy</Button>
        </Tooltip>
      </Modal>,
    );
    act(() => {
      btn().focus();
      btn().blur();
      btn().focus();
    });
    expect(tip()).not.toBeNull();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(tip()).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("opens on a touch long press and swallows the click that ends it", () => {
    const onClick = vi.fn();
    render(
      <Tooltip content="Copy link">
        <Button onClick={onClick}>Copy</Button>
      </Tooltip>,
    );
    fireEvent.pointerDown(btn(), { pointerType: "touch" });
    advance(499);
    expect(tip()).toBeNull();
    advance(1);
    expect(tip()).not.toBeNull();
    fireEvent.pointerUp(btn(), { pointerType: "touch" });
    fireEvent.click(btn());
    expect(onClick).not.toHaveBeenCalled();
    // A tap elsewhere closes it.
    fireEvent.pointerDown(document.body, { pointerType: "touch" });
    expect(tip()).toBeNull();
  });

  it("lets a plain tap activate the child", () => {
    const onClick = vi.fn();
    render(
      <Tooltip content="Copy link">
        <Button onClick={onClick}>Copy</Button>
      </Tooltip>,
    );
    fireEvent.pointerEnter(btn(), { pointerType: "touch" });
    fireEvent.pointerDown(btn(), { pointerType: "touch" });
    advance(100);
    fireEvent.pointerUp(btn(), { pointerType: "touch" });
    fireEvent.click(btn());
    advance(1000);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(tip()).toBeNull();
  });

  it("opens on keyboard focus after a mouse press that never focused the button", () => {
    render(
      <Tooltip content="Copy link">
        <Button>Copy</Button>
      </Tooltip>,
    );
    fireEvent.pointerDown(btn(), { pointerType: "mouse" });
    fireEvent.pointerUp(btn(), { pointerType: "mouse" });
    advance(500);
    act(() => {
      btn().focus();
    });
    expect(tip()).not.toBeNull();
  });

  it("does not open on focus caused by a mouse press", () => {
    render(
      <Tooltip content="Copy link">
        <Button>Copy</Button>
      </Tooltip>,
    );
    fireEvent.pointerDown(btn(), { pointerType: "mouse" });
    act(() => {
      btn().focus();
    });
    expect(tip()).toBeNull();
  });

  it("does not swallow a click after a cancelled long press", () => {
    const onClick = vi.fn();
    render(
      <Tooltip content="Copy link">
        <Button onClick={onClick}>Copy</Button>
      </Tooltip>,
    );
    fireEvent.pointerDown(btn(), { pointerType: "touch" });
    advance(500);
    fireEvent.pointerCancel(btn(), { pointerType: "touch" });
    advance(500);
    fireEvent.click(btn());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("works controlled", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Tooltip content="Copy link" open={false} onOpenChange={onOpenChange}>
        <Button>Copy</Button>
      </Tooltip>,
    );
    act(() => {
      btn().focus();
    });
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(tip()).toBeNull();
    rerender(
      <Tooltip content="Copy link" open onOpenChange={onOpenChange}>
        <Button>Copy</Button>
      </Tooltip>,
    );
    expect(tip()).not.toBeNull();
  });

  it("exposes the placement and forwards the ref and child handlers", () => {
    const ref = createRef<HTMLDivElement>();
    const childRef = createRef<HTMLButtonElement>();
    const onFocus = vi.fn();
    render(
      <Tooltip content="Below" placement="bottom" defaultOpen ref={ref} className="x">
        <Button ref={childRef} onFocus={onFocus}>
          Copy
        </Button>
      </Tooltip>,
    );
    expect(tip()).toHaveAttribute("data-placement", "bottom");
    expect(tip()).toHaveClass("x");
    expect(ref.current).toBe(tip());
    expect(childRef.current).toBe(btn());
    act(() => {
      btn().focus();
    });
    expect(onFocus).toHaveBeenCalled();
  });

  it("carries the theme and language to the portal", () => {
    render(
      <Root theme="sumi" locale="ja">
        <Tooltip content="Copy link" defaultOpen>
          <Button>Copy</Button>
        </Tooltip>
      </Root>,
    );
    const layer = tip()?.closest(".ol-portal");
    expect(layer).toHaveAttribute("data-theme", "sumi");
    expect(layer).toHaveAttribute("lang", "ja");
  });

  it("has no axe violations in a sumi Root", async () => {
    vi.useRealTimers();
    render(
      <Root theme="sumi" locale="ja">
        <Tooltip content="Copy link" open>
          <Button>Copy</Button>
        </Tooltip>
      </Root>,
    );
    expect(
      await runAxe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });

  it("has no axe violations closed or open", async () => {
    vi.useRealTimers();
    const { container, rerender } = render(
      <Tooltip content="Copy link">
        <Button>Copy</Button>
      </Tooltip>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
    rerender(
      <Tooltip content="Copy link" open>
        <Button>Copy</Button>
      </Tooltip>,
    );
    expect(
      await runAxe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});

const mouse = { pointerType: "mouse", button: 0 };
const named = (name: string) => screen.getByRole("button", { name });
const focusKeyboard = (el: HTMLElement) => {
  act(() => {
    el.focus();
  });
};
const blur = (el: HTMLElement) => {
  act(() => {
    el.blur();
  });
};

function Row({ skipDelay }: { skipDelay?: number }) {
  return (
    <TooltipProvider {...(skipDelay === undefined ? {} : { skipDelay })}>
      <Tooltip content="Bold text">
        <Button>Bold</Button>
      </Tooltip>
      <Tooltip content="Italic text">
        <Button>Italic</Button>
      </Tooltip>
    </TooltipProvider>
  );
}

describe("Tooltip delay group", () => {
  it("waits for the first tooltip, then opens a neighbour at once with no entrance motion", () => {
    render(<Row />);
    fireEvent.pointerEnter(named("Bold"), mouse);
    advance(299);
    expect(tip()).toBeNull();
    advance(1);
    expect(tip()).toHaveTextContent("Bold text");
    expect(tip()).not.toHaveAttribute("data-instant");
    fireEvent.pointerLeave(named("Bold"), mouse);
    fireEvent.pointerEnter(named("Italic"), mouse);
    // Only one tooltip of a group is open: the first closes with no grace.
    expect(screen.getAllByRole("tooltip")).toHaveLength(1);
    expect(tip()).toHaveTextContent("Italic text");
    expect(tip()).toHaveAttribute("data-instant");
  });

  it("cools down after skipDelay", () => {
    render(<Row skipDelay={200} />);
    fireEvent.pointerEnter(named("Bold"), mouse);
    advance(300);
    fireEvent.pointerLeave(named("Bold"), mouse);
    advance(100);
    expect(tip()).toBeNull();
    advance(250);
    fireEvent.pointerEnter(named("Italic"), mouse);
    expect(tip()).toBeNull();
    advance(300);
    expect(tip()).toHaveTextContent("Italic text");
  });

  it("keeps one tooltip open per group when focus moves while another is hovered", () => {
    render(<Row />);
    fireEvent.pointerEnter(named("Bold"), mouse);
    advance(300);
    focusKeyboard(named("Italic"));
    expect(screen.getAllByRole("tooltip")).toHaveLength(1);
    expect(tip()).toHaveTextContent("Italic text");
  });

  it("warms the built-in default group without a provider", () => {
    render(
      <>
        <Tooltip content="Bold text">
          <Button>Bold</Button>
        </Tooltip>
        <Tooltip content="Italic text">
          <Button>Italic</Button>
        </Tooltip>
      </>,
    );
    fireEvent.pointerEnter(named("Bold"), mouse);
    advance(300);
    fireEvent.pointerLeave(named("Bold"), mouse);
    fireEvent.pointerEnter(named("Italic"), mouse);
    expect(tip()).toHaveTextContent("Italic text");
  });

  it("takes its timing from the provider, and a tooltip's own delays win", () => {
    render(
      <TooltipProvider openDelay={600} closeDelay={200}>
        <Tooltip content="Bold text">
          <Button>Bold</Button>
        </Tooltip>
        <Tooltip content="Italic text" openDelay={50}>
          <Button>Italic</Button>
        </Tooltip>
      </TooltipProvider>,
    );
    fireEvent.pointerEnter(named("Bold"), mouse);
    advance(599);
    expect(tip()).toBeNull();
    advance(1);
    expect(tip()).not.toBeNull();
    fireEvent.pointerLeave(named("Bold"), mouse);
    advance(199);
    expect(tip()).not.toBeNull();
    advance(1);
    expect(tip()).toBeNull();
    // Let the group cool down, then the own delay applies.
    advance(1000);
    fireEvent.pointerEnter(named("Italic"), mouse);
    advance(50);
    expect(tip()).toHaveTextContent("Italic text");
  });
});

describe("Tooltip dismissal and persistence", () => {
  it("stays open while keyboard focus remains after the pointer leaves", () => {
    render(
      <Tooltip content="Copy link">
        <Button>Copy</Button>
      </Tooltip>,
    );
    focusKeyboard(btn());
    hover();
    unhover();
    advance(1000);
    expect(tip()).not.toBeNull();
    blur(btn());
    expect(tip()).toBeNull();
  });

  it("stays open after blur while the pointer is still over the trigger", () => {
    render(
      <Tooltip content="Copy link">
        <Button>Copy</Button>
      </Tooltip>,
    );
    hover();
    advance(300);
    focusKeyboard(btn());
    blur(btn());
    advance(1000);
    expect(tip()).not.toBeNull();
    unhover();
    advance(100);
    expect(tip()).toBeNull();
  });

  it("closes on a mouse press of the trigger and reopens only after the pointer returns", () => {
    const onClick = vi.fn();
    render(
      <Tooltip content="Copy link">
        <Button onClick={onClick}>Copy</Button>
      </Tooltip>,
    );
    hover();
    advance(300);
    expect(tip()).not.toBeNull();
    fireEvent.pointerDown(btn(), mouse);
    expect(tip()).toBeNull();
    fireEvent.pointerUp(btn(), mouse);
    fireEvent.click(btn());
    expect(onClick).toHaveBeenCalledTimes(1);
    advance(1000);
    expect(tip()).toBeNull();
    unhover();
    advance(1000);
    hover();
    advance(300);
    expect(tip()).not.toBeNull();
  });

  it("doesn't reopen after Escape until the pointer leaves and comes back", () => {
    render(
      <Tooltip content="Copy link">
        <Button>Copy</Button>
      </Tooltip>,
    );
    hover();
    advance(300);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(tip()).toBeNull();
    advance(2000);
    expect(tip()).toBeNull();
    unhover();
    advance(1000);
    hover();
    advance(300);
    expect(tip()).not.toBeNull();
  });

  it("keeps the tooltip open while Enter or Space activates the trigger", () => {
    const onClick = vi.fn();
    render(
      <Tooltip content="Copy link">
        <Button onClick={onClick}>Copy</Button>
      </Tooltip>,
    );
    focusKeyboard(btn());
    fireEvent.keyDown(btn(), { key: "Enter" });
    fireEvent.click(btn());
    fireEvent.keyDown(btn(), { key: " " });
    fireEvent.keyUp(btn(), { key: " " });
    expect(onClick).toHaveBeenCalled();
    expect(tip()).not.toBeNull();
  });

  it("closes on a touch tap on the tooltip itself", () => {
    render(
      <Tooltip content="Copy link">
        <Button>Copy</Button>
      </Tooltip>,
    );
    fireEvent.pointerDown(btn(), { pointerType: "touch" });
    advance(500);
    fireEvent.pointerUp(btn(), { pointerType: "touch" });
    const box = screen.getByRole("tooltip");
    fireEvent.pointerDown(box, { pointerType: "touch" });
    expect(tip()).toBeNull();
  });

  it("closes on a mouse press elsewhere", () => {
    render(
      <Tooltip content="Copy link">
        <Button>Copy</Button>
      </Tooltip>,
    );
    focusKeyboard(btn());
    fireEvent.pointerDown(document.body, mouse);
    expect(tip()).toBeNull();
  });
});

describe("Tooltip disabled and empty", () => {
  it("never opens when disabled and leaves the trigger untouched", () => {
    const onOpenChange = vi.fn();
    render(
      <Tooltip content="Copy link" disabled onOpenChange={onOpenChange}>
        <Button>Copy</Button>
      </Tooltip>,
    );
    focusKeyboard(btn());
    hover();
    advance(1000);
    fireEvent.pointerDown(btn(), { pointerType: "touch" });
    advance(1000);
    expect(tip()).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(btn()).not.toHaveAttribute("aria-describedby");
  });

  it("renders nothing even when told to be open while disabled", () => {
    render(
      <Tooltip content="Copy link" disabled open>
        <Button>Copy</Button>
      </Tooltip>,
    );
    expect(tip()).toBeNull();
  });

  it("closes an open tooltip when it becomes disabled", () => {
    const { rerender } = render(
      <Tooltip content="Copy link" defaultOpen>
        <Button>Copy</Button>
      </Tooltip>,
    );
    expect(tip()).not.toBeNull();
    rerender(
      <Tooltip content="Copy link" defaultOpen disabled>
        <Button>Copy</Button>
      </Tooltip>,
    );
    expect(tip()).toBeNull();
  });

  it.each([
    ["an empty string", ""],
    ["null", null],
    ["false", false],
  ])("renders no tooltip for %s content", (_, content) => {
    render(
      <Tooltip content={content} open>
        <Button>Copy</Button>
      </Tooltip>,
    );
    focusKeyboard(btn());
    expect(tip()).toBeNull();
    expect(btn()).not.toHaveAttribute("aria-describedby");
  });
});

describe("Tooltip rich variant", () => {
  it("renders a title and supporting text in a raised box", () => {
    render(
      <Tooltip title="Lead time" content="Six to ten weeks from approved drawings" defaultOpen>
        <Button>Copy</Button>
      </Tooltip>,
    );
    const box = screen.getByRole("tooltip");
    expect(box).toHaveClass("ol-tooltip", "ol-tooltip--rich");
    expect(box.querySelector(".ol-tooltip__title")).toHaveTextContent("Lead time");
    expect(box.querySelector(".ol-tooltip__body")).toHaveTextContent(
      "Six to ten weeks from approved drawings",
    );
  });

  it("separates the title from the body in the description with hidden punctuation", () => {
    render(
      <Tooltip title="Lead time" content="Six weeks" defaultOpen>
        <Button>Copy</Button>
      </Tooltip>,
    );
    const separator = tip()?.querySelector(".ol-tooltip__title .ol-sr");
    expect(separator).toHaveTextContent(".");
    expect(tip()?.textContent).toBe("Lead time. Six weeks");
  });

  it("is rich with variant alone, and plain with variant plain even when a title is set", () => {
    const { rerender } = render(
      <Tooltip variant="rich" content="Body only" defaultOpen>
        <Button>Copy</Button>
      </Tooltip>,
    );
    expect(tip()).toHaveClass("ol-tooltip--rich");
    expect(tip()?.querySelector(".ol-tooltip__title")).toBeNull();
    rerender(
      <Tooltip variant="plain" title="Ignored" content="Body only" defaultOpen>
        <Button>Copy</Button>
      </Tooltip>,
    );
    expect(tip()).not.toHaveClass("ol-tooltip--rich");
    expect(tip()).toHaveTextContent(/^Body only$/);
  });

  it("always describes the trigger, even when its text repeats the name", () => {
    render(
      <Tooltip title="Copy" content="Copy" defaultOpen>
        <Button aria-label="Copy">⧉</Button>
      </Tooltip>,
    );
    expect(btn()).toHaveAttribute("aria-describedby", tip()?.id);
  });

  it("has no axe violations open in both themes", async () => {
    vi.useRealTimers();
    render(
      <>
        {(["washi", "sumi"] as const).map((theme) => (
          <Root key={theme} theme={theme}>
            <Tooltip title="Lead time" content="Six to ten weeks" open>
              <Button>{`Delivery ${theme}`}</Button>
            </Tooltip>
          </Root>
        ))}
      </>,
    );
    expect(screen.getAllByRole("tooltip")).toHaveLength(2);
    expect(
      await runAxe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});

describe("Tooltip describedby skip", () => {
  it("skips a trigger named by aria-labelledby with the same words", () => {
    render(
      <>
        <span id="lbl">Copy link</span>
        <Tooltip content="Copy link" defaultOpen>
          <Button square aria-labelledby="lbl">
            ⧉
          </Button>
        </Tooltip>
      </>,
    );
    expect(tip()).not.toBeNull();
    expect(screen.getByRole("button", { name: "Copy link" })).not.toHaveAttribute(
      "aria-describedby",
    );
  });

  it("skips when an aria-labelledby name already contains the words", () => {
    render(
      <>
        <span id="lbl">Copy link to clipboard</span>
        <Tooltip content="copy link" defaultOpen>
          <Button aria-labelledby="lbl">⧉</Button>
        </Tooltip>
      </>,
    );
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-describedby");
  });

  it("skips a name built from nested elements and node content", () => {
    render(
      <Tooltip
        content={
          <>
            Copy <strong>link</strong>
          </>
        }
        defaultOpen
      >
        <Button>
          <span aria-hidden="true">⧉</span>
          <span>Copy</span> link
        </Button>
      </Tooltip>,
    );
    expect(screen.getByRole("button", { name: "Copy link" })).not.toHaveAttribute(
      "aria-describedby",
    );
  });

  it("skips a form control named by its label", () => {
    render(
      <label>
        Snow
        <Tooltip content="Snow" defaultOpen>
          <input type="radio" name="c" />
        </Tooltip>
      </label>,
    );
    expect(screen.getByRole("radio", { name: "Snow" })).not.toHaveAttribute("aria-describedby");
  });

  it("matches whole words only inside a label name", () => {
    render(
      <>
        <span id="lbl">Password</span>
        <Tooltip content="word" defaultOpen>
          <Button aria-labelledby="lbl">⧉</Button>
        </Tooltip>
      </>,
    );
    expect(screen.getByRole("button", { name: "Password" })).toHaveAttribute(
      "aria-describedby",
      tip()?.id,
    );
  });

  it("names an input button by its value and an image input by its alt", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <>
        <Tooltip content="Send" defaultOpen>
          <input type="submit" value="Send" />
        </Tooltip>
        <Tooltip content="Search">
          <input type="image" alt="Search" src="data:," />
        </Tooltip>
      </>,
    );
    expect(screen.getByRole("button", { name: "Send" })).not.toHaveAttribute("aria-describedby");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("describes when the words differ from the name", () => {
    render(
      <Tooltip content="Copy the share link" defaultOpen>
        <Button>
          <span>Copy</span> link
        </Button>
      </Tooltip>,
    );
    expect(screen.getByRole("button", { name: "Copy link" })).toHaveAttribute(
      "aria-describedby",
      tip()?.id,
    );
  });
});

describe("Tooltip development warnings", () => {
  const spy = () => vi.spyOn(console, "warn").mockImplementation(() => undefined);

  it("warns when the trigger has no accessible name", () => {
    const warn = spy();
    render(
      <Tooltip content="Copy link">
        <button type="button">
          <span aria-hidden="true">⧉</span>
        </button>
      </Tooltip>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no accessible name"));
    warn.mockRestore();
  });

  it("warns when the trigger has a native title", () => {
    const warn = spy();
    render(
      <Tooltip content="Copy link">
        <Button title="Copy link">Copy</Button>
      </Tooltip>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("native `title`"));
    warn.mockRestore();
  });

  it("warns when the tooltip holds a focusable element", () => {
    const warn = spy();
    render(
      <Tooltip
        content={
          <>
            See <a href="#help">help</a>
          </>
        }
        defaultOpen
      >
        <Button>Copy</Button>
      </Tooltip>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Popover"));
    warn.mockRestore();
  });

  it("stays quiet for a named trigger with plain content", () => {
    const warn = spy();
    render(
      <Tooltip title="Lead time" content="Six weeks" defaultOpen>
        <Button aria-label="Delivery">⧉</Button>
      </Tooltip>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("Tooltip motion", () => {
  const css = readFileSync("src/components/Tooltip/Tooltip.css", "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );

  it("animates only with motion tokens, so reduced motion shortens it to 1ms", () => {
    const animations = [...css.matchAll(/animation:\s*([^;]+);/g)].map((m) => m[1] ?? "");
    expect(animations).toEqual([
      "ol-fade-in var(--dur-s) var(--ease-effect) backwards",
      "ol-settle var(--dur-m) var(--ease-standard) backwards",
    ]);
    expect(css).not.toMatch(/\d+m?s\b/);
  });

  it("animates only once positioned and never when opened at once by a warm group", () => {
    const selectors = [...css.matchAll(/([^{}]+)\{[^}]*animation:/g)].map((m) =>
      (m[1] ?? "").trim(),
    );
    expect(selectors).toHaveLength(2);
    for (const selector of selectors) {
      expect(selector).toContain('[data-state="open"]');
      expect(selector).toContain(":not([data-instant])");
    }
  });
});
