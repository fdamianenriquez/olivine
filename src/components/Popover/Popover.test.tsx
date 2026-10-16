import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { useDismiss } from "../../hooks/useDismiss";
import { runAxe } from "../../test/axe";
import { Modal } from "../Modal";
import { Root } from "../Root";
import { Popover, type PopoverProps } from "./Popover";

const setup = (props: Partial<PopoverProps> = {}) =>
  render(
    <Root>
      <main>
        <button type="button">Before</button>
        <Popover
          title="Filters"
          content={
            <form>
              <label>
                Name <input type="text" />
              </label>
              <button type="button">Apply</button>
            </form>
          }
          trigger={<button type="button">Open</button>}
          {...props}
        />
        <button type="button">After</button>
        <p>Outside text</p>
      </main>
    </Root>,
  );

const trigger = () => screen.getByRole("button", { name: "Open" });

describe("Popover", () => {
  it("renders a closed trigger with dialog semantics", () => {
    setup();
    expect(trigger()).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).not.toHaveAttribute("aria-controls");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("toggles on click and names the dialog from the title", async () => {
    const user = userEvent.setup();
    setup({ className: "x", "data-testid": "p" } as Partial<PopoverProps>);
    await user.click(trigger());
    const dialog = await screen.findByRole("dialog", { name: "Filters" });
    expect(dialog).toHaveClass("ol-popover", "ol-popover--bottom", "x");
    expect(dialog).toHaveAttribute("data-testid", "p");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveAttribute("aria-controls", dialog.id);
    await user.click(trigger());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("moves focus into the panel on open", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(trigger());
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => {
      expect(dialog).toHaveFocus();
    });
  });

  it("uses aria-label when there is no title", async () => {
    const user = userEvent.setup();
    setup({ title: undefined, "aria-label": "Quick note" });
    await user.click(trigger());
    expect(await screen.findByRole("dialog", { name: "Quick note" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(trigger());
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("closes with the close button and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(trigger());
    await user.click(await screen.findByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("closes on an outside press without stealing focus", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(trigger());
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "After" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("stays open when pressing inside the panel", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(trigger());
    await user.click(await screen.findByRole("textbox"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("tabbing past the last control closes it and continues from the trigger", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(trigger());
    await screen.findByRole("dialog");
    await user.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("textbox")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Apply" })).toHaveFocus();
    await user.tab();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("shift+tab from the first control goes back to the trigger and keeps it open", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(trigger());
    await screen.findByRole("dialog");
    await user.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(trigger()).toHaveFocus();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens by default with defaultOpen", async () => {
    setup({ defaultOpen: true });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("works controlled", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Popover
        title="T"
        content="C"
        trigger={<button type="button">Open</button>}
        open={false}
        onOpenChange={onOpenChange}
      />,
    );
    await user.click(trigger());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(
      <Popover
        title="T"
        content="C"
        trigger={<button type="button">Open</button>}
        open
        onOpenChange={onOpenChange}
      />,
    );
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("merges the trigger's own onClick and ref", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    render(
      <Popover
        title="T"
        content="C"
        trigger={
          <button type="button" ref={ref} onClick={onClick}>
            Open
          </button>
        }
      />,
    );
    await user.click(trigger());
    expect(onClick).toHaveBeenCalledOnce();
    expect(ref.current).toBe(trigger());
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("exposes the placement and its flip attribute", async () => {
    const user = userEvent.setup();
    setup({ placement: "top" });
    await user.click(trigger());
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveClass("ol-popover--top");
    await waitFor(() => {
      expect(dialog).toHaveAttribute("data-placement");
    });
    expect(["top", "bottom"]).toContain(dialog.getAttribute("data-placement"));
  });

  it("forwards the ref to the panel", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLDivElement>();
    setup({ ref } as Partial<PopoverProps>);
    await user.click(trigger());
    expect(ref.current).toBe(await screen.findByRole("dialog"));
  });

  it("closing it with Escape leaves the layer below open", async () => {
    const user = userEvent.setup();
    const onBelow = vi.fn();
    function Below() {
      const [open, setOpen] = useState(true);
      const wrapper = useRef<HTMLDivElement>(null);
      useDismiss(open, () => {
        onBelow();
        setOpen(false);
      }, [wrapper]);
      return (
        <div ref={wrapper} role="presentation">
          <Popover title="T" content="C" trigger={<button type="button">Open</button>} />
        </div>
      );
    }
    render(<Below />);
    await user.click(trigger());
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onBelow).not.toHaveBeenCalled();
  });

  it("localises the close button", async () => {
    const user = userEvent.setup();
    render(
      <Root locale="es">
        <Popover title="T" content="C" trigger={<button type="button">Open</button>} />
      </Root>,
    );
    await user.click(trigger());
    expect(await screen.findByRole("button", { name: "Cerrar" })).toBeInTheDocument();
  });

  it("has no axe violations closed", async () => {
    const { container } = setup();
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations open", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(trigger());
    await screen.findByRole("dialog");
    expect(
      await runAxe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });

  it("has no axe violations open with aria-label and no title", async () => {
    const user = userEvent.setup();
    setup({ title: undefined, "aria-label": "Quick note" });
    await user.click(trigger());
    await screen.findByRole("dialog");
    expect(
      await runAxe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });

  it("localises the close button in Japanese", async () => {
    const user = userEvent.setup();
    render(
      <Root locale="ja">
        <Popover title="T" content="C" trigger={<button type="button">Open</button>} />
      </Root>,
    );
    await user.click(trigger());
    expect(await screen.findByRole("button", { name: "閉じる" })).toBeInTheDocument();
  });

  it("warns in development when it has no accessible name", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Popover content="C" trigger={<button type="button">Open</button>} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Popover"));
    warn.mockRestore();
  });

  describe("inside a modal", () => {
    const renderInModal = () =>
      render(
        <Root>
          <Modal open onClose={onModalClose} title="Inquiry">
            <Popover
              title="Hint"
              content={<button type="button">Inner</button>}
              trigger={<button type="button">Open</button>}
            />
            <button type="button">Last</button>
          </Modal>
        </Root>,
      );
    const onModalClose = vi.fn();

    it("focuses the panel, closes only the popover on Escape and keeps the modal", async () => {
      const user = userEvent.setup();
      renderInModal();
      await user.click(trigger());
      const popover = await screen.findByRole("dialog", { name: "Hint" });
      await waitFor(() => {
        expect(popover).toHaveFocus();
      });
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog", { name: "Hint" })).toBeNull();
      expect(screen.getByRole("dialog", { name: "Inquiry" })).toBeInTheDocument();
      expect(onModalClose).not.toHaveBeenCalled();
      expect(trigger()).toHaveFocus();
    });

    it("tabbing out lands on the trigger's neighbour inside the modal", async () => {
      const user = userEvent.setup();
      renderInModal();
      await user.click(trigger());
      await screen.findByRole("dialog", { name: "Hint" });
      await user.tab();
      await user.tab();
      await user.tab();
      expect(screen.queryByRole("dialog", { name: "Hint" })).toBeNull();
      expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
    });
  });
});
