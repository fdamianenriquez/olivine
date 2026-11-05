import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useScrollDirection } from "./useScrollDirection";

function Probe({ enabled = true }: { enabled?: boolean }) {
  const down = useScrollDirection({ enabled });
  return <p data-testid="out">{down ? "down" : "up"}</p>;
}

const scrollTo = (y: number) => {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
};

afterEach(() => {
  scrollTo(0);
});

describe("useScrollDirection", () => {
  it("reports down after a real move and up again on the way back", () => {
    render(<Probe />);
    expect(screen.getByTestId("out")).toHaveTextContent("up");
    scrollTo(120);
    expect(screen.getByTestId("out")).toHaveTextContent("down");
    scrollTo(60);
    expect(screen.getByTestId("out")).toHaveTextContent("up");
  });

  it("ignores jitter below the hysteresis", () => {
    render(<Probe />);
    scrollTo(2);
    expect(screen.getByTestId("out")).toHaveTextContent("up");
  });

  it("does nothing while disabled", () => {
    render(<Probe enabled={false} />);
    scrollTo(300);
    expect(screen.getByTestId("out")).toHaveTextContent("up");
  });
});
