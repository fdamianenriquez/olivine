import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { ListGroup } from "./ListGroup";

describe("ListGroup", () => {
  it("renders a ul with static rows, root class, className and native attributes", () => {
    render(
      <ListGroup
        className="extra"
        data-x="1"
        items={[
          { title: "Identity", description: "Marks, type", meta: "12" },
          { title: "Editorial" },
        ]}
      />,
    );
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("UL");
    expect(list).toHaveClass("ol-list", "extra");
    expect(list).toHaveAttribute("data-x", "1");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Marks, type")).toHaveClass("ol-list__desc");
    expect(screen.getByText("12")).toHaveClass("ol-list__meta");
  });

  it("renders links for href rows and buttons for onClick rows", () => {
    render(
      <ListGroup
        items={[
          { title: "Go", href: "/go" },
          { title: "Do", onClick: vi.fn() },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Go" })).toHaveAttribute("href", "/go");
    const button = screen.getByRole("button", { name: "Do" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("ol-list__item--action");
  });

  it("calls onClick for button rows", async () => {
    const onClick = vi.fn();
    render(<ListGroup items={[{ title: "Do", onClick }]} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("marks the active row: page for links, true for buttons", () => {
    render(
      <ListGroup
        items={[
          { title: "A", href: "/a", active: true },
          { title: "B", onClick: vi.fn(), active: true },
          { title: "C", href: "/c" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "A" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "A" })).toHaveClass("ol-list__item--active");
    expect(screen.getByRole("button", { name: "B" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "C" })).not.toHaveAttribute("aria-current");
  });

  it("disables buttons natively and keeps disabled links out of the tab order", async () => {
    const onClick = vi.fn();
    render(
      <ListGroup
        items={[
          { title: "Btn", onClick, disabled: true },
          { title: "Lnk", href: "/x", onClick, disabled: true },
          { title: "Static", disabled: true },
        ]}
      />,
    );
    const button = screen.getByRole("button", { name: "Btn" });
    expect(button).toBeDisabled();
    const link = screen.getByText("Lnk").closest("a") as HTMLElement;
    expect(link).not.toHaveAttribute("href");
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).not.toHaveClass("ol-list__item--action");
    await userEvent.click(link);
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(document.body).toHaveFocus();
  });

  it("renders an ol when numbered", () => {
    render(<ListGroup numbered items={[{ title: "A" }, { title: "B" }]} />);
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(list).toHaveClass("ol-list--numbered");
  });

  it("maps boxed and flush to modifier classes", () => {
    render(<ListGroup boxed flush items={[{ title: "A" }]} />);
    expect(screen.getByRole("list")).toHaveClass("ol-list--boxed", "ol-list--flush");
  });

  it("forwards the ref to the list element", () => {
    const ref = createRef<HTMLUListElement>();
    render(<ListGroup ref={ref} items={[{ title: "A" }]} />);
    expect(ref.current).toBe(screen.getByRole("list"));
  });

  it("has no axe violations in default and rich states", async () => {
    const { container, rerender } = render(<ListGroup items={[{ title: "A", meta: "1" }]} />);
    expect(await runAxe(container)).toHaveNoViolations();
    rerender(
      <ListGroup
        numbered
        boxed
        items={[
          { title: "A", href: "/a", active: true },
          { title: "B", onClick: vi.fn(), active: true, description: "d" },
          { title: "C", href: "/c", disabled: true },
          { title: "D", onClick: vi.fn(), disabled: true },
          { title: "E", disabled: true },
        ]}
      />,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
