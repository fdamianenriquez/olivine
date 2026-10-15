import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Image } from "./Image";

const SRC = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

afterEach(() => vi.restoreAllMocks());

describe("Image", () => {
  it("renders an img with alt, className and native props", () => {
    render(<Image src={SRC} alt="Composition" className="x" id="pic" />);
    const img = screen.getByAltText("Composition");
    expect(img.tagName).toBe("IMG");
    expect(img).toHaveClass("ol-img", "x");
    expect(img).not.toHaveClass("ol-img--framed", "ol-img--mono");
    expect(img).toHaveAttribute("id", "pic");
  });

  it("maps framed and mono to modifier classes", () => {
    render(<Image src={SRC} alt="a" framed mono />);
    expect(screen.getByAltText("a")).toHaveClass("ol-img--framed", "ol-img--mono");
  });

  it("passes native img props", () => {
    render(
      <Image src={SRC} alt="a" loading="lazy" srcSet={`${SRC} 2x`} width={160} height={120} />,
    );
    const img = screen.getByAltText("a");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("srcset", `${SRC} 2x`);
    expect(img).toHaveAttribute("width", "160");
  });

  it("keeps an empty alt for decorative images", () => {
    const { container } = render(<Image src={SRC} alt="" />);
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("warns in development when alt is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    // @ts-expect-error alt is required in the type
    render(<Image src={SRC} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Image"));
  });

  it("does not warn when alt is empty", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Image src={SRC} alt="" />);
    expect(warn).not.toHaveBeenCalled();
  });

  it("forwards the ref to the img", () => {
    const ref = createRef<HTMLImageElement>();
    render(<Image ref={ref} src={SRC} alt="a" />);
    expect(ref.current).toBe(screen.getByAltText("a"));
  });

  it('has no axe violations with alt or with alt=""', async () => {
    const { container } = render(
      <>
        <Image src={SRC} alt="Composition" framed mono />
        <Image src={SRC} alt="" />
      </>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
