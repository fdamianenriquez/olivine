import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { MenuItems, MenuPopup } from "../components/Dropdown/Menu";
import { stubNoAnimations } from "../test/animations";
import { runAxe } from "../test/axe";
import { type MenuCloseReason, useMenu, type UseMenuOptions } from "./useMenu";
import { useMenuPosition } from "./useMenuPosition";

/** A menu without positioning, with its own rows (as Fab draws them). */
function Bare({
  onSelect = () => undefined,
  ...options
}: UseMenuOptions & { onSelect?: (value: string) => void }) {
  const { setTrigger, setMenu, mounted, getTriggerProps, getMenuProps, getItemProps } =
    useMenu(options);
  const [bold, setBold] = useState(false);
  return (
    <div lang="es">
      <button type="button" ref={setTrigger} {...getTriggerProps({})}>
        Format
      </button>
      {mounted ? (
        <ul ref={setMenu} {...getMenuProps({})}>
          <li role="none">
            <button
              type="button"
              {...getItemProps({
                onSelect: () => {
                  onSelect("arbol");
                },
              })}
            >
              Árbol
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              {...getItemProps({
                kind: "checkbox",
                checked: bold,
                onSelect: () => {
                  setBold(!bold);
                },
              })}
            >
              Bold
            </button>
          </li>
          <li role="none">
            <button type="button" {...getItemProps({ disabled: true })}>
              Borrar
            </button>
          </li>
          <li role="none">
            <button type="button" {...getItemProps({ textValue: "kiru" })}>
              切る
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

/** A split button: the menu lines up with the whole bar, focus returns to the arrow. */
function Split() {
  const menu = useMenu();
  const { setTrigger, getTriggerProps } = menu;
  const position = useMenuPosition<HTMLDivElement, HTMLUListElement>({
    open: menu.mounted,
    placement: "bottom-end",
    matchWidth: true,
  });
  const { setAnchor } = position;
  return (
    <div ref={setAnchor} data-testid="bar">
      <button type="button">Save</button>
      <button type="button" aria-label="More" ref={setTrigger} {...getTriggerProps({})} />
      <MenuPopup menu={menu} position={position}>
        <MenuItems
          menu={menu}
          items={[
            { header: "Save as" },
            { label: "Draft" },
            { label: "Template" },
            { divider: true },
            { label: "Export" },
          ]}
        />
      </MenuPopup>
    </div>
  );
}

const trigger = () => screen.getByRole("button", { name: "Format" });
const item = (name: string) => screen.getByRole("menuitem", { name });

async function openWithKeyboard(user: ReturnType<typeof userEvent.setup>) {
  trigger().focus();
  await user.keyboard("{Enter}");
  await waitFor(() => expect(item("Árbol")).toHaveFocus());
}

describe("useMenu", () => {
  stubNoAnimations();

  it("works without positioning and wires the trigger", async () => {
    const user = userEvent.setup();
    render(<Bare />);
    expect(trigger()).toHaveAttribute("aria-haspopup", "menu");
    await openWithKeyboard(user);
    const menu = screen.getByRole("menu", { name: "Format" });
    expect(trigger()).toHaveAttribute("aria-controls", menu.id);
    expect(menu).toHaveAttribute("data-state", "open");
    expect(menu).not.toHaveClass("ol-floating");
  });

  it("reaches checkbox items by arrows and keeps the menu open when they toggle", async () => {
    const user = userEvent.setup();
    render(<Bare />);
    await openWithKeyboard(user);
    await user.keyboard("{ArrowDown}");
    const bold = screen.getByRole("menuitemcheckbox", { name: "Bold" });
    expect(bold).toHaveFocus();
    expect(bold).toHaveAttribute("aria-checked", "false");
    await user.keyboard("{Enter}");
    expect(bold).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    // Disabled items are skipped and marked.
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "切る" })).toHaveFocus();
    expect(item("Borrar")).toHaveAttribute("data-disabled");
  });

  it("can keep disabled items focusable", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Bare disabledItems="focusable" onSelect={onSelect} />);
    await openWithKeyboard(user);
    await user.keyboard("{End}{ArrowUp}");
    expect(item("Borrar")).toHaveFocus();
    expect(item("Borrar")).not.toHaveAttribute("data-disabled");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("matches typeahead ignoring accents, and uses textValue", async () => {
    const user = userEvent.setup();
    render(<Bare />);
    await openWithKeyboard(user);
    await user.keyboard("k");
    expect(screen.getByRole("menuitem", { name: "切る" })).toHaveFocus();
    await user.keyboard("{Escape}");
    await openWithKeyboard(user);
    await user.keyboard("{End}a");
    expect(item("Árbol")).toHaveFocus();
  });

  it("leaves IME composition alone", async () => {
    const user = userEvent.setup();
    render(<Bare />);
    await openWithKeyboard(user);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "b", isComposing: true });
    expect(item("Árbol")).toHaveFocus();
    fireEvent.keyDown(item("Árbol"), { key: "Process" });
    expect(item("Árbol")).toHaveFocus();
  });

  it("moves the highlight with the pointer and drops it when the pointer leaves", async () => {
    const user = userEvent.setup();
    render(<Bare />);
    await openWithKeyboard(user);
    const menu = screen.getByRole("menu");
    expect(item("Árbol")).toHaveAttribute("data-highlighted");
    fireEvent.pointerMove(screen.getByRole("menuitemcheckbox"), { pointerType: "mouse" });
    expect(screen.getByRole("menuitemcheckbox")).toHaveFocus();
    expect(menu.querySelectorAll("[data-highlighted]")).toHaveLength(1);
    fireEvent.pointerMove(item("Árbol"), { pointerType: "touch" });
    expect(screen.getByRole("menuitemcheckbox")).toHaveFocus();
    // Over a skipped row no row stays highlighted.
    fireEvent.pointerMove(item("Borrar"), { pointerType: "mouse" });
    expect(menu).toHaveFocus();
    expect(menu.querySelectorAll("[data-highlighted]")).toHaveLength(0);
    fireEvent.pointerMove(screen.getByRole("menuitemcheckbox"), { pointerType: "mouse" });
    fireEvent.pointerLeave(menu, { pointerType: "mouse" });
    expect(menu).toHaveFocus();
    expect(menu.querySelectorAll("[data-highlighted]")).toHaveLength(0);
  });

  it("focuses the menu, not an item, after a pointer click", async () => {
    render(<Bare />);
    fireEvent.click(trigger(), { detail: 1 });
    const menu = await screen.findByRole("menu");
    await waitFor(() => expect(menu).toHaveFocus());
  });

  it("does not leak a keyboard open into a later pointer open", async () => {
    const user = userEvent.setup();
    render(<Bare />);
    trigger().addEventListener(
      "click",
      (event) => {
        event.preventDefault();
      },
      { once: true },
    );
    trigger().focus();
    await user.keyboard("{Enter}");
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(trigger(), { detail: 1 });
    await waitFor(() => expect(screen.getByRole("menu")).toHaveFocus());
  });

  it.each<[string, MenuCloseReason]>([
    ["{Escape}", "escape"],
    ["{Tab}", "tab"],
    ["{Enter}", "select"],
  ])("reports %s as %s", async (key, reason) => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Bare onOpenChange={onOpenChange} />);
    await openWithKeyboard(user);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.keyboard(key);
    expect(onOpenChange).toHaveBeenLastCalledWith(false, reason);
  });

  it("reports outside presses and leaves focus where the press put it", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <>
        <button type="button">Elsewhere</button>
        <Bare onOpenChange={onOpenChange} />
      </>,
    );
    await openWithKeyboard(user);
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false, "outside");
    expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
  });

  it("restores focus as restoreFocus says", async () => {
    const user = userEvent.setup();
    const restoreFocus = vi.fn((reason: MenuCloseReason) => reason !== "select");
    render(
      <>
        <input aria-label="Name" />
        <Bare restoreFocus={restoreFocus} />
      </>,
    );
    await openWithKeyboard(user);
    await user.keyboard("{Escape}");
    expect(trigger()).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(item("Árbol")).toHaveFocus());
    await user.keyboard("{Enter}");
    expect(restoreFocus).toHaveBeenLastCalledWith("select");
    // Nothing chosen to focus: the closing menu hands focus back to its opener.
    expect(trigger()).toHaveFocus();
  });

  it("is inert while closing and chooses an item once on a double click", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const finish: (() => void)[] = [];
    const spy = vi.spyOn(Element.prototype, "getAnimations").mockImplementation(() => [
      {
        effect: { getComputedTiming: () => ({ endTime: 200 }) },
        finished: new Promise<void>((resolve) => finish.push(resolve)),
      } as unknown as Animation,
    ]);
    render(<Bare onSelect={onSelect} />);
    await openWithKeyboard(user);
    const row = item("Árbol");
    fireEvent.click(row);
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledTimes(1);
    const menu = screen.getByRole("menu");
    expect(menu).toHaveAttribute("data-state", "closing");
    expect(menu).toHaveAttribute("inert");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    await act(async () => {
      for (const done of finish) done();
      await Promise.resolve();
    });
    expect(screen.queryByRole("menu")).toBeNull();
    spy.mockRestore();
  });

  it("names a menu without a trigger with label", () => {
    function Context() {
      const { setMenu, getMenuProps } = useMenu({ defaultOpen: true, label: "Canvas" });
      return <ul ref={setMenu} {...getMenuProps({})} />;
    }
    render(<Context />);
    expect(screen.getByRole("menu", { name: "Canvas" })).toBeInTheDocument();
  });

  it("reports arrows out of the menu, mirrored in RTL", () => {
    const onArrowOut = vi.fn();
    function Bar({ dir }: { dir: "ltr" | "rtl" }) {
      const { setMenu, getMenuProps, getItemProps } = useMenu({
        defaultOpen: true,
        label: "File",
        onArrowOut,
        triggerRole: "menuitem",
      });
      return (
        <div dir={dir} style={{ direction: dir }}>
          <ul ref={setMenu} {...getMenuProps({})} style={{ direction: dir }}>
            <li role="none">
              <button type="button" {...getItemProps()}>
                New
              </button>
            </li>
          </ul>
        </div>
      );
    }
    const { rerender } = render(<Bar dir="ltr" />);
    fireEvent.keyDown(screen.getByRole("menuitem"), { key: "ArrowRight" });
    expect(onArrowOut).toHaveBeenLastCalledWith("next");
    rerender(<Bar dir="rtl" />);
    fireEvent.keyDown(screen.getByRole("menuitem"), { key: "ArrowRight" });
    expect(onArrowOut).toHaveBeenLastCalledWith("prev");
  });

  it("scrolls a capped menu to keep the focused item in view", async () => {
    const user = userEvent.setup();
    render(<Bare />);
    await openWithKeyboard(user);
    const menu = screen.getByRole("menu");
    Object.defineProperty(menu, "scrollHeight", { value: 300 });
    Object.defineProperty(menu, "clientHeight", { value: 100 });
    menu.getBoundingClientRect = () => ({ top: 0, bottom: 100 }) as DOMRect;
    screen.getByRole("menuitem", { name: "切る" }).getBoundingClientRect = () =>
      ({ top: 140, bottom: 172 }) as DOMRect;
    await user.keyboard("{End}");
    expect(menu.scrollTop).toBe(72);
  });
});

describe("MenuPopup and MenuItems", () => {
  stubNoAnimations();

  it("lines the menu up with a separate anchor and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Split />);
    await user.click(screen.getByRole("button", { name: "More" }));
    const menu = await screen.findByRole("menu", { name: "More" });
    expect(menu).toHaveClass("ol-floating", "ol-dropdown__menu");
    expect(menu).toHaveAttribute("data-match-width");
    expect(menu).toHaveAttribute("data-side", "bottom");
    expect(menu).toHaveAttribute("data-align", "end");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: "More" })).toHaveFocus();
  });

  it("groups the items after a header under a named group", async () => {
    const user = userEvent.setup();
    render(<Split />);
    await user.click(screen.getByRole("button", { name: "More" }));
    const group = await screen.findByRole("group", { name: "Save as" });
    expect(group.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
    expect(
      await runAxe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});

describe("menu trees", () => {
  stubNoAnimations();

  function Sub() {
    const sub = useMenu({ defaultOpen: true, label: "More" });
    return (
      <MenuPopup menu={sub}>
        <MenuItems menu={sub} items={[{ label: "Nested" }]} />
      </MenuPopup>
    );
  }

  function Parent({ onArrowOut }: { onArrowOut: () => void }) {
    const menu = useMenu({ defaultOpen: true, label: "File", onArrowOut });
    return (
      <MenuPopup menu={menu}>
        <MenuItems menu={menu} items={[{ label: "New" }]} />
        <Sub />
      </MenuPopup>
    );
  }

  it("leaves a submenu's events to the submenu and dismisses the tree together", async () => {
    const user = userEvent.setup();
    const onArrowOut = vi.fn();
    render(
      <>
        <button type="button">Elsewhere</button>
        <Parent onArrowOut={onArrowOut} />
      </>,
    );
    const nested = screen.getByRole("menuitem", { name: "Nested" });
    fireEvent.keyDown(nested, { key: "ArrowRight" });
    expect(onArrowOut).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "New" }), { key: "ArrowRight" });
    expect(onArrowOut).toHaveBeenCalledTimes(1);
    // A press inside the submenu is not an outside press for the root.
    fireEvent.pointerDown(nested);
    expect(screen.getByRole("menu", { name: "File" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.queryByRole("menu", { name: "File" })).toBeNull();
  });
});
