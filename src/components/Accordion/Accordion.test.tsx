import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Accordion } from "./Accordion";

const items = [
  { title: "What is ma?", content: "The pause between things." },
  { title: "Lead times", content: "Six to ten weeks." },
  { title: "Materials", content: "Solid oak." },
];

const btn = (name: string) => screen.getByRole("button", { name: new RegExp(name) });

describe("Accordion", () => {
  it("renders closed rows with root class, className and native props", () => {
    const { container } = render(<Accordion items={items} className="extra" data-x="1" />);
    const root = container.firstElementChild;
    if (!root) throw new Error("no root");
    expect(root).toHaveClass("ol-accordion", "extra");
    expect(root).toHaveAttribute("data-x", "1");
    expect(screen.getAllByRole("button")).toHaveLength(3);
    screen
      .getAllByRole("button")
      .forEach((b) => expect(b).toHaveAttribute("aria-expanded", "false"));
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("toggles by click, Enter and Space", async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);
    await user.click(btn("Lead"));
    expect(btn("Lead")).toHaveAttribute("aria-expanded", "true");
    await user.click(btn("Lead"));
    expect(btn("Lead")).toHaveAttribute("aria-expanded", "false");
    btn("Lead").focus();
    await user.keyboard("{Enter}");
    expect(btn("Lead")).toHaveAttribute("aria-expanded", "true");
    await user.keyboard(" ");
    expect(btn("Lead")).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps one row open unless multiple", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Accordion items={items} />);
    await user.click(btn("What"));
    await user.click(btn("Lead"));
    expect(btn("What")).toHaveAttribute("aria-expanded", "false");
    expect(btn("Lead")).toHaveAttribute("aria-expanded", "true");
    rerender(<Accordion items={items} multiple />);
    await user.click(btn("Materials"));
    expect(btn("Lead")).toHaveAttribute("aria-expanded", "true");
    expect(btn("Materials")).toHaveAttribute("aria-expanded", "true");
  });

  it("honours defaultOpen", () => {
    render(<Accordion items={items} defaultOpen={[0, 2]} multiple />);
    expect(btn("What")).toHaveAttribute("aria-expanded", "true");
    expect(btn("Lead")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("region")).toHaveLength(2);
  });

  it("works controlled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Wrapper() {
      const [v, setV] = useState<number[]>([1]);
      return (
        <Accordion
          items={items}
          multiple
          value={v}
          onChange={(n) => {
            onChange(n);
            setV(n);
          }}
        />
      );
    }
    render(<Wrapper />);
    expect(btn("Lead")).toHaveAttribute("aria-expanded", "true");
    await user.click(btn("What"));
    expect(onChange).toHaveBeenCalledWith([0, 1]);
    expect(btn("What")).toHaveAttribute("aria-expanded", "true");
  });

  it("does not change when controlled value is fixed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Accordion items={items} value={[]} onChange={onChange} />);
    await user.click(btn("What"));
    expect(onChange).toHaveBeenCalledWith([0]);
    expect(btn("What")).toHaveAttribute("aria-expanded", "false");
  });

  it("wraps buttons in the requested heading level", () => {
    const { rerender } = render(<Accordion items={items} />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    rerender(<Accordion items={items} headingLevel={2} />);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
  });

  it("wires aria between button and panel", () => {
    render(<Accordion items={items} defaultOpen={[0]} />);
    const b = btn("What");
    const panel = screen.getByRole("region", { name: /What is ma/ });
    expect(b).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", b.id);
    expect(
      document.getElementById(btn("Lead").getAttribute("aria-controls") ?? ""),
    ).toHaveAttribute("hidden");
  });

  it("moves focus between headers with arrows, Home and End", async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);
    btn("What").focus();
    await user.keyboard("{ArrowDown}");
    expect(btn("Lead")).toHaveFocus();
    await user.keyboard("{End}");
    expect(btn("Materials")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(btn("What")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(btn("Materials")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(btn("What")).toHaveFocus();
  });

  it("forwards the ref to the root", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Accordion ref={ref} items={items} />);
    expect(ref.current).toBe(container.firstElementChild);
  });

  it("has no axe violations closed and open", async () => {
    const { container, rerender } = render(<Accordion items={items} />);
    expect(await runAxe(container)).toHaveNoViolations();
    rerender(<Accordion items={items} defaultOpen={[0]} />);
    await userEvent.setup().click(btn("Lead"));
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
