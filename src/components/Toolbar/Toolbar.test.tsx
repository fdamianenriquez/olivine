import { readFileSync } from "node:fs";

import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubNoAnimations } from "../../test/animations";
import { runAxe } from "../../test/axe";
import { Button } from "../Button";
import { ButtonGroup } from "../ButtonGroup";
import { Dropdown } from "../Dropdown";
import { Input } from "../Input";
import { Root } from "../Root";
import { SegmentedControl } from "../SegmentedControl";
import { SplitButton } from "../SplitButton";
import { ToggleButton } from "../ToggleButton";
import { Tooltip } from "../Tooltip";
import { Toolbar, type ToolbarProps } from "./Toolbar";

afterEach(() => vi.restoreAllMocks());

const tool = (name: string) => screen.getByRole("button", { name });

function Basic(props: Partial<ToolbarProps> = {}) {
  return (
    <Toolbar label="Text formatting" {...props}>
      <Button variant="ghost">Cut</Button>
      <Button variant="ghost">Copy</Button>
      <Button variant="ghost">Paste</Button>
    </Toolbar>
  );
}

function Page(props: Partial<ToolbarProps> = {}) {
  return (
    <>
      <button type="button">Before</button>
      <Basic {...props} />
      <button type="button">After</button>
    </>
  );
}

describe("Toolbar", () => {
  stubNoAnimations();

  describe("rendering", () => {
    it("renders a named toolbar with root classes and native props", () => {
      render(<Basic className="x" data-testid="t" />);
      const el = screen.getByRole("toolbar", { name: "Text formatting" });
      expect(el).toHaveClass("ol-toolbar", "ol-toolbar--docked", "x");
      expect(el).toHaveAttribute("data-testid", "t");
      expect(el).not.toHaveAttribute("aria-orientation");
    });

    it("names the bar with aria-labelledby", () => {
      render(
        <>
          <h2 id="h">Selection</h2>
          <Toolbar aria-labelledby="h">
            <Button>A</Button>
          </Toolbar>
        </>,
      );
      expect(screen.getByRole("toolbar", { name: "Selection" })).toBeInTheDocument();
    });

    it("forwards the ref to the root", () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <Toolbar label="T" ref={ref}>
          <Button>A</Button>
        </Toolbar>,
      );
      expect(ref.current).toBe(screen.getByRole("toolbar"));
    });

    it("maps variant, orientation, anchor and overflow", () => {
      render(<Basic variant="floating" orientation="vertical" anchor="start" overflow="scroll" />);
      const el = screen.getByRole("toolbar");
      expect(el).toHaveClass(
        "ol-toolbar--floating",
        "ol-toolbar--v",
        "ol-toolbar--anchor-start",
        "ol-toolbar--scroll",
      );
      expect(el).toHaveAttribute("aria-orientation", "vertical");
    });

    it("adds the wrap modifier and none for overflow none", () => {
      const { rerender } = render(<Basic overflow="wrap" />);
      expect(screen.getByRole("toolbar")).toHaveClass("ol-toolbar--wrap");
      rerender(<Basic overflow="none" />);
      expect(screen.getByRole("toolbar").className).not.toMatch(/--(wrap|scroll)/);
    });

    it("keeps a docked bar in the flow when the anchor is a side", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(<Basic anchor="end" />);
      expect(screen.getByRole("toolbar").className).not.toMatch(/anchor/);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('variant="floating"'));
    });

    it("warns when the bar has no name", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <Toolbar>
          <Button>A</Button>
        </Toolbar>,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("needs a name"));
    });

    it("warns about a foreign roving group and about a text field that is not last", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <Toolbar label="Bad">
          <div role="tablist" />
          <Input aria-label="Find" />
          <Button>Go</Button>
        </Toolbar>,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("keep them out"));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("the last item"));
    });
  });

  describe("tab stop", () => {
    it("is one tab stop that leaves in one press", async () => {
      const user = userEvent.setup();
      render(<Page />);
      expect(tool("Cut")).toHaveAttribute("tabindex", "0");
      expect(tool("Copy")).toHaveAttribute("tabindex", "-1");
      expect(tool("Paste")).toHaveAttribute("tabindex", "-1");
      await user.tab();
      expect(tool("Before")).toHaveFocus();
      await user.tab();
      expect(tool("Cut")).toHaveFocus();
      await user.tab();
      expect(tool("After")).toHaveFocus();
      await user.tab({ shift: true });
      expect(tool("Cut")).toHaveFocus();
    });

    it("re-enters on the last focused item", async () => {
      const user = userEvent.setup();
      render(<Page />);
      await user.tab();
      await user.tab();
      await user.keyboard("{ArrowRight}");
      expect(tool("Copy")).toHaveFocus();
      await user.tab();
      expect(tool("After")).toHaveFocus();
      await user.tab({ shift: true });
      expect(tool("Copy")).toHaveFocus();
    });

    it("remembers an item focused by a click", async () => {
      const user = userEvent.setup();
      render(<Page />);
      await user.click(tool("Paste"));
      await user.tab();
      expect(tool("After")).toHaveFocus();
      await user.tab({ shift: true });
      expect(tool("Paste")).toHaveFocus();
    });
  });

  describe("keyboard", () => {
    it("moves with Right and Left, Home and End", async () => {
      const user = userEvent.setup();
      render(<Basic />);
      await user.tab();
      await user.keyboard("{ArrowRight}");
      expect(tool("Copy")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(tool("Paste")).toHaveFocus();
      await user.keyboard("{ArrowLeft}");
      expect(tool("Copy")).toHaveFocus();
      await user.keyboard("{End}");
      expect(tool("Paste")).toHaveFocus();
      await user.keyboard("{Home}");
      expect(tool("Cut")).toHaveFocus();
    });

    it("wraps with loop (default)", async () => {
      const user = userEvent.setup();
      render(<Basic />);
      await user.tab();
      await user.keyboard("{ArrowLeft}");
      expect(tool("Paste")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(tool("Cut")).toHaveFocus();
    });

    it("stops at the ends and leaves the key alone with loop={false}", async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn();
      render(<Basic loop={false} onKeyDown={onKeyDown} />);
      await user.tab();
      await user.keyboard("{ArrowLeft}");
      expect(tool("Cut")).toHaveFocus();
      const event = new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        bubbles: true,
        cancelable: true,
      });
      act(() => {
        tool("Cut").dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(false);
    });

    it("skips disabled items and items that are hidden", async () => {
      const user = userEvent.setup();
      render(
        <Toolbar label="T">
          <Button>One</Button>
          <Button disabled>Two</Button>
          <Button hidden>Three</Button>
          <span hidden>
            <Button>Four</Button>
          </span>
          <Button>Five</Button>
        </Toolbar>,
      );
      await user.tab();
      await user.keyboard("{ArrowRight}");
      expect(screen.getByRole("button", { name: "Five" })).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(screen.getByRole("button", { name: "One" })).toHaveFocus();
    });

    it("enters on the first enabled item the first time", async () => {
      const user = userEvent.setup();
      render(
        <Toolbar label="T">
          <Button disabled>One</Button>
          <Button>Two</Button>
        </Toolbar>,
      );
      await user.tab();
      expect(screen.getByRole("button", { name: "Two" })).toHaveFocus();
    });

    it("swaps Left and Right in right-to-left text", async () => {
      const user = userEvent.setup();
      render(
        <div dir="rtl" style={{ direction: "rtl" }}>
          <Basic />
        </div>,
      );
      await user.tab();
      await user.keyboard("{ArrowLeft}");
      expect(tool("Copy")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(tool("Cut")).toHaveFocus();
    });

    it("activates the focused item with Enter and Space without moving focus", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Toolbar label="T">
          <Button onClick={onClick}>Cut</Button>
          <Button>Copy</Button>
        </Toolbar>,
      );
      await user.tab();
      await user.keyboard("{Enter}");
      await user.keyboard(" ");
      expect(onClick).toHaveBeenCalledTimes(2);
      expect(tool("Cut")).toHaveFocus();
    });

    it("leaves Escape to the item and ignores modified keys", async () => {
      const user = userEvent.setup();
      render(<Basic />);
      await user.tab();
      await user.keyboard("{Escape}");
      expect(tool("Cut")).toHaveFocus();
      await user.keyboard("{Control>}{ArrowRight}{/Control}");
      expect(tool("Cut")).toHaveFocus();
    });

    it("runs a user onKeyDown first and respects preventDefault", async () => {
      const user = userEvent.setup();
      render(
        <Basic
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") e.preventDefault();
          }}
        />,
      );
      await user.tab();
      await user.keyboard("{ArrowRight}");
      expect(tool("Cut")).toHaveFocus();
    });
  });

  describe("vertical", () => {
    it("moves with Down and Up and leaves Left and Right alone", async () => {
      const user = userEvent.setup();
      render(<Basic orientation="vertical" />);
      await user.tab();
      await user.keyboard("{ArrowDown}");
      expect(tool("Copy")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(tool("Copy")).toHaveFocus();
      await user.keyboard("{ArrowUp}");
      expect(tool("Cut")).toHaveFocus();
      await user.keyboard("{ArrowUp}");
      expect(tool("Paste")).toHaveFocus();
      await user.keyboard("{Home}");
      expect(tool("Cut")).toHaveFocus();
      await user.keyboard("{End}");
      expect(tool("Paste")).toHaveFocus();
    });

    it("leaves Up and Down to the item in a horizontal bar", async () => {
      const user = userEvent.setup();
      render(<Basic />);
      await user.tab();
      await user.keyboard("{ArrowDown}");
      expect(tool("Cut")).toHaveFocus();
    });
  });

  describe("parts", () => {
    it("draws a vertical separator in a horizontal bar and a horizontal one in a vertical bar", () => {
      const { rerender } = render(
        <Toolbar label="T">
          <Button>A</Button>
          <Toolbar.Separator data-testid="s" />
          <Button>B</Button>
        </Toolbar>,
      );
      const sep = screen.getByTestId("s");
      expect(sep).toHaveClass("ol-toolbar__sep", "ol-divider--v");
      expect(sep).toHaveAttribute("aria-orientation", "vertical");
      rerender(
        <Toolbar label="T" orientation="vertical">
          <Button>A</Button>
          <Toolbar.Separator data-testid="s" />
          <Button>B</Button>
        </Toolbar>,
      );
      expect(screen.getByTestId("s")).not.toHaveClass("ol-divider--v");
      expect(screen.getByTestId("s")).not.toHaveAttribute("aria-orientation");
    });

    it("hides the spacer from assistive tech and keeps it out of the tab order", () => {
      render(
        <Toolbar label="T">
          <Button>A</Button>
          <Toolbar.Spacer data-testid="sp" />
          <Button>B</Button>
        </Toolbar>,
      );
      expect(screen.getByTestId("sp")).toHaveAttribute("aria-hidden", "true");
      expect(screen.getByTestId("sp")).toHaveClass("ol-toolbar__spacer");
    });

    it("renders an Action as a ghost button that calls onAction", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(
        <Toolbar label="T">
          <Toolbar.Action label="Archive" onAction={onAction} icon="+" />
          <Toolbar.Action label="Share" />
        </Toolbar>,
      );
      const action = tool("+Archive".replace("+", "")) as HTMLButtonElement;
      expect(action).toHaveClass("ol-btn", "ol-btn--ghost", "ol-toolbar__action");
      await user.click(action);
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it("names an icon-only Action by its label", () => {
      render(
        <Toolbar label="T">
          <Toolbar.Action label="Add row" icon="+" iconOnly />
        </Toolbar>,
      );
      const button = screen.getByRole("button", { name: "Add row" });
      expect(button).toHaveClass("ol-btn--square");
      expect(button).toHaveTextContent("+");
    });

    it("passes variant, size and danger to the button", () => {
      render(
        <Toolbar label="T">
          <Toolbar.Action label="Keep" variant="solid" size="s" />
          <Toolbar.Action label="Delete" danger />
        </Toolbar>,
      );
      expect(tool("Keep")).toHaveClass("ol-btn--solid", "ol-btn--s");
      expect(tool("Delete")).toHaveClass("ol-btn--danger");
    });

    it("skips a disabled Action and forwards its ref", async () => {
      const user = userEvent.setup();
      const ref = createRef<HTMLButtonElement>();
      render(
        <Toolbar label="T">
          <Toolbar.Action label="One" ref={ref} />
          <Toolbar.Action label="Two" disabled />
          <Toolbar.Action label="Three" />
        </Toolbar>,
      );
      expect(ref.current).toBe(tool("One"));
      await user.tab();
      await user.keyboard("{ArrowRight}");
      expect(tool("Three")).toHaveFocus();
    });

    it("warns when iconOnly has no icon and shows the label", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <Toolbar label="T">
          <Toolbar.Action label="Bare" iconOnly />
        </Toolbar>,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("`iconOnly` needs an `icon`"));
      expect(tool("Bare")).toHaveTextContent("Bare");
    });
  });

  describe("composition", () => {
    it("treats a ButtonGroup's buttons as toolbar items", async () => {
      const user = userEvent.setup();
      render(
        <Toolbar label="T">
          <Button>Solo</Button>
          <ButtonGroup label="Align">
            <Button aria-pressed="true">Left</Button>
            <Button aria-pressed="false">Right</Button>
          </ButtonGroup>
        </Toolbar>,
      );
      await user.tab();
      await user.keyboard("{ArrowRight}");
      expect(tool("Left")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(tool("Right")).toHaveFocus();
      await user.tab();
      expect(tool("Right")).not.toHaveFocus();
    });

    it("moves through toggles and shows the pressed state", async () => {
      const user = userEvent.setup();
      render(
        <Toolbar label="T">
          <ToggleButton variant="ghost">Bold</ToggleButton>
          <ToggleButton variant="ghost" defaultPressed>
            Italic
          </ToggleButton>
        </Toolbar>,
      );
      await user.tab();
      await user.keyboard("{ArrowRight}");
      expect(tool("Italic")).toHaveFocus();
      expect(tool("Italic")).toHaveAttribute("aria-pressed", "true");
      await user.keyboard(" ");
      expect(tool("Italic")).toHaveAttribute("aria-pressed", "false");
    });

    it("counts a SplitButton as two stops", async () => {
      const user = userEvent.setup();
      render(
        <Toolbar label="T">
          <SplitButton label="Save" items={[{ label: "Save as" }]} />
          <Button>Next</Button>
        </Toolbar>,
      );
      await user.tab();
      expect(tool("Save")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(document.activeElement).toHaveAttribute("aria-haspopup", "menu");
      await user.keyboard("{ArrowRight}");
      expect(tool("Next")).toHaveFocus();
    });

    describe("SegmentedControl", () => {
      const seg = (props: { onChange?: (v: string) => void } = {}) => (
        <Toolbar label="T">
          <Button>Before</Button>
          <SegmentedControl
            label="Align"
            options={[
              { value: "l", label: "Left" },
              { value: "c", label: "Centre" },
              { value: "r", label: "Right" },
            ]}
            defaultValue="l"
            {...props}
          />
          <Button>After</Button>
        </Toolbar>
      );

      it("is walked by the toolbar and arrows only move focus", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(seg({ onChange }));
        await user.tab();
        await user.keyboard("{ArrowRight}");
        expect(screen.getByRole("radio", { name: "Left" })).toHaveFocus();
        await user.keyboard("{ArrowRight}");
        expect(screen.getByRole("radio", { name: "Centre" })).toHaveFocus();
        expect(screen.getByRole("radio", { name: "Left" })).toBeChecked();
        expect(onChange).not.toHaveBeenCalled();
        await user.keyboard("{ArrowRight}{ArrowRight}");
        expect(tool("After")).toHaveFocus();
      });

      it("selects with Space, Enter or a click", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(seg({ onChange }));
        await user.tab();
        await user.keyboard("{ArrowRight}{ArrowRight}");
        await user.keyboard(" ");
        expect(onChange).toHaveBeenLastCalledWith("c");
        expect(screen.getByRole("radio", { name: "Centre" })).toBeChecked();
        await user.keyboard("{ArrowRight}{Enter}");
        expect(onChange).toHaveBeenLastCalledWith("r");
        await user.click(screen.getByRole("radio", { name: "Left" }));
        expect(onChange).toHaveBeenLastCalledWith("l");
      });

      it("is a single tab stop together with the rest of the bar", async () => {
        const user = userEvent.setup();
        render(
          <>
            {seg()}
            <button type="button">Out</button>
          </>,
        );
        await user.tab();
        expect(tool("Before")).toHaveFocus();
        await user.tab();
        expect(tool("Out")).toHaveFocus();
      });
    });
  });

  describe("menus", () => {
    const items = [{ label: "Rename" }, { label: "Duplicate" }];

    it("opens a menu with Down in a horizontal bar and keeps menu keys out of the bar", async () => {
      const user = userEvent.setup();
      render(
        <Toolbar label="T">
          <Button>Before</Button>
          <Dropdown label="More" items={items} variant="ghost" />
          <Button>After</Button>
        </Toolbar>,
      );
      await user.tab();
      await user.keyboard("{ArrowRight}");
      const trigger = tool("More");
      expect(trigger).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      const menu = await screen.findByRole("menu");
      expect(menu).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      expect(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveFocus();
      // Left and Right belong to the menu, not to the bar.
      await user.keyboard("{ArrowRight}");
      expect(menu.contains(document.activeElement)).toBe(true);
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("menu")).toBeNull();
      expect(trigger).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(tool("After")).toHaveFocus();
    });
  });

  describe("menus in a vertical bar", () => {
    const items = [{ label: "Rename" }, { label: "Duplicate" }];
    const bar = (kind: "dropdown" | "split", dir?: "rtl") => {
      const trigger =
        kind === "dropdown" ? (
          <Dropdown label="More" items={items} variant="ghost" />
        ) : (
          <SplitButton label="Save" items={items} variant="ghost" menuLabel="Save options" />
        );
      const content = (
        <Toolbar label="T" orientation="vertical" variant="floating">
          <Button>Before</Button>
          {trigger}
          <Button>After</Button>
        </Toolbar>
      );
      return dir ? (
        <div dir={dir} style={{ direction: dir }}>
          {content}
        </div>
      ) : (
        content
      );
    };
    const menuTrigger = (): HTMLElement => {
      const el = document.querySelector<HTMLElement>('[aria-haspopup="menu"]');
      if (!el) throw new Error("missing menu trigger");
      return el;
    };

    it.each(["dropdown", "split"] as const)(
      "moves focus with Down and Up and does not open the %s menu",
      async (kind) => {
        const user = userEvent.setup();
        render(bar(kind));
        await user.tab();
        await user.keyboard("{ArrowDown}");
        if (kind === "split") {
          expect(tool("Save")).toHaveFocus();
          await user.keyboard("{ArrowDown}");
        }
        expect(menuTrigger()).toHaveFocus();
        await user.keyboard("{ArrowDown}");
        expect(screen.queryByRole("menu")).toBeNull();
        expect(tool("After")).toHaveFocus();
        await user.keyboard("{ArrowUp}");
        expect(menuTrigger()).toHaveFocus();
        await user.keyboard("{ArrowUp}");
        expect(screen.queryByRole("menu")).toBeNull();
        expect(kind === "split" ? tool("Save") : tool("Before")).toHaveFocus();
      },
    );

    it.each(["dropdown", "split"] as const)(
      "still opens the %s menu with Enter, Space and a click",
      async (kind) => {
        const user = userEvent.setup();
        render(bar(kind));
        const open = async (act: () => Promise<void>) => {
          menuTrigger().focus();
          await act();
          expect(await screen.findByRole("menu")).toBeInTheDocument();
          await user.keyboard("{Escape}");
          expect(screen.queryByRole("menu")).toBeNull();
          expect(menuTrigger()).toHaveFocus();
        };
        await open(() => user.keyboard("{Enter}"));
        await open(() => user.keyboard(" "));
        await open(() => user.click(menuTrigger()));
      },
    );

    it.each([
      [undefined, "right"],
      ["rtl", "left"],
    ] as const)("opens the menu to the side (dir %s: %s)", async (dir, side) => {
      const user = userEvent.setup();
      render(bar("dropdown", dir));
      await user.click(tool("More"));
      expect(await screen.findByRole("menu")).toHaveAttribute("data-side", side);
    });

    it("opens the SplitButton menu to the side too", async () => {
      const user = userEvent.setup();
      render(bar("split"));
      await user.click(screen.getByRole("button", { name: "Save options" }));
      expect(await screen.findByRole("menu")).toHaveAttribute("data-side", "right");
    });
  });

  describe("menus in a horizontal bar", () => {
    const items = [{ label: "Rename" }, { label: "Duplicate" }, { label: "Delete" }];
    const bar = (onSelect = vi.fn()) => (
      <>
        <Toolbar label="T">
          <Button>Before</Button>
          <Dropdown
            label="More"
            variant="ghost"
            items={items.map((item) => ({ ...item, onSelect }))}
          />
          <Button>After</Button>
        </Toolbar>
        <button type="button">Out</button>
      </>
    );
    const stops = () =>
      Array.from(document.querySelectorAll(".ol-toolbar button")).filter(
        (el) => el.getAttribute("tabindex") === "0",
      );

    it("opens with Up on the last item", async () => {
      const user = userEvent.setup();
      render(bar());
      await user.tab();
      await user.keyboard("{ArrowRight}");
      await user.keyboard("{ArrowUp}");
      expect(await screen.findByRole("menu")).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
    });

    it("returns focus to the trigger after a choice and keeps one tab stop", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(bar(onSelect));
      await user.tab();
      await user.keyboard("{ArrowRight}{ArrowDown}");
      await screen.findByRole("menu");
      await user.keyboard("{Enter}");
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("menu")).toBeNull();
      expect(tool("More")).toHaveFocus();
      expect(stops()).toEqual([tool("More")]);
      await user.tab();
      expect(tool("Out")).toHaveFocus();
    });
  });

  describe("text field", () => {
    const withInput = (props: Partial<ToolbarProps> = {}) => (
      <Toolbar label="T" {...props}>
        <Button>Bold</Button>
        <Button>Italic</Button>
        <Input aria-label="Find" defaultValue="abc" />
      </Toolbar>
    );
    const field = () => screen.getByRole<HTMLInputElement>("textbox", { name: "Find" });

    it("moves the caret inside the text and keeps focus", async () => {
      const user = userEvent.setup();
      render(withInput());
      await user.click(field());
      field().setSelectionRange(1, 1);
      await user.keyboard("{ArrowLeft}");
      expect(field()).toHaveFocus();
      expect(field().selectionStart).toBe(0);
      await user.keyboard("{ArrowRight}{ArrowRight}");
      expect(field()).toHaveFocus();
      expect(field().selectionStart).toBe(2);
    });

    it("hands focus to the previous item from the start of the text", async () => {
      const user = userEvent.setup();
      render(withInput());
      await user.click(field());
      field().setSelectionRange(0, 0);
      await user.keyboard("{ArrowLeft}");
      expect(tool("Italic")).toHaveFocus();
    });

    it("wraps from the end of the text to the first item", async () => {
      const user = userEvent.setup();
      render(withInput());
      await user.click(field());
      field().setSelectionRange(3, 3);
      await user.keyboard("{ArrowRight}");
      expect(tool("Bold")).toHaveFocus();
    });

    it("does not leave while text is selected, with Shift, or with the other axis", async () => {
      const user = userEvent.setup();
      render(withInput());
      await user.click(field());
      field().setSelectionRange(0, 3);
      await user.keyboard("{ArrowLeft}");
      expect(field()).toHaveFocus();
      field().setSelectionRange(0, 0);
      await user.keyboard("{Shift>}{ArrowLeft}{/Shift}");
      expect(field()).toHaveFocus();
      await user.keyboard("{ArrowUp}{ArrowDown}");
      expect(field()).toHaveFocus();
    });

    it("never takes Home and End from the field", async () => {
      const user = userEvent.setup();
      render(withInput());
      await user.click(field());
      field().setSelectionRange(1, 1);
      await user.keyboard("{Home}");
      expect(field()).toHaveFocus();
      expect(field().selectionStart).toBe(0);
      await user.keyboard("{End}");
      expect(field()).toHaveFocus();
      expect(field().selectionStart).toBe(3);
    });

    it("types characters without moving focus", async () => {
      const user = userEvent.setup();
      render(withInput());
      await user.click(field());
      await user.keyboard("de");
      expect(field()).toHaveValue("abcde");
      expect(field()).toHaveFocus();
    });

    it("swaps the edges in right-to-left text", async () => {
      const user = userEvent.setup();
      render(
        <div dir="rtl" style={{ direction: "rtl" }}>
          {withInput()}
        </div>,
      );
      await user.click(field());
      field().setSelectionRange(0, 0);
      // At the start of the text Right is "backwards" in RTL.
      await user.keyboard("{ArrowRight}");
      expect(tool("Italic")).toHaveFocus();
    });

    it("uses Up and Down at the edges in a vertical bar", async () => {
      const user = userEvent.setup();
      render(withInput({ orientation: "vertical" }));
      await user.click(field());
      field().setSelectionRange(0, 0);
      await user.keyboard("{ArrowUp}");
      expect(tool("Italic")).toHaveFocus();
    });

    it("lets a field without a caret API leave only when it is empty", async () => {
      const user = userEvent.setup();
      render(
        <Toolbar label="T">
          <Button>Bold</Button>
          <Input aria-label="Count" type="number" defaultValue="" />
        </Toolbar>,
      );
      await user.click(screen.getByRole("spinbutton", { name: "Count" }));
      await user.keyboard("{ArrowLeft}");
      expect(tool("Bold")).toHaveFocus();
    });
  });

  describe("accessibility", () => {
    const formatting = (
      <Toolbar label="Text formatting">
        <ToggleButton variant="ghost" aria-label="Bold" icon="B" />
        <ToggleButton variant="ghost" aria-label="Italic" icon="I" />
        <Toolbar.Separator />
        <SegmentedControl
          label="Alignment"
          options={[
            { value: "l", label: "Left" },
            { value: "r", label: "Right" },
          ]}
          defaultValue="l"
        />
        <Toolbar.Separator />
        <Dropdown label="Style" items={[{ label: "Heading" }]} variant="ghost" />
        <Toolbar.Spacer />
        <Toolbar.Action label="Clear" />
        <Input aria-label="Find" />
      </Toolbar>
    );

    it.each(["washi", "sumi"] as const)("has no axe violations (%s)", async (theme) => {
      render(
        <Root theme={theme}>
          <main>{formatting}</main>
        </Root>,
      );
      expect(await runAxe(document.body)).toHaveNoViolations();
    });

    it.each(["washi", "sumi"] as const)(
      "has no axe violations when floating and vertical (%s)",
      async (theme) => {
        render(
          <Root theme={theme}>
            <main>
              <Toolbar label="Selection" variant="floating" orientation="vertical">
                <Toolbar.Action label="Copy" />
                <Toolbar.Separator />
                <Toolbar.Action label="Move" />
                <Toolbar.Action label="Delete" danger />
              </Toolbar>
            </main>
          </Root>,
        );
        expect(await runAxe(document.body)).toHaveNoViolations();
      },
    );

    it.each(["washi", "sumi"] as const)(
      "has no axe violations with a pressed toggle, a disabled item and overflow bars (%s)",
      async (theme) => {
        render(
          <Root theme={theme}>
            <main>
              {(["scroll", "wrap"] as const).map((overflow) => (
                <Toolbar key={overflow} label={`Tools (${overflow})`} overflow={overflow}>
                  <ToggleButton variant="ghost" defaultPressed>
                    Bold
                  </ToggleButton>
                  <ToggleButton variant="ghost">Italic</ToggleButton>
                  <Toolbar.Action label="Clear" disabled />
                  <Toolbar.Separator />
                  <Toolbar.Action label="Copy" />
                </Toolbar>
              ))}
            </main>
          </Root>,
        );
        expect(await runAxe(document.body)).toHaveNoViolations();
      },
    );

    it("has no axe violations while a menu is open", async () => {
      const user = userEvent.setup();
      render(
        <main>
          <Toolbar label="T">
            <Button variant="ghost">A</Button>
            <Dropdown label="Menu" items={[{ label: "One" }]} variant="ghost" />
          </Toolbar>
        </main>,
      );
      await user.click(tool("Menu"));
      await screen.findByRole("menu");
      // The menu is portalled to the body, outside the page's landmarks by design.
      expect(
        await runAxe(document.body, { rules: { region: { enabled: false } } }),
      ).toHaveNoViolations();
    });
  });

  describe("styles", () => {
    const css = readFileSync("src/components/Toolbar/Toolbar.css", "utf8");

    it("uses the block shadow only on the floating bar", () => {
      const rules = css.split("}").filter((rule) => rule.includes("--shadow-block"));
      expect(rules).toHaveLength(1);
      expect(rules[0]).toContain(".ol-toolbar--floating");
    });

    it("drops the shadow and keeps the frame in forced colours", () => {
      const forced = css.slice(css.indexOf("@media (forced-colors: active)"));
      expect(forced).toContain("box-shadow: none");
      expect(forced).toContain("border-color: CanvasText");
    });

    it("has no literal colours, lengths or motion", () => {
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
      // Only the unit-less fallback of env() may be written out.
      expect(css.replaceAll("env(", "").replaceAll(", 0px)", ")")).not.toMatch(/\d+px/);
      expect(css).not.toMatch(/transition|animation/);
    });

    it("positions with logical properties only", () => {
      expect(css).not.toMatch(
        /\b(left|right|margin-left|margin-right|padding-left|padding-right):/,
      );
    });
  });

  it("does not change focus when only a prop changes", () => {
    const { rerender } = render(<Page />);
    act(() => {
      tool("Copy").focus();
    });
    fireEvent.focus(tool("Copy"));
    rerender(<Page orientation="vertical" />);
    expect(tool("Copy")).toHaveFocus();
    expect(tool("Copy")).toHaveAttribute("tabindex", "0");
  });
});

describe("Toolbar.Action inside a Tooltip", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not run the action on the click that ends a touch long press", () => {
    vi.useFakeTimers();
    const onAction = vi.fn();
    render(
      <Root>
        <Toolbar aria-label="Edit">
          <Tooltip content="Delete">
            <Toolbar.Action
              label="Delete"
              icon={<span aria-hidden="true">×</span>}
              iconOnly
              onAction={onAction}
            />
          </Tooltip>
        </Toolbar>
      </Root>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    fireEvent.pointerDown(button, { pointerType: "touch", button: 0 });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerUp(button, { pointerType: "touch", button: 0 });
    fireEvent.click(button);
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
