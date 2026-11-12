import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Button } from "../Button";
import { Modal } from "../Modal";
import { Offcanvas } from "../Offcanvas";
import { Tooltip } from "../Tooltip";
import { Dropdown, type DropdownItem } from "./Dropdown";

const items = (onSelect = vi.fn()): DropdownItem[] => [
  { label: "Rename", onSelect },
  { label: "Delete", danger: true, onSelect },
];

const trigger = () => screen.getByRole("button", { name: "Actions" });
const menu = () => screen.queryByRole("menu");

function Page({ onElsewhere }: { onElsewhere: () => void }) {
  return (
    <>
      <button type="button" onClick={onElsewhere}>
        Elsewhere
      </button>
      <Dropdown label="Actions" items={items()} />
    </>
  );
}

describe("Dropdown outside press (D15)", () => {
  stubNoAnimations();

  it("dismisses on the first press outside without activating what is under it", async () => {
    const user = userEvent.setup();
    const onElsewhere = vi.fn();
    render(<Page onElsewhere={onElsewhere} />);
    await user.click(trigger());
    await screen.findByRole("menu");
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(menu()).toBeNull();
    expect(onElsewhere).not.toHaveBeenCalled();
    // The next press reaches the control.
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(onElsewhere).toHaveBeenCalledTimes(1);
  });

  it("never swallows a click from a key or assistive technology (detail 0)", async () => {
    const user = userEvent.setup();
    const onElsewhere = vi.fn();
    render(<Page onElsewhere={onElsewhere} />);
    await user.click(trigger());
    await screen.findByRole("menu");
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    fireEvent.pointerDown(elsewhere, { button: 0, pointerType: "mouse" });
    fireEvent.click(elsewhere, { detail: 0 });
    expect(onElsewhere).toHaveBeenCalledTimes(1);
  });

  it("lets a right press outside land: it dismisses and the contextmenu is not cancelled", async () => {
    const user = userEvent.setup();
    render(<Page onElsewhere={vi.fn()} />);
    await user.click(trigger());
    await screen.findByRole("menu");
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    fireEvent.pointerDown(elsewhere, { button: 2, pointerType: "mouse" });
    await waitFor(() => {
      expect(menu()).toBeNull();
    });
    expect(fireEvent.contextMenu(elsewhere)).toBe(true);
  });

  it("keeps the menu open when a touch outside turns into a scroll", async () => {
    const user = userEvent.setup();
    render(<Page onElsewhere={vi.fn()} />);
    await user.click(trigger());
    await screen.findByRole("menu");
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    fireEvent.pointerDown(elsewhere, { button: 0, pointerType: "touch", pointerId: 7 });
    expect(menu()).not.toBeNull();
    fireEvent.pointerCancel(elsewhere, { pointerType: "touch", pointerId: 7 });
    fireEvent.pointerUp(elsewhere, { pointerType: "touch", pointerId: 7 });
    expect(menu()).not.toBeNull();
  });

  it("dismisses on a touch tap outside and swallows its click", async () => {
    const user = userEvent.setup();
    const onElsewhere = vi.fn();
    render(<Page onElsewhere={onElsewhere} />);
    await user.click(trigger());
    await screen.findByRole("menu");
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    fireEvent.pointerDown(elsewhere, { button: 0, pointerType: "touch", pointerId: 3 });
    fireEvent.pointerUp(elsewhere, { button: 0, pointerType: "touch", pointerId: 3 });
    fireEvent.click(elsewhere, { detail: 1 });
    await waitFor(() => {
      expect(menu()).toBeNull();
    });
    expect(onElsewhere).not.toHaveBeenCalled();
  });

  it("closes when focus moves into an iframe", async () => {
    const user = userEvent.setup();
    render(
      <>
        <iframe title="Embed" />
        <Dropdown label="Actions" items={items()} />
      </>,
    );
    await user.click(trigger());
    await screen.findByRole("menu");
    vi.useFakeTimers();
    try {
      screen.getByTitle("Embed").focus();
      fireEvent.blur(window);
      await act(async () => {
        await vi.runAllTimersAsync();
      });
    } finally {
      vi.useRealTimers();
    }
    await waitFor(() => {
      expect(menu()).toBeNull();
    });
  });

  it("in a Modal, a press on the scrim closes the menu only; the next one closes the Modal", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open title="Project" onClose={onClose}>
        <Dropdown label="Actions" items={items()} />
      </Modal>,
    );
    await user.click(trigger());
    await screen.findByRole("menu");
    const found = document.querySelector<HTMLElement>(".ol-scrim");
    if (!found) throw new Error("no scrim");
    const scrim = found;
    await user.click(scrim);
    await waitFor(() => {
      expect(menu()).toBeNull();
    });
    expect(onClose).not.toHaveBeenCalled();
    await user.click(scrim);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("applies restoreFocus with reason trigger when the app closes the menu while focus is inside", async () => {
    const user = userEvent.setup();
    const reasons: string[] = [];
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Dropdown
            label="Actions"
            items={items()}
            open={open}
            onOpenChange={setOpen}
            restoreFocus={(reason) => {
              reasons.push(reason);
              return document.getElementById("target");
            }}
          />
          <button type="button" id="target">
            Target
          </button>
          <button
            type="button"
            hidden
            data-testid="app-close"
            onClick={() => {
              setOpen(false);
            }}
          />
        </>
      );
    }
    render(<Controlled />);
    trigger().focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveFocus());
    act(() => {
      screen.getByTestId("app-close").click();
    });
    await waitFor(() => {
      expect(menu()).toBeNull();
    });
    expect(reasons).toEqual(["trigger"]);
    expect(screen.getByRole("button", { name: "Target" })).toHaveFocus();
  });

  it("does not pull focus back after an outside press", async () => {
    const user = userEvent.setup();
    const restoreFocus = vi.fn(() => true);
    render(
      <>
        <button type="button">Elsewhere</button>
        <Dropdown label="Actions" items={items()} restoreFocus={restoreFocus} />
      </>,
    );
    await user.click(trigger());
    await screen.findByRole("menu");
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    await waitFor(() => {
      expect(menu()).toBeNull();
    });
    expect(restoreFocus).toHaveBeenCalledTimes(1);
    expect(restoreFocus).toHaveBeenCalledWith("outside");
  });

  it("a press on a button that shows a tooltip still dismisses the menu and is swallowed", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(
      <>
        <Tooltip content="Copy the link" defaultOpen>
          <Button onClick={onCopy}>Copy</Button>
        </Tooltip>
        <Dropdown label="Actions" items={items()} />
      </>,
    );
    await user.click(trigger());
    await screen.findByRole("menu");
    await user.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => {
      expect(menu()).toBeNull();
    });
    expect(onCopy).not.toHaveBeenCalled();
  });

  it("forgets a vetoed outside close: a later app close still applies restoreFocus", async () => {
    const user = userEvent.setup();
    const reasons: string[] = [];
    function Vetoing() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button">Elsewhere</button>
          <Dropdown
            label="Actions"
            items={items()}
            open={open}
            onOpenChange={(next, reason) => {
              if (!next && reason === "outside") return;
              setOpen(next);
            }}
            restoreFocus={(reason) => {
              reasons.push(reason);
              return document.getElementById("target");
            }}
          />
          <button type="button" id="target">
            Target
          </button>
          <button
            type="button"
            hidden
            data-testid="app-close"
            onClick={() => {
              setOpen(false);
            }}
          />
        </>
      );
    }
    render(<Vetoing />);
    trigger().focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveFocus());
    fireEvent.pointerDown(screen.getByRole("button", { name: "Elsewhere" }), {
      button: 0,
      pointerType: "mouse",
    });
    expect(menu()).not.toBeNull();
    screen.getByRole("menuitem", { name: "Rename" }).focus();
    await new Promise((resolve) => setTimeout(resolve, 5));
    act(() => {
      screen.getByTestId("app-close").click();
    });
    await waitFor(() => {
      expect(menu()).toBeNull();
    });
    expect(reasons).toContain("trigger");
    expect(screen.getByRole("button", { name: "Target" })).toHaveFocus();
  });

  it("in a modal Offcanvas, a press on the scrim closes the menu only", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Offcanvas open title="Filters" onClose={onClose}>
        <Dropdown label="Actions" items={items()} />
      </Offcanvas>,
    );
    await user.click(trigger());
    await screen.findByRole("menu");
    const found = document.querySelector<HTMLElement>(".ol-scrim");
    if (!found) throw new Error("no scrim");
    await user.click(found);
    await waitFor(() => {
      expect(menu()).toBeNull();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("has no axe violations with the menu open", async () => {
    const user = userEvent.setup();
    const { container } = render(<Page onElsewhere={vi.fn()} />);
    await user.click(trigger());
    await screen.findByRole("menu");
    expect((await runAxe(container)).violations).toEqual([]);
  });
});
