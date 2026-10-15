import { act, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useControllable } from "./useControllable";
import { FieldContext, type FieldContextValue, useFieldControl } from "./useFieldControl";

describe("useControllable", () => {
  it("keeps its own state when uncontrolled", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllable<number | undefined>(undefined, 1, onChange),
    );
    act(() => {
      result.current[1](2);
    });
    expect(result.current[0]).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("follows the value when controlled", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllable<number>(5, 1, onChange));
    act(() => {
      result.current[1](9);
    });
    expect(result.current[0]).toBe(5);
    expect(onChange).toHaveBeenCalledWith(9);
  });
});

function makeField(overrides: Partial<FieldContextValue> = {}): FieldContextValue {
  let owner: string | null = null;
  return {
    id: "field-1",
    describedBy: "field-1-hint",
    invalid: true,
    required: true,
    claim: (id) => {
      owner ??= id;
      return owner === id;
    },
    ...overrides,
  };
}

function Control(props: { id?: string; "aria-describedby"?: string; testId: string }) {
  const { testId, ...rest } = props;
  return <input data-testid={testId} {...useFieldControl(rest)} />;
}

describe("useFieldControl", () => {
  it("returns props unchanged outside a Field", () => {
    const { result } = renderHook(() => useFieldControl({ id: "x" }));
    expect(result.current).toEqual({ id: "x" });
  });

  it("gives the first control the id and every control the description", () => {
    const field = makeField();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FieldContext.Provider value={field}>{children}</FieldContext.Provider>
    );
    render(
      <>
        <Control testId="a" aria-describedby="own" />
        <Control testId="b" />
      </>,
      { wrapper },
    );
    const a = screen.getByTestId("a");
    const b = screen.getByTestId("b");
    expect(a).toHaveAttribute("id", "field-1");
    expect(a).toHaveAttribute("aria-describedby", "field-1-hint own");
    expect(a).toHaveAttribute("aria-invalid", "true");
    expect(a).toBeRequired();
    expect(b).not.toHaveAttribute("id");
    expect(b).toHaveAttribute("aria-describedby", "field-1-hint");
  });

  it("lets an explicit id win", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FieldContext.Provider value={makeField({ invalid: false })}>
        {children}
      </FieldContext.Provider>
    );
    render(<Control testId="c" id="mine" />, { wrapper });
    expect(screen.getByTestId("c")).toHaveAttribute("id", "mine");
    expect(screen.getByTestId("c")).not.toHaveAttribute("aria-invalid");
  });
});
