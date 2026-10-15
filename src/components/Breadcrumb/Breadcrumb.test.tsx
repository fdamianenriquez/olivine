import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Breadcrumb } from "./Breadcrumb";

const items = [
  { label: "Index", href: "/" },
  { label: "Works", href: "/works" },
  { label: "Kitchen 04" },
];

describe("Breadcrumb", () => {
  it("renders a nav with the root class, className and native props", () => {
    render(<Breadcrumb items={items} className="extra" data-x="1" />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toHaveClass("ol-breadcrumb", "extra");
    expect(nav).toHaveAttribute("data-x", "1");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("links the earlier items and marks the last as current, not a link", () => {
    render(<Breadcrumb items={items} />);
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/", "/works"]);
    const current = screen.getByText("Kitchen 04");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.closest("a")).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("renders an item without href as text and never links the last item", () => {
    render(<Breadcrumb items={[{ label: "A" }, { label: "B", href: "/b" }]} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText("B")).toHaveAttribute("aria-current", "page");
  });

  it("keeps separators out of the DOM text (CSS only, empty alt)", () => {
    render(<Breadcrumb items={items} />);
    expect(screen.getByRole("list")).toHaveTextContent("IndexWorksKitchen 04");
  });

  it("uses the locale name and lets label override it", () => {
    const { rerender } = render(
      <Root locale="es">
        <Breadcrumb items={items} />
      </Root>,
    );
    expect(screen.getByRole("navigation", { name: "Ruta de navegación" })).toBeInTheDocument();
    rerender(
      <Root locale="ja">
        <Breadcrumb items={items} />
      </Root>,
    );
    expect(screen.getByRole("navigation", { name: "パンくずリスト" })).toBeInTheDocument();
    rerender(
      <Root locale="ja">
        <Breadcrumb items={items} label="Trail" />
      </Root>,
    );
    expect(screen.getByRole("navigation", { name: "Trail" })).toBeInTheDocument();
  });

  it("forwards the ref to the nav", () => {
    const ref = createRef<HTMLElement>();
    render(<Breadcrumb ref={ref} items={items} />);
    expect(ref.current?.tagName).toBe("NAV");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Breadcrumb items={items} />);
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
