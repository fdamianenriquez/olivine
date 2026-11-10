import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, type ReactNode, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Modal } from "../Modal";
import { Root } from "../Root";
import { AlertDialog, type AlertDialogCloseReason, type AlertDialogProps } from "./AlertDialog";

type HarnessProps = Partial<Omit<AlertDialogProps, "onClose" | "open">> & {
  onClose?: (reason: AlertDialogCloseReason) => void;
};

function Harness({ onClose, children = "The files go for good.", ...props }: HarnessProps) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => {
          setOpen(true);
        }}
      >
        Open
      </button>
      <AlertDialog
        title="Delete 3 files?"
        {...props}
        open={open}
        onClose={(reason) => {
          onClose?.(reason);
          setOpen(false);
        }}
      >
        {children}
      </AlertDialog>
    </div>
  );
}

const openHarness = () => {
  const trigger = screen.getByRole("button", { name: "Open" });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
};

const dialogEl = () => document.querySelector<HTMLElement>(".ol-alertdialog");

const gone = () =>
  waitFor(() => {
    expect(dialogEl()).toBeNull();
  });

const scrim = () => {
  const el = document.querySelector<HTMLElement>(".ol-scrim");
  if (!el) throw new Error("no scrim");
  return el;
};

/** A promise and its settle functions. */
function deferred() {
  let resolve: () => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

describe("AlertDialog", () => {
  stubNoAnimations();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing while closed", () => {
    render(<AlertDialog open={false} title="T" onClose={() => undefined} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("is a modal alertdialog named by the title and described by the message", () => {
    render(
      <AlertDialog open title="Delete 3 files?" onClose={() => undefined}>
        The files go for good.
      </AlertDialog>,
    );
    const dialog = screen.getByRole("alertdialog", { name: "Delete 3 files?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("The files go for good.");
    expect(dialog).toHaveClass("ol-modal", "ol-modal--s", "ol-kakejiku", "ol-alertdialog");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("has no close button, only Cancel and Confirm from the locale", () => {
    render(<AlertDialog open title="T" onClose={() => undefined} />);
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Cancel", "Confirm"]);
    expect(buttons[1]).toHaveClass("ol-btn--accent");
  });

  it("uses custom labels, size m, className, native props and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <AlertDialog
        ref={ref}
        open
        title="Send?"
        size="m"
        className="x"
        data-testid="ad"
        confirmLabel="Send"
        cancelLabel="Keep editing"
        onClose={() => undefined}
      />,
    );
    const dialog = screen.getByRole("alertdialog");
    expect(ref.current).toBe(dialog);
    expect(dialog).toHaveClass("x");
    expect(dialog).not.toHaveClass("ol-modal--s");
    expect(dialog).toHaveAttribute("data-testid", "ad");
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep editing" })).toBeInTheDocument();
  });

  it("lets a caller aria-describedby win over the generated one", () => {
    render(
      <>
        <p id="own">Own description</p>
        <AlertDialog open title="T" aria-describedby="own" onClose={() => undefined}>
          Message
        </AlertDialog>
      </>,
    );
    expect(screen.getByRole("alertdialog")).toHaveAttribute("aria-describedby", "own");
  });

  it("danger tone adds the Caution word to the description and the danger confirm", () => {
    render(
      <AlertDialog
        open
        tone="danger"
        title="Delete?"
        confirmLabel="Delete"
        onClose={() => undefined}
      >
        It cannot be undone.
      </AlertDialog>,
    );
    expect(screen.getByRole("alertdialog")).toHaveAccessibleDescription(
      "Caution It cannot be undone.",
    );
    expect(screen.getByText("Caution").parentElement).toHaveClass("ol-alertdialog__tag");
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("ol-btn--danger");
  });

  it("neutral tone has no tag", () => {
    render(<AlertDialog open title="T" onClose={() => undefined} />);
    expect(document.querySelector(".ol-alertdialog__tag")).toBeNull();
  });

  it("warns in development when a danger dialog keeps the default confirm label", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { rerender } = render(
      <AlertDialog open tone="danger" title="T" onClose={() => undefined} />,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("confirmLabel"));
    warn.mockClear();
    rerender(
      <AlertDialog open tone="danger" title="T" confirmLabel="Delete" onClose={() => undefined} />,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  describe("focus", () => {
    it("focuses Cancel on open", () => {
      render(<Harness />);
      openHarness();
      expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    });

    it("focuses Confirm with initialFocus='confirm'", () => {
      render(<Harness initialFocus="confirm" />);
      openHarness();
      expect(screen.getByRole("button", { name: "Confirm" })).toHaveFocus();
    });

    it("wraps Tab and Shift+Tab between the two actions", () => {
      render(<Harness />);
      openHarness();
      const cancel = screen.getByRole("button", { name: "Cancel" });
      const ok = screen.getByRole("button", { name: "Confirm" });
      ok.focus();
      fireEvent.keyDown(document, { key: "Tab" });
      expect(cancel).toHaveFocus();
      fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
      expect(ok).toHaveFocus();
    });

    it("returns focus to the trigger on close", async () => {
      render(<Harness />);
      const trigger = openHarness();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(trigger).toHaveFocus();
      await gone();
      expect(trigger).toHaveFocus();
    });
  });

  describe("closing", () => {
    it("Cancel closes with reason 'cancel'", async () => {
      const onClose = vi.fn();
      render(<Harness onClose={onClose} />);
      openHarness();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClose).toHaveBeenCalledExactlyOnceWith("cancel");
      await gone();
    });

    it("Escape closes with reason 'escape'", async () => {
      const onClose = vi.fn();
      render(<Harness onClose={onClose} />);
      openHarness();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledExactlyOnceWith("escape");
      await gone();
    });

    it("a scrim press and click does nothing", () => {
      const onClose = vi.fn();
      render(<Harness onClose={onClose} />);
      openHarness();
      fireEvent.pointerDown(scrim());
      fireEvent.click(scrim());
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("a synchronous confirm calls onConfirm then closes with reason 'confirm'", async () => {
      const calls: string[] = [];
      render(
        <Harness
          onConfirm={() => {
            calls.push("confirm");
          }}
          onClose={(reason) => {
            calls.push(`close:${reason}`);
          }}
        />,
      );
      openHarness();
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      expect(calls).toEqual(["confirm", "close:confirm"]);
      await gone();
    });

    it("closes with 'confirm' without onConfirm", () => {
      const onClose = vi.fn();
      render(<Harness onClose={onClose} />);
      openHarness();
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      expect(onClose).toHaveBeenCalledExactlyOnceWith("confirm");
    });
  });

  describe("pending", () => {
    it("an async confirm is pending: loading confirm, disabled cancel, Escape ignored", async () => {
      const work = deferred();
      const onClose = vi.fn();
      render(<Harness onConfirm={() => work.promise} onClose={onClose} />);
      openHarness();
      const ok = screen.getByRole("button", { name: "Confirm" });
      ok.focus();
      fireEvent.click(ok);
      const dialog = screen.getByRole("alertdialog");
      // Busy sits on the confirm button only, so the status message inside is announced.
      expect(dialog).not.toHaveAttribute("aria-busy");
      expect(ok).toBeDisabled();
      expect(ok).toHaveAttribute("aria-busy", "true");
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      expect(screen.getByRole("status")).toHaveTextContent("Loading");
      // Focus is kept on the dialog, not dropped to the page.
      expect(dialog).toHaveFocus();
      fireEvent.keyDown(document, { key: "Escape" });
      fireEvent.pointerDown(scrim());
      fireEvent.click(scrim());
      expect(onClose).not.toHaveBeenCalled();
      await act(async () => {
        work.resolve();
        await work.promise;
      });
      expect(onClose).toHaveBeenCalledExactlyOnceWith("confirm");
      await gone();
    });

    it("runs onConfirm once on a double click", async () => {
      const work = deferred();
      const onConfirm = vi.fn(() => work.promise);
      render(<Harness onConfirm={onConfirm} />);
      openHarness();
      const ok = screen.getByRole("button", { name: "Confirm" });
      // Both clicks land before React re-renders the disabled button.
      act(() => {
        ok.click();
        ok.click();
      });
      expect(onConfirm).toHaveBeenCalledTimes(1);
      await act(async () => {
        work.resolve();
        await work.promise;
      });
    });

    it("a rejected confirm keeps it open, refocuses confirm and reports the error", async () => {
      const failure = new Error("Network down");
      const reported: unknown[] = [];
      const onError = (event: ErrorEvent) => {
        event.preventDefault();
        reported.push(event.error);
      };
      window.addEventListener("error", onError);
      const work = deferred();
      const onClose = vi.fn();
      render(<Harness onConfirm={() => work.promise} onClose={onClose} />);
      openHarness();
      const ok = screen.getByRole("button", { name: "Confirm" });
      ok.focus();
      fireEvent.click(ok);
      work.reject(failure);
      await flush();
      window.removeEventListener("error", onError);
      expect(onClose).not.toHaveBeenCalled();
      expect(ok).not.toHaveAttribute("aria-busy");
      expect(ok).toBeEnabled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
      expect(ok).toHaveFocus();
      expect(reported).toEqual([failure]);
      // It can be answered again.
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledExactlyOnceWith("escape");
    });

    it("the pending prop drives the state for work run outside onConfirm", () => {
      const onClose = vi.fn();
      const { rerender } = render(<AlertDialog open title="T" onClose={onClose} pending={false} />);
      const cancel = screen.getByRole("button", { name: "Cancel" });
      expect(cancel).toHaveFocus();
      rerender(<AlertDialog open title="T" onClose={onClose} pending />);
      const dialog = screen.getByRole("alertdialog");
      expect(dialog).not.toHaveAttribute("aria-busy");
      expect(screen.getByRole("button", { name: /Confirm/ })).toHaveAttribute("aria-busy", "true");
      expect(screen.getByRole("status")).toHaveTextContent("Loading");
      expect(cancel).toBeDisabled();
      expect(dialog).toHaveFocus();
      fireEvent.keyDown(document, { key: "Escape" });
      fireEvent.click(screen.getByRole("button", { name: /Confirm/ }));
      expect(onClose).not.toHaveBeenCalled();
      rerender(<AlertDialog open title="T" onClose={onClose} pending={false} />);
      expect(screen.getByRole("button", { name: "Confirm" })).toHaveFocus();
    });
  });

  it("Tab while pending keeps focus on the dialog root", async () => {
    const work = deferred();
    render(<Harness onConfirm={() => work.promise} />);
    openHarness();
    const ok = screen.getByRole("button", { name: "Confirm" });
    ok.focus();
    fireEvent.click(ok);
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(dialog).toHaveFocus();
    await act(async () => {
      work.resolve();
      await work.promise;
    });
  });

  it("an async confirm nested over a Modal returns focus into the Modal, whose trap works", async () => {
    const work = deferred();
    function Nested() {
      const [ask, setAsk] = useState(false);
      return (
        <Modal open title="Order" onClose={() => undefined} closeButton={false}>
          <button
            onClick={() => {
              setAsk(true);
            }}
          >
            Discard
          </button>
          <button>Keep</button>
          <AlertDialog
            open={ask}
            title="Discard changes?"
            onConfirm={() => work.promise}
            onClose={() => {
              setAsk(false);
            }}
          />
        </Modal>
      );
    }
    render(<Nested />);
    const trigger = screen.getByRole("button", { name: "Discard" });
    trigger.focus();
    fireEvent.click(trigger);
    const ok = screen.getByRole("button", { name: "Confirm" });
    ok.focus();
    fireEvent.click(ok);
    await act(async () => {
      work.resolve();
      await work.promise;
    });
    expect(trigger).toHaveFocus();
    await gone();
    const modal = screen.getByRole("dialog", { name: "Order" });
    expect(modal.closest("[inert]")).toBeNull();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "Keep" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(trigger).toHaveFocus();
  });

  it("nested over a Modal: Escape closes only the alert dialog", async () => {
    const onModalClose = vi.fn();
    function Nested() {
      const [ask, setAsk] = useState(false);
      return (
        <Modal open title="Order" onClose={onModalClose}>
          <button
            onClick={() => {
              setAsk(true);
            }}
          >
            Discard
          </button>
          <AlertDialog
            open={ask}
            title="Discard changes?"
            onClose={() => {
              setAsk(false);
            }}
          />
        </Modal>
      );
    }
    render(<Nested />);
    const trigger = screen.getByRole("button", { name: "Discard" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(screen.getByRole("dialog", { hidden: true }).closest(".ol-portal")).toHaveAttribute(
      "inert",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onModalClose).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    await gone();
    expect(screen.getByRole("dialog", { name: "Order" })).toBeInTheDocument();
  });

  it.each([
    ["es", "Confirmar", "Cancelar", "Atención", "Cargando"],
    ["ja", "OK", "キャンセル", "注意", "読み込み中"],
  ] as const)("uses the %s locale", (locale, ok, cancel, caution, loading) => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <Root locale={locale}>
        <AlertDialog open tone="danger" title="T" pending onClose={() => undefined} />
      </Root>,
    );
    expect(screen.getByRole("button", { name: cancel })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(ok) })).toBeInTheDocument();
    expect(screen.getByText(caution)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(loading);
  });

  describe("axe", () => {
    const wrap = (theme: "washi" | "sumi", node: ReactNode) => <Root theme={theme}>{node}</Root>;
    it.each([
      ["washi", "neutral"],
      ["washi", "danger"],
      ["sumi", "neutral"],
      ["sumi", "danger"],
    ] as const)("has no violations in %s, %s tone", async (theme, tone) => {
      render(
        wrap(
          theme,
          <AlertDialog
            open
            tone={tone}
            title="Delete 3 files?"
            confirmLabel="Delete"
            onClose={() => undefined}
          >
            The files go for good.
          </AlertDialog>,
        ),
      );
      await flush();
      expect(await runAxe(screen.getByRole("alertdialog"))).toHaveNoViolations();
    });

    it("has no violations while pending", async () => {
      render(<AlertDialog open title="T" pending onClose={() => undefined} />);
      await flush();
      expect(await runAxe(screen.getByRole("alertdialog"))).toHaveNoViolations();
    });
  });
});

describe("AlertDialog with a running exit motion", () => {
  // An exit animation that runs until the test ends it, as in a browser.
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

  it("returns focus to the trigger after an async confirm while the dialog rolls up", async () => {
    const work = deferred();
    render(<Harness onConfirm={() => work.promise} />);
    const trigger = openHarness();
    const ok = screen.getByRole("button", { name: "Confirm" });
    ok.focus();
    fireEvent.click(ok);
    await act(async () => {
      work.resolve();
      await work.promise;
    });
    const dialog = dialogEl();
    expect(dialog).not.toBeNull();
    expect(dialog).toHaveAttribute("data-state", "closing");
    expect(dialog).toHaveAttribute("inert");
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
    await act(async () => {
      finishExit();
      await Promise.resolve();
    });
    await gone();
    expect(trigger).toHaveFocus();
  });
});
