import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, forwardRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Tabs } from "./Tabs";

const Demo = forwardRef<HTMLDivElement, Partial<React.ComponentProps<typeof Tabs>>>(
  function Demo(props, ref) {
    return (
      <Tabs label="Sections" ref={ref} {...props}>
        <Tabs.Tab label="One">Panel one</Tabs.Tab>
        <Tabs.Tab label="Two">Panel two</Tabs.Tab>
        <Tabs.Tab label="Three" disabled>
          Panel three
        </Tabs.Tab>
        <Tabs.Tab label="Four">
          <button type="button">Inside</button>
        </Tabs.Tab>
      </Tabs>
    );
  },
);

function Bare(props: Omit<React.ComponentProps<typeof Tabs>, "children">) {
  return (
    <Tabs {...props}>
      <Tabs.Tab label="One">a</Tabs.Tab>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("renders root class, className, native props and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Demo className="extra" data-x="1" ref={ref} />);
    expect(ref.current).toHaveClass("ol-tabs", "extra");
    expect(ref.current).toHaveAttribute("data-x", "1");
  });

  it("maps fill and indexed", () => {
    const { container } = render(<Demo fill indexed />);
    expect(container.firstChild).toHaveClass("ol-tabs--fill");
    expect(screen.getByRole("tab", { name: /Two/ })).toHaveTextContent("02");
  });

  it("wires aria and the roving tabindex", () => {
    render(<Demo />);
    const list = screen.getByRole("tablist", { name: "Sections" });
    expect(list).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("data-state", "active");
    expect(tabs[0]).toHaveAttribute("tabindex", "0");
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("id", tabs[0]?.getAttribute("aria-controls") ?? "");
    expect(panel).toHaveAttribute("aria-labelledby", tabs[0]?.id ?? "");
    expect(panel).toHaveTextContent("Panel one");
  });

  it("switches on click (uncontrolled) and calls onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Demo onChange={onChange} />);
    await user.click(screen.getByRole("tab", { name: "Two" }));
    expect(onChange).toHaveBeenCalledWith(1);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
  });

  it("honours defaultValue", () => {
    render(<Demo defaultValue={1} />);
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("aria-selected", "true");
  });

  it("is controlled when value is given", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [v, setV] = useState(1);
      return <Demo value={v} onChange={setV} />;
    }
    render(<Controlled />);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
    await user.click(screen.getByRole("tab", { name: "One" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel one");
  });

  it("stays on the given value when nothing updates it", async () => {
    const user = userEvent.setup();
    render(<Demo value={0} />);
    await user.click(screen.getByRole("tab", { name: "Two" }));
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
  });

  it("moves with arrows, wraps, skips disabled and activates on focus", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    screen.getByRole("tab", { name: "One" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Four" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Four" })).toHaveFocus();
  });

  it("jumps with Home and End", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    screen.getByRole("tab", { name: "One" }).focus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Four" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
  });

  it("makes a panel a tab stop only when it has no focusable content", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    expect(screen.getByRole("tabpanel")).toHaveAttribute("tabindex", "0");
    await user.click(screen.getByRole("tab", { name: "Four" }));
    expect(screen.getByRole("tabpanel")).not.toHaveAttribute("tabindex");
  });

  it("has no axe violations by default and after switching", async () => {
    const user = userEvent.setup();
    const { container } = render(<Demo indexed />);
    expect(await runAxe(container)).toHaveNoViolations();
    await user.click(screen.getByRole("tab", { name: /Four/ }));
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("names the tablist from label, aria-label or aria-labelledby", () => {
    const { rerender, container } = render(<Demo label="A" />);
    expect(screen.getByRole("tablist", { name: "A" })).toBeInTheDocument();
    rerender(<Bare aria-label="B" />);
    expect(screen.getByRole("tablist", { name: "B" })).toBeInTheDocument();
    expect(container.firstChild).not.toHaveAttribute("aria-label");
    rerender(
      <>
        <span id="lbl">C</span>
        <Bare aria-labelledby="lbl" />
      </>,
    );
    expect(screen.getByRole("tablist", { name: "C" })).toBeInTheDocument();
  });

  it("flips arrows in RTL", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <Demo />
      </div>,
    );
    screen.getByRole("tab", { name: "One" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveFocus();
  });

  it("ignores clicks on a disabled tab", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Demo onChange={onChange} />);
    await user.click(screen.getByRole("tab", { name: "Three" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("falls back to the first enabled tab stop when value is disabled", () => {
    render(<Demo value={2} />);
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute("tabindex", "-1");
  });

  it("skips a disabled first or last tab on Home and End", async () => {
    const user = userEvent.setup();
    render(
      <Tabs label="x">
        <Tabs.Tab label="A" disabled />
        <Tabs.Tab label="B">b</Tabs.Tab>
        <Tabs.Tab label="C">c</Tabs.Tab>
        <Tabs.Tab label="D" disabled />
      </Tabs>,
    );
    screen.getByRole("tab", { name: "B" }).focus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "C" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "B" })).toHaveFocus();
  });

  it("has no axe violations with fill and a disabled tab", async () => {
    const { container } = render(<Demo fill indexed />);
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
