import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { SplitButton, type SplitButtonItem, type SplitButtonProps } from "./SplitButton";

const items = (onSelect = vi.fn()): SplitButtonItem[] => [
  { label: "Save as…", onSelect },
  { label: "Save and close", kbd: "mod+shift+s", onSelect },
  { label: "Save a copy", disabled: true, onSelect },
  { divider: true },
  { label: "Discard", danger: true, onSelect },
];

const primary = () => screen.getByRole("button", { name: "Save" });
const trigger = () => screen.getByRole("button", { name: "More save options" });
const item = (name: string) => screen.getByRole("menuitem", { name });

function renderSplit(props: Partial<SplitButtonProps> = {}) {
  return render(
    <SplitButton label="Save" menuLabel="More save options" items={items()} {...props} />,
  );
}

describe("SplitButton", () => {
  stubNoAnimations();

  it("renders two buttons in a bar with menu semantics on the trigger", () => {
    renderSplit({ className: "x", "data-testid": "bar" } as Partial<SplitButtonProps>);
    const bar = screen.getByTestId("bar");
    expect(bar).toHaveClass("ol-split", "x");
    expect(bar).not.toHaveAttribute("role");
    expect(primary()).toHaveClass("ol-btn", "ol-split__primary");
    expect(primary()).not.toHaveAttribute("aria-haspopup");
    const el = trigger();
    expect(el).toHaveClass("ol-btn", "ol-btn--square", "ol-split__trigger");
    expect(el).toHaveAttribute("aria-haspopup", "menu");
    expect(el).toHaveAttribute("aria-expanded", "false");
    expect(el).not.toHaveAttribute("aria-controls");
    expect(el).toHaveTextContent("↓");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("is a named group only when given a name", () => {
    renderSplit({ "aria-label": "Document" });
    expect(screen.getByRole("group", { name: "Document" })).toHaveClass("ol-split");
  });

  it("forwards the ref to the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SplitButton ref={ref} label="Save" items={items()} />);
    expect(ref.current).toHaveClass("ol-split");
  });

  it.each(["solid", "accent", "ghost", "danger"] as const)(
    "passes variant %s to both halves",
    (variant) => {
      renderSplit({ variant });
      expect(primary()).toHaveClass(`ol-btn--${variant}`);
      expect(trigger()).toHaveClass(`ol-btn--${variant}`);
    },
  );

  it.each(["s", "l"] as const)("passes size %s to both halves", (size) => {
    renderSplit({ size });
    expect(primary()).toHaveClass(`ol-btn--${size}`);
    expect(trigger()).toHaveClass(`ol-btn--${size}`);
  });

  it("passes brackets, icon and block to the primary only", () => {
    const { container } = renderSplit({ brackets: true, icon: "+", block: true });
    expect(container.firstChild).toHaveClass("ol-split--block");
    expect(primary()).toHaveClass("ol-btn--block");
    expect(primary().querySelector(".ol-btn__br")).not.toBeNull();
    expect(trigger()).not.toHaveClass("ol-btn--block");
  });

  it("runs the primary action on click, Enter and Space", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderSplit({ onClick });
    await user.click(primary());
    primary().focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("renders the primary as a link with href", () => {
    render(<SplitButton label="Open" href="/docs" items={items()} />);
    const link = screen.getByRole("link", { name: "Open" });
    expect(link).toHaveAttribute("href", "/docs");
    expect(link).toHaveClass("ol-split__primary");
  });

  it("has two tab stops: primary, then trigger", async () => {
    const user = userEvent.setup();
    renderSplit();
    await user.tab();
    expect(primary()).toHaveFocus();
    await user.tab();
    expect(trigger()).toHaveFocus();
  });

  it("does not open the menu from the primary with ArrowDown", async () => {
    const user = userEvent.setup();
    renderSplit();
    primary().focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens on click, names the menu after the trigger and swaps the glyph", async () => {
    const user = userEvent.setup();
    renderSplit();
    await user.click(trigger());
    const menu = await screen.findByRole("menu", { name: "More save options" });
    expect(menu).toHaveClass("ol-floating", "ol-dropdown__menu");
    expect(menu).toHaveAttribute("data-match-width");
    expect(menu).toHaveAttribute("data-side", "bottom");
    expect(menu).toHaveAttribute("data-align", "start");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveAttribute("aria-controls", menu.id);
    expect(trigger()).toHaveTextContent("↑");
    expect(menu).toHaveFocus();
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(item("Save and close")).toHaveAttribute("aria-keyshortcuts");
    await user.click(trigger());
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it.each(["{Enter}", " ", "{ArrowDown}"])(
    "%s on the trigger focuses the first item",
    async (key) => {
      const user = userEvent.setup();
      renderSplit();
      trigger().focus();
      await user.keyboard(key);
      await waitFor(() => {
        expect(item("Save as…")).toHaveFocus();
      });
    },
  );

  it("ArrowUp on the trigger focuses the last item", async () => {
    const user = userEvent.setup();
    renderSplit();
    trigger().focus();
    await user.keyboard("{ArrowUp}");
    await waitFor(() => {
      expect(item("Discard")).toHaveFocus();
    });
  });

  it("moves with arrows (wrapping, skipping disabled), Home, End and typeahead", async () => {
    const user = userEvent.setup();
    renderSplit();
    trigger().focus();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(item("Save as…")).toHaveFocus();
    });
    await user.keyboard("{ArrowDown}");
    expect(item("Save and close")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item("Discard")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item("Save as…")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(item("Discard")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(item("Save as…")).toHaveFocus();
    await user.keyboard("{End}");
    expect(item("Discard")).toHaveFocus();
    await user.keyboard("s");
    expect(item("Save as…")).toHaveFocus();
  });

  it.each(["{Enter}", " "])(
    "%s on an item runs it, closes and returns focus to the trigger",
    async (key) => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const onOpenChange = vi.fn();
      render(
        <SplitButton
          label="Save"
          menuLabel="More save options"
          items={items(onSelect)}
          onOpenChange={onOpenChange}
        />,
      );
      trigger().focus();
      await user.keyboard("{Enter}");
      await waitFor(() => {
        expect(item("Save as…")).toHaveFocus();
      });
      await user.keyboard(key);
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("menu")).toBeNull();
      expect(trigger()).toHaveFocus();
      expect(onOpenChange).toHaveBeenLastCalledWith(false, "select");
    },
  );

  it("Escape closes and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderSplit({ onOpenChange });
    trigger().focus();
    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      expect(item("Save as…")).toHaveFocus();
    });
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveFocus();
    expect(onOpenChange).toHaveBeenLastCalledWith(false, "escape");
  });

  it("Tab closes and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderSplit();
    trigger().focus();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(item("Save as…")).toHaveFocus();
    });
    fireEvent.keyDown(item("Save as…"), { key: "Tab" });
    await waitFor(() => {
      expect(screen.queryByRole("menu")).toBeNull();
    });
    expect(trigger()).toHaveFocus();
  });

  it("closes on an outside press without moving focus back", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Elsewhere</button>
        <SplitButton label="Save" menuLabel="More save options" items={items()} />
      </>,
    );
    await user.click(trigger());
    await screen.findByRole("menu");
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
  });

  it("pressing the primary while open closes the menu and runs the action once", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onSelect = vi.fn();
    render(
      <SplitButton
        label="Save"
        menuLabel="More save options"
        items={items(onSelect)}
        onClick={onClick}
      />,
    );
    await user.click(trigger());
    await screen.findByRole("menu");
    await user.click(primary());
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes when the primary is clicked without a pointer press", async () => {
    const onClick = vi.fn();
    renderSplit({ onClick, defaultOpen: true });
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.click(primary());
    expect(onClick).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole("menu")).toBeNull();
    });
  });

  it("supports a controlled open state", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <span data-testid="state">{String(open)}</span>
          <SplitButton
            label="Save"
            menuLabel="More save options"
            items={items()}
            open={open}
            onOpenChange={setOpen}
          />
        </>
      );
    }
    render(<Controlled />);
    await user.click(trigger());
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(screen.getByTestId("state")).toHaveTextContent("true");
    await user.keyboard("{Escape}");
    expect(screen.getByTestId("state")).toHaveTextContent("false");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("stays closed when controlled closed", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderSplit({ open: false, onOpenChange });
    await user.click(trigger());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens above and lines up with the end edge", () => {
    renderSplit({ defaultOpen: true, up: true, align: "end", menuClassName: "ol-motion-noren" });
    const menu = screen.getByRole("menu");
    expect(menu).toHaveAttribute("data-side", "top");
    expect(menu).toHaveAttribute("data-align", "end");
    expect(menu).toHaveClass("ol-motion-noren");
  });

  it("disabled makes both halves inert", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderSplit({ disabled: true, onClick });
    expect(primary()).toBeDisabled();
    expect(trigger()).toBeDisabled();
    await user.click(primary());
    await user.click(trigger());
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("can disable one half alone", async () => {
    const user = userEvent.setup();
    renderSplit({ primaryProps: { disabled: true } });
    expect(primary()).toBeDisabled();
    expect(trigger()).toBeEnabled();
    await user.click(trigger());
    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("loading shows the stepped square, makes both halves inert and closes the menu", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = renderSplit({ defaultOpen: true, onOpenChange });
    expect(screen.getByRole("menu")).toBeInTheDocument();
    rerender(
      <SplitButton
        label="Save"
        menuLabel="More save options"
        items={items()}
        defaultOpen
        onOpenChange={onOpenChange}
        loading
      />,
    );
    const busy = screen.getByRole("button", { name: /save/i, busy: true });
    expect(busy).toBeDisabled();
    expect(busy.querySelector(".ol-btn__spin")).not.toBeNull();
    expect(trigger()).toBeDisabled();
    await waitFor(() => {
      expect(screen.queryByRole("menu")).toBeNull();
    });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("passes props to one half and composes handlers", async () => {
    const user = userEvent.setup();
    const onPrimary = vi.fn();
    const onTrigger = vi.fn();
    const onClick = vi.fn();
    renderSplit({
      onClick,
      primaryProps: { type: "submit", onClick: onPrimary, className: "p" },
      triggerProps: { onClick: onTrigger, className: "t" },
    });
    expect(primary()).toHaveAttribute("type", "submit");
    expect(primary()).toHaveClass("p");
    expect(trigger()).toHaveClass("t");
    await user.click(primary());
    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
    await user.click(trigger());
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it.each([
    ["en", "More actions"],
    ["es", "Más acciones"],
    ["ja", "その他の操作"],
  ] as const)("names the trigger from the %s locale", (locale, name) => {
    render(
      <Root locale={locale}>
        <SplitButton label="Save" items={items()} />
      </Root>,
    );
    expect(screen.getByRole("button", { name })).toHaveClass("ol-split__trigger");
  });

  it("Shift+Tab closes and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderSplit();
    trigger().focus();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(item("Save as…")).toHaveFocus();
    });
    fireEvent.keyDown(item("Save as…"), { key: "Tab", shiftKey: true });
    await waitFor(() => {
      expect(screen.queryByRole("menu")).toBeNull();
    });
    expect(trigger()).toHaveFocus();
  });

  it("clicking the trigger again closes and keeps focus on it", async () => {
    const user = userEvent.setup();
    renderSplit();
    await user.click(trigger());
    await screen.findByRole("menu");
    await user.click(trigger());
    await waitFor(() => {
      expect(screen.queryByRole("menu")).toBeNull();
    });
    expect(trigger()).toHaveFocus();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("ArrowDown on the trigger while open moves to the first item", async () => {
    const user = userEvent.setup();
    renderSplit({ defaultOpen: true });
    trigger().focus();
    await user.keyboard("{ArrowDown}");
    expect(item("Save as…")).toHaveFocus();
  });

  it("moves focus to the primary when the trigger turns inert with focus in the menu", async () => {
    const user = userEvent.setup();
    const props = { label: "Save", menuLabel: "More save options", items: items() };
    const { rerender } = render(<SplitButton {...props} />);
    trigger().focus();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(item("Save as…")).toHaveFocus();
    });
    rerender(<SplitButton {...props} triggerProps={{ disabled: true }} />);
    await waitFor(() => {
      expect(screen.queryByRole("menu")).toBeNull();
    });
    expect(primary()).toHaveFocus();
  });

  it("moves focus to the bar when both halves turn inert with focus in the menu", async () => {
    const user = userEvent.setup();
    const props = { label: "Save", menuLabel: "More save options", items: items() };
    const { rerender, container } = render(<SplitButton {...props} />);
    trigger().focus();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(item("Save as…")).toHaveFocus();
    });
    rerender(<SplitButton {...props} loading />);
    await waitFor(() => {
      expect(screen.queryByRole("menu")).toBeNull();
    });
    const bar = container.querySelector<HTMLElement>(".ol-split");
    expect(bar).toHaveFocus();
    expect(bar).toHaveAttribute("tabindex", "-1");
    bar?.blur();
    expect(bar).not.toHaveAttribute("tabindex");
  });

  it.each([
    ["solid", { variant: "solid" }],
    ["accent", { variant: "accent" }],
    ["href", { href: "/save" }],
    ["named group", { "aria-label": "Document" }],
  ] as const)("has no axe violations when open (%s)", async (_, extra) => {
    const user = userEvent.setup();
    render(
      <main>
        <SplitButton label="Save" items={items()} {...extra} />
      </main>,
    );
    await user.click(screen.getByRole("button", { name: "More actions" }));
    await screen.findByRole("menu");
    expect(
      await runAxe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });

  it("has no axe violations while loading", async () => {
    const { container } = render(
      <main>
        <SplitButton label="Save" items={items()} loading />
      </main>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations, closed and open", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <main>
        <SplitButton label="Save" items={items()} />
      </main>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
    await user.click(screen.getByRole("button", { name: "More actions" }));
    await screen.findByRole("menu");
    expect(
      await runAxe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
