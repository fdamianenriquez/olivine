import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Button } from "../Button";
import { Modal } from "../Modal";
import { Root } from "../Root";
import { Tooltip } from "./Tooltip";

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
