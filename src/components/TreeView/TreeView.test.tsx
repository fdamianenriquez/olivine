import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import {
  type TreeActions,
  type TreeNode,
  TreeView,
  type TreeViewCheckboxProps,
  type TreeViewMultipleProps,
  type TreeViewNoneProps,
  type TreeViewSingleProps,
} from ".";

afterEach(() => {
  vi.restoreAllMocks();
});

const FILES: TreeNode[] = [
  {
    id: "docs",
    label: "Documents",
    children: [
      { id: "report", label: "Report", meta: "2 MB" },
      { id: "notes", label: "Notes", description: "Plain text", disabled: true },
    ],
  },
  {
    id: "src",
    label: "Source",
    children: [
      {
        id: "components",
        label: "Components",
        children: [
          { id: "button", label: "Button" },
          { id: "tree", label: "Tree" },
        ],
      },
      { id: "index", label: "Index" },
    ],
  },
  { id: "readme", label: "Readme" },
];

const FLAT: TreeNode[] = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Beta" },
  { id: "c", label: "Gamma" },
  { id: "d", label: "Delta" },
];

type NoneProps = Omit<TreeViewNoneProps, "items" | "label">;
type SingleProps = Omit<TreeViewSingleProps, "items" | "label" | "selectionMode">;
type MultipleProps = Omit<TreeViewMultipleProps, "items" | "label" | "selectionMode">;
type CheckProps = Omit<TreeViewCheckboxProps, "items" | "label" | "checkboxes">;

function Files({ items = FILES, ...props }: NoneProps & { items?: TreeNode[] }) {
  return <TreeView label="Files" items={items} {...props} />;
}

function Single({ items = FILES, ...props }: SingleProps & { items?: TreeNode[] }) {
  return <TreeView label="Files" items={items} selectionMode="single" {...props} />;
}

function Multiple({ items = FILES, ...props }: MultipleProps & { items?: TreeNode[] }) {
  return <TreeView label="Files" items={items} selectionMode="multiple" {...props} />;
}

function Checks({ items = FILES, ...props }: CheckProps & { items?: TreeNode[] }) {
  return <TreeView label="Files" items={items} checkboxes {...props} />;
}

const item = (name: string) => screen.getByRole("treeitem", { name });
const queryItem = (name: string) => screen.queryByRole("treeitem", { name });
const isOpen = (name: string) => item(name).getAttribute("aria-expanded") === "true";
const isSelected = (name: string) => item(name).getAttribute("aria-selected") === "true";
const checked = (name: string) => item(name).getAttribute("aria-checked");
/** An element that must exist: fails the test with a clear message instead of a null access. */
function must<T extends Element>(el: T | null | undefined, what: string): T {
  if (!el) throw new Error(`missing ${what}`);
  return el;
}
const parentOf = (el: Element) => must(el.parentElement, "parent element");
const sign = (name: string) =>
  must(item(name).querySelector<HTMLElement>(".ol-tree__sign"), "sign");
const check = (name: string) =>
  must(item(name).querySelector<HTMLElement>(".ol-tree__check"), "check mark");
const focus = (name: string) => {
  act(() => {
    item(name).focus();
  });
};
const status = () => screen.getByRole("status");
/** The visible worded cue of a failed load (the live region repeats it for assistive technology). */
const failedRow = () =>
  waitFor(() => {
    const row = document.querySelector<HTMLElement>(".ol-tree__failed");
    if (!row) throw new Error("no failed row");
    return row;
  });

describe("TreeView", () => {
  describe("anatomy and ARIA", () => {
    it("is a named tree of treeitems; only the open branches are in the DOM", () => {
      render(<Files defaultExpanded={["docs"]} />);
      expect(screen.getByRole("tree", { name: "Files" })).toBeInTheDocument();
      expect(screen.getAllByRole("treeitem").map((el) => el.textContent)).toEqual([
        expect.stringContaining("Documents"),
        expect.stringContaining("Report"),
        expect.stringContaining("Notes"),
        expect.stringContaining("Source"),
        expect.stringContaining("Readme"),
      ]);
      expect(queryItem("Components")).not.toBeInTheDocument();
    });

    it("wraps each node in an li with role none and keeps the group beside the row", () => {
      render(<Files defaultExpanded={["docs"]} />);
      const row = item("Documents");
      const wrapper = parentOf(row);
      expect(wrapper.tagName).toBe("LI");
      expect(wrapper).toHaveAttribute("role", "none");
      const group = wrapper.querySelector(":scope > ul");
      expect(group).toHaveAttribute("role", "group");
      expect(row).not.toContainElement(group as HTMLElement);
      expect(row).toHaveAttribute("aria-owns", (group as HTMLElement).id);
    });

    it("writes aria-level, aria-setsize and aria-posinset on every node", () => {
      render(<Files defaultExpanded={["src", "components"]} />);
      expect(item("Button")).toHaveAttribute("aria-level", "3");
      expect(item("Button")).toHaveAttribute("aria-setsize", "2");
      expect(item("Button")).toHaveAttribute("aria-posinset", "1");
      expect(item("Tree")).toHaveAttribute("aria-posinset", "2");
      expect(item("Index")).toHaveAttribute("aria-level", "2");
      expect(item("Index")).toHaveAttribute("aria-posinset", "2");
      expect(item("Readme")).toHaveAttribute("aria-setsize", "3");
      expect(item("Readme")).toHaveAttribute("aria-posinset", "3");
    });

    it("marks parents with aria-expanded and leaves leaves without it", () => {
      render(<Files defaultExpanded={["docs"]} />);
      expect(isOpen("Documents")).toBe(true);
      expect(item("Source")).toHaveAttribute("aria-expanded", "false");
      expect(item("Report")).not.toHaveAttribute("aria-expanded");
    });

    it("writes aria-owns only while the group is mounted", async () => {
      const user = userEvent.setup();
      render(<Files />);
      expect(item("Documents")).not.toHaveAttribute("aria-owns");
      await user.click(item("Documents"));
      expect(item("Documents")).toHaveAttribute("aria-owns");
      await user.click(item("Documents"));
      expect(item("Documents")).not.toHaveAttribute("aria-owns");
    });

    it("names a node from its label and describes it with the description and meta", () => {
      render(<Files defaultExpanded={["docs"]} />);
      expect(item("Report")).toHaveAccessibleDescription("2 MB");
      expect(screen.getByRole("treeitem", { name: "Notes" })).toHaveAccessibleDescription(
        "Plain text",
      );
    });

    it("has no selection state in none mode", () => {
      render(<Files defaultExpanded={["docs"]} />);
      for (const row of screen.getAllByRole("treeitem")) {
        expect(row).not.toHaveAttribute("aria-selected");
        expect(row).not.toHaveAttribute("aria-checked");
      }
      expect(screen.getByRole("tree")).not.toHaveAttribute("aria-multiselectable");
    });

    it("single: aria-selected on every selectable node, none on a node that cannot be selected", () => {
      const items: TreeNode[] = [
        { id: "g", label: "Group", selectable: false, children: [{ id: "x", label: "X" }] },
        { id: "y", label: "Y" },
      ];
      render(<Single items={items} defaultExpanded={["g"]} defaultValue="y" />);
      expect(isSelected("Y")).toBe(true);
      expect(isSelected("X")).toBe(false);
      expect(item("Group")).not.toHaveAttribute("aria-selected");
      expect(screen.getByRole("tree")).not.toHaveAttribute("aria-multiselectable");
    });

    it("multiple: aria-multiselectable and aria-selected", () => {
      render(<Multiple defaultValue={["readme"]} />);
      expect(screen.getByRole("tree")).toHaveAttribute("aria-multiselectable", "true");
      expect(isSelected("Readme")).toBe(true);
    });

    it("checkboxes: aria-checked instead of aria-selected, multiselectable, no ink rows", () => {
      render(<Checks defaultValue={["readme"]} />);
      expect(screen.getByRole("tree")).toHaveAttribute("aria-multiselectable", "true");
      expect(checked("Readme")).toBe("true");
      expect(checked("Source")).toBe("false");
      expect(item("Readme")).not.toHaveAttribute("aria-selected");
    });

    it("marks disabled nodes, the current node and a busy node", () => {
      render(<Files defaultExpanded={["docs"]} current="report" />);
      expect(item("Notes")).toHaveAttribute("aria-disabled", "true");
      expect(item("Notes")).toHaveAttribute("data-disabled");
      expect(item("Report")).toHaveAttribute("aria-current", "page");
      expect(item("Source")).not.toHaveAttribute("aria-current");
    });

    it("keeps current and selection apart", () => {
      render(<Single defaultValue="readme" current="report" defaultExpanded={["docs"]} />);
      expect(isSelected("Readme")).toBe(true);
      expect(item("Readme")).not.toHaveAttribute("aria-current");
      expect(isSelected("Report")).toBe(false);
      expect(item("Report")).toHaveAttribute("aria-current", "page");
    });

    it("an empty tree is a plain group with the locale's text", () => {
      render(<Files items={[]} />);
      const root = screen.getByRole("group", { name: "Files" });
      expect(root).toHaveTextContent("No items");
      expect(screen.queryByRole("tree")).not.toBeInTheDocument();
    });

    it("shows a custom empty text, and the locale's in Spanish and Japanese", () => {
      const { rerender } = render(<Files items={[]} empty="Nothing here" />);
      expect(screen.getByRole("group")).toHaveTextContent("Nothing here");
      rerender(
        <Root locale="es">
          <Files items={[]} />
        </Root>,
      );
      expect(screen.getByRole("group")).toHaveTextContent("Sin elementos");
      rerender(
        <Root locale="ja">
          <Files items={[]} />
        </Root>,
      );
      expect(screen.getByRole("group")).toHaveTextContent("項目がありません");
    });

    it("the loading prop marks the tree busy and adds a loading row", () => {
      render(<Files loading />);
      expect(screen.getByRole("tree")).toHaveAttribute("aria-busy", "true");
      expect(screen.getByRole("tree")).toHaveTextContent("Loading");
    });

    it("an empty tree that is loading shows only the loading row", () => {
      render(<Files items={[]} loading />);
      const root = screen.getByRole("group");
      expect(root).toHaveTextContent("Loading");
      expect(root).not.toHaveTextContent("No items");
    });

    it("warns in development when the tree has no name", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(<TreeView items={FILES} />);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("needs a name"));
    });

    it("accepts aria-labelledby as the name, and forwards ref, class, style and props", () => {
      const ref = createRef<HTMLUListElement>();
      render(
        <>
          <span id="n">Project</span>
          <TreeView
            ref={ref}
            items={FILES}
            aria-labelledby="n"
            className="extra"
            style={{ width: 200 }}
            data-testid="t"
          />
        </>,
      );
      const root = screen.getByRole("tree", { name: "Project" });
      expect(ref.current).toBe(root);
      expect(root).toHaveClass("ol-tree", "extra");
      expect(root).toHaveStyle({ width: "200px" });
      expect(root).toHaveAttribute("data-testid", "t");
    });

    it("applies size, boxed and rows", () => {
      render(<Files size="m" boxed rows={5} />);
      const root = screen.getByRole("tree");
      expect(root).toHaveClass("ol-tree--m", "ol-tree--boxed", "ol-tree--rows");
      expect(root.style.getPropertyValue("--ol-tree-rows")).toBe("5");
    });

    it("writes one hidden input per selected id with name", () => {
      const { container } = render(<Multiple name="picked" defaultValue={["readme", "src"]} />);
      const inputs = container.querySelectorAll<HTMLInputElement>('input[type="hidden"]');
      expect(Array.from(inputs).map((i) => [i.name, i.value])).toEqual([
        ["picked", "readme"],
        ["picked", "src"],
      ]);
    });

    it("does not write hidden inputs when disabled", () => {
      const { container } = render(<Multiple name="picked" disabled defaultValue={["readme"]} />);
      expect(container.querySelector('input[type="hidden"]')).toBeNull();
    });
  });

  describe("focus", () => {
    const tabStops = () =>
      screen.getAllByRole("treeitem").filter((el) => el.getAttribute("tabindex") === "0");

    it("is one tab stop: the first node", async () => {
      const user = userEvent.setup();
      render(
        <>
          <button>before</button>
          <Files defaultExpanded={["docs"]} />
          <button>after</button>
        </>,
      );
      expect(tabStops()).toEqual([item("Documents")]);
      await user.tab();
      await user.tab();
      expect(item("Documents")).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
    });

    it("single: Tab enters on the selected node", async () => {
      const user = userEvent.setup();
      render(<Single defaultValue="readme" />);
      await user.tab();
      expect(item("Readme")).toHaveFocus();
    });

    it("multiple: Tab enters on the first selected node in tree order", async () => {
      const user = userEvent.setup();
      render(<Multiple defaultValue={["readme", "src"]} />);
      await user.tab();
      expect(item("Source")).toHaveFocus();
    });

    it("none: Tab enters on the current node", async () => {
      const user = userEvent.setup();
      render(<Files current="report" defaultExpanded={["docs"]} />);
      await user.tab();
      expect(item("Report")).toHaveFocus();
    });

    it("checkboxes: the tab stop is the last focused node", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Checks />
          <button>after</button>
        </>,
      );
      await user.tab();
      await user.keyboard("{ArrowDown}");
      expect(item("Source")).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
      await user.tab({ shift: true });
      expect(item("Source")).toHaveFocus();
    });

    it("selection and focus are separate: moving does not select", async () => {
      const user = userEvent.setup();
      render(<Single defaultValue="readme" />);
      await user.tab();
      await user.keyboard("{ArrowUp}");
      expect(item("Source")).toHaveFocus();
      expect(isSelected("Readme")).toBe(true);
      expect(isSelected("Source")).toBe(false);
    });

    it("a tree that becomes disabled drops its tab stop", () => {
      const { rerender } = render(<Single defaultValue="readme" />);
      expect(tabStops()).toHaveLength(1);
      rerender(<Single disabled defaultValue="readme" />);
      expect(tabStops()).toEqual([]);
      for (const el of screen.getAllByRole("treeitem")) expect(el).not.toHaveAttribute("tabindex");
      rerender(<Single defaultValue="readme" />);
      expect(tabStops()).toHaveLength(1);
    });

    it("a disabled tree is no tab stop and ignores keys and clicks", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single disabled defaultValue="readme" onChange={onChange} />);
      expect(screen.getByRole("tree")).toHaveAttribute("aria-disabled", "true");
      expect(tabStops()).toEqual([]);
      await user.click(item("Source"));
      await user.keyboard("{ArrowDown} ");
      expect(onChange).not.toHaveBeenCalled();
      expect(isOpen("Source")).toBe(false);
    });
  });

  describe("keyboard: moving", () => {
    it("Down and Up move through the visible nodes, skipping disabled ones and closed branches", async () => {
      const user = userEvent.setup();
      render(<Files defaultExpanded={["docs"]} />);
      focus("Documents");
      await user.keyboard("{ArrowDown}");
      expect(item("Report")).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      expect(item("Source")).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      expect(item("Readme")).toHaveFocus();
      await user.keyboard("{ArrowUp}");
      expect(item("Source")).toHaveFocus();
    });

    it("never opens or closes a branch", async () => {
      const user = userEvent.setup();
      render(<Files />);
      focus("Documents");
      await user.keyboard("{ArrowDown}{ArrowUp}");
      expect(isOpen("Documents")).toBe(false);
    });

    it("consumes the key at the ends so the page does not scroll", () => {
      render(<Files />);
      focus("Documents");
      expect(fireEvent.keyDown(item("Documents"), { key: "ArrowUp" })).toBe(false);
      focus("Readme");
      expect(fireEvent.keyDown(item("Readme"), { key: "ArrowDown" })).toBe(false);
      expect(item("Readme")).toHaveFocus();
    });

    it("Home and End jump to the first and last visible enabled node", async () => {
      const user = userEvent.setup();
      render(<Files defaultExpanded={["docs", "src"]} />);
      focus("Source");
      await user.keyboard("{End}");
      expect(item("Readme")).toHaveFocus();
      await user.keyboard("{Home}");
      expect(item("Documents")).toHaveFocus();
    });
  });

  describe("keyboard: opening and closing", () => {
    it("Right opens a closed parent and keeps focus", async () => {
      const user = userEvent.setup();
      const onExpandedChange = vi.fn();
      render(<Files onExpandedChange={onExpandedChange} />);
      focus("Source");
      await user.keyboard("{ArrowRight}");
      expect(isOpen("Source")).toBe(true);
      expect(item("Source")).toHaveFocus();
      expect(onExpandedChange).toHaveBeenCalledWith(["src"]);
    });

    it("Right on an open parent moves to its first enabled child; on a leaf it does nothing", async () => {
      const user = userEvent.setup();
      render(<Files defaultExpanded={["docs", "src"]} />);
      focus("Documents");
      await user.keyboard("{ArrowRight}");
      expect(item("Report")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(item("Report")).toHaveFocus();
    });

    it("Left closes an open parent, then moves to the parent, and does nothing on a root", async () => {
      const user = userEvent.setup();
      render(<Files defaultExpanded={["src", "components"]} />);
      focus("Button");
      await user.keyboard("{ArrowLeft}");
      expect(item("Components")).toHaveFocus();
      expect(isOpen("Components")).toBe(true);
      await user.keyboard("{ArrowLeft}");
      expect(isOpen("Components")).toBe(false);
      expect(item("Components")).toHaveFocus();
      await user.keyboard("{ArrowLeft}");
      expect(item("Source")).toHaveFocus();
      await user.keyboard("{ArrowLeft}");
      expect(isOpen("Source")).toBe(false);
      await user.keyboard("{ArrowLeft}");
      expect(item("Source")).toHaveFocus();
    });

    it("Left on a child of a disabled parent does nothing", async () => {
      const user = userEvent.setup();
      const items: TreeNode[] = [
        {
          id: "locked",
          label: "Locked",
          disabled: true,
          children: [{ id: "in", label: "Inside" }],
        },
      ];
      render(<Files items={items} defaultExpanded={["locked"]} />);
      focus("Inside");
      await user.keyboard("{ArrowLeft}");
      expect(item("Inside")).toHaveFocus();
      expect(isOpen("Locked")).toBe(true);
    });

    it("swaps Left and Right in RTL", async () => {
      const user = userEvent.setup();
      render(
        <div dir="rtl" style={{ direction: "rtl" }}>
          <Files />
        </div>,
      );
      focus("Source");
      await user.keyboard("{ArrowLeft}");
      expect(isOpen("Source")).toBe(true);
      await user.keyboard("{ArrowLeft}");
      expect(item("Components")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(item("Source")).toHaveFocus();
      await user.keyboard("{ArrowRight}");
      expect(isOpen("Source")).toBe(false);
    });

    it("* opens every closed sibling of the focused node and keeps focus", async () => {
      const user = userEvent.setup();
      render(<Files />);
      focus("Documents");
      await user.keyboard("*");
      expect(isOpen("Documents")).toBe(true);
      expect(isOpen("Source")).toBe(true);
      expect(item("Documents")).toHaveFocus();
      expect(queryItem("Components")).toBeInTheDocument();
      expect(queryItem("Button")).not.toBeInTheDocument();
    });

    it("* is not typeahead", async () => {
      const user = userEvent.setup();
      const items: TreeNode[] = [{ id: "s", label: "*Star" }, ...FILES];
      render(<Files items={items} />);
      focus("Documents");
      await user.keyboard("*");
      expect(item("Documents")).toHaveFocus();
    });

    it("Escape is not handled", () => {
      const onKeyDown = vi.fn();
      render(<Files onKeyDown={onKeyDown} />);
      focus("Documents");
      expect(fireEvent.keyDown(item("Documents"), { key: "Escape" })).toBe(true);
      expect(onKeyDown).toHaveBeenCalled();
    });
  });

  describe("keyboard: typeahead", () => {
    it("moves focus to the next visible node that starts with the typed letters", async () => {
      const user = userEvent.setup();
      render(<Files />);
      focus("Documents");
      await user.keyboard("r");
      expect(item("Readme")).toHaveFocus();
      expect(item("Readme")).toHaveAttribute("tabindex", "0");
    });

    it("skips nodes inside closed branches", async () => {
      const user = userEvent.setup();
      render(<Files />);
      focus("Documents");
      await user.keyboard("b");
      expect(item("Documents")).toHaveFocus();
    });

    it("cycles through nodes that share a first letter", async () => {
      const user = userEvent.setup();
      render(
        <Files
          items={[
            { id: "1", label: "Pear" },
            { id: "2", label: "Peach" },
            { id: "3", label: "Plum" },
          ]}
        />,
      );
      focus("Pear");
      await user.keyboard("p");
      expect(item("Peach")).toHaveFocus();
      await user.keyboard("p");
      expect(item("Plum")).toHaveFocus();
    });

    it("never selects or opens", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single onChange={onChange} />);
      focus("Readme");
      await user.keyboard("s");
      expect(item("Source")).toHaveFocus();
      expect(isOpen("Source")).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("finds a kanji label by its textValue", async () => {
      const user = userEvent.setup();
      render(
        <Files
          items={[
            { id: "kyoto", label: "京都", textValue: "kyoto" },
            { id: "osaka", label: "大阪", textValue: "osaka" },
          ]}
        />,
      );
      focus("京都");
      await user.keyboard("o");
      expect(item("大阪")).toHaveFocus();
    });

    it("keeps a Space inside the typed text", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Single
          onChange={onChange}
          items={[
            { id: "1", label: "New file" },
            { id: "2", label: "New folder" },
          ]}
        />,
      );
      focus("New file");
      await user.keyboard("new fo");
      expect(item("New folder")).toHaveFocus();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("is off with typeahead={false}", async () => {
      const user = userEvent.setup();
      render(<Files typeahead={false} />);
      focus("Documents");
      await user.keyboard("r");
      expect(item("Documents")).toHaveFocus();
    });
  });

  describe("keyboard: Enter and Space", () => {
    it("Enter on a parent opens it and calls onAction", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(<Files onAction={onAction} />);
      focus("Documents");
      await user.keyboard("{Enter}");
      expect(isOpen("Documents")).toBe(true);
      expect(onAction).toHaveBeenCalledWith("docs", expect.anything());
      await user.keyboard("{Enter}");
      expect(isOpen("Documents")).toBe(false);
    });

    it("Enter on a leaf with no selection only calls onAction", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(<Files onAction={onAction} />);
      focus("Readme");
      await user.keyboard("{Enter}");
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledWith("readme", expect.anything());
    });

    it("Enter on a leaf selects it (single) or toggles it (multiple)", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<Single />);
      focus("Readme");
      await user.keyboard("{Enter}");
      expect(isSelected("Readme")).toBe(true);
      unmount();
      render(<Multiple />);
      focus("Readme");
      await user.keyboard("{Enter}");
      expect(isSelected("Readme")).toBe(true);
      await user.keyboard("{Enter}");
      expect(isSelected("Readme")).toBe(false);
    });

    it("Enter on a parent in a selecting tree opens it without selecting it", async () => {
      const user = userEvent.setup();
      render(<Single />);
      focus("Documents");
      await user.keyboard("{Enter}");
      expect(isOpen("Documents")).toBe(true);
      expect(isSelected("Documents")).toBe(false);
    });

    it("Space selects (single) and never opens", async () => {
      const user = userEvent.setup();
      render(<Single />);
      focus("Source");
      await user.keyboard(" ");
      expect(isSelected("Source")).toBe(true);
      expect(isOpen("Source")).toBe(false);
    });

    it("Space toggles in multiple and checkbox trees", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<Multiple />);
      focus("Readme");
      await user.keyboard(" ");
      expect(isSelected("Readme")).toBe(true);
      await user.keyboard(" ");
      expect(isSelected("Readme")).toBe(false);
      unmount();
      render(<Checks />);
      focus("Readme");
      await user.keyboard(" ");
      expect(checked("Readme")).toBe("true");
    });

    it("Space does nothing without selection, and does not scroll the page", () => {
      const onAction = vi.fn();
      render(<Files onAction={onAction} />);
      focus("Documents");
      expect(fireEvent.keyDown(item("Documents"), { key: " " })).toBe(false);
      expect(isOpen("Documents")).toBe(false);
      expect(onAction).not.toHaveBeenCalled();
    });

    it("does not select a node that cannot be selected", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Single
          onChange={onChange}
          items={[{ id: "g", label: "Group", selectable: false, children: [] }]}
        />,
      );
      focus("Group");
      await user.keyboard(" ");
      expect(onChange).not.toHaveBeenCalled();
      expect(item("Group")).not.toHaveAttribute("aria-selected");
    });
  });

  describe("keyboard: multiple selection", () => {
    it("Shift+Down and Shift+Up move and toggle the node moved to", async () => {
      const user = userEvent.setup();
      render(<Multiple items={FLAT} />);
      focus("Alpha");
      await user.keyboard("{Shift>}{ArrowDown}{ArrowDown}{/Shift}");
      expect(isSelected("Alpha")).toBe(false);
      expect(isSelected("Beta")).toBe(true);
      expect(isSelected("Gamma")).toBe(true);
      await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
      expect(item("Beta")).toHaveFocus();
      expect(isSelected("Beta")).toBe(false);
      expect(isSelected("Gamma")).toBe(true);
    });

    it("Shift+Space selects the visible range from the last selected node", async () => {
      const user = userEvent.setup();
      render(<Multiple items={FLAT} />);
      focus("Alpha");
      await user.keyboard(" ");
      await user.keyboard("{ArrowDown}{ArrowDown}");
      await user.keyboard("{Shift>} {/Shift}");
      expect(["Alpha", "Beta", "Gamma", "Delta"].map(isSelected)).toEqual([
        true,
        true,
        true,
        false,
      ]);
    });

    it("Ctrl+Shift+End and Ctrl+Shift+Home select from the focused node to the edge", async () => {
      const user = userEvent.setup();
      render(<Multiple items={FLAT} />);
      focus("Beta");
      await user.keyboard("{Control>}{Shift>}{End}{/Shift}{/Control}");
      expect(["Alpha", "Beta", "Gamma", "Delta"].map(isSelected)).toEqual([
        false,
        true,
        true,
        true,
      ]);
      expect(item("Delta")).toHaveFocus();
      expect(status()).toHaveTextContent("3 selected");
      focus("Gamma");
      await user.keyboard("{Control>}{Shift>}{Home}{/Shift}{/Control}");
      expect(["Alpha", "Beta", "Gamma", "Delta"].map(isSelected)).toEqual([true, true, true, true]);
      expect(item("Alpha")).toHaveFocus();
    });

    it("Ctrl+A selects every enabled loaded node, collapsed ones too, and announces it", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Multiple onChange={onChange} />);
      focus("Documents");
      await user.keyboard("{Control>}a{/Control}");
      expect(onChange).toHaveBeenLastCalledWith([
        "docs",
        "report",
        "src",
        "components",
        "button",
        "tree",
        "index",
        "readme",
      ]);
      expect(status()).toHaveTextContent("8 selected");
    });

    it("Ctrl+A again clears them", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Multiple onChange={onChange} />);
      focus("Documents");
      await user.keyboard("{Control>}a{/Control}");
      await user.keyboard("{Control>}a{/Control}");
      expect(onChange).toHaveBeenLastCalledWith([]);
      expect(status()).toHaveTextContent("0 selected");
    });

    it("Ctrl+A in Spanish announces the count with the locale's plural", async () => {
      const user = userEvent.setup();
      render(
        <Root locale="es">
          <Multiple items={[{ id: "a", label: "Alfa" }]} />
        </Root>,
      );
      focus("Alfa");
      await user.keyboard("{Control>}a{/Control}");
      expect(status()).toHaveTextContent(/^1 seleccionado$/);
    });

    it("Ctrl+A does nothing in single mode", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single onChange={onChange} />);
      focus("Readme");
      await user.keyboard("{Control>}a{/Control}");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("the announcement is silent with announce={false}", async () => {
      const user = userEvent.setup();
      render(<Multiple announce={false} />);
      focus("Readme");
      await user.keyboard("{Control>}a{/Control}");
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("leaves other modifier combinations and composition keys alone", async () => {
      const user = userEvent.setup();
      render(<Files />);
      focus("Documents");
      await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
      expect(item("Documents")).toHaveFocus();
      fireEvent.keyDown(item("Documents"), { key: "ArrowDown", isComposing: true });
      expect(item("Documents")).toHaveFocus();
      fireEvent.keyDown(item("Documents"), { key: "Process", keyCode: 229 });
      expect(item("Documents")).toHaveFocus();
    });

    it("ignores Enter and Space that end an IME composition", () => {
      const onAction = vi.fn();
      const onChange = vi.fn();
      render(<Single onAction={onAction} onChange={onChange} />);
      focus("Readme");
      fireEvent.keyDown(item("Readme"), { key: "Enter", keyCode: 229, isComposing: true });
      fireEvent.keyDown(item("Readme"), { key: " ", isComposing: true });
      expect(onAction).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("pointer", () => {
    it("without selection a click opens a parent and calls onAction", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(<Files onAction={onAction} />);
      await user.click(item("Documents"));
      expect(isOpen("Documents")).toBe(true);
      expect(onAction).toHaveBeenCalledWith("docs", expect.anything());
      await user.click(item("Readme"));
      expect(onAction).toHaveBeenLastCalledWith("readme", expect.anything());
    });

    it("with selection a click selects the row and only the sign opens it", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(<Single onAction={onAction} />);
      await user.click(item("Documents"));
      expect(isSelected("Documents")).toBe(true);
      expect(isOpen("Documents")).toBe(false);
      expect(onAction).toHaveBeenCalledTimes(1);
      await user.click(sign("Documents"));
      expect(isOpen("Documents")).toBe(true);
      expect(onAction).toHaveBeenCalledTimes(1);
      await user.click(sign("Documents"));
      expect(isOpen("Documents")).toBe(false);
      expect(isSelected("Documents")).toBe(true);
    });

    it("the sign toggles a parent even when the tree has no selection", async () => {
      const user = userEvent.setup();
      render(<Files expandOn="sign" />);
      await user.click(item("Documents"));
      expect(isOpen("Documents")).toBe(false);
      await user.click(sign("Documents"));
      expect(isOpen("Documents")).toBe(true);
    });

    it("expandOn=row lets a click open a parent in a selecting tree too", async () => {
      const user = userEvent.setup();
      render(<Single expandOn="row" />);
      await user.click(item("Documents"));
      expect(isOpen("Documents")).toBe(true);
      expect(isSelected("Documents")).toBe(true);
    });

    it("single: clicking the selected node keeps it unless deselectable", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<Single defaultValue="readme" />);
      await user.click(item("Readme"));
      expect(isSelected("Readme")).toBe(true);
      unmount();
      const onChange = vi.fn();
      render(<Single defaultValue="readme" deselectable onChange={onChange} />);
      await user.click(item("Readme"));
      expect(isSelected("Readme")).toBe(false);
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("multiple: a click toggles; Shift+click selects the visible range", async () => {
      const user = userEvent.setup();
      render(<Multiple items={FLAT} />);
      await user.click(item("Alpha"));
      await user.keyboard("{Shift>}");
      await user.click(item("Gamma"));
      await user.keyboard("{/Shift}");
      expect(["Alpha", "Beta", "Gamma", "Delta"].map(isSelected)).toEqual([
        true,
        true,
        true,
        false,
      ]);
      await user.click(item("Beta"));
      expect(isSelected("Beta")).toBe(false);
    });

    it("a click on the check mark toggles the node and does not open it", async () => {
      const user = userEvent.setup();
      render(<Checks expandOn="row" />);
      await user.click(check("Documents"));
      expect(checked("Documents")).toBe("true");
      expect(isOpen("Documents")).toBe(false);
    });

    it("a click on a disabled node does nothing", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      const onChange = vi.fn();
      render(<Single defaultExpanded={["docs"]} onAction={onAction} onChange={onChange} />);
      await user.click(item("Notes"));
      expect(onAction).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("a click on the empty sign slot of a leaf is a click on the row", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(<Single onAction={onAction} />);
      await user.click(sign("Readme"));
      expect(isSelected("Readme")).toBe(true);
      expect(onAction).toHaveBeenCalledWith("readme", expect.anything());
    });

    it("a click without a pointer opens a parent in a selecting tree, and selects it", () => {
      render(<Single />);
      // VoiceOver, TalkBack and voice commands click with no position and detail 0.
      fireEvent.click(item("Documents"));
      expect(isOpen("Documents")).toBe(true);
      expect(isSelected("Documents")).toBe(true);
      fireEvent.click(item("Documents"));
      expect(isOpen("Documents")).toBe(false);
    });

    it("a pointer click with a position still leaves opening to the sign", () => {
      render(<Single />);
      fireEvent.click(item("Documents"), { detail: 1, clientX: 40, clientY: 12 });
      expect(isOpen("Documents")).toBe(false);
      expect(isSelected("Documents")).toBe(true);
    });

    it("a click does not toggle a disabled parent's sign", async () => {
      const user = userEvent.setup();
      render(
        <Files
          items={[
            { id: "l", label: "Locked", disabled: true, children: [{ id: "x", label: "X" }] },
          ]}
        />,
      );
      await user.click(sign("Locked"));
      expect(isOpen("Locked")).toBe(false);
    });

    it("marks only rows that act as actionable", () => {
      render(<Files defaultExpanded={["docs"]} />);
      expect(item("Documents")).toHaveAttribute("data-actionable");
      expect(item("Readme")).not.toHaveAttribute("data-actionable");
      expect(item("Notes")).not.toHaveAttribute("data-actionable");
    });
  });

  describe("state", () => {
    it("selection: uncontrolled with a default, and onChange with the value", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Single defaultValue="readme" onChange={onChange} />);
      await user.click(item("Source"));
      expect(onChange).toHaveBeenCalledWith("src");
      expect(isSelected("Source")).toBe(true);
      expect(isSelected("Readme")).toBe(false);
    });

    it("selection: controlled follows the prop", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { rerender } = render(<Single value="readme" onChange={onChange} />);
      await user.click(item("Source"));
      expect(onChange).toHaveBeenCalledWith("src");
      expect(isSelected("Readme")).toBe(true);
      rerender(<Single value="src" onChange={onChange} />);
      expect(isSelected("Source")).toBe(true);
      rerender(<Single value={null} onChange={onChange} />);
      expect(isSelected("Source")).toBe(false);
    });

    it("multiple: the value keeps the order the nodes were chosen in", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Multiple items={FLAT} onChange={onChange} />);
      await user.click(item("Gamma"));
      await user.click(item("Alpha"));
      expect(onChange).toHaveBeenLastCalledWith(["c", "a"]);
    });

    it("expansion: uncontrolled with a default, and onExpandedChange", async () => {
      const user = userEvent.setup();
      const onExpandedChange = vi.fn();
      render(<Files defaultExpanded={["docs"]} onExpandedChange={onExpandedChange} />);
      expect(isOpen("Documents")).toBe(true);
      await user.click(item("Source"));
      expect(onExpandedChange).toHaveBeenLastCalledWith(["docs", "src"]);
      await user.click(item("Documents"));
      expect(onExpandedChange).toHaveBeenLastCalledWith(["src"]);
    });

    it("expansion: controlled follows the prop", async () => {
      const user = userEvent.setup();
      const onExpandedChange = vi.fn();
      const { rerender } = render(<Files expanded={[]} onExpandedChange={onExpandedChange} />);
      await user.click(item("Documents"));
      expect(onExpandedChange).toHaveBeenCalledWith(["docs"]);
      expect(isOpen("Documents")).toBe(false);
      rerender(<Files expanded={["docs"]} onExpandedChange={onExpandedChange} />);
      expect(isOpen("Documents")).toBe(true);
    });

    it("moves focus to the nearest visible ancestor when a controlled collapse removes its node", () => {
      function Controlled() {
        const [expanded, setExpanded] = useState(["src", "components"]);
        return (
          <>
            <button
              onClick={() => {
                setExpanded(["src"]);
              }}
            >
              collapse
            </button>
            <Files expanded={expanded} onExpandedChange={setExpanded} />
          </>
        );
      }
      render(<Controlled />);
      focus("Button");
      fireEvent.click(screen.getByRole("button", { name: "collapse" }));
      expect(queryItem("Button")).not.toBeInTheDocument();
      expect(item("Components")).toHaveFocus();
    });

    it("does not pull focus back after the user left the tree", () => {
      function Controlled() {
        const [expanded, setExpanded] = useState(["src", "components"]);
        return (
          <>
            <button
              onClick={() => {
                setExpanded(["src"]);
              }}
            >
              collapse
            </button>
            <Files expanded={expanded} onExpandedChange={setExpanded} />
          </>
        );
      }
      render(<Controlled />);
      focus("Button");
      act(() => {
        screen.getByRole("button", { name: "collapse" }).focus();
      });
      fireEvent.click(screen.getByRole("button", { name: "collapse" }));
      expect(screen.getByRole("button", { name: "collapse" })).toHaveFocus();
    });
  });

  describe("checkboxes and cascade", () => {
    it("checking a parent checks everything enabled under it, and the value includes the parents", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Checks defaultExpanded={["docs"]} onChange={onChange} />);
      await user.click(item("Documents"));
      expect(onChange).toHaveBeenLastCalledWith(["docs", "report"]);
      expect(checked("Documents")).toBe("true");
      expect(checked("Report")).toBe("true");
      expect(checked("Notes")).toBe("false");
    });

    it("a parent with some children checked is mixed", async () => {
      const user = userEvent.setup();
      render(<Checks defaultExpanded={["src", "components"]} />);
      await user.click(item("Button"));
      expect(checked("Components")).toBe("mixed");
      expect(checked("Source")).toBe("mixed");
      expect(item("Components").querySelector(".ol-tree__check")).toHaveAttribute(
        "data-state",
        "mixed",
      );
      await user.click(item("Tree"));
      expect(checked("Components")).toBe("true");
      expect(checked("Source")).toBe("mixed");
      await user.click(item("Index"));
      expect(checked("Source")).toBe("true");
    });

    it("unchecking one child of a checked parent leaves its siblings checked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Checks defaultExpanded={["src", "components"]} onChange={onChange} />);
      await user.click(item("Source"));
      await user.click(item("Button"));
      const last = onChange.mock.calls.at(-1)?.[0] as string[];
      expect(last).not.toContain("src");
      expect(last).not.toContain("components");
      expect(last).not.toContain("button");
      expect(last).toEqual(expect.arrayContaining(["tree", "index"]));
      expect(checked("Source")).toBe("mixed");
      expect(checked("Tree")).toBe("true");
    });

    it("clicking a mixed parent checks it fully", async () => {
      const user = userEvent.setup();
      render(<Checks defaultExpanded={["src", "components"]} />);
      await user.click(item("Button"));
      await user.click(item("Source"));
      expect(checked("Source")).toBe("true");
      expect(checked("Tree")).toBe("true");
    });

    it("a parent id in the value stands for all its children", () => {
      render(<Checks defaultValue={["src"]} defaultExpanded={["src", "components"]} />);
      expect(checked("Source")).toBe("true");
      expect(checked("Components")).toBe("true");
      expect(checked("Button")).toBe("true");
    });

    it("a disabled child does not change its parent's state and cannot be checked", async () => {
      const user = userEvent.setup();
      render(<Checks defaultExpanded={["docs"]} />);
      await user.click(item("Report"));
      expect(checked("Documents")).toBe("true");
      await user.click(item("Notes"));
      expect(checked("Notes")).toBe("false");
    });

    it("a node that cannot be selected has no state and no box, and is looked through", async () => {
      const user = userEvent.setup();
      const items: TreeNode[] = [
        {
          id: "top",
          label: "Top",
          children: [
            {
              id: "grp",
              label: "Group",
              selectable: false,
              children: [
                { id: "g1", label: "G1" },
                { id: "g2", label: "G2" },
              ],
            },
          ],
        },
      ];
      render(<Checks items={items} defaultExpanded={["top", "grp"]} />);
      expect(item("Group")).not.toHaveAttribute("aria-checked");
      expect(item("Group").querySelector(".ol-tree__check")).toHaveAttribute("data-state", "none");
      await user.click(item("G1"));
      expect(checked("Top")).toBe("mixed");
      await user.click(item("G2"));
      expect(checked("Top")).toBe("true");
    });

    it("cascade={false} makes every box independent", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Checks cascade={false} defaultExpanded={["docs"]} onChange={onChange} />);
      await user.click(item("Documents"));
      expect(onChange).toHaveBeenLastCalledWith(["docs"]);
      expect(checked("Report")).toBe("false");
    });

    it("Ctrl+A checks everything and the parents follow", async () => {
      const user = userEvent.setup();
      render(<Checks defaultExpanded={["docs"]} />);
      focus("Documents");
      await user.keyboard("{Control>}a{/Control}");
      expect(checked("Documents")).toBe("true");
      expect(checked("Source")).toBe("true");
      expect(checked("Notes")).toBe("false");
      await user.keyboard("{Control>}a{/Control}");
      expect(checked("Documents")).toBe("false");
    });

    it("Shift+click checks a visible range with its children", async () => {
      const user = userEvent.setup();
      render(<Checks defaultExpanded={["docs"]} />);
      await user.click(item("Report"));
      await user.keyboard("{Shift>}");
      await user.click(item("Source"));
      await user.keyboard("{/Shift}");
      expect(checked("Source")).toBe("true");
      expect(checked("Documents")).toBe("true");
    });

    it("children that load under a checked parent join as checked", async () => {
      const user = userEvent.setup();
      function Lazy() {
        const [items, setItems] = useState<TreeNode[]>([
          { id: "remote", label: "Remote", hasChildren: true },
        ]);
        return (
          <Checks
            items={items}
            onLoadChildren={() => {
              setItems([
                {
                  id: "remote",
                  label: "Remote",
                  hasChildren: true,
                  children: [
                    { id: "r1", label: "R1" },
                    { id: "r2", label: "R2" },
                  ],
                },
              ]);
            }}
          />
        );
      }
      render(<Lazy />);
      await user.click(item("Remote"));
      expect(checked("Remote")).toBe("true");
      await user.click(sign("Remote"));
      expect(checked("R1")).toBe("true");
      expect(checked("R2")).toBe("true");
      expect(checked("Remote")).toBe("true");
    });
  });

  describe("lazy loading", () => {
    function deferred() {
      let resolve!: () => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    }

    function Lazy({
      load,
      locale,
    }: {
      load: (node: TreeNode) => Promise<unknown>;
      locale?: "en" | "es" | "ja";
    }) {
      const [items, setItems] = useState<TreeNode[]>([
        { id: "remote", label: "Remote", hasChildren: true },
        { id: "plain", label: "Plain" },
      ]);
      const tree = (
        <TreeView
          label="Lazy"
          items={items}
          onLoadChildren={async (node) => {
            await load(node);
            setItems((prev) =>
              prev.map((n) =>
                n.id === node.id
                  ? {
                      ...n,
                      children: [
                        { id: `${n.id}-1`, label: "One" },
                        { id: `${n.id}-2`, label: "Two" },
                      ],
                    }
                  : n,
              ),
            );
          }}
        />
      );
      return locale ? <Root locale={locale}>{tree}</Root> : tree;
    }

    it("starts closed with aria-expanded false, and asks for the children once on first open", async () => {
      const user = userEvent.setup();
      const load = vi.fn(() => Promise.resolve());
      render(<Lazy load={load} />);
      expect(item("Remote")).toHaveAttribute("aria-expanded", "false");
      expect(load).not.toHaveBeenCalled();
      await user.click(item("Remote"));
      expect(load).toHaveBeenCalledTimes(1);
      expect(await screen.findByRole("treeitem", { name: "One" })).toBeInTheDocument();
      await user.click(item("Remote"));
      await user.click(item("Remote"));
      expect(load).toHaveBeenCalledTimes(1);
      expect(isOpen("Remote")).toBe(true);
    });

    it("shows a loading row and aria-busy while the promise is pending, then the children", async () => {
      const user = userEvent.setup();
      const gate = deferred();
      render(<Lazy load={() => gate.promise} />);
      await user.click(item("Remote"));
      expect(item("Remote")).toHaveAttribute("aria-busy", "true");
      expect(item("Remote")).toHaveAttribute("aria-expanded", "false");
      expect(sign("Remote")).toHaveTextContent("+");
      expect(screen.getByText("Loading")).toBeInTheDocument();
      await act(async () => {
        gate.resolve();
        await gate.promise;
      });
      expect(item("Remote")).not.toHaveAttribute("aria-busy");
      expect(isOpen("Remote")).toBe(true);
      expect(sign("Remote")).toHaveTextContent("−");
      expect(screen.queryByText("Loading")).not.toBeInTheDocument();
      expect(item("One")).toHaveAttribute("aria-level", "2");
    });

    it("announces how many items loaded, with the locale's singular and plural", async () => {
      const user = userEvent.setup();
      render(<Lazy load={() => Promise.resolve()} />);
      await user.click(item("Remote"));
      await screen.findByRole("treeitem", { name: "One" });
      expect(status()).toHaveTextContent("2 items loaded in Remote");
    });

    it("announces in Spanish and Japanese", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<Lazy load={() => Promise.resolve()} locale="es" />);
      await user.click(item("Remote"));
      await screen.findByRole("treeitem", { name: "One" });
      expect(status()).toHaveTextContent("2 elementos cargados en Remote");
      unmount();
      render(<Lazy load={() => Promise.resolve()} locale="ja" />);
      await user.click(item("Remote"));
      await screen.findByRole("treeitem", { name: "One" });
      expect(status()).toHaveTextContent("Remoteに2件を読み込みました");
    });

    it("a rejection closes the node, marks the row and announces the failure", async () => {
      const user = userEvent.setup();
      const onExpandedChange = vi.fn();
      const load = vi.fn(() => Promise.reject(new Error("offline")));
      render(
        <TreeView
          label="Lazy"
          items={[{ id: "remote", label: "Remote", hasChildren: true }]}
          onLoadChildren={load}
          onExpandedChange={onExpandedChange}
        />,
      );
      await user.click(item("Remote"));
      expect(await failedRow()).toBeInTheDocument();
      expect(isOpen("Remote")).toBe(false);
      expect(item("Remote")).toHaveAttribute("data-error");
      expect(item("Remote")).not.toHaveAttribute("aria-busy");
      expect(onExpandedChange).toHaveBeenLastCalledWith([]);
    });

    it("shows a worded cue under the node after a failure, until the next try", async () => {
      const user = userEvent.setup();
      const load = vi
        .fn<() => Promise<void>>()
        .mockRejectedValueOnce(new Error("offline"))
        .mockImplementation(() => new Promise(() => undefined));
      render(
        <TreeView
          label="Lazy"
          items={[{ id: "remote", label: "Remote", hasChildren: true }]}
          onLoadChildren={load}
        />,
      );
      await user.click(item("Remote"));
      const cue = await failedRow();
      expect(cue).toHaveTextContent("Couldn't load Remote");
      expect(cue.closest("li")).toHaveAttribute("role", "none");
      expect(item("Remote")).not.toHaveAttribute("aria-owns");
      await user.click(item("Remote"));
      expect(document.querySelector(".ol-tree__failed")).toBeNull();
    });

    it("opening again after a failure retries", async () => {
      const user = userEvent.setup();
      const load = vi
        .fn<() => Promise<void>>()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValue(undefined);
      render(
        <TreeView
          label="Lazy"
          items={[{ id: "remote", label: "Remote", hasChildren: true }]}
          onLoadChildren={load}
        />,
      );
      await user.click(item("Remote"));
      await failedRow();
      await user.click(item("Remote"));
      expect(load).toHaveBeenCalledTimes(2);
      expect(item("Remote")).not.toHaveAttribute("data-error");
    });

    it("a synchronous throw counts as a failure", async () => {
      const user = userEvent.setup();
      render(
        <TreeView
          label="Lazy"
          items={[{ id: "remote", label: "Remote", hasChildren: true }]}
          onLoadChildren={() => {
            throw new Error("nope");
          }}
        />,
      );
      await user.click(item("Remote"));
      expect(await failedRow()).toBeInTheDocument();
      expect(isOpen("Remote")).toBe(false);
    });

    it("Right on an unloaded branch opens it and starts the load", async () => {
      const user = userEvent.setup();
      const load = vi.fn(() => Promise.resolve());
      render(<Lazy load={load} />);
      focus("Remote");
      await user.keyboard("{ArrowRight}");
      expect(load).toHaveBeenCalledTimes(1);
      await screen.findByRole("treeitem", { name: "One" });
      expect(item("Remote")).toHaveFocus();
    });

    it("loads a branch that starts open", async () => {
      const load = vi.fn(() => Promise.resolve());
      render(
        <TreeView
          label="Lazy"
          items={[{ id: "remote", label: "Remote", hasChildren: true }]}
          defaultExpanded={["remote"]}
          onLoadChildren={load}
        />,
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(load).toHaveBeenCalledTimes(1);
    });

    it("shows a branch that has hasChildren without a handler as an openable parent", async () => {
      const user = userEvent.setup();
      render(<TreeView label="x" items={[{ id: "r", label: "Remote", hasChildren: true }]} />);
      expect(item("Remote")).toHaveAttribute("aria-expanded", "false");
      await user.click(item("Remote"));
      expect(screen.queryByRole("group")).not.toBeInTheDocument();
    });
  });

  describe("actionRef", () => {
    it("focus opens the branches above a node and focuses it", () => {
      const ref = createRef<TreeActions>();
      render(<Files actionRef={ref} />);
      let ok = false;
      act(() => {
        ok = ref.current?.focus("button") ?? false;
      });
      expect(ok).toBe(true);
      expect(item("Button")).toHaveFocus();
      expect(isOpen("Source")).toBe(true);
      expect(isOpen("Components")).toBe(true);
    });

    it("focus returns false for an unknown id", () => {
      const ref = createRef<TreeActions>();
      render(<Files actionRef={ref} />);
      expect(ref.current?.focus("nope")).toBe(false);
    });

    it("focus on a visible node focuses it at once", () => {
      const ref = createRef<TreeActions>();
      render(<Files actionRef={ref} />);
      act(() => {
        ref.current?.focus("readme");
      });
      expect(item("Readme")).toHaveFocus();
    });

    it("expandAll opens every loaded branch and collapseAll closes them", () => {
      const ref = createRef<TreeActions>();
      render(<Files actionRef={ref} />);
      act(() => {
        ref.current?.expandAll();
      });
      expect(isOpen("Documents")).toBe(true);
      expect(isOpen("Source")).toBe(true);
      expect(isOpen("Components")).toBe(true);
      act(() => {
        ref.current?.collapseAll();
      });
      expect(queryItem("Report")).not.toBeInTheDocument();
    });

    it("scrollTo does not throw, with or without the node", () => {
      const ref = createRef<TreeActions>();
      render(<Files actionRef={ref} />);
      expect(() => {
        ref.current?.scrollTo("readme");
        ref.current?.scrollTo("nope");
      }).not.toThrow();
    });
  });

  describe("fold", () => {
    it("adds the fold class and marks the group of a user toggle", async () => {
      const user = userEvent.setup();
      render(<Files fold />);
      expect(screen.getByRole("tree")).toHaveClass("ol-tree--fold");
      await user.click(item("Documents"));
      const group = within(parentOf(item("Documents"))).getByRole("group");
      expect(group).toHaveAttribute("data-fold");
      expect(group).toHaveAttribute("data-state", "open");
    });

    it("opens instantly for * and for the first render", async () => {
      const user = userEvent.setup();
      render(<Files fold defaultExpanded={["docs"]} />);
      const first = within(parentOf(item("Documents"))).getByRole("group");
      expect(first).not.toHaveAttribute("data-fold");
      focus("Documents");
      await user.keyboard("*");
      const second = within(parentOf(item("Source"))).getByRole("group");
      expect(second).not.toHaveAttribute("data-fold");
    });

    it("keeps the group mounted and inert while it folds closed, then removes it", async () => {
      const user = userEvent.setup();
      render(<Files fold />);
      await user.click(item("Documents"));
      await user.click(item("Documents"));
      const closing = document.querySelector('.ol-tree__group[data-state="closing"]');
      expect(closing).not.toBeNull();
      expect(closing).toHaveAttribute("inert");
      expect(isOpen("Documents")).toBe(false);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1100));
      });
      expect(document.querySelector(".ol-tree__group")).toBeNull();
    }, 5000);

    it("without fold nothing is marked and a close removes the group at once", async () => {
      const user = userEvent.setup();
      render(<Files />);
      await user.click(item("Documents"));
      expect(document.querySelector("[data-fold]")).toBeNull();
      await user.click(item("Documents"));
      expect(document.querySelector(".ol-tree__group")).toBeNull();
    });
  });

  describe("axe", () => {
    describe.each(["washi", "sumi"] as const)("%s", (theme) => {
      const wrap = (node: React.ReactNode) => <Root theme={theme}>{node}</Root>;

      it("none", async () => {
        const { container } = render(
          wrap(<Files defaultExpanded={["docs", "src"]} current="report" />),
        );
        expect(await runAxe(container)).toHaveNoViolations();
      });

      it("single", async () => {
        const { container } = render(
          wrap(<Single defaultExpanded={["docs", "src"]} defaultValue="report" />),
        );
        expect(await runAxe(container)).toHaveNoViolations();
      });

      it("multiple", async () => {
        const { container } = render(
          wrap(
            <Multiple defaultExpanded={["docs"]} defaultValue={["report", "readme"]} name="f" />,
          ),
        );
        expect(await runAxe(container)).toHaveNoViolations();
      });

      it("checkboxes with checked and mixed parents", async () => {
        const { container } = render(
          wrap(
            <Checks
              defaultExpanded={["docs", "src", "components"]}
              defaultValue={["button", "report"]}
            />,
          ),
        );
        expect(container.querySelector('[aria-checked="mixed"]')).not.toBeNull();
        expect(await runAxe(container)).toHaveNoViolations();
      });

      it("lazy, while a node is loading", async () => {
        const user = userEvent.setup();
        const { container } = render(
          wrap(
            <TreeView
              label="Lazy"
              items={[{ id: "r", label: "Remote", hasChildren: true }]}
              onLoadChildren={() => new Promise(() => undefined)}
            />,
          ),
        );
        await user.click(screen.getByRole("treeitem", { name: "Remote" }));
        expect(screen.getByText("Loading")).toBeInTheDocument();
        expect(await runAxe(container)).toHaveNoViolations();
      });

      it("loading and empty", async () => {
        const { container } = render(
          wrap(
            <>
              <Files loading />
              <TreeView label="Empty" items={[]} />
              <TreeView label="Loading" items={[]} loading />
            </>,
          ),
        );
        expect(await runAxe(container)).toHaveNoViolations();
      });

      it("fold, open and closing", async () => {
        const user = userEvent.setup();
        const { container } = render(wrap(<Files fold />));
        await user.click(item("Documents"));
        expect(await runAxe(container)).toHaveNoViolations();
        await user.click(item("Documents"));
        expect(await runAxe(container)).toHaveNoViolations();
      });

      it("a failed load with its cue", async () => {
        const user = userEvent.setup();
        const { container } = render(
          wrap(
            <TreeView
              label="Lazy"
              items={[{ id: "r", label: "Remote", hasChildren: true }]}
              onLoadChildren={() => Promise.reject(new Error("offline"))}
            />,
          ),
        );
        await user.click(screen.getByRole("treeitem", { name: "Remote" }));
        await failedRow();
        expect(await runAxe(container)).toHaveNoViolations();
      });

      it("the current node that is also selected", async () => {
        const { container } = render(
          wrap(<Single defaultExpanded={["docs"]} defaultValue="report" current="report" />),
        );
        expect(await runAxe(container)).toHaveNoViolations();
      });

      it("size m, boxed and rows", async () => {
        const { container } = render(
          wrap(
            <>
              <Single size="m" defaultValue="readme" />
              <Files boxed defaultExpanded={["docs"]} />
              <Multiple
                rows={3}
                boxed
                defaultExpanded={["docs", "src"]}
                defaultValue={["report"]}
              />
            </>,
          ),
        );
        expect(await runAxe(container)).toHaveNoViolations();
      });

      it("with a node focused, selected or not", async () => {
        const user = userEvent.setup();
        const { container } = render(
          wrap(<Single defaultExpanded={["docs"]} defaultValue="report" />),
        );
        await user.tab();
        expect(await runAxe(container)).toHaveNoViolations();
        await user.keyboard("{ArrowUp}");
        expect(await runAxe(container)).toHaveNoViolations();
      });

      it("disabled nodes and a disabled tree", async () => {
        const { container } = render(
          wrap(
            <>
              <Files defaultExpanded={["docs"]} />
              <Single disabled defaultValue="readme" />
            </>,
          ),
        );
        expect(await runAxe(container)).toHaveNoViolations();
      });

      it("RTL", async () => {
        const { container } = render(
          wrap(
            <div dir="rtl">
              <Multiple defaultExpanded={["docs"]} defaultValue={["report"]} />
            </div>,
          ),
        );
        expect(await runAxe(container)).toHaveNoViolations();
      });
    });
  });
});
