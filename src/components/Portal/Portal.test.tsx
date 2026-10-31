import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { Portal } from "./Portal";

function Island({ theme = "sumi" }: { theme?: string }) {
  const anchor = useRef<HTMLSpanElement>(null);
  return (
    <div data-theme={theme} data-testid="island">
      <span ref={anchor}>anchor</span>
      <Portal anchor={anchor}>
        <p>floated</p>
      </Portal>
    </div>
  );
}

describe("Portal", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("follows the island's theme while open", async () => {
    render(<Island />);
    const layer = screen.getByText("floated").parentElement;
    expect(layer).toHaveAttribute("data-theme", "sumi");
    await act(async () => {
      screen.getByTestId("island").setAttribute("data-theme", "washi");
      await Promise.resolve();
    });
    expect(layer).toHaveAttribute("data-theme", "washi");
  });

  it("does not copy a theme set on <html>, so the layer inherits it", () => {
    document.documentElement.setAttribute("data-theme", "sumi");
    function Page() {
      const anchor = useRef<HTMLSpanElement>(null);
      return (
        <>
          <span ref={anchor} />
          <Portal anchor={anchor}>
            <p>floated</p>
          </Portal>
        </>
      );
    }
    render(<Page />);
    expect(screen.getByText("floated").parentElement).not.toHaveAttribute("data-theme");
  });

  it("renders nothing while the container is null, then into it", () => {
    const box = document.createElement("div");
    document.body.append(box);
    const { rerender } = render(
      <Portal container={null}>
        <p>floated</p>
      </Portal>,
    );
    expect(screen.queryByText("floated")).toBeNull();
    rerender(
      <Portal container={box}>
        <p>floated</p>
      </Portal>,
    );
    expect(screen.getByText("floated").parentElement?.parentElement).toBe(box);
    box.remove();
  });

  it("marks a keepActive layer", () => {
    render(
      <Portal keepActive>
        <p>floated</p>
      </Portal>,
    );
    const layer = screen.getByText("floated").parentElement;
    expect(layer).toHaveAttribute("data-ol-keep-active");
  });

  it("copies lang and dir from the anchor and renders nothing on the server", () => {
    function Page() {
      const anchor = useRef<HTMLSpanElement>(null);
      return (
        <div lang="ja" dir="rtl">
          <span ref={anchor} />
          <Portal anchor={anchor}>
            <p>floated</p>
          </Portal>
        </div>
      );
    }
    expect(renderToString(<Page />)).not.toContain("floated");
    render(<Page />);
    const layer = screen.getByText("floated").parentElement;
    expect(layer).toHaveAttribute("lang", "ja");
    expect(layer).toHaveAttribute("dir", "rtl");
  });
});
