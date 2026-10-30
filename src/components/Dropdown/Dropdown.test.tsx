import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { KbdPlatformContext } from "../Kbd";
import { Root } from "../Root";
import { Dropdown, type DropdownItem } from "./Dropdown";

const items = (onSelect = vi.fn()): DropdownItem[] => [
  { header: "Project" },
  { label: "Rename", kbd: "⌘R", onSelect },
  { label: "Duplicate", onSelect },
  { label: "Archive", disabled: true, onSelect },
  { divider: true },
  { label: "Delete", danger: true, onSelect },
];

const trigger = () => screen.getByRole("button", { name: /actions/i });
const menuitems = () => screen.queryAllByRole("menuitem");

async function openByKeyboard(user: ReturnType<typeof userEvent.setup>, key = "{Enter}") {
  await user.tab();
  await user.keyboard(key);
  return screen.findByRole("menu");
}

describe("Dropdown", () => {
  stubNoAnimations();

  it("renders a closed trigger with menu semantics and no menu", () => {
    render(<Dropdown label="Actions" items={items()} className="x" data-testid="t" />);
    const el = trigger();
    expect(el).toHaveClass("ol-btn", "ol-dropdown__trigger", "x");
    expect(el).toHaveAttribute("data-testid", "t");
    expect(el).toHaveAttribute("aria-haspopup", "menu");
    expect(el).toHaveAttribute("aria-expanded", "false");
    expect(el).not.toHaveAttribute("aria-controls");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it.each(["solid", "accent", "ghost", "danger"] as const)(
    "passes variant %s to the trigger",
    (variant) => {
      render(<Dropdown label="Actions" items={items()} variant={variant} />);
      expect(trigger()).toHaveClass(`ol-btn--${variant}`);
    },
  );

  it.each(["s", "l"] as const)("passes size %s to the trigger", (size) => {
    render(<Dropdown label="Actions" items={items()} size={size} />);
    expect(trigger()).toHaveClass(`ol-btn--${size}`);
  });

  it("opens on click and wires aria", async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={items()} />);
    await user.click(trigger());
    const menu = await screen.findByRole("menu", { name: /actions/i });
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveAttribute("aria-controls", menu.id);
    expect(menuitems().map((el) => el.querySelector(".ol-dropdown__label")?.textContent)).toEqual([
      "Rename",
      "Duplicate",
      "Archive",
      "Delete",
    ]);
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Archive" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await waitFor(() => expect(menu).toHaveAttribute("data-state", "open"));
  });

  it("draws the shortcut with Kbd, hidden from the name and exposed as aria-keyshortcuts", async () => {
    const user = userEvent.setup();
    render(
      <KbdPlatformContext.Provider value="apple">
        <Dropdown
          label="Actions"
          items={[
            { label: "Rename", kbd: "⌘R" },
            { label: "Open", kbd: "mod+o" },
          ]}
        />
      </KbdPlatformContext.Provider>,
    );
    await user.click(trigger());
    const rename = await screen.findByRole("menuitem", { name: "Rename" });
    expect(rename).toHaveAttribute("aria-keyshortcuts", "Meta+R");
    expect(rename.querySelector(".ol-kbd-group, .ol-kbd")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("menuitem", { name: "Open" })).toHaveAttribute(
      "aria-keyshortcuts",
      "Meta+O",
    );
  });

  it("focuses the menu itself after a pointer open", async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={items()} />);
    await user.click(trigger());
    const menu = await screen.findByRole("menu");
    await waitFor(() => expect(menu).toHaveFocus());
  });

  it.each(["{Enter}", " ", "{ArrowDown}"])(
    "focuses the first item when opened with %j",
    async (key) => {
      const user = userEvent.setup();
      render(<Dropdown label="Actions" items={items()} />);
      await openByKeyboard(user, key);
      await waitFor(() => expect(screen.getByRole("menuitem", { name: /Rename/ })).toHaveFocus());
    },
  );

  it("focuses the last item when opened with ArrowUp", async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={items()} />);
    await openByKeyboard(user, "{ArrowUp}");
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus());
  });

  it("moves with arrows, wrapping and skipping disabled items", async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={items()} />);
    await openByKeyboard(user);
    const rename = screen.getByRole("menuitem", { name: /Rename/ });
    await waitFor(() => expect(rename).toHaveFocus());
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(rename).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
  });

  it("uses a roving tabindex", async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={items()} />);
    await openByKeyboard(user);
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /Rename/ })).toHaveFocus());
    await user.keyboard("{ArrowDown}");
    expect(
      menuitems()
        .filter((el) => el.tabIndex === 0)
        .map((el) => el.textContent),
    ).toEqual(["Duplicate"]);
  });

  it("jumps with Home and End", async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={items()} />);
    await openByKeyboard(user);
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /Rename/ })).toHaveFocus());
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: /Rename/ })).toHaveFocus();
  });

  it("moves to the first item with ArrowDown from the trigger while open", async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={items()} />);
    await user.click(trigger());
    await screen.findByRole("menu");
    trigger().focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: /Rename/ })).toHaveFocus();
  });

  it("supports typeahead and skips disabled items", async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={items()} />);
    await openByKeyboard(user);
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /Rename/ })).toHaveFocus());
    await user.keyboard("d");
    expect(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveFocus();
    await user.keyboard("d");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
    await user.keyboard("a");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
  });

  it("matches a typed prefix", async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={items()} />);
    await openByKeyboard(user);
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /Rename/ })).toHaveFocus());
    await user.keyboard("del");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
  });

  it("selects with Enter: calls onSelect, closes and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Dropdown label="Actions" items={items(onSelect)} />);
    await openByKeyboard(user);
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /Rename/ })).toHaveFocus());
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("selects with a click and ignores disabled items", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Dropdown label="Actions" items={items(onSelect)} />);
    await user.click(trigger());
    await user.click(await screen.findByRole("menuitem", { name: "Archive" }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={items()} />);
    await openByKeyboard(user);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("closes on an outside press", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Elsewhere</button>
        <Dropdown label="Actions" items={items()} />
      </>,
    );
    await user.click(trigger());
    await screen.findByRole("menu");
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes on Tab and keeps focus on the trigger", async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={items()} />);
    await openByKeyboard(user);
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /Rename/ })).toHaveFocus());
    await user.keyboard("{Tab}");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("toggles closed when the trigger is clicked again", async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={items()} />);
    await user.click(trigger());
    await screen.findByRole("menu");
    await user.click(trigger());
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("starts open with defaultOpen", async () => {
    render(<Dropdown label="Actions" items={items()} defaultOpen />);
    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("works controlled and reports changes", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
          >
            External
          </button>
          <Dropdown
            label="Actions"
            items={items()}
            open={open}
            onOpenChange={(next) => {
              onOpenChange(next);
              setOpen(next);
            }}
          />
        </>
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: "External" }));
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("does not open by itself when controlled closed", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Dropdown label="Actions" items={items()} open={false} onOpenChange={onOpenChange} />);
    await user.click(trigger());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("keeps the theme of a sumi island in the portal", async () => {
    const user = userEvent.setup();
    render(
      <div data-theme="sumi">
        <Dropdown label="Actions" items={items()} />
      </div>,
    );
    await user.click(trigger());
    const menu = await screen.findByRole("menu");
    expect(menu.closest("[data-theme]")).toHaveAttribute("data-theme", "sumi");
    expect(menu.parentElement?.parentElement).toBe(document.body);
  });

  it("forwards the ref to the trigger button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Dropdown ref={ref} label="Actions" items={items()} />);
    expect(ref.current).toBe(trigger());
  });

  it("accepts a disabled trigger", async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={items()} disabled />);
    await user.click(trigger());
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("has no axe violations closed", async () => {
    const { container } = render(<Dropdown label="Actions" items={items()} />);
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations open", async () => {
    const user = userEvent.setup();
    render(
      <Root>
        <main>
          <Dropdown label="Actions" items={items()} />
        </main>
      </Root>,
    );
    await user.click(trigger());
    await screen.findByRole("menu");
    expect(
      await runAxe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });

  it("has no axe violations open in sumi with groups, shortcuts and danger rows", async () => {
    const user = userEvent.setup();
    render(
      <Root theme="sumi">
        <main>
          <Dropdown label="Actions" items={items()} />
        </main>
      </Root>,
    );
    await user.click(trigger());
    await screen.findByRole("group", { name: "Project" });
    expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveAttribute("aria-keyshortcuts");
    expect(
      await runAxe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
