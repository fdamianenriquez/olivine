import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, StrictMode, useEffect, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Dropdown } from "../Dropdown";
import { Modal } from "../Modal";
import { Root } from "../Root";
import { AlertDialog } from "./AlertDialog";
import { type ConfirmFn, type ConfirmOptions, useConfirm } from "./ConfirmContext";
import { ConfirmProvider } from "./ConfirmProvider";

/** Hands the provider's confirm to the test and renders a trigger button. */
function Capture({
  onReady,
  label = "Trigger",
}: {
  onReady: (c: ConfirmFn) => void;
  label?: string;
}) {
  const confirm = useConfirm();
  useEffect(() => {
    onReady(confirm);
  }, [confirm, onReady]);
  return <button>{label}</button>;
}

function setup(wrap: (node: ReactNode) => ReactNode = (node) => node) {
  let confirm: ConfirmFn | null = null;
  const onReady = (c: ConfirmFn) => {
    confirm = c;
  };
  const utils = render(
    <>{wrap(<ConfirmProvider>{<Capture onReady={onReady} />}</ConfirmProvider>)}</>,
  );
  /** Calls confirm inside act; `then` runs right after the call, before React commits. */
  const ask = (options: ConfirmOptions, then?: () => void) => {
    if (!confirm) throw new Error("no confirm");
    const fn = confirm;
    let promise: Promise<boolean> = Promise.resolve(false);
    act(() => {
      promise = fn(options);
      then?.();
    });
    // Confirms left open when a test ends reject on unmount; that is expected here.
    promise.catch(() => undefined);
    return promise;
  };
  const trigger = screen.getByRole("button", { name: "Trigger" });
  return { ...utils, ask, trigger };
}

/** Records how a promise settled, without leaving a rejection unhandled. */
function track(promise: Promise<boolean>) {
  const result: { value?: boolean; error?: unknown; done: boolean } = { done: false };
  promise.then(
    (value) => {
      result.value = value;
      result.done = true;
    },
    (error: unknown) => {
      result.error = error;
      result.done = true;
    },
  );
  return result;
}

const dialogs = () => document.querySelectorAll<HTMLElement>(".ol-alertdialog");

const gone = () =>
  waitFor(() => {
    expect(dialogs()).toHaveLength(0);
  });

const flush = () =>
  act(async () => {
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
  });

function deferred() {
  let resolve: () => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function catchErrors() {
  const reported: unknown[] = [];
  const onError = (event: ErrorEvent) => {
    event.preventDefault();
    reported.push(event.error);
  };
  window.addEventListener("error", onError);
  return {
    reported,
    stop: () => {
      window.removeEventListener("error", onError);
    },
  };
}

describe("useConfirm", () => {
  stubNoAnimations();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws outside a ConfirmProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    function Bare() {
      useConfirm();
      return null;
    }
    expect(() => render(<Bare />)).toThrow(/inside a <ConfirmProvider>/);
  });

  it("returns a stable function across renders", () => {
    const seen: ConfirmFn[] = [];
    function Probe() {
      const [n, setN] = useState(0);
      seen.push(useConfirm());
      return (
        <button
          onClick={() => {
            setN(n + 1);
          }}
        >
          Again
        </button>
      );
    }
    render(
      <ConfirmProvider>
        <Probe />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Again" }));
    expect(seen.length).toBeGreaterThan(1);
    expect(new Set(seen).size).toBe(1);
  });

  it("opens an AlertDialog named by the title and described by the description", async () => {
    const { ask } = setup();
    void ask({ title: "Delete 3 files?", description: "The files go for good." });
    const dialog = screen.getByRole("alertdialog", { name: "Delete 3 files?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("The files go for good.");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await gone();
  });

  it("passes tone, labels, initial focus and size to the dialog", async () => {
    const { ask } = setup();
    void ask({
      title: "Delete?",
      tone: "danger",
      confirmLabel: "Delete",
      cancelLabel: "Keep",
      initialFocus: "confirm",
      size: "m",
    });
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveClass("ol-alertdialog--danger");
    expect(dialog).not.toHaveClass("ol-modal--s");
    const ok = screen.getByRole("button", { name: "Delete" });
    expect(ok).toHaveClass("ol-btn--danger");
    expect(ok).toHaveFocus();
    expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await gone();
  });

  it.each([
    ["Confirm", true, "confirm"],
    ["Cancel", false, "cancel"],
  ] as const)("%s resolves %s and calls onClose(%s) once", async (button, value, reason) => {
    const { ask } = setup();
    const onClose = vi.fn();
    const result = track(ask({ title: "T", onClose }));
    fireEvent.click(screen.getByRole("button", { name: button }));
    await flush();
    expect(result).toEqual({ value, done: true });
    expect(onClose).toHaveBeenCalledExactlyOnceWith(reason);
    await gone();
  });

  it("Escape resolves false with reason 'escape'", async () => {
    const { ask } = setup();
    const onClose = vi.fn();
    const result = track(ask({ title: "T", onClose }));
    fireEvent.keyDown(document, { key: "Escape" });
    await flush();
    expect(result).toEqual({ value: false, done: true });
    expect(onClose).toHaveBeenCalledExactlyOnceWith("escape");
  });

  it("closes the dialog and restores focus before the caller continues; a caller's own focus wins", async () => {
    const { ask, trigger } = setup();
    const next = document.createElement("button");
    document.body.append(next);
    trigger.focus();
    const order: string[] = [];
    const seen: { focus?: Element | null; state?: string | null } = {};
    void ask({
      title: "T",
      onClose: () => {
        order.push("onClose");
      },
    }).then(() => {
      order.push("settled");
      seen.focus = document.activeElement;
      seen.state = document.querySelector(".ol-alertdialog")?.getAttribute("data-state") ?? null;
      next.focus();
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await flush();
    expect(order).toEqual(["onClose", "settled"]);
    expect(seen.focus).toBe(trigger);
    expect(seen.state === null || seen.state === "closing").toBe(true);
    await gone();
    expect(next).toHaveFocus();
    next.remove();
  });

  describe("async onConfirm", () => {
    it("is pending until it resolves, then resolves true", async () => {
      const { ask } = setup();
      const work = deferred();
      const onConfirm = vi.fn<(signal: AbortSignal) => Promise<void>>(() => work.promise);
      const onClose = vi.fn();
      const result = track(ask({ title: "T", onConfirm, onClose }));
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm.mock.calls[0]?.[0]).toBeInstanceOf(AbortSignal);
      expect(screen.getByRole("button", { name: /Confirm/ })).toHaveAttribute("aria-busy", "true");
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      fireEvent.keyDown(document, { key: "Escape" });
      await flush();
      expect(result.done).toBe(false);
      expect(onClose).not.toHaveBeenCalled();
      await act(async () => {
        work.resolve();
        await work.promise;
      });
      await flush();
      expect(result).toEqual({ value: true, done: true });
      expect(onClose).toHaveBeenCalledExactlyOnceWith("confirm");
    });

    it("a rejection keeps the dialog open, reports the error and leaves the confirm unsettled", async () => {
      const { ask } = setup();
      const failure = new Error("Network down");
      const errors = catchErrors();
      const result = track(ask({ title: "T", onConfirm: () => Promise.reject(failure) }));
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      await flush();
      errors.stop();
      expect(errors.reported).toEqual([failure]);
      expect(result.done).toBe(false);
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await flush();
      expect(result).toEqual({ value: false, done: true });
    });
  });

  describe("abort", () => {
    it("an already aborted signal rejects at once and shows nothing", async () => {
      const { ask } = setup();
      const reason = new Error("gone");
      const onClose = vi.fn();
      const result = track(ask({ title: "T", signal: AbortSignal.abort(reason), onClose }));
      await flush();
      expect(result).toEqual({ error: reason, done: true });
      expect(onClose).toHaveBeenCalledExactlyOnceWith("abort");
      expect(dialogs()).toHaveLength(0);
    });

    it("aborting a queued confirm removes it without ever showing it", async () => {
      const { ask } = setup();
      const controller = new AbortController();
      const first = track(ask({ title: "First" }));
      const onClose = vi.fn();
      const second = track(ask({ title: "Second", signal: controller.signal, onClose }));
      act(() => {
        controller.abort();
      });
      await flush();
      expect(second.done).toBe(true);
      expect((second.error as DOMException).name).toBe("AbortError");
      expect(onClose).toHaveBeenCalledExactlyOnceWith("abort");
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await gone();
      await flush();
      expect(first).toEqual({ value: false, done: true });
      expect(screen.queryByRole("alertdialog", { name: "Second" })).toBeNull();
    });

    it("aborting an open confirm closes it, restores focus and rejects with the reason", async () => {
      const { ask, trigger } = setup();
      trigger.focus();
      const controller = new AbortController();
      const onClose = vi.fn();
      const result = track(ask({ title: "T", signal: controller.signal, onClose }));
      expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
      const reason = new Error("route changed");
      act(() => {
        controller.abort(reason);
      });
      await flush();
      expect(result).toEqual({ error: reason, done: true });
      expect(onClose).toHaveBeenCalledExactlyOnceWith("abort");
      expect(trigger).toHaveFocus();
      await gone();
    });

    it("aborting a pending confirm closes it, aborts the work's signal and ignores its late result", async () => {
      const { ask } = setup();
      const controller = new AbortController();
      const work = deferred();
      let workSignal: AbortSignal | null = null;
      const errors = catchErrors();
      const result = track(
        ask({
          title: "T",
          signal: controller.signal,
          onConfirm: (signal) => {
            workSignal = signal;
            return work.promise;
          },
        }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      act(() => {
        controller.abort();
      });
      await flush();
      expect(result.done).toBe(true);
      expect((result.error as DOMException).name).toBe("AbortError");
      expect((workSignal as AbortSignal | null)?.aborted).toBe(true);
      await gone();
      // The work fails late: no error is reported and nothing else settles.
      work.reject(new Error("late"));
      await flush();
      errors.stop();
      expect(errors.reported).toEqual([]);
    });

    it("an abort after settling has no effect", async () => {
      const { ask } = setup();
      const controller = new AbortController();
      const onClose = vi.fn();
      const result = track(ask({ title: "T", signal: controller.signal, onClose }));
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      await flush();
      act(() => {
        controller.abort();
      });
      await flush();
      expect(result).toEqual({ value: true, done: true });
      expect(onClose).toHaveBeenCalledExactlyOnceWith("confirm");
    });

    it("a Confirm click and an abort in the same tick settle once", async () => {
      const { ask } = setup();
      const controller = new AbortController();
      const onClose = vi.fn();
      const result = track(ask({ title: "T", signal: controller.signal, onClose }));
      act(() => {
        screen.getByRole("button", { name: "Confirm" }).click();
        controller.abort();
      });
      await flush();
      expect(result).toEqual({ value: true, done: true });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("works with AbortSignal.timeout for a hung request", async () => {
      const { ask } = setup();
      const result = track(
        ask({
          title: "T",
          signal: AbortSignal.timeout(30),
          onConfirm: () => new Promise(() => undefined),
        }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      await waitFor(() => {
        expect(result.done).toBe(true);
      });
      expect((result.error as DOMException).name).toBe("TimeoutError");
      await gone();
    });
  });

  describe("queue", () => {
    it("shows one dialog at a time, first in first out", async () => {
      const { ask } = setup();
      const first = track(ask({ title: "First" }));
      const second = track(ask({ title: "Second" }));
      expect(dialogs()).toHaveLength(1);
      expect(screen.getByRole("alertdialog", { name: "First" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      await waitFor(() => {
        expect(screen.getByRole("alertdialog", { name: "Second" })).toBeInTheDocument();
      });
      expect(dialogs()).toHaveLength(1);
      expect(first).toEqual({ value: true, done: true });
      expect(second.done).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await flush();
      expect(second).toEqual({ value: false, done: true });
      await gone();
    });

    it("an id of an open or queued confirm returns the same promise and no second dialog", async () => {
      const { ask } = setup();
      const a = ask({ title: "First", id: "delete" });
      const b = ask({ title: "Again", id: "delete" });
      expect(b).toBe(a);
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      await gone();
      expect(await a).toBe(true);
      // Once settled, the id can ask again.
      const c = ask({ title: "Third", id: "delete" });
      expect(c).not.toBe(a);
      expect(screen.getByRole("alertdialog", { name: "Third" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(await c).toBe(false);
    });

    it("a queued confirm keeps its own id dedupe", () => {
      const { ask } = setup();
      void ask({ title: "First" });
      const a = ask({ title: "Queued", id: "q" });
      expect(ask({ title: "Queued", id: "q" })).toBe(a);
      expect(dialogs()).toHaveLength(1);
    });
  });

  describe("focus", () => {
    it("returns focus to returnFocus when given", async () => {
      const { ask } = setup();
      const target = document.createElement("button");
      document.body.append(target);
      void ask({ title: "T", returnFocus: target });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await flush();
      expect(target).toHaveFocus();
      void ask({ title: "T", returnFocus: () => target });
      screen.getByRole("button", { name: "Cancel" }).focus();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await flush();
      expect(target).toHaveFocus();
      target.remove();
    });

    it("falls back to the element focused when confirm was called", async () => {
      const { ask, trigger } = setup();
      // Focus moves on before the dialog mounts, so the overlay records another element, which
      // then disappears: the overlay has nothing to return to, the confirm's opener is still there.
      const elsewhere = document.createElement("button");
      document.body.append(elsewhere);
      trigger.focus();
      void ask({ title: "T" }, () => {
        elsewhere.focus();
      });
      const cancel = screen.getByRole("button", { name: "Cancel" });
      expect(cancel).toHaveFocus();
      elsewhere.remove();
      fireEvent.click(cancel);
      await flush();
      expect(trigger).toHaveFocus();
    });

    it("works from a Dropdown item and returns focus to its trigger", async () => {
      const user = userEvent.setup();
      const onResult = vi.fn();
      function Row() {
        const confirm = useConfirm();
        const menu = useRef<HTMLButtonElement>(null);
        return (
          <Dropdown
            ref={menu}
            label="Actions"
            items={[
              {
                label: "Delete",
                danger: true,
                onSelect: () => {
                  void confirm({
                    title: "Delete the row?",
                    tone: "danger",
                    confirmLabel: "Delete",
                    returnFocus: () => menu.current,
                  }).then(onResult);
                },
              },
            ]}
          />
        );
      }
      render(
        <ConfirmProvider>
          <Row />
        </ConfirmProvider>,
      );
      await user.click(screen.getByRole("button", { name: "Actions" }));
      await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
      const dialog = await screen.findByRole("alertdialog", { name: "Delete the row?" });
      expect(screen.queryByRole("menu")).toBeNull();
      expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
      expect(dialog).toBeInTheDocument();
      await user.keyboard("{Escape}");
      await flush();
      expect(onResult).toHaveBeenCalledExactlyOnceWith(false);
      expect(screen.getByRole("button", { name: "Actions" })).toHaveFocus();
    });

    it("over a Modal, returns focus into the Modal", async () => {
      let confirm: ConfirmFn | null = null;
      function Inside() {
        const c = useConfirm();
        useEffect(() => {
          confirm = c;
        }, [c]);
        return null;
      }
      render(
        <ConfirmProvider>
          <Inside />
          <Modal open title="Order" closeButton={false} onClose={() => undefined}>
            <button>Discard</button>
          </Modal>
        </ConfirmProvider>,
      );
      const discard = screen.getByRole("button", { name: "Discard" });
      discard.focus();
      const fn = confirm as unknown as ConfirmFn;
      act(() => {
        void fn({ title: "Discard changes?" });
      });
      expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
      fireEvent.keyDown(document, { key: "Escape" });
      await gone();
      expect(discard).toHaveFocus();
      expect(screen.getByRole("dialog", { name: "Order" })).toBeInTheDocument();
    });
  });

  describe("unmount", () => {
    it("the provider unmounting rejects open and queued confirms with an AbortError", async () => {
      const { ask, unmount } = setup();
      const work = deferred();
      let workSignal: AbortSignal | null = null;
      const onClose = vi.fn();
      const open = track(
        ask({
          title: "Open",
          onClose,
          onConfirm: (signal) => {
            workSignal = signal;
            return work.promise;
          },
        }),
      );
      const queued = track(ask({ title: "Queued", onClose }));
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      unmount();
      await flush();
      for (const result of [open, queued]) {
        expect(result.done).toBe(true);
        expect((result.error as DOMException).name).toBe("AbortError");
      }
      expect(onClose).toHaveBeenCalledTimes(2);
      expect(onClose).toHaveBeenCalledWith("abort");
      expect((workSignal as AbortSignal | null)?.aborted).toBe(true);
      expect(dialogs()).toHaveLength(0);
    });

    it("the caller unmounting does not cancel the confirm", async () => {
      let confirm: ConfirmFn | null = null;
      function Caller() {
        const c = useConfirm();
        useEffect(() => {
          confirm = c;
        }, [c]);
        return <span>Row</span>;
      }
      const { rerender } = render(
        <ConfirmProvider>
          <Caller />
        </ConfirmProvider>,
      );
      const fn = confirm as unknown as ConfirmFn;
      let promise: Promise<boolean> = Promise.resolve(false);
      act(() => {
        promise = fn({ title: "Delete the row?" });
      });
      const result = track(promise);
      rerender(<ConfirmProvider>{null}</ConfirmProvider>);
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      await flush();
      expect(result).toEqual({ value: true, done: true });
    });
  });

  it.each([
    ["with a signal tied to the cleanup", true],
    ["without a signal", false],
  ])(
    "under StrictMode, a child calling confirm from its mount effect ends with one dialog (%s)",
    async (_label, withSignal) => {
      const rejected: unknown[] = [];
      function Guard() {
        const confirm = useConfirm();
        useEffect(() => {
          const controller = new AbortController();
          confirm({
            title: "Leave without saving?",
            ...(withSignal ? { signal: controller.signal } : null),
          }).catch((error: unknown) => {
            rejected.push(error);
          });
          return () => {
            controller.abort();
          };
        }, [confirm]);
        return null;
      }
      render(
        <StrictMode>
          <ConfirmProvider>
            <Guard />
          </ConfirmProvider>
        </StrictMode>,
      );
      await flush();
      expect(dialogs()).toHaveLength(1);
      expect(
        screen.getByRole("alertdialog", { name: "Leave without saving?" }),
      ).toBeInTheDocument();
      // Only the simulated first run was rejected, with an AbortError.
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as DOMException).name).toBe("AbortError");
    },
  );

  it("an already aborted confirm rejects even when its id matches an open one", async () => {
    const { ask } = setup();
    const open = ask({ title: "T", id: "x" });
    const reason = new Error("gone");
    const again = ask({ title: "T", id: "x", signal: AbortSignal.abort(reason) });
    expect(again).not.toBe(open);
    await expect(again).rejects.toBe(reason);
    expect(dialogs()).toHaveLength(1);
  });

  it("works under StrictMode: one dialog, one settlement", async () => {
    const { ask } = setup((node) => <StrictMode>{node}</StrictMode>);
    const onClose = vi.fn();
    const result = track(ask({ title: "T", onClose }));
    expect(dialogs()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await flush();
    expect(result).toEqual({ value: true, done: true });
    expect(onClose).toHaveBeenCalledExactlyOnceWith("confirm");
    await gone();
    // Still usable afterwards.
    const again = track(ask({ title: "Again" }));
    expect(dialogs()).toHaveLength(1);
    fireEvent.keyDown(document, { key: "Escape" });
    await flush();
    expect(again).toEqual({ value: false, done: true });
  });

  it.each([
    ["es", "Confirmar", "Cancelar"],
    ["ja", "OK", "キャンセル"],
  ] as const)("uses the %s labels of where the provider sits", (locale, ok, cancel) => {
    const { ask } = setup((node) => <Root locale={locale}>{node}</Root>);
    void ask({ title: "T" });
    expect(screen.getByRole("button", { name: cancel })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ok })).toBeInTheDocument();
  });

  it.each([
    ["washi", "neutral"],
    ["washi", "danger"],
    ["sumi", "neutral"],
    ["sumi", "danger"],
  ] as const)("has no axe violations in %s, %s tone", async (theme, tone) => {
    const { ask } = setup((node) => <Root theme={theme}>{node}</Root>);
    void ask({
      title: "Delete 3 files?",
      description: "The files go for good.",
      tone,
      confirmLabel: "Delete",
    });
    await flush();
    expect(await runAxe(screen.getByRole("alertdialog"))).toHaveNoViolations();
  });
});

describe("useConfirm with a running exit motion", () => {
  let finishExit: () => void = () => undefined;
  beforeEach(() => {
    const finished = new Promise<void>((resolve) => {
      finishExit = resolve;
    });
    const animation = {
      finished,
      effect: { getComputedTiming: () => ({ endTime: 400 }) },
    } as unknown as Animation;
    Element.prototype.getAnimations = () => [animation];
  });
  afterEach(() => {
    delete (Element.prototype as Partial<Element>).getAnimations;
  });

  it("opens the next confirm only after the previous has rolled up", async () => {
    const { ask } = setup();
    const first = track(ask({ title: "First" }));
    void ask({ title: "Second" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await flush();
    expect(first).toEqual({ value: false, done: true });
    expect(dialogs()).toHaveLength(1);
    expect(dialogs()[0]).toHaveAttribute("data-state", "closing");
    expect(screen.queryByRole("alertdialog", { name: "Second" })).toBeNull();
    await act(async () => {
      finishExit();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByRole("alertdialog", { name: "Second" })).toBeInTheDocument();
    });
    expect(dialogs()).toHaveLength(1);
  });
});

describe("AlertDialog closed while pending", () => {
  stubNoAnimations();

  it("ignores the late result and resets the pending state", async () => {
    const work = deferred();
    const onClose = vi.fn();
    const errors = catchErrors();
    const { rerender } = render(
      <AlertDialog open title="T" onConfirm={() => work.promise} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(screen.getByRole("button", { name: /Confirm/ })).toHaveAttribute("aria-busy", "true");
    rerender(
      <AlertDialog open={false} title="T" onConfirm={() => work.promise} onClose={onClose} />,
    );
    work.reject(new Error("late"));
    await flush();
    errors.stop();
    expect(onClose).not.toHaveBeenCalled();
    expect(errors.reported).toEqual([]);
    rerender(<AlertDialog open title="T" onConfirm={() => undefined} onClose={onClose} />);
    expect(screen.getByRole("button", { name: "Confirm" })).not.toHaveAttribute("aria-busy");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("calls onExited once the dialog has gone", async () => {
    const onExited = vi.fn();
    const { rerender } = render(
      <AlertDialog open title="T" onClose={() => undefined} onExited={onExited} />,
    );
    expect(onExited).not.toHaveBeenCalled();
    rerender(<AlertDialog open={false} title="T" onClose={() => undefined} onExited={onExited} />);
    await gone();
    expect(onExited).toHaveBeenCalledTimes(1);
  });
});
