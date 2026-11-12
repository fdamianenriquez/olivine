import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { repeatable, useStatusMessage } from "./useStatusMessage";

const NBSP = " ";

describe("useStatusMessage", () => {
  it("starts empty and sets a message", () => {
    const { result } = renderHook(() => useStatusMessage());
    expect(result.current.message).toBe("");
    act(() => {
      result.current.announce("Removed");
    });
    expect(result.current.message).toBe("Removed");
  });

  it("changes a repeated message so it is read again, alternating", () => {
    const { result } = renderHook(() => useStatusMessage());
    act(() => {
      result.current.announce("Removed");
    });
    act(() => {
      result.current.announce("Removed");
    });
    expect(result.current.message).toBe(`Removed${NBSP}`);
    act(() => {
      result.current.announce("Removed");
    });
    expect(result.current.message).toBe("Removed");
  });

  it("clears the message", () => {
    const { result } = renderHook(() => useStatusMessage());
    act(() => {
      result.current.announce("Removed");
    });
    act(() => {
      result.current.clear();
    });
    expect(result.current.message).toBe("");
  });

  it("keeps announce and clear stable across renders", () => {
    const { result, rerender } = renderHook(() => useStatusMessage());
    const { announce, clear } = result.current;
    rerender();
    expect(result.current.announce).toBe(announce);
    expect(result.current.clear).toBe(clear);
  });
});

describe("repeatable", () => {
  it("alternates a trailing no-break space with the count", () => {
    expect(repeatable("Copied", 1)).toBe("Copied");
    expect(repeatable("Copied", 2)).toBe(`Copied${NBSP}`);
    expect(repeatable("Copied", 3)).toBe("Copied");
  });

  it("leaves an empty message empty", () => {
    expect(repeatable("", 2)).toBe("");
  });
});
