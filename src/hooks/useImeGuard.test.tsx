import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useImeGuard } from "./useImeGuard";

function Field({ onEnter }: { onEnter: () => void }) {
  const ime = useImeGuard();
  return (
    <input
      aria-label="Query"
      onCompositionStart={ime.onCompositionStart}
      onCompositionEnd={ime.onCompositionEnd}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !ime.isComposing(event)) onEnter();
      }}
    />
  );
}

describe("useImeGuard", () => {
  it("ignores Enter while composing and in the task that ends the composition", () => {
    vi.useFakeTimers();
    const onEnter = vi.fn();
    render(<Field onEnter={onEnter} />);
    const input = screen.getByRole("textbox");
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onEnter).not.toHaveBeenCalled();
    act(() => {
      vi.runAllTimers();
    });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onEnter).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
