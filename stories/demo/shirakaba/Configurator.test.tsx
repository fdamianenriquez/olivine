import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Root } from "../../../src";
import { Configurator } from "./Configurator";
import { DEFAULT_CONFIG } from "./data";

const noop = () => () => undefined;

function Body() {
  return (
    <Root locale="en">
      <Configurator cfg={DEFAULT_CONFIG} set={noop} step={1} setStep={() => undefined} />
    </Root>
  );
}

describe("case cavities", () => {
  it("show the photograph of each sample", () => {
    const { container } = render(<Body />);
    // Four woods and six finishes on the Body step.
    expect(container.querySelectorAll("img.sg-piece__img")).toHaveLength(10);
    expect(container.querySelectorAll("svg.sg-piece__svg")).toHaveLength(0);
    expect(screen.getAllByRole("radio")).toHaveLength(10);
  });

  it("fall back to the vector swatch when the photograph is missing", async () => {
    vi.resetModules();
    vi.doMock("./images", () => ({ PHOTOS: {}, photo: () => undefined }));
    const { Configurator: Bare } = await import("./Configurator");
    const { container } = render(
      <Root locale="en">
        <Bare cfg={DEFAULT_CONFIG} set={noop} step={1} setStep={() => undefined} />
      </Root>,
    );
    expect(container.querySelectorAll("img.sg-piece__img")).toHaveLength(0);
    expect(container.querySelectorAll("svg.sg-piece__svg")).toHaveLength(10);
    vi.doUnmock("./images");
  });
});
