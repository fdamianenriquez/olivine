import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DelayGroupProvider, useDelayGroup } from "./useDelayGroup";
import { type HoverIntentOptions, useHoverIntent } from "./useHoverIntent";

type ProbeOptions = Partial<Omit<HoverIntentOptions, "open" | "setOpen" | "group">> & {
  id?: string;
  grouped?: boolean;
};

function Probe({ id = "a", grouped = false, ...options }: ProbeOptions) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const group = useDelayGroup(id);
  const { getTriggerProps, contentProps, instant } = useHoverIntent({
    open,
    setOpen,
    openDelay: 300,
    closeDelay: 0,
    contentRef,
    ...(grouped ? { group } : {}),
    ...options,
  });
  return (
    <>
      <button type="button" {...getTriggerProps({})}>
        trigger {id}
      </button>
      {open ? (
        <div
          ref={contentRef}
          data-testid={`content-${id}`}
          data-instant={instant || undefined}
          {...contentProps}
        >
          card <a href="#x">x</a>
        </div>
      ) : null}
    </>
  );
}

const mouse = { pointerType: "mouse", button: 0 };
const touch = { pointerType: "touch", button: 0 };
const trigger = (id = "a") => screen.getByRole("button", { name: `trigger ${id}` });
const content = (id = "a") => screen.queryByTestId(`content-${id}`);
const must = (node: HTMLElement | null): HTMLElement => {
  if (!node) throw new Error("content is not rendered");
  return node;
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useHoverIntent", () => {
  it("opens after the delay on hover and closes after the grace", () => {
    render(<Probe />);
    fireEvent.pointerEnter(trigger(), mouse);
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(content()).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(content()).not.toBeNull();
    fireEvent.pointerLeave(trigger(), mouse);
    act(() => {
      vi.advanceTimersByTime(99);
    });
    expect(content()).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(content()).toBeNull();
  });

  it("stays open while the pointer is on the content", () => {
    render(<Probe />);
    fireEvent.pointerEnter(trigger(), mouse);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.pointerLeave(trigger(), mouse);
    fireEvent.pointerEnter(must(content()), mouse);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(content()).not.toBeNull();
    fireEvent.pointerLeave(must(content()), mouse);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(content()).toBeNull();
  });

  it("opens on keyboard focus and stays while focus remains after the pointer leaves", () => {
    render(<Probe />);
    fireEvent.focus(trigger());
    expect(content()).not.toBeNull();
    fireEvent.pointerEnter(trigger(), mouse);
    fireEvent.pointerLeave(trigger(), mouse);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(content()).not.toBeNull();
    fireEvent.blur(trigger());
    expect(content()).toBeNull();
  });

  it("waits focusDelay on keyboard focus", () => {
    render(<Probe focusDelay={600} />);
    fireEvent.focus(trigger());
    act(() => {
      vi.advanceTimersByTime(599);
    });
    expect(content()).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(content()).not.toBeNull();
  });

  it("ignores focus caused by a press", () => {
    render(<Probe />);
    fireEvent.pointerDown(trigger(), mouse);
    fireEvent.focus(trigger());
    expect(content()).toBeNull();
  });

  it("closes on a mouse press and does not reopen until the pointer leaves", () => {
    render(<Probe />);
    fireEvent.pointerEnter(trigger(), mouse);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.pointerDown(trigger(), mouse);
    expect(content()).toBeNull();
    fireEvent.pointerEnter(trigger(), mouse);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(content()).toBeNull();
    fireEvent.pointerLeave(trigger(), mouse);
    fireEvent.pointerEnter(trigger(), mouse);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(content()).not.toBeNull();
  });

  it("ignores touch by default", () => {
    render(<Probe />);
    fireEvent.pointerEnter(trigger(), touch);
    fireEvent.pointerDown(trigger(), touch);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(content()).toBeNull();
  });

  it("opens on a touch long press, swallows its click and closes on a tap on the content", () => {
    const onClick = vi.fn();
    function Clicky() {
      const [open, setOpen] = useState(false);
      const { getTriggerProps, contentProps } = useHoverIntent({
        open,
        setOpen,
        openDelay: 300,
        closeDelay: 0,
        touch: "long-press",
      });
      return (
        <>
          <button type="button" {...getTriggerProps({ onClick })}>
            trigger a
          </button>
          {open ? <div data-testid="content-a" {...contentProps} /> : null}
        </>
      );
    }
    render(<Clicky />);
    fireEvent.pointerDown(trigger(), touch);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(content()).not.toBeNull();
    fireEvent.pointerUp(trigger(), touch);
    const prevented = !fireEvent.contextMenu(trigger());
    expect(prevented).toBe(true);
    fireEvent.click(trigger());
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.pointerDown(must(content()), touch);
    expect(content()).toBeNull();
  });

  it("never opens when disabled", () => {
    render(<Probe disabled />);
    fireEvent.pointerEnter(trigger(), mouse);
    fireEvent.focus(trigger());
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(content()).toBeNull();
  });

  it("keeps the content open while text inside it is being selected", () => {
    render(<Probe keepOpenWhileSelecting />);
    fireEvent.pointerEnter(trigger(), mouse);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.pointerLeave(trigger(), mouse);
    fireEvent.pointerEnter(must(content()), mouse);
    fireEvent.pointerDown(must(content()), mouse);
    fireEvent.pointerLeave(must(content()), mouse);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(content()).not.toBeNull();
    fireEvent.pointerUp(document, mouse);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(content()).toBeNull();
  });
});

describe("useDelayGroup", () => {
  it("opens the next member at once while warm and keeps one open", () => {
    render(
      <DelayGroupProvider>
        <Probe id="a" grouped />
        <Probe id="b" grouped />
      </DelayGroupProvider>,
    );
    fireEvent.pointerEnter(trigger("a"), mouse);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(content("a")).not.toBeNull();
    expect(content("a")).not.toHaveAttribute("data-instant");
    fireEvent.pointerLeave(trigger("a"), mouse);
    fireEvent.pointerEnter(trigger("b"), mouse);
    expect(content("b")).not.toBeNull();
    expect(content("b")).toHaveAttribute("data-instant");
    expect(content("a")).toBeNull();
  });

  it("cools down after skipDelay", () => {
    render(
      <DelayGroupProvider skipDelay={200}>
        <Probe id="a" grouped />
        <Probe id="b" grouped />
      </DelayGroupProvider>,
    );
    fireEvent.pointerEnter(trigger("a"), mouse);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.pointerLeave(trigger("a"), mouse);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(content("a")).toBeNull();
    fireEvent.pointerEnter(trigger("b"), mouse);
    expect(content("b")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(content("b")).not.toBeNull();
  });

  it("uses the built-in default group without a provider", () => {
    render(
      <>
        <Probe id="a" grouped />
        <Probe id="b" grouped />
      </>,
    );
    fireEvent.pointerEnter(trigger("a"), mouse);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.pointerLeave(trigger("a"), mouse);
    fireEvent.pointerEnter(trigger("b"), mouse);
    expect(content("b")).not.toBeNull();
  });
});
