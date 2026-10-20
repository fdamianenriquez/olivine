import { render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

import { Popover } from "../components/Popover";
import { Tooltip } from "../components/Tooltip";

// React logs the element.ref error once per page, so the first render in this file is the one that
// can catch it: keep Tooltip first.
let error: MockInstance<typeof console.error>;

beforeEach(() => {
  error = vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe.each([
  ["Tooltip", (child: React.ReactElement) => <Tooltip content="Copy">{child}</Tooltip>],
  [
    "Popover",
    (child: React.ReactElement) => <Popover title="Filters" content="Body" trigger={child} />,
  ],
])("%s around a child with a ref", (_name, wrap) => {
  it("sets an object ref without logging an error", () => {
    const ref = createRef<HTMLButtonElement>();
    render(wrap(<button ref={ref}>Open</button>));
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(error).not.toHaveBeenCalled();
  });

  it("calls a callback ref without logging an error", () => {
    const ref = vi.fn();
    const { unmount } = render(wrap(<button ref={ref}>Open</button>));
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
    unmount();
    expect(ref).toHaveBeenLastCalledWith(null);
    expect(error).not.toHaveBeenCalled();
  });
});
