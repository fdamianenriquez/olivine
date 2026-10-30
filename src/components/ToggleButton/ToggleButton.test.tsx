import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { ButtonGroup } from "../ButtonGroup";
import { Root } from "../Root";
import { ToggleButton } from "./ToggleButton";

afterEach(() => vi.restoreAllMocks());

describe("ToggleButton", () => {
  it("renders a native type=button button with aria-pressed=false by default", () => {
    render(
      <ToggleButton className="x" data-testid="t">
        Grid
      </ToggleButton>,
    );
    const el = screen.getByRole("button", { name: "Grid" });
    expect(el.tagName).toBe("BUTTON");
    expect(el).toHaveAttribute("type", "button");
    expect(el).toHaveAttribute("aria-pressed", "false");
    expect(el).toHaveClass("ol-btn", "ol-btn--toggle", "x");
    expect(el).toHaveAttribute("data-testid", "t");
    expect(el).not.toHaveAttribute("role");
  });

  it("toggles on click when uncontrolled and reports the next state", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(<ToggleButton onPressedChange={onPressedChange}>Grid</ToggleButton>);
    const el = screen.getByRole("button");
    await user.click(el);
    expect(el).toHaveAttribute("aria-pressed", "true");
    expect(onPressedChange).toHaveBeenLastCalledWith(true);
    await user.click(el);
    expect(el).toHaveAttribute("aria-pressed", "false");
    expect(onPressedChange).toHaveBeenLastCalledWith(false);
  });

  it("starts from defaultPressed", () => {
    render(<ToggleButton defaultPressed>Grid</ToggleButton>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("follows the pressed prop when controlled", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    const { rerender } = render(
      <ToggleButton pressed={false} onPressedChange={onPressedChange}>
        Grid
      </ToggleButton>,
    );
    const el = screen.getByRole("button");
    await user.click(el);
    expect(onPressedChange).toHaveBeenCalledWith(true);
    expect(el).toHaveAttribute("aria-pressed", "false");
    rerender(
      <ToggleButton pressed onPressedChange={onPressedChange}>
        Grid
      </ToggleButton>,
    );
    expect(el).toHaveAttribute("aria-pressed", "true");
  });

  it("works as a controlled toggle with state in the parent", async () => {
    const user = userEvent.setup();
    function Demo() {
      const [on, setOn] = useState(false);
      return (
        <ToggleButton pressed={on} onPressedChange={setOn}>
          Grid
        </ToggleButton>
      );
    }
    render(<Demo />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("is reached with Tab and toggled with Space and Enter; focus stays on it", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ToggleButton>Bold</ToggleButton>
        <button type="button">After</button>
      </>,
    );
    await user.tab();
    const el = screen.getByRole("button", { name: "Bold" });
    expect(el).toHaveFocus();
    await user.keyboard(" ");
    expect(el).toHaveAttribute("aria-pressed", "true");
    expect(el).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(el).toHaveAttribute("aria-pressed", "false");
    expect(el).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(el).toHaveFocus();
  });

  it("keeps the same accessible name in both states", async () => {
    const user = userEvent.setup();
    render(
      <ToggleButton icon="+" pressedIcon="−" aria-label="Save for later">
        {undefined}
      </ToggleButton>,
    );
    const el = screen.getByRole("button");
    expect(el).toHaveAccessibleName("Save for later");
    await user.click(el);
    expect(el).toHaveAccessibleName("Save for later");
  });

  it("swaps icon for pressedIcon while pressed, hidden from assistive tech", async () => {
    const user = userEvent.setup();
    render(
      <ToggleButton icon="+" pressedIcon="−">
        Watch
      </ToggleButton>,
    );
    const el = screen.getByRole("button", { name: "Watch" });
    const glyph = () => el.querySelector('[aria-hidden="true"]');
    expect(glyph()).toHaveTextContent("+");
    await user.click(el);
    expect(glyph()).toHaveTextContent("−");
    expect(el).toHaveAccessibleName("Watch");
  });

  it("keeps icon while pressed when there is no pressedIcon", async () => {
    const user = userEvent.setup();
    render(<ToggleButton icon="■">Grid</ToggleButton>);
    const el = screen.getByRole("button");
    await user.click(el);
    expect(el.querySelector('[aria-hidden="true"]')).toHaveTextContent("■");
  });

  it("does not toggle when disabled and leaves the Tab order", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(
      <>
        <ToggleButton disabled defaultPressed onPressedChange={onPressedChange}>
          Map
        </ToggleButton>
        <button type="button">After</button>
      </>,
    );
    const el = screen.getByRole("button", { name: "Map" });
    expect(el).toBeDisabled();
    expect(el).toHaveAttribute("aria-pressed", "true");
    await user.click(el);
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    expect(onPressedChange).not.toHaveBeenCalled();
    expect(el).toHaveAttribute("aria-pressed", "true");
  });

  it.each([true, "true"] as const)(
    "does not toggle with aria-disabled=%s",
    async (ariaDisabled) => {
      const user = userEvent.setup();
      const onPressedChange = vi.fn();
      render(
        <ToggleButton aria-disabled={ariaDisabled} onPressedChange={onPressedChange}>
          Map
        </ToggleButton>,
      );
      const el = screen.getByRole("button");
      await user.click(el);
      el.focus();
      await user.keyboard(" ");
      await user.keyboard("{Enter}");
      expect(el).toHaveAttribute("aria-pressed", "false");
      expect(onPressedChange).not.toHaveBeenCalled();
    },
  );

  it("runs onClick first and skips the toggle when it calls preventDefault", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((e: { preventDefault: () => void }) => {
      e.preventDefault();
    });
    render(<ToggleButton onClick={onClick}>Grid</ToggleButton>);
    const el = screen.getByRole("button");
    await user.click(el);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(el).toHaveAttribute("aria-pressed", "false");
  });

  it("maps ghost, sizes and square from Button", () => {
    render(
      <>
        <ToggleButton variant="ghost">A</ToggleButton>
        <ToggleButton size="s">B</ToggleButton>
        <ToggleButton square size="l" aria-label="Bold">
          B
        </ToggleButton>
      </>,
    );
    expect(screen.getByRole("button", { name: "A" })).toHaveClass("ol-btn--ghost");
    expect(screen.getByRole("button", { name: "B" })).toHaveClass("ol-btn--s");
    const sq = screen.getByRole("button", { name: "Bold" });
    expect(sq).toHaveClass("ol-btn--square", "ol-btn--l");
    expect(sq.querySelector(".ol-btn__glyph")).toHaveAttribute("aria-hidden", "true");
  });

  it("requires a name for a square toggle in the types", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    // @ts-expect-error -- a square toggle needs aria-label or aria-labelledby
    render(<ToggleButton square>B</ToggleButton>);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("rejects Button-only props in the types", () => {
    // Type-level only: never rendered.
    const invalid = () => (
      <>
        {/* @ts-expect-error -- filled variants cannot show the ink pressed fill */}
        <ToggleButton variant="solid">A</ToggleButton>
        {/* @ts-expect-error -- no loading state */}
        <ToggleButton loading>B</ToggleButton>
        {/* @ts-expect-error -- no href */}
        <ToggleButton href="/x">C</ToggleButton>
        {/* @ts-expect-error -- always a native button */}
        <ToggleButton as="a">D</ToggleButton>
        {/* @ts-expect-error -- no arrow */}
        <ToggleButton arrow>E</ToggleButton>
        {/* @ts-expect-error -- no brackets */}
        <ToggleButton brackets>F</ToggleButton>
        {/* @ts-expect-error -- no block */}
        <ToggleButton block>G</ToggleButton>
      </>
    );
    expect(invalid).toBeTypeOf("function");
  });

  it("stays an independent toggle inside a ButtonGroup", async () => {
    const user = userEvent.setup();
    render(
      <ButtonGroup label="Text style">
        <ToggleButton>Bold</ToggleButton>
        <ToggleButton defaultPressed>Italic</ToggleButton>
      </ButtonGroup>,
    );
    expect(screen.getByRole("group", { name: "Text style" })).toBeInTheDocument();
    const bold = screen.getByRole("button", { name: "Bold" });
    const italic = screen.getByRole("button", { name: "Italic" });
    await user.click(bold);
    expect(bold).toHaveAttribute("aria-pressed", "true");
    expect(italic).toHaveAttribute("aria-pressed", "true");
    expect(bold).toHaveFocus();
    await user.tab();
    expect(italic).toHaveFocus();
  });

  it("forwards the ref to the button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<ToggleButton ref={ref}>Grid</ToggleButton>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("has no axe violations after a toggle and when disabled and pressed", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <main>
        <ToggleButton icon="+" pressedIcon="✓" aria-label="Save for later" />
        <ToggleButton disabled defaultPressed>
          Map
        </ToggleButton>
      </main>,
    );
    await user.click(screen.getByRole("button", { name: "Save for later" }));
    expect(screen.getByRole("button", { name: "Save for later" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it.each(["washi", "sumi"] as const)("has no axe violations in %s", async (theme) => {
    const { container } = render(
      <Root theme={theme}>
        <main>
          <ToggleButton>Grid</ToggleButton>
          <ToggleButton defaultPressed>List</ToggleButton>
          <ToggleButton variant="ghost" defaultPressed>
            Map
          </ToggleButton>
          <ToggleButton disabled>Off</ToggleButton>
          <ToggleButton square aria-label="Bold">
            B
          </ToggleButton>
          <ButtonGroup label="View">
            <ToggleButton>Rows</ToggleButton>
            <ToggleButton defaultPressed>Cards</ToggleButton>
          </ButtonGroup>
        </main>
      </Root>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
