import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Progress } from "./Progress";

describe("Progress", () => {
  it("renders a determinate bar with defaults and passes props through", () => {
    render(<Progress value={64} label="Upload" className="x" data-testid="p" id="up" />);
    const root = screen.getByTestId("p");
    expect(root).toHaveClass("ol-progress", "x");
    expect(root).toHaveAttribute("id", "up");
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "64");
    expect(screen.getByText("064%")).toHaveClass("ol-progress__value");
  });

  it("maps variants to modifier classes", () => {
    const { rerender } = render(<Progress value={10} data-testid="p" />);
    const root = screen.getByTestId("p");
    expect(root).not.toHaveClass("ol-progress--ink");
    rerender(<Progress value={10} variant="ink" data-testid="p" />);
    expect(root).toHaveClass("ol-progress--ink");
    rerender(<Progress value={10} variant="segments" data-testid="p" />);
    expect(root).toHaveClass("ol-progress--segments");
  });

  it("draws segments with the on and edge blocks", () => {
    const { container } = render(<Progress variant="segments" value={7} max={20} />);
    expect(container.querySelectorAll(".ol-progress__seg")).toHaveLength(20);
    expect(container.querySelectorAll(".ol-progress__seg--on")).toHaveLength(7);
    expect(container.querySelectorAll(".ol-progress__seg--edge")).toHaveLength(1);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "20");
    expect(screen.getByText("035%")).toBeInTheDocument();
  });

  it("honours a custom segment count", () => {
    const { container } = render(<Progress variant="segments" segments={5} value={50} />);
    expect(container.querySelectorAll(".ol-progress__seg")).toHaveLength(5);
  });

  it("is indeterminate without a value: no valuenow and no percentage", () => {
    render(<Progress label="Syncing" data-testid="p" />);
    expect(screen.getByTestId("p")).toHaveClass("ol-progress--indeterminate");
    expect(screen.getByTestId("p")).toHaveAttribute("data-state", "indeterminate");
    const bar = screen.getByRole("progressbar", { name: "Syncing" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("clamps the value into range", () => {
    const { rerender } = render(<Progress value={150} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("100%")).toBeInTheDocument();
    rerender(<Progress value={-5} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("hides the percentage when showValue is false", () => {
    render(<Progress value={40} showValue={false} aria-label="Quiet" />);
    expect(screen.queryByText("040%")).toBeNull();
  });

  it("names the bar from aria-label or aria-labelledby, which win over label", () => {
    const { rerender } = render(<Progress value={1} label="Visible" aria-label="Custom" />);
    expect(screen.getByRole("progressbar", { name: "Custom" })).toBeInTheDocument();
    rerender(
      <>
        <span id="ext">External</span>
        <Progress value={1} label="Visible" aria-labelledby="ext" />
      </>,
    );
    expect(screen.getByRole("progressbar", { name: "External" })).toBeInTheDocument();
  });

  it("accepts a node as label", () => {
    render(<Progress value={5} label={<em>Rich</em>} />);
    expect(screen.getByRole("progressbar", { name: "Rich" })).toBeInTheDocument();
  });

  it("is not affected by the locale and keeps digits and symbol", () => {
    render(
      <Root locale="ja">
        <Progress value={9} label="進捗" />
      </Root>,
    );
    expect(screen.getByRole("progressbar", { name: "進捗" })).toBeInTheDocument();
    expect(screen.getByText("009%")).toBeInTheDocument();
  });

  it("forwards the ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Progress ref={ref} value={1} data-testid="p" />);
    expect(ref.current).toBe(screen.getByTestId("p"));
  });

  it("has no axe violations in each variant and when indeterminate", async () => {
    const { container } = render(
      <div>
        <Progress label="Upload" value={64} />
        <Progress label="Ink" variant="ink" value={30} />
        <Progress label="Steps" variant="segments" value={7} max={20} />
        <Progress label="Syncing" />
        <Progress aria-label="Unlabelled visually" value={10} />
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("sets aria-valuetext to the rounded percentage", () => {
    render(<Progress value={7} max={20} aria-label="x" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "35%");
  });

  it("falls back to 100 for a max that is zero, negative or NaN, and ignores a NaN value", () => {
    const { rerender } = render(<Progress value={50} max={0} aria-label="x" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "100");
    rerender(<Progress value={50} max={Number.NaN} aria-label="x" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "100");
    rerender(<Progress value={Number.NaN} aria-label="x" />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
  });

  it("renders no label element without a label", () => {
    const { container } = render(<Progress value={5} aria-label="x" />);
    expect(container.querySelector(".ol-label")).toBeNull();
  });

  it("keeps aria-label as the name when a visible label is also given", () => {
    render(<Progress value={5} label="Visible" aria-label="Hidden name" />);
    expect(screen.getByRole("progressbar")).toHaveAccessibleName("Hidden name");
    expect(screen.getByText("Visible")).toBeInTheDocument();
  });

  it("has no axe violations at 0 and 100", async () => {
    const { container } = render(
      <div>
        <Progress label="Start" value={0} />
        <Progress label="Done" value={100} variant="segments" />
      </div>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
