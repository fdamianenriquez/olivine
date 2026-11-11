import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useEffect, useState } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Button } from "../Button";
import { Modal } from "../Modal";
import { Root } from "../Root";
import { Toast } from "../Toast";
import { type ToastApi, type ToastOptions, useToast } from "./ToastContext";
import { ToastProvider, type ToastProviderProps } from "./ToastProvider";
import { ToastStack } from "./ToastStack";

/** jsdom has no animations: usePresence ends the exit on its fallback timeout. */
const EXIT = 1000;

const holder: { api: ToastApi | null } = { api: null };
function Grab() {
  const current = useToast();
  useEffect(() => {
    holder.api = current;
  });
  return null;
}
function getApi(): ToastApi {
  if (!holder.api) throw new Error("provider not mounted");
  return holder.api;
}

function setup(props: ToastProviderProps = {}) {
  return render(
    <ToastProvider {...props}>
      <Grab />
    </ToastProvider>,
  );
}

function show(options: ToastOptions) {
  let id = "";
  act(() => {
    id = getApi().show(options);
  });
  return id;
}

function call(fn: (api: ToastApi) => void) {
  act(() => {
    fn(getApi());
  });
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

function key(target: EventTarget, init: KeyboardEventInit) {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

function pointer(
  target: EventTarget,
  type: string,
  init: { x?: number; pointerType?: string } = {},
) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: init.x ?? 0 });
  Object.assign(event, { pointerId: 1, pointerType: init.pointerType ?? "touch" });
  act(() => {
    target.dispatchEvent(event);
  });
}

const titles = () => [...document.querySelectorAll(".ol-toast__title")].map((n) => n.textContent);
const toastOf = (text: string) => {
  const el = screen.getByText(text).closest<HTMLElement>(".ol-toast");
  if (!el) throw new Error(`no toast for ${text}`);
  return el;
};

beforeAll(() => {
  Object.defineProperty(Element.prototype, "setPointerCapture", {
    value: () => undefined,
    configurable: true,
  });
});

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ToastStack", () => {
  it("is a named landmark that holds the polite live region, even when empty", () => {
    render(<ToastStack data-testid="s" className="x" />);
    const el = screen.getByTestId("s");
    expect(el).toHaveClass("ol-toaststack", "ol-toaststack--tr", "x");
    expect(screen.getByRole("region", { name: "Notifications" })).toBe(el);
    expect(el).toHaveAttribute("tabindex", "-1");
    expect(el).toHaveAttribute("aria-live", "polite");
    expect(el).toHaveAttribute("aria-atomic", "false");
    expect(el).toHaveAttribute("aria-relevant", "additions text");
  });

  it("takes its own label and localises the default", () => {
    const { rerender } = render(<ToastStack label="Alerts" />);
    expect(screen.getByRole("region", { name: "Alerts" })).toBeInTheDocument();
    rerender(
      <Root locale="es">
        <ToastStack />
      </Root>,
    );
    expect(screen.getByRole("region", { name: "Notificaciones" })).toBeInTheDocument();
    rerender(
      <Root locale="ja">
        <ToastStack />
      </Root>,
    );
    expect(screen.getByRole("region", { name: "通知" })).toBeInTheDocument();
  });

  it("is not a landmark when static", () => {
    render(<ToastStack data-testid="s" position="static" />);
    const el = screen.getByTestId("s");
    expect(el).not.toHaveAttribute("role");
    expect(el).not.toHaveAttribute("tabindex");
    expect(el).toHaveAttribute("aria-live", "polite");
  });

  it.each(["br", "tr", "bl", "tc", "static"] as const)("maps position %s to its modifier", (p) => {
    render(<ToastStack data-testid="s" position={p} />);
    expect(screen.getByTestId("s")).toHaveClass(`ol-toaststack--${p}`);
  });

  it("forwards the ref to the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ToastStack ref={ref} />);
    expect(ref.current).toHaveClass("ol-toaststack");
  });

  it("keeps toasts keyboard reachable", () => {
    render(
      <ToastStack>
        <Toast title="Hi" onClose={() => undefined} />
      </ToastStack>,
    );
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it.each([
    ["tr", "ol-toast--swipe-x"],
    ["bl", "ol-toast--swipe-x"],
    ["tc", "ol-toast--swipe-y"],
  ] as const)("gives toasts in %s a swipe along %s", (position, cls) => {
    render(
      <ToastStack position={position}>
        <Toast title="Hi" onClose={() => undefined} />
      </ToastStack>,
    );
    expect(toastOf("Hi")).toHaveClass(cls);
  });

  it("does not swipe in a static stack", () => {
    render(
      <ToastStack position="static">
        <Toast title="Hi" onClose={() => undefined} />
      </ToastStack>,
    );
    expect(toastOf("Hi").className).not.toMatch(/swipe/);
  });

  it("stops pausing when a focused control is removed without a blur", async () => {
    const onClose = vi.fn();
    function Host({ first }: { first: boolean }) {
      return (
        <ToastStack>
          {first && <Toast title="First" onClose={() => undefined} />}
          <Toast title="Second" duration={1000} onClose={onClose} />
        </ToastStack>
      );
    }
    const { rerender } = render(<Host first />);
    const [button] = screen.getAllByRole("button", { name: "Dismiss" });
    act(() => {
      button?.focus();
    });
    expect(toastOf("Second")).toHaveAttribute("data-state", "paused");
    // Simulate a browser that fires no blur: take the node out without moving focus first.
    rerender(<Host first={false} />);
    await flush();
    expect(toastOf("Second")).toHaveAttribute("data-state", "active");
    advance(1000);
    expect(onClose).toHaveBeenCalledWith("timeout");
  });

  it("pauses on a mouse hover of the stack but not on a touch", () => {
    const onClose = vi.fn();
    render(
      <ToastStack data-testid="s">
        <Toast title="A" duration={1000} onClose={onClose} />
      </ToastStack>,
    );
    const stack = screen.getByTestId("s");
    fireEvent.pointerEnter(stack, { pointerType: "touch" });
    expect(toastOf("A")).toHaveAttribute("data-state", "active");
    fireEvent.pointerEnter(stack, { pointerType: "mouse" });
    expect(toastOf("A")).toHaveAttribute("data-state", "paused");
    fireEvent.pointerLeave(stack, { pointerType: "mouse" });
    advance(1000);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pauses every toast while one is pressed, until the release", () => {
    const onClose = vi.fn();
    render(
      <ToastStack>
        <Toast title="A" duration={1000} onClose={onClose} />
        <Toast title="B" duration={1000} onClose={onClose} />
      </ToastStack>,
    );
    pointer(toastOf("A"), "pointerdown");
    expect(toastOf("B")).toHaveAttribute("data-state", "paused");
    advance(5000);
    expect(onClose).not.toHaveBeenCalled();
    pointer(window, "pointerup");
    advance(1000);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("pauses while the window has no focus", () => {
    const onClose = vi.fn();
    render(
      <ToastStack>
        <Toast title="A" duration={1000} onClose={onClose} />
      </ToastStack>,
    );
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    advance(5000);
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    advance(1000);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations", async () => {
    vi.useRealTimers();
    const { container } = render(
      <>
        <ToastStack position="static">
          <Toast title="Shipped" meta="Order" onClose={() => undefined} />
        </ToastStack>
        <ToastStack>
          <Toast title="Saved" onClose={() => undefined} action={<Button size="s">Undo</Button>} />
        </ToastStack>
      </>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

describe("hotkey", () => {
  function App({ toasts = true, hotkey }: { toasts?: boolean; hotkey?: string | false }) {
    return (
      <>
        <button type="button">Outside</button>
        <ToastStack {...(hotkey === undefined ? null : { hotkey })}>
          {toasts && (
            <Toast
              title="Saved"
              onClose={() => undefined}
              action={<Button size="s">Undo</Button>}
            />
          )}
        </ToastStack>
      </>
    );
  }

  it("F6 moves focus into the stack and F6 or Shift+F6 brings it back", () => {
    render(<App />);
    const outside = screen.getByRole("button", { name: "Outside" });
    act(() => {
      outside.focus();
    });
    const into = key(outside, { key: "F6" });
    expect(into.defaultPrevented).toBe(true);
    expect(screen.getByRole("button", { name: "Dismiss" })).toHaveFocus();
    key(document.activeElement ?? document, { key: "F6" });
    expect(outside).toHaveFocus();
    key(outside, { key: "F6", shiftKey: true });
    expect(screen.getByRole("button", { name: "Dismiss" })).toHaveFocus();
    key(document.activeElement ?? document, { key: "F6", shiftKey: true });
    expect(outside).toHaveFocus();
  });

  it("is not intercepted while no toast is shown, with a modifier, or when off", () => {
    const { rerender } = render(<App toasts={false} />);
    const outside = screen.getByRole("button", { name: "Outside" });
    act(() => {
      outside.focus();
    });
    expect(key(outside, { key: "F6" }).defaultPrevented).toBe(false);
    rerender(<App />);
    expect(key(outside, { key: "F6", ctrlKey: true }).defaultPrevented).toBe(false);
    rerender(<App hotkey={false} />);
    expect(key(outside, { key: "F6" }).defaultPrevented).toBe(false);
    expect(outside).toHaveFocus();
    expect(screen.queryByText(/to reach the action/)).toBeNull();
  });

  it("takes another key and names it in the hint", () => {
    render(<App hotkey="F8" />);
    expect(screen.getByText("Press F8 to reach the action")).toBeInTheDocument();
    const outside = screen.getByRole("button", { name: "Outside" });
    act(() => {
      outside.focus();
    });
    key(outside, { key: "F8" });
    expect(screen.getByRole("button", { name: "Dismiss" })).toHaveFocus();
  });

  it("focuses the stack itself when no toast has a control", () => {
    render(
      <ToastStack data-testid="s">
        <Toast title="Plain" />
      </ToastStack>,
    );
    key(document.body, { key: "F6" });
    expect(screen.getByTestId("s")).toHaveFocus();
  });

  it("Tab and Shift+Tab move between the stack's controls and are kept from the page", () => {
    render(<App />);
    const dismiss = screen.getByRole("button", { name: "Dismiss" });
    const undo = screen.getByRole("button", { name: "Undo" });
    const seen = vi.fn();
    document.addEventListener("keydown", seen);
    act(() => {
      dismiss.focus();
    });
    key(dismiss, { key: "Tab" });
    expect(undo).toHaveFocus();
    key(undo, { key: "Tab", shiftKey: true });
    expect(dismiss).toHaveFocus();
    expect(seen).not.toHaveBeenCalled();
    // At the edge the browser takes over.
    const leave = key(dismiss, { key: "Tab", shiftKey: true });
    expect(leave.defaultPrevented).toBe(false);
    expect(seen).toHaveBeenCalledTimes(1);
    document.removeEventListener("keydown", seen);
  });
});

describe("ToastProvider and useToast", () => {
  it("has the live region in the DOM before the first toast", () => {
    setup();
    const region = screen.getByRole("region", { name: "Notifications" });
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region.children).toHaveLength(0);
  });

  it("throws a clear error outside a provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Grab />)).toThrow(/ToastProvider/);
  });

  it("shows a toast with options and returns a stable id", () => {
    setup({ position: "bl" });
    const id = show({
      id: "a",
      title: "Saved",
      description: "Stored.",
      meta: "Draft",
      tone: "success",
    });
    expect(id).toBe("a");
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Stored.")).toBeInTheDocument();
    expect(document.querySelector(".ol-toaststack")).toHaveClass("ol-toaststack--bl");
    expect(document.querySelector(".ol-toast")).toHaveClass("ol-toast--success");
  });

  it("passes label and hotkey to the stack", () => {
    setup({ label: "Alerts", hotkey: false });
    show({ title: "A", action: { label: "Undo", onClick: () => undefined } });
    expect(screen.getByRole("region", { name: "Alerts" })).toBeInTheDocument();
    expect(screen.queryByText(/to reach the action/)).toBeNull();
  });

  it("auto-dismisses after the default duration, plays the exit, then unmounts", () => {
    setup();
    const onClose = vi.fn();
    show({ title: "Gone", onClose });
    advance(4999);
    expect(onClose).not.toHaveBeenCalled();
    advance(1);
    expect(onClose).toHaveBeenCalledWith("timeout");
    expect(toastOf("Gone")).toHaveAttribute("data-state", "closing");
    advance(EXIT);
    expect(screen.queryByText("Gone")).toBeNull();
  });

  it("honours a per-toast and a provider duration", () => {
    setup({ duration: 1000 });
    show({ title: "Short" });
    show({ title: "Long", duration: 3000 });
    advance(1000);
    advance(EXIT);
    expect(screen.queryByText("Short")).toBeNull();
    expect(screen.getByText("Long")).toBeInTheDocument();
    advance(2000);
    expect(toastOf("Long")).toHaveAttribute("data-state", "closing");
    advance(EXIT);
    expect(screen.queryByText("Long")).toBeNull();
  });

  it.each([0, null])("keeps a toast with duration %s until dismissed", (d) => {
    setup();
    const onClose = vi.fn();
    show({ title: "Stay", duration: d, onClose });
    advance(60000);
    expect(screen.getByText("Stay")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onClose).toHaveBeenCalledWith("dismiss");
    advance(EXIT);
    expect(screen.queryByText("Stay")).toBeNull();
  });

  it("queues beyond max and promotes once the earlier toast has left", () => {
    setup({ max: 2, duration: null });
    show({ id: "1", title: "One" });
    show({ id: "2", title: "Two" });
    show({ id: "3", title: "Three" });
    expect(screen.queryByText("Three")).toBeNull();
    call((api) => {
      api.dismiss("1");
    });
    // The leaving toast keeps its slot so toasts never overlap.
    expect(toastOf("One")).toHaveAttribute("data-state", "closing");
    expect(screen.queryByText("Three")).toBeNull();
    advance(EXIT);
    expect(screen.queryByText("One")).toBeNull();
    expect(screen.getByText("Three")).toBeInTheDocument();
  });

  it("dismisses queued toasts by id at once and calls onClose once with api", () => {
    setup({ max: 1, duration: null });
    const onClose = vi.fn();
    show({ id: "1", title: "One" });
    show({ id: "2", title: "Two", onClose });
    call((api) => {
      api.dismiss("2");
      api.dismiss("2");
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith("api");
    call((api) => {
      api.dismiss("1");
    });
    advance(EXIT);
    expect(document.querySelectorAll(".ol-toast")).toHaveLength(0);
  });

  it("clear closes everything, queued included, with reason api", () => {
    setup({ max: 1, duration: null });
    const one = vi.fn();
    const two = vi.fn();
    show({ title: "One", onClose: one });
    show({ title: "Two", onClose: two });
    call((api) => {
      api.clear();
    });
    expect(one).toHaveBeenCalledWith("api");
    expect(two).toHaveBeenCalledWith("api");
    advance(EXIT);
    expect(document.querySelectorAll(".ol-toast")).toHaveLength(0);
  });

  it("puts the newest toast nearest the corner", () => {
    const { unmount } = setup({ position: "br", duration: null });
    show({ title: "First" });
    show({ title: "Second" });
    expect(titles()).toEqual(["First", "Second"]);
    unmount();

    setup({ position: "tr", duration: null });
    show({ title: "First" });
    show({ title: "Second" });
    expect(titles()).toEqual(["Second", "First"]);
  });

  it("showing an open id replaces it in place and restarts its countdown", () => {
    setup({ duration: 1000 });
    const onClose = vi.fn();
    show({ id: "a", title: "Saving" });
    advance(800);
    show({ id: "a", title: "Saved", onClose });
    expect(titles()).toEqual(["Saved"]);
    advance(999);
    expect(onClose).not.toHaveBeenCalled();
    advance(1);
    expect(onClose).toHaveBeenCalledWith("timeout");
  });

  it("showing a closing id brings it back", () => {
    setup({ duration: null });
    show({ id: "a", title: "One" });
    call((api) => {
      api.dismiss("a");
    });
    show({ id: "a", title: "Again" });
    advance(EXIT);
    expect(toastOf("Again")).not.toHaveAttribute("data-state", "closing");
  });

  describe("onClose reasons", () => {
    it("reports escape and swipe", () => {
      setup({ duration: null });
      const onClose = vi.fn();
      show({ title: "Esc", onClose });
      key(screen.getByRole("button", { name: "Dismiss" }), { key: "Escape" });
      expect(onClose).toHaveBeenLastCalledWith("escape");
      advance(EXIT);

      show({ title: "Swipe", onClose });
      const el = toastOf("Swipe");
      Object.defineProperty(el, "offsetWidth", { value: 300 });
      pointer(el, "pointerdown");
      pointer(el, "pointermove", { x: 50 });
      pointer(el, "pointermove", { x: 200 });
      advance(400);
      pointer(el, "pointerup", { x: 200 });
      expect(onClose).toHaveBeenLastCalledWith("swipe");
      expect(el).toHaveAttribute("data-state", "closing");
      expect(el).toHaveAttribute("data-swipe", "out");
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it("turns swipe off with swipe={false}", () => {
      setup({ duration: null, swipe: false });
      show({ title: "Stay" });
      expect(toastOf("Stay").className).not.toMatch(/swipe/);
    });
  });

  describe("action", () => {
    it("renders one outline button, runs onClick, then closes with reason action", () => {
      setup();
      const onClick = vi.fn();
      const onClose = vi.fn();
      show({
        title: "Removed",
        action: { label: "Undo", onClick, ariaLabel: "Undo removing Ana" },
        onClose,
      });
      const button = screen.getByRole("button", { name: "Undo removing Ana" });
      expect(button).toHaveClass("ol-btn", "ol-btn--s");
      expect(button).toHaveTextContent("Undo");
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledWith("action");
      expect(toastOf("Removed")).toHaveAttribute("data-state", "closing");
    });

    it("stays open with closeOnAction: false", () => {
      setup({ duration: null });
      const onClick = vi.fn();
      show({ title: "Kept", action: { label: "Retry", onClick, closeOnAction: false } });
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(toastOf("Kept")).not.toHaveAttribute("data-state", "closing");
    });

    it("waits actionDuration (10 s) for action and danger toasts", () => {
      setup();
      const onClose = vi.fn();
      show({ title: "Undo me", action: { label: "Undo", onClick: () => undefined }, onClose });
      show({ title: "Failed", tone: "danger", onClose });
      advance(9999);
      expect(onClose).not.toHaveBeenCalled();
      advance(1);
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it("takes a custom actionDuration", () => {
      setup({ actionDuration: null });
      show({ title: "Persistent", action: { label: "Undo", onClick: () => undefined } });
      advance(60000);
      expect(toastOf("Persistent")).not.toHaveAttribute("data-state", "closing");
    });

    it("hints the hotkey in the hidden text", () => {
      setup();
      show({ title: "Removed", action: { label: "Undo", onClick: () => undefined } });
      expect(screen.getByText("Press F6 to reach the action")).toHaveClass("ol-sr");
    });
  });

  it("makes a danger toast an alert, and honours priority", () => {
    setup({ duration: null });
    show({ title: "Failed", tone: "danger" });
    show({ title: "Note", tone: "warning", priority: "assertive" });
    show({ title: "Calm", tone: "danger", priority: "polite" });
    const alerts = screen
      .getAllByRole("alert")
      .map((n) => n.querySelector(".ol-toast__title")?.textContent);
    expect(alerts.sort()).toEqual(["Failed", "Note"]);
  });

  it("draws a seal", () => {
    setup({ duration: null });
    show({ title: "Paid", tone: "success", seal: "済" });
    expect(toastOf("Paid").querySelector(".ol-toast__seal .ol-stamp")).toHaveTextContent("済");
  });

  describe("update", () => {
    it("changes an open toast, restarts its countdown and keeps it in place", () => {
      setup({ duration: 1000 });
      const onClose = vi.fn();
      show({ id: "u", title: "Uploading", description: "1 of 3", onClose });
      advance(800);
      call((api) => {
        api.update("u", { description: "2 of 3" });
      });
      expect(screen.getByText("Uploading")).toBeInTheDocument();
      expect(screen.getByText("2 of 3")).toBeInTheDocument();
      advance(999);
      expect(onClose).not.toHaveBeenCalled();
      advance(1);
      expect(onClose).toHaveBeenCalledWith("timeout");
    });

    it("works on a queued toast and can replace onClose", () => {
      setup({ max: 1, duration: null });
      const first = vi.fn();
      const second = vi.fn();
      show({ id: "1", title: "One" });
      show({ id: "2", title: "Two", onClose: first });
      call((api) => {
        api.update("2", { title: "Two, updated", onClose: second });
        api.dismiss("1");
      });
      advance(EXIT);
      expect(screen.getByText("Two, updated")).toBeInTheDocument();
      call((api) => {
        api.dismiss("2");
      });
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledWith("api");
    });

    it("does nothing for an id that is gone", () => {
      setup({ duration: null });
      call((api) => {
        api.update("missing", { title: "Ghost" });
      });
      expect(screen.queryByText("Ghost")).toBeNull();
    });
  });

  describe("promise", () => {
    it("shows a persistent loading toast, then the success in place", async () => {
      setup();
      let resolve: (v: number) => void = () => undefined;
      const work = new Promise<number>((r) => {
        resolve = r;
      });
      let returned: Promise<number> | null = null;
      call((api) => {
        returned = api.promise(work, {
          loading: "Uploading",
          success: (n) => `Uploaded ${String(n)} files`,
          error: "Upload failed",
        });
      });
      expect(returned).toBe(work);
      const loading = toastOf("Uploading");
      expect(loading).toHaveClass("ol-toast--neutral");
      expect(loading.querySelector(".ol-toast__meta")).toHaveTextContent("Loading");
      expect(loading.querySelector(".ol-toast__timer")).toBeNull();
      advance(60000);
      expect(screen.getByText("Uploading")).toBeInTheDocument();

      resolve(3);
      await flush();
      const done = toastOf("Uploaded 3 files");
      expect(done).toBe(loading);
      expect(done).toHaveClass("ol-toast--success");
      expect(done.querySelector(".ol-toast__meta")).toHaveTextContent("Done");
      expect(done.querySelector(".ol-toast__timer")).toBeInTheDocument();
      advance(5000);
      expect(done).toHaveAttribute("data-state", "closing");
    });

    it("shows the error as a danger alert, from an options step", async () => {
      setup();
      const work = Promise.reject(new Error("disk full"));
      call((api) => {
        api
          .promise(
            work,
            {
              loading: { title: "Saving", description: "Hold on" },
              success: "Saved",
              error: (e) => ({ title: "Not saved", description: (e as Error).message }),
            },
            { duration: 2000 },
          )
          .catch(() => undefined);
      });
      await flush();
      const failed = toastOf("Not saved");
      expect(failed).toHaveAttribute("role", "alert");
      expect(failed).toHaveClass("ol-toast--danger");
      expect(screen.getByText("disk full")).toBeInTheDocument();
      expect(failed.querySelector(".ol-toast__meta")).toHaveTextContent("Error");
      advance(2000);
      expect(failed).toHaveAttribute("data-state", "closing");
    });

    it("does not show the outcome after the loading toast was dismissed", async () => {
      setup();
      let resolve: () => void = () => undefined;
      const work = new Promise<void>((r) => {
        resolve = r;
      });
      call((api) => {
        void api.promise(work, { loading: "Working", success: "Finished", error: "Failed" });
      });
      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      resolve();
      await flush();
      expect(screen.queryByText("Finished")).toBeNull();
    });
  });

  describe("focus", () => {
    it("moves focus to the next toast when the focused one closes", () => {
      setup({ duration: null, position: "br" });
      show({ title: "One" });
      show({ title: "Two" });
      const [first, second] = screen.getAllByRole("button", { name: "Dismiss" });
      if (!first) throw new Error("no toast");
      act(() => {
        first.focus();
      });
      fireEvent.click(first);
      expect(second).toHaveFocus();
    });

    it("returns focus to where the hotkey came from when the last toast closes", () => {
      render(
        <ToastProvider duration={null}>
          <Grab />
          <button type="button">Origin</button>
        </ToastProvider>,
      );
      show({ title: "Only" });
      const origin = screen.getByRole("button", { name: "Origin" });
      act(() => {
        origin.focus();
      });
      key(origin, { key: "F6" });
      expect(screen.getByRole("button", { name: "Dismiss" })).toHaveFocus();
      key(document.activeElement ?? document, { key: "Escape" });
      expect(origin).toHaveFocus();
    });

    it("reaches toasts from inside a Modal and Escape closes only the toast", () => {
      const onModalClose = vi.fn();
      function App() {
        const [open] = useState(true);
        return (
          <ToastProvider duration={null}>
            <Grab />
            <Modal open={open} title="Edit" onClose={onModalClose}>
              <button type="button">Inside</button>
            </Modal>
          </ToastProvider>
        );
      }
      render(<App />);
      show({ title: "Saved", action: { label: "Undo", onClick: () => undefined } });
      const inside = screen.getByRole("button", { name: "Inside" });
      act(() => {
        inside.focus();
      });
      key(inside, { key: "F6" });
      const dismiss = screen.getByRole("button", { name: "Dismiss" });
      expect(dismiss).toHaveFocus();
      key(dismiss, { key: "Tab" });
      expect(screen.getByRole("button", { name: "Undo" })).toHaveFocus();
      key(document.activeElement ?? document, { key: "Escape" });
      expect(onModalClose).not.toHaveBeenCalled();
      expect(inside).toHaveFocus();
    });
  });

  it("has no axe violations with toasts open", async () => {
    vi.useRealTimers();
    setup({ duration: null });
    show({ title: "Shipped", description: "On its way", meta: "Order" });
    show({
      title: "Removed",
      tone: "success",
      seal: "済",
      action: { label: "Undo", onClick: () => undefined },
    });
    show({ title: "Failed", tone: "danger" });
    expect(await runAxe(document.body)).toHaveNoViolations();
  });

  it("dismisses with the keyboard: Tab to Dismiss, then Enter", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onClose = vi.fn();
    setup({ duration: null });
    show({ title: "Keyboard", onClose });
    await user.tab();
    expect(screen.getByRole("button", { name: "Dismiss" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClose).toHaveBeenCalledWith("dismiss");
    expect(toastOf("Keyboard")).toHaveAttribute("data-state", "closing");
  });

  it("pauses every toast while one is hovered with a mouse, resuming on leave", () => {
    setup();
    show({ title: "A" });
    show({ title: "B" });
    const stack = screen.getByRole("region");
    fireEvent.pointerEnter(stack, { pointerType: "mouse" });
    advance(20000);
    expect(toastOf("A")).not.toHaveAttribute("data-state", "closing");
    expect(toastOf("B")).not.toHaveAttribute("data-state", "closing");
    fireEvent.pointerLeave(stack, { pointerType: "mouse" });
    advance(5000);
    advance(EXIT);
    expect(screen.queryByText("A")).toBeNull();
    expect(screen.queryByText("B")).toBeNull();
  });

  it("pauses while focus is inside the stack", () => {
    setup();
    show({ title: "A" });
    show({ title: "B" });
    const [button] = screen.getAllByRole("button", { name: "Dismiss" });
    act(() => {
      button?.focus();
    });
    advance(20000);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("pauses while the document is hidden", () => {
    setup();
    show({ title: "A" });
    const spy = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(20000);
    expect(screen.getByText("A")).toBeInTheDocument();
    spy.mockReturnValue(false);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(5000);
    advance(EXIT);
    expect(screen.queryByText("A")).toBeNull();
  });

  it.each([
    ["es", "Descartar"],
    ["ja", "閉じる"],
  ])("keeps the %s language in the portal layer", (locale, word) => {
    render(
      <Root locale={locale}>
        <ToastProvider>
          <Grab />
        </ToastProvider>
      </Root>,
    );
    show({ title: "T", duration: null });
    expect(document.querySelector(".ol-portal")).toHaveAttribute("lang", locale);
    expect(screen.getByRole("button", { name: word })).toBeInTheDocument();
  });

  it("keeps the theme in the portal layer", () => {
    render(
      <Root theme="sumi">
        <ToastProvider>
          <Grab />
        </ToastProvider>
      </Root>,
    );
    expect(document.querySelector(".ol-portal")).toHaveAttribute("data-theme", "sumi");
  });

  it("has no axe violations in sumi and after a queued toast is promoted", async () => {
    render(
      <Root theme="sumi">
        <ToastProvider max={1} duration={null}>
          <Grab />
        </ToastProvider>
      </Root>,
    );
    show({ id: "1", title: "One" });
    show({ id: "2", title: "Two" });
    call((api) => {
      api.dismiss("1");
    });
    advance(EXIT);
    expect(screen.getByText("Two")).toBeInTheDocument();
    vi.useRealTimers();
    expect(await runAxe(document.body)).toHaveNoViolations();
  });
});

describe("review round 1", () => {
  it("keeps focus in the toast when update() takes its focused action away", async () => {
    setup({ duration: 1000 });
    const onClose = vi.fn();
    show({
      id: "r",
      title: "Retry?",
      duration: 1000,
      onClose,
      action: { label: "Retry", onClick: () => undefined, closeOnAction: false },
    });
    const retry = screen.getByRole("button", { name: "Retry" });
    act(() => {
      retry.focus();
    });
    fireEvent.click(retry);
    call((api) => {
      api.update("r", { action: undefined });
    });
    await flush();
    expect(screen.getByRole("button", { name: "Dismiss" })).toHaveFocus();
    expect(document.activeElement).not.toBe(document.body);
  });

  it("re-inserts the toast when promise() fails, so the alert is announced, and keeps focus", async () => {
    setup();
    let reject: (e: Error) => void = () => undefined;
    const work = new Promise<void>((_, r) => {
      reject = r;
    });
    call((api) => {
      api
        .promise(work, { loading: "Saving", success: "Saved", error: "Not saved" })
        .catch(() => undefined);
    });
    const loading = toastOf("Saving");
    expect(loading).not.toHaveAttribute("role");
    act(() => {
      screen.getByRole("button", { name: "Dismiss" }).focus();
    });
    reject(new Error("no"));
    await flush();
    const failed = toastOf("Not saved");
    expect(failed).not.toBe(loading);
    expect(loading.isConnected).toBe(false);
    expect(failed).toHaveAttribute("role", "alert");
    expect(screen.getByRole("button", { name: "Dismiss" })).toHaveFocus();
  });

  it("keeps the same element when the priority does not change", async () => {
    setup({ duration: null });
    show({ id: "s", title: "One" });
    const first = toastOf("One");
    show({ id: "s", title: "Two" });
    await flush();
    expect(toastOf("Two")).toBe(first);
  });

  describe("under an open Modal", () => {
    function App() {
      return (
        <ToastProvider duration={null}>
          <Grab />
          <Modal open title="Edit" onClose={() => undefined}>
            <button type="button">Inside</button>
          </Modal>
        </ToastProvider>
      );
    }

    function reach() {
      render(<App />);
      show({ title: "Saved", action: { label: "Undo", onClick: () => undefined } });
      const inside = screen.getByRole("button", { name: "Inside" });
      act(() => {
        inside.focus();
      });
      key(inside, { key: "F6" });
      return screen.getByRole("dialog");
    }

    it("has no axe violations with focus inside the stack", async () => {
      reach();
      expect(screen.getByRole("button", { name: "Dismiss" })).toHaveFocus();
      vi.useRealTimers();
      expect(await runAxe(document.body)).toHaveNoViolations();
    });

    it("Tab off the last control and Shift+Tab off the first return into the dialog", () => {
      const dialog = reach();
      const undo = screen.getByRole("button", { name: "Undo" });
      act(() => {
        undo.focus();
      });
      key(undo, { key: "Tab" });
      expect(dialog.contains(document.activeElement)).toBe(true);

      key(document.activeElement ?? document, { key: "F6" });
      const dismiss = screen.getByRole("button", { name: "Dismiss" });
      expect(dismiss).toHaveFocus();
      key(dismiss, { key: "Tab", shiftKey: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });
});
