import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Card } from "./Card";

describe("Card", () => {
  it("renders an article with the root class, className and native props", () => {
    render(<Card className="extra" data-x="1" title="Kitchen" />);
    const card = screen.getByRole("article");
    expect(card).toHaveClass("ol-card", "extra");
    expect(card).toHaveAttribute("data-x", "1");
  });

  it("renders sections only when given", () => {
    const { container, rerender } = render(<Card />);
    for (const part of ["head", "media", "body", "foot", "title", "text"]) {
      expect(container.querySelector(`.ol-card__${part}`)).toBeNull();
    }
    rerender(
      <Card
        index={1}
        meta="2026"
        media={<img alt="" src="x.png" />}
        title="T"
        text="Body"
        footer={<span>F</span>}
      >
        child
      </Card>,
    );
    for (const part of ["head", "media", "body", "foot", "title", "text"]) {
      expect(container.querySelector(`.ol-card__${part}`)).not.toBeNull();
    }
    expect(screen.getByText("01")).toHaveClass("ol-card__index");
    expect(screen.getByText("2026")).toHaveClass("ol-card__meta");
    expect(screen.getByText("child").closest(".ol-card__body")).not.toBeNull();
  });

  it("renders a string index as given and meta alone without an index", () => {
    const { container, rerender } = render(<Card index="A-7" />);
    expect(screen.getByText("A-7")).toBeInTheDocument();
    rerender(<Card meta="Only meta" />);
    expect(container.querySelector(".ol-card__index")).toBeNull();
  });

  it("maps interactive and flat to modifier classes", () => {
    render(<Card interactive flat title="T" />);
    expect(screen.getByRole("article")).toHaveClass("ol-card--interactive", "ol-card--flat");
  });

  it("makes the whole card one link named by the title", () => {
    render(<Card interactive href="/k" title="Kitchen 04" text="Oak and steel" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName("Kitchen 04");
    expect(links[0]).toHaveAttribute("href", "/k");
    expect(screen.getByRole("heading", { name: "Kitchen 04" })).toContainElement(links[0] ?? null);
    expect(screen.getByRole("article")).not.toHaveAttribute("href");
  });

  it("keeps footer controls clickable on a link card", async () => {
    const onClick = vi.fn();
    render(<Card href="/k" title="Kitchen" footer={<button onClick={onClick}>Save</button>} />);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("does not link without href", () => {
    render(<Card title="Kitchen" />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("uses an h3 title by default and headingLevel overrides it", () => {
    const { rerender } = render(<Card title="T" />);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    rerender(<Card title="T" headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("renders another element with as", () => {
    render(<Card as="li" title="T" />);
    expect(screen.getByRole("listitem")).toHaveClass("ol-card");
  });

  it("forwards the ref to the root element", () => {
    const ref = createRef<HTMLElement>();
    render(<Card ref={ref} title="T" />);
    expect(ref.current).toBe(screen.getByRole("article"));
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <Card index={1} meta="2026" title="Plain" text="Text" footer={<button>Go</button>} />
        <Card interactive href="/k" title="Linked" text="Text" footer={<button>Save</button>} />
        <Card flat title="Flat" />
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
