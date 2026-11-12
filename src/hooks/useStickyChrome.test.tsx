import { render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useStickyChrome } from "./useStickyChrome";

const root = () => document.documentElement;

function Chrome({
  height,
  sticky = true,
  active = true,
  id,
}: {
  height: number;
  sticky?: boolean;
  active?: boolean;
  id: string;
}) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  useStickyChrome(node, active);
  return (
    <div
      ref={(el) => {
        if (el) {
          el.getBoundingClientRect = () => ({ height }) as DOMRect;
          el.style.position = sticky ? "sticky" : "static";
        }
        setNode(el);
      }}
      data-testid={id}
    />
  );
}

describe("useStickyChrome", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stacks sticky chrome in document order and publishes the total offset", () => {
    const { getByTestId, unmount } = render(
      <>
        <Chrome id="nav" height={56} />
        <Chrome id="banner" height={72} />
      </>,
    );
    expect(getByTestId("nav").style.getPropertyValue("--ol-sticky-top")).toBe("0px");
    expect(getByTestId("banner").style.getPropertyValue("--ol-sticky-top")).toBe("56px");
    expect(root().style.getPropertyValue("--ol-sticky-offset")).toBe("128px");
    unmount();
    expect(root().style.getPropertyValue("--ol-sticky-offset")).toBe("");
  });

  it("works with the banner above the navbar", () => {
    const { getByTestId, unmount } = render(
      <>
        <Chrome id="banner" height={72} />
        <Chrome id="nav" height={56} />
      </>,
    );
    expect(getByTestId("banner").style.getPropertyValue("--ol-sticky-top")).toBe("0px");
    expect(getByTestId("nav").style.getPropertyValue("--ol-sticky-top")).toBe("72px");
    unmount();
  });

  it("does not count chrome that is not sticky right now (a static banner on a phone)", () => {
    const { getByTestId, unmount } = render(
      <>
        <Chrome id="banner" height={72} sticky={false} />
        <Chrome id="nav" height={56} />
      </>,
    );
    expect(getByTestId("nav").style.getPropertyValue("--ol-sticky-top")).toBe("0px");
    expect(root().style.getPropertyValue("--ol-sticky-offset")).toBe("56px");
    unmount();
  });

  it("drops an element and its top when it stops being active", () => {
    const { getByTestId, rerender, unmount } = render(
      <>
        <Chrome id="nav" height={56} />
        <Chrome id="banner" height={72} />
      </>,
    );
    rerender(
      <>
        <Chrome id="nav" height={56} />
        <Chrome id="banner" height={72} active={false} />
      </>,
    );
    expect(getByTestId("banner").style.getPropertyValue("--ol-sticky-top")).toBe("");
    expect(root().style.getPropertyValue("--ol-sticky-offset")).toBe("56px");
    unmount();
    expect(root().style.getPropertyValue("--ol-sticky-offset")).toBe("");
  });
});
