import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Chip } from "./Chip";
import { CHIP_ITEM_ATTR, ChipGroupContext, type ChipGroupContextValue } from "./ChipGroupContext";

afterEach(() => {
  vi.restoreAllMocks();
});

function must<T>(value: T | null): T {
  if (value === null) throw new Error("element not found");
  return value;
}

function Group({ children, ...value }: Partial<ChipGroupContextValue> & { children: ReactNode }) {
  return (
    <ChipGroupContext.Provider
      value={{
        mode: "none",
        selectedValues: [],
        toggle: vi.fn(),
        canRemove: false,
        requestRemove: vi.fn(),
        disabled: false,
        ...value,
      }}
    >
      {children}
    </ChipGroupContext.Provider>
  );
}

describe("Chip", () => {
  describe("kinds", () => {
    it("renders a static label as a span inside the hairline frame", () => {
      const { container } = render(
        <Chip className="x" style={{ order: 1 }}>
          Walnut
        </Chip>,
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveClass("ol-chip", "x");
      expect(root).toHaveStyle({ order: "1" });
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(root.querySelector(".ol-chip__main")?.tagName).toBe("SPAN");
      expect(root.querySelector(".ol-chip__mark")).toBeNull();
    });

    it("is an action button with onClick, without aria-pressed", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Chip onClick={onClick}>Add walnut</Chip>);
      const button = screen.getByRole("button", { name: "Add walnut" });
      expect(button).toHaveAttribute("type", "button");
      expect(button).not.toHaveAttribute("aria-pressed");
      await user.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("activates with Enter and Space", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Chip onClick={onClick}>Oak</Chip>);
      screen.getByRole("button").focus();
      await user.keyboard("{Enter}");
      await user.keyboard(" ");
      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it("renders a link with href, target and rel", () => {
      render(
        <Chip href="/woods/oak" target="_blank" rel="noreferrer">
          Oak
        </Chip>,
      );
      const link = screen.getByRole("link", { name: "Oak" });
      expect(link).toHaveAttribute("href", "/woods/oak");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer");
      expect(link).not.toHaveAttribute("aria-pressed");
    });

    it("warns and ignores selection on a link chip", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <Chip href="/oak" selected>
          Oak
        </Chip>,
      );
      expect(screen.getByRole("link")).not.toHaveAttribute("aria-pressed");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("link chip"));
    });

    it("forwards other props and the ref to the main control", () => {
      const ref = createRef<HTMLElement>();
      render(
        <Chip ref={ref} onClick={vi.fn()} data-testid="m" aria-describedby="hint">
          Oak
        </Chip>,
      );
      expect(ref.current).toBe(screen.getByRole("button"));
      expect(ref.current).toHaveAttribute("data-testid", "m");
      expect(ref.current).toHaveAttribute("aria-describedby", "hint");
    });

    it("hides the leading glyph from assistive tech", () => {
      render(
        <Chip leading="◼" onClick={vi.fn()}>
          Yui Tanaka
        </Chip>,
      );
      const leading = document.querySelector(".ol-chip__leading");
      expect(leading).toHaveAttribute("aria-hidden", "true");
      expect(screen.getByRole("button", { name: "Yui Tanaka" })).toBeInTheDocument();
    });
  });

  describe("toggle", () => {
    it("toggles aria-pressed when uncontrolled and reports the change", async () => {
      const user = userEvent.setup();
      const onSelectedChange = vi.fn();
      render(
        <Chip defaultSelected={false} onSelectedChange={onSelectedChange}>
          Walnut
        </Chip>,
      );
      const button = screen.getByRole("button", { name: "Walnut" });
      expect(button).toHaveAttribute("aria-pressed", "false");
      await user.click(button);
      expect(button).toHaveAttribute("aria-pressed", "true");
      expect(onSelectedChange).toHaveBeenLastCalledWith(true);
      await user.keyboard(" ");
      expect(button).toHaveAttribute("aria-pressed", "false");
      expect(onSelectedChange).toHaveBeenLastCalledWith(false);
    });

    it("follows the controlled prop", async () => {
      const user = userEvent.setup();
      const onSelectedChange = vi.fn();
      const { rerender } = render(
        <Chip selected={false} onSelectedChange={onSelectedChange}>
          Walnut
        </Chip>,
      );
      await user.click(screen.getByRole("button"));
      expect(onSelectedChange).toHaveBeenCalledWith(true);
      expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
      rerender(
        <Chip selected onSelectedChange={onSelectedChange}>
          Walnut
        </Chip>,
      );
      expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    });

    it("keeps the label and reserves the ✓ slot in both states", async () => {
      const user = userEvent.setup();
      const { container } = render(<Chip defaultSelected={false}>Walnut</Chip>);
      const root = container.firstElementChild as HTMLElement;
      const mark = root.querySelector(".ol-chip__mark");
      expect(mark).toHaveAttribute("aria-hidden", "true");
      expect(mark).toHaveTextContent("✓");
      expect(root).toHaveAttribute("data-state", "off");
      await user.click(screen.getByRole("button"));
      expect(root).toHaveClass("ol-chip--selected");
      expect(root).toHaveAttribute("data-state", "on");
      expect(root.querySelector(".ol-chip__mark")).toBe(mark);
      expect(screen.getByRole("button", { name: "Walnut" })).toBeInTheDocument();
    });

    it("does not toggle when onClick prevents default", async () => {
      const user = userEvent.setup();
      render(
        <Chip
          defaultSelected={false}
          onClick={(e) => {
            e.preventDefault();
          }}
        >
          Walnut
        </Chip>,
      );
      await user.click(screen.getByRole("button"));
      expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    });

    it("cannot be pressed when disabled and keeps the ✓ when selected", async () => {
      const user = userEvent.setup();
      const onSelectedChange = vi.fn();
      const { container } = render(
        <Chip selected disabled onSelectedChange={onSelectedChange}>
          Walnut
        </Chip>,
      );
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      await user.click(button);
      expect(onSelectedChange).not.toHaveBeenCalled();
      expect(container.firstElementChild).toHaveClass("ol-chip--selected", "ol-chip--disabled");
    });
  });

  describe("motion", () => {
    it("stamps the ✓ only on a user's select and clears it after the animation", async () => {
      const user = userEvent.setup();
      const { container } = render(<Chip defaultSelected={false}>Walnut</Chip>);
      const root = container.firstElementChild as HTMLElement;
      await user.click(screen.getByRole("button"));
      expect(root).toHaveClass("ol-chip--stamp");
      fireEvent.animationEnd(must(root.querySelector<HTMLElement>(".ol-chip__mark")));
      expect(root).not.toHaveClass("ol-chip--stamp");
      await user.click(screen.getByRole("button"));
      expect(root).not.toHaveClass("ol-chip--stamp");
    });

    it("does not stamp on first render or on a controlled change", () => {
      const { container, rerender } = render(<Chip selected>Walnut</Chip>);
      const root = container.firstElementChild as HTMLElement;
      expect(root).not.toHaveClass("ol-chip--stamp");
      rerender(<Chip selected={false}>Walnut</Chip>);
      rerender(<Chip selected>Walnut</Chip>);
      expect(root).not.toHaveClass("ol-chip--stamp");
    });

    it("does not stamp when a controlled owner rejects the press, nor on a later select", async () => {
      const user = userEvent.setup();
      function Owner() {
        const [on, setOn] = useState(false);
        return (
          <>
            <Chip selected={on} onSelectedChange={() => undefined}>
              Walnut
            </Chip>
            <button
              type="button"
              onClick={() => {
                setOn(true);
              }}
            >
              Select
            </button>
          </>
        );
      }
      const { container } = render(<Owner />);
      await user.click(screen.getByRole("button", { name: "Walnut" }));
      await user.click(screen.getByRole("button", { name: "Select" }));
      const root = container.querySelector(".ol-chip");
      expect(root).toHaveClass("ol-chip--selected");
      expect(root).not.toHaveClass("ol-chip--stamp");
    });

    it("stamps when a controlled owner accepts the press", async () => {
      const user = userEvent.setup();
      function Owner() {
        const [on, setOn] = useState(false);
        return (
          <Chip selected={on} onSelectedChange={setOn}>
            Walnut
          </Chip>
        );
      }
      const { container } = render(<Owner />);
      await user.click(screen.getByRole("button", { name: "Walnut" }));
      expect(container.querySelector(".ol-chip")).toHaveClass("ol-chip--stamp");
    });

    it("does not stamp under reduced motion", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div className={REDUCE_MOTION_CLASS}>
          <Chip defaultSelected={false}>Walnut</Chip>
        </div>,
      );
      await user.click(screen.getByRole("button"));
      const root = container.querySelector(".ol-chip");
      expect(root).toHaveClass("ol-chip--selected");
      expect(root).not.toHaveClass("ol-chip--stamp");
    });

    it("does not stamp when the media query asks for reduced motion", async () => {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      });
      try {
        const user = userEvent.setup();
        const { container } = render(<Chip defaultSelected={false}>Walnut</Chip>);
        await user.click(screen.getByRole("button"));
        expect(container.firstElementChild).not.toHaveClass("ol-chip--stamp");
      } finally {
        Reflect.deleteProperty(window, "matchMedia");
      }
    });
  });

  describe("remove", () => {
    it("adds a remove button named from the label", async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      const { container } = render(<Chip onRemove={onRemove}>Walnut</Chip>);
      expect(container.firstElementChild).toHaveClass("ol-chip--removable");
      await user.click(screen.getByRole("button", { name: "Remove Walnut" }));
      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove.mock.calls[0]?.[0]).toHaveProperty("type", "click");
    });

    it("is two tab stops alone: main control, then remove button", async () => {
      const user = userEvent.setup();
      render(
        <Chip onClick={vi.fn()} onRemove={vi.fn()}>
          Walnut
        </Chip>,
      );
      await user.tab();
      expect(screen.getByRole("button", { name: "Walnut" })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "Remove Walnut" })).toHaveFocus();
      await user.tab({ shift: true });
      expect(screen.getByRole("button", { name: "Walnut" })).toHaveFocus();
    });

    it("calls onRemove with Space and Enter on the remove button", async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      render(<Chip onRemove={onRemove}>Walnut</Chip>);
      screen.getByRole("button", { name: "Remove Walnut" }).focus();
      await user.keyboard(" ");
      await user.keyboard("{Enter}");
      expect(onRemove).toHaveBeenCalledTimes(2);
    });

    it.each(["Delete", "Backspace"])("calls onRemove with %s on the main control", async (key) => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      render(
        <Chip onClick={vi.fn()} onRemove={onRemove}>
          Walnut
        </Chip>,
      );
      screen.getByRole("button", { name: "Walnut" }).focus();
      await user.keyboard(`{${key}}`);
      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove.mock.calls[0]?.[0]).toHaveProperty("key", key);
    });

    it("ignores Delete and Backspace with Ctrl, Alt or Meta held", () => {
      const onRemove = vi.fn();
      render(
        <Chip onClick={vi.fn()} onRemove={onRemove}>
          Walnut
        </Chip>,
      );
      const button = screen.getByRole("button", { name: "Walnut" });
      fireEvent.keyDown(button, { key: "Backspace", ctrlKey: true });
      fireEvent.keyDown(button, { key: "Delete", altKey: true });
      fireEvent.keyDown(button, { key: "Backspace", metaKey: true });
      expect(onRemove).not.toHaveBeenCalled();
      fireEvent.keyDown(button, { key: "Backspace" });
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it("calls onRemove with Delete on the focused × of a chip with a main control", async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      render(
        <Chip onClick={vi.fn()} onRemove={onRemove}>
          Walnut
        </Chip>,
      );
      screen.getByRole("button", { name: "Remove Walnut" }).focus();
      await user.keyboard("{Delete}");
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it("never removes during IME composition", () => {
      const onRemove = vi.fn();
      render(
        <Chip onClick={vi.fn()} onRemove={onRemove}>
          Walnut
        </Chip>,
      );
      const button = screen.getByRole("button", { name: "Walnut" });
      fireEvent.keyDown(button, { key: "Backspace", isComposing: true });
      fireEvent.keyDown(button, { key: "Delete", isComposing: true });
      fireEvent.keyDown(button, { key: "Backspace", keyCode: 229 });
      expect(onRemove).not.toHaveBeenCalled();
    });

    it("ignores Delete when not removable, when disabled and when the key was handled", () => {
      const onRemove = vi.fn();
      const { rerender } = render(<Chip onClick={vi.fn()}>Walnut</Chip>);
      fireEvent.keyDown(screen.getByRole("button"), { key: "Delete" });
      rerender(
        <Chip
          onClick={vi.fn()}
          onRemove={onRemove}
          onKeyDown={(e) => {
            e.preventDefault();
          }}
        >
          Walnut
        </Chip>,
      );
      fireEvent.keyDown(screen.getByRole("button", { name: "Walnut" }), { key: "Delete" });
      rerender(
        <Chip onClick={vi.fn()} onRemove={onRemove} disabled>
          Walnut
        </Chip>,
      );
      fireEvent.keyDown(screen.getByRole("button", { name: "Walnut" }), { key: "Delete" });
      expect(screen.getByRole("button", { name: "Remove Walnut" })).toBeDisabled();
      expect(onRemove).not.toHaveBeenCalled();
    });

    it("renders a remove-only chip with a plain label and the button as its control", async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      const { container } = render(<Chip onRemove={onRemove}>yui@shirakaba.jp</Chip>);
      expect(container.querySelector(".ol-chip__main")?.tagName).toBe("SPAN");
      const remove = screen.getByRole("button", { name: "Remove yui@shirakaba.jp" });
      expect(remove).toHaveAttribute(CHIP_ITEM_ATTR);
      remove.focus();
      await user.keyboard("{Backspace}");
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it("never unmounts itself", async () => {
      const user = userEvent.setup();
      render(<Chip onRemove={vi.fn()}>Walnut</Chip>);
      await user.click(screen.getByRole("button", { name: "Remove Walnut" }));
      expect(screen.getByText("Walnut")).toBeInTheDocument();
    });

    it("names the remove button from textValue and removeLabel", () => {
      render(
        <>
          <Chip onRemove={vi.fn()} textValue="Yui Tanaka">
            <strong>Yui</strong> Tanaka
          </Chip>
          <Chip onRemove={vi.fn()} removeLabel="Drop oak">
            Oak
          </Chip>
        </>,
      );
      expect(screen.getByRole("button", { name: "Remove Yui Tanaka" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Drop oak" })).toBeInTheDocument();
    });

    it("warns and falls back to the dismiss string without a text label", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <Chip onRemove={vi.fn()}>
          <strong>Yui</strong>
        </Chip>,
      );
      expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("textValue"));
    });

    it.each([
      ["en", "Remove Walnut"],
      ["es", "Quitar Walnut"],
      ["ja", "Walnutを削除"],
    ] as const)("uses the %s remove name", (locale, name) => {
      render(
        <Root locale={locale}>
          <Chip onRemove={vi.fn()}>Walnut</Chip>
        </Root>,
      );
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    });
  });

  describe("disabled link", () => {
    it("is not a tab stop", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Chip href="/oak" disabled>
            Oak
          </Chip>
          <Chip onClick={vi.fn()}>Ash</Chip>
        </>,
      );
      await user.tab();
      expect(screen.getByRole("button", { name: "Ash" })).toHaveFocus();
    });

    it("drops href, sets aria-disabled and blocks onClick", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const { container } = render(
        <Chip href="/oak" disabled onClick={onClick}>
          Oak
        </Chip>,
      );
      const link = must(container.querySelector("a"));
      expect(link).not.toHaveAttribute("href");
      expect(link).toHaveAttribute("aria-disabled", "true");
      expect(link).toHaveAttribute("data-disabled");
      expect(screen.getByRole("link", { name: "Oak" })).toBe(link);
      await user.click(link);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("inside a group", () => {
    it("takes selection from the group, ignores its own props and marks the roving item", async () => {
      const user = userEvent.setup();
      const toggle = vi.fn();
      const onSelectedChange = vi.fn();
      render(
        <Group mode="multiple" selectedValues={["oak"]} toggle={toggle}>
          <Chip value="oak">Oak</Chip>
          <Chip value="ash" selected onSelectedChange={onSelectedChange}>
            Ash
          </Chip>
        </Group>,
      );
      const oak = screen.getByRole("button", { name: "Oak" });
      const ash = screen.getByRole("button", { name: "Ash" });
      expect(oak).toHaveAttribute("aria-pressed", "true");
      expect(ash).toHaveAttribute("aria-pressed", "false");
      expect(oak).toHaveAttribute(CHIP_ITEM_ATTR);
      expect(oak).not.toHaveAttribute("tabindex");
      await user.click(ash);
      expect(toggle).toHaveBeenCalledWith("ash");
      expect(onSelectedChange).not.toHaveBeenCalled();
    });

    it("stamps when the group selects a chip by a press", async () => {
      const user = userEvent.setup();
      function Live() {
        const [values, setValues] = useState<string[]>([]);
        return (
          <Group
            mode="single"
            selectedValues={values}
            toggle={(v) => {
              setValues((prev) => (prev.includes(v) ? [] : [v]));
            }}
          >
            <Chip value="oak">Oak</Chip>
          </Group>
        );
      }
      const { container } = render(<Live />);
      await user.click(screen.getByRole("button", { name: "Oak" }));
      expect(container.querySelector(".ol-chip")).toHaveClass(
        "ol-chip--selected",
        "ol-chip--stamp",
      );
    });

    it("reserves the ✓ slot in a selecting group and none in mode none", () => {
      const { container, rerender } = render(
        <Group mode="multiple">
          <Chip value="oak">Oak</Chip>
        </Group>,
      );
      expect(container.querySelector(".ol-chip__mark")).not.toBeNull();
      rerender(
        <Group mode="none">
          <Chip value="oak" onClick={vi.fn()} selected>
            Oak
          </Chip>
        </Group>,
      );
      expect(container.querySelector(".ol-chip__mark")).toBeNull();
      expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed");
    });

    it("routes removal to the group, takes the remove button out of the tab order", async () => {
      const user = userEvent.setup();
      const requestRemove = vi.fn();
      const onRemove = vi.fn();
      render(
        <Group canRemove requestRemove={requestRemove}>
          <Chip value="oak" onClick={vi.fn()} onRemove={onRemove}>
            Oak
          </Chip>
          <Chip value="ash" onClick={vi.fn()} removable={false}>
            Ash
          </Chip>
        </Group>,
      );
      const remove = screen.getByRole("button", { name: "Remove Oak" });
      expect(remove).toHaveAttribute("tabindex", "-1");
      expect(remove).not.toHaveAttribute(CHIP_ITEM_ATTR);
      expect(screen.queryByRole("button", { name: "Remove Ash" })).not.toBeInTheDocument();
      await user.click(remove);
      screen.getByRole("button", { name: "Oak" }).focus();
      await user.keyboard("{Delete}");
      expect(requestRemove).toHaveBeenCalledTimes(2);
      expect(requestRemove).toHaveBeenLastCalledWith("oak", "Oak", expect.anything());
      expect(onRemove).not.toHaveBeenCalled();
    });

    it("hides the remove cell when the group has no onRemove", () => {
      render(
        <Group>
          <Chip value="oak" onClick={vi.fn()} onRemove={vi.fn()}>
            Oak
          </Chip>
        </Group>,
      );
      expect(screen.queryByRole("button", { name: "Remove Oak" })).not.toBeInTheDocument();
    });

    it("leaves the remove-only chip's tab stop to the group", () => {
      render(
        <Group canRemove>
          <Chip value="oak">Oak</Chip>
        </Group>,
      );
      const remove = screen.getByRole("button", { name: "Remove Oak" });
      expect(remove).toHaveAttribute(CHIP_ITEM_ATTR);
      expect(remove).not.toHaveAttribute("tabindex");
    });

    it("is disabled by the group", () => {
      render(
        <Group mode="multiple" disabled>
          <Chip value="oak">Oak</Chip>
        </Group>,
      );
      expect(screen.getByRole("button", { name: "Oak" })).toBeDisabled();
    });

    it("is not a toggle in a selecting group without a value", () => {
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <Group mode="multiple">
          <Chip onClick={vi.fn()}>Oak</Chip>
        </Group>,
      );
      expect(screen.getByRole("button", { name: "Oak" })).not.toHaveAttribute("aria-pressed");
      expect(document.querySelector(".ol-chip__mark")).toBeNull();
    });

    it("has no axe violations in a removable multiple-selection group", async () => {
      const { container } = render(
        <div role="toolbar" aria-label="Woods">
          <Group mode="multiple" selectedValues={["oak"]} canRemove>
            <Chip value="oak">Oak</Chip>
            <Chip value="ash">Ash</Chip>
            <Chip value="alder" removable={false}>
              Alder
            </Chip>
            <Chip value="maple" disabled>
              Maple
            </Chip>
          </Group>
          <Group canRemove>
            <Chip value="yui">yui@shirakaba.jp</Chip>
          </Group>
        </div>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it("warns without a value", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <Group mode="multiple">
          <Chip>Oak</Chip>
        </Group>,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("needs a `value`"));
    });
  });

  it("has no axe violations in every kind and state", async () => {
    const { container } = render(
      <>
        <Chip>Static</Chip>
        <Chip onClick={vi.fn()}>Action</Chip>
        <Chip defaultSelected={false}>Filter off</Chip>
        <Chip defaultSelected>Filter on</Chip>
        <Chip href="/oak">Link</Chip>
        <Chip onClick={vi.fn()} onRemove={vi.fn()} leading="◼">
          Input
        </Chip>
        <Chip onRemove={vi.fn()}>Remove only</Chip>
        <Chip disabled selected onRemove={vi.fn()}>
          Disabled
        </Chip>
        <Chip href="/ash" disabled>
          Disabled link
        </Chip>
      </>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
