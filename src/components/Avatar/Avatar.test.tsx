import { fireEvent, render, screen } from "@testing-library/react";
import { createRef, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Tooltip } from "../Tooltip";
import { Avatar, AvatarGroup } from "./Avatar";
import { deriveInitials, graphemes } from "./initials";

afterEach(() => {
  vi.restoreAllMocks();
});

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("element not found");
  return value;
}

const PHOTO = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

describe("initials", () => {
  it.each([
    ["Haruka Mori", "HM"],
    ["Sora Ito", "SI"],
    ["Cher", "C"],
    ["  ana   garcía   lópez ", "AL"],
    ["émile zola", "ÉZ"],
    ["", ""],
  ])("Latin: first letter of the first and last word (%s)", (name, expected) => {
    expect(deriveInitials(name).text).toBe(expected);
  });

  it("CJK: first character of the first word, family name first, tagged with a language", () => {
    expect(deriveInitials("田中 太郎")).toEqual({ text: "田", cjk: "ja" });
    expect(deriveInitials("田中太郎")).toEqual({ text: "田", cjk: "ja" });
    expect(deriveInitials("さくら")).toEqual({ text: "さ", cjk: "ja" });
    expect(deriveInitials("김 민준")).toEqual({ text: "김", cjk: "ko" });
  });

  it("takes graphemes, not UTF-16 units", () => {
    expect(deriveInitials("𠮷野 家").text).toBe("𠮷");
    expect(deriveInitials("émile zola").text).toBe("ÉZ");
    expect(graphemes("葛\u{E0100}城")).toEqual(["葛\u{E0100}", "城"]);
  });

  it("upper-cases with the name's language when given", () => {
    expect(deriveInitials("ilkay irmak", "tr").text).toBe("İİ");
    expect(deriveInitials("ilkay irmak").text).toBe("II");
    expect(deriveInitials("ilkay irmak", "not a tag!").text).toBe("II");
  });

  it("falls back to code points without Intl.Segmenter", async () => {
    vi.resetModules();
    const original = Intl.Segmenter;
    // @ts-expect-error -- simulate an engine without Intl.Segmenter
    delete Intl.Segmenter;
    try {
      const fresh = await import("./initials");
      expect(fresh.graphemes("𠮷野")).toEqual(["𠮷", "野"]);
    } finally {
      Object.defineProperty(Intl, "Segmenter", {
        configurable: true,
        writable: true,
        value: original,
      });
    }
  });
});

describe("Avatar", () => {
  describe("kinds and naming", () => {
    it("is a role=img named by the name, with initials drawn from data", () => {
      const ref = createRef<HTMLSpanElement>();
      const { container } = render(
        <Avatar ref={ref} name="Emi Kato" className="x" data-testid="a" />,
      );
      const img = screen.getByRole("img", { name: "Emi Kato" });
      expect(img).toBe(ref.current);
      expect(img).toHaveClass("ol-avatar", "ol-avatar--m", "ol-avatar--initials", "x");
      expect(img).not.toHaveAttribute("title");
      const initials = must(container.querySelector(".ol-avatar__initials"));
      expect(initials).toHaveTextContent("EK");
      expect(initials).toHaveAttribute("aria-hidden", "true");
      expect(initials).not.toHaveAttribute("lang");
    });

    it("tags CJK initials with a language and the Japanese face class", () => {
      const { container } = render(<Avatar name="森 春香" />);
      const initials = must(container.querySelector(".ol-avatar__initials"));
      expect(initials).toHaveTextContent("森");
      expect(initials).toHaveAttribute("lang", "ja");
      expect(initials).toHaveClass("ol-avatar__initials--cjk");
    });

    it("uses the initials override, tagging it when it is CJK", () => {
      const { container, rerender } = render(<Avatar name="Ana García López" initials="AG" />);
      expect(container.querySelector(".ol-avatar__initials")).toHaveTextContent("AG");
      rerender(<Avatar name="Tanaka Taro" initials="田" />);
      expect(container.querySelector(".ol-avatar__initials")).toHaveAttribute("lang", "ja");
    });

    it("upper-cases with the lang prop", () => {
      const { container } = render(<Avatar name="ilkay irmak" lang="tr" />);
      const initials = container.querySelector(".ol-avatar__initials");
      expect(initials).toHaveTextContent("İİ");
      expect(initials).toHaveAttribute("lang", "tr");
      expect(screen.getByRole("img")).not.toHaveAttribute("lang");
    });

    it("keeps the status word in the locale's language; lang only tags the visible name", () => {
      const { container } = render(
        <Root locale="es">
          <Avatar name="Tanaka" lang="ja" status="busy" />
          <Avatar name="Tanaka" lang="ja" status="busy" showName data-testid="l" />
        </Root>,
      );
      expect(screen.getByRole("img", { name: "Tanaka, Ocupado" })).not.toHaveAttribute("lang");
      expect(screen.getByTestId("l")).not.toHaveAttribute("lang");
      expect(container.querySelector(".ol-avatar-label__name")).toHaveAttribute("lang", "ja");
      expect(container.querySelector(".ol-avatar-label__meta")).not.toHaveAttribute("lang");
    });

    it.each(["xs", "s", "m", "l", "xl"] as const)("sets the %s size class", (size) => {
      render(<Avatar name="Sora Ito" size={size} />);
      expect(screen.getByRole("img")).toHaveClass(`ol-avatar--${size}`);
    });

    it("draws a negative shu seal by default, one kanji centred", () => {
      const { container } = render(<Avatar name="Haruka Mori" kanji="森" />);
      expect(screen.getByRole("img", { name: "Haruka Mori" })).toHaveClass("ol-avatar--seal");
      const seal = must(container.querySelector(".ol-avatar__seal"));
      expect(seal).toHaveClass(
        "ol-stamp",
        "ol-stamp--negative",
        "ol-stamp--shu",
        "ol-avatar__seal--1",
      );
      expect(seal).not.toHaveClass("ol-stamp--vertical", "ol-stamp--square", "ol-stamp--press");
      expect(seal).toHaveAttribute("lang", "ja");
      expect(seal).toHaveAttribute("aria-hidden", "true");
      expect(seal).toHaveTextContent("森");
    });

    it("stands two kanji in a column and makes 3–4 a square seal; ink and olivo inks", () => {
      const { container, rerender } = render(<Avatar name="Daichi Ueno" kanji="上野" ink="ink" />);
      let seal = must(container.querySelector(".ol-avatar__seal"));
      expect(seal).toHaveClass("ol-stamp--vertical", "ol-avatar__seal--2");
      expect(seal).not.toHaveClass("ol-stamp--shu", "ol-stamp--olivo");
      rerender(<Avatar name="Shirakaba Gakki" kanji="白樺楽器" ink="olivo" />);
      seal = must(container.querySelector(".ol-avatar__seal"));
      expect(seal).toHaveClass("ol-stamp--square", "ol-stamp--olivo", "ol-avatar__seal--4");
      rerender(<Avatar name="Three" kanji="白樺楽" />);
      expect(container.querySelector(".ol-avatar__seal")).toHaveClass("ol-avatar__seal--3");
    });

    it("cuts seals to four kanji, and to two at xs, with a dev warning", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const { container, rerender } = render(<Avatar name="Long" kanji="白樺楽器店" />);
      expect(container.querySelector(".ol-avatar__seal")).toHaveTextContent(/^白樺楽器$/);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("four kanji"));
      warn.mockClear();
      rerender(<Avatar name="Shirakaba" kanji="白樺楽器" size="xs" />);
      const seal = must(container.querySelector(".ol-avatar__seal"));
      expect(seal).toHaveTextContent(/^白樺$/);
      expect(seal).toHaveClass("ol-stamp--vertical");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"xs"'));
    });

    it("counts kanji by grapheme", () => {
      const { container } = render(<Avatar name="Katsuragi" kanji={"葛\u{E0100}城"} />);
      expect(container.querySelector(".ol-avatar__seal")).toHaveClass("ol-stamp--vertical");
    });

    it("draws the hanko motion only with press", () => {
      const { container } = render(<Avatar name="Haruka Mori" kanji="森" press />);
      expect(container.querySelector(".ol-avatar__seal")).toHaveClass("ol-stamp--press");
    });

    it("forwards span props but drops onClick from the type", () => {
      // @ts-expect-error -- Avatar is not interactive: wrap it in a Button or Link
      render(<Avatar name="Sora Ito" onClick={() => undefined} style={{ order: 2 }} />);
      expect(screen.getByRole("img")).toHaveStyle({ order: "2" });
    });
  });

  describe("photo", () => {
    it("shows a decorative photo while it loads and on load; the root keeps the name", () => {
      const { container } = render(<Avatar name="Haruka Mori" src={PHOTO} kanji="森" />);
      const root = screen.getByRole("img", { name: "Haruka Mori" });
      expect(root).toHaveClass("ol-avatar--image");
      const photo = must(container.querySelector("img"));
      expect(photo).toHaveAttribute("alt", "");
      expect(photo).toHaveClass("ol-avatar__img");
      fireEvent.load(photo);
      expect(container.querySelector("img")).toBe(photo);
    });

    it("falls back photo → seal → initials when the photo fails", () => {
      const { container, rerender } = render(
        <Avatar name="Abe Kenji" src="broken.png" kanji="阿部" />,
      );
      fireEvent.error(must(container.querySelector("img")));
      expect(container.querySelector("img")).toBeNull();
      expect(container.querySelector(".ol-avatar__seal")).toHaveTextContent("阿部");
      rerender(<Avatar name="Kenji Sato" src="broken.png" />);
      expect(container.querySelector(".ol-avatar__initials")).toHaveTextContent("KS");
    });

    it("tries again when src changes after a failure", () => {
      const { container, rerender } = render(<Avatar name="Abe Kenji" src="broken.png" />);
      fireEvent.error(must(container.querySelector("img")));
      expect(container.querySelector("img")).toBeNull();
      rerender(<Avatar name="Abe Kenji" src={PHOTO} />);
      expect(container.querySelector("img")).toHaveAttribute("src", PHOTO);
      rerender(<Avatar name="Abe Kenji" src="broken.png" />);
      expect(container.querySelector("img")).toHaveAttribute("src", "broken.png");
    });

    it("catches a failure that happened before hydration (complete with no pixels)", async () => {
      vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
      vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(0);
      const { container, findByText } = render(<Avatar name="Kenji Sato" src="gone.png" />);
      expect(await findByText("KS")).toBeInTheDocument();
      expect(container.querySelector("img")).toBeNull();
    });

    it("asks decode() before calling a complete, pixel-less image broken", async () => {
      vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
      vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(0);
      const decode = vi.fn(() => Promise.resolve());
      Object.defineProperty(HTMLImageElement.prototype, "decode", {
        configurable: true,
        value: decode,
      });
      try {
        const { container } = render(<Avatar name="Kenji Sato" src="vector.svg" />);
        await Promise.resolve();
        expect(decode).toHaveBeenCalled();
        expect(container.querySelector("img")).not.toBeNull();
        decode.mockImplementation(() => Promise.reject(new Error("EncodingError")));
        const second = render(<Avatar name="Kenji Sato" src="broken.svg" />);
        expect(await second.findByText("KS")).toBeInTheDocument();
      } finally {
        // @ts-expect-error -- remove the stub; jsdom has no decode()
        delete HTMLImageElement.prototype.decode;
      }
    });

    it("renders the photo on the server and keeps the box", () => {
      const html = renderToString(<Avatar name="Haruka Mori" src={PHOTO} />);
      expect(html).toContain('class="ol-avatar ol-avatar--m ol-avatar--image"');
      expect(html).toContain('alt=""');
    });
  });

  describe("status", () => {
    it.each([
      ["online", "Available"],
      ["away", "Away"],
      ["busy", "Busy"],
      ["offline", "Offline"],
    ] as const)(
      "names %s from the locale and shows the word in the hover title",
      (status, word) => {
        const { container } = render(<Avatar name="Haruka Mori" status={status} />);
        const root = screen.getByRole("img", { name: `Haruka Mori, ${word}` });
        expect(root).toHaveAttribute("title", word);
        const dot = must(container.querySelector(".ol-avatar__status"));
        expect(dot).toHaveClass(`ol-avatar__status--${status}`);
        expect(dot).toHaveAttribute("aria-hidden", "true");
      },
    );

    it("follows the locale", () => {
      render(
        <>
          <Root locale="es">
            <Avatar name="Sora Ito" status="offline" />
          </Root>
          <Root locale="ja">
            <Avatar name="森 春香" status="busy" />
          </Root>
        </>,
      );
      expect(screen.getByRole("img", { name: "Sora Ito, Sin conexión" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "森 春香、取り込み中" })).toBeInTheDocument();
    });

    it("lets a caller replace the title, or wrap the avatar in a Tooltip trigger", () => {
      render(
        <>
          <Avatar name="Daichi Ueno" status="busy" title="Busy until 3 pm" />
          <Tooltip content="Daichi Ueno, Busy" defaultOpen>
            <button type="button">
              <Avatar name="Daichi Ueno" status="busy" title="" />
            </button>
          </Tooltip>
        </>,
      );
      expect(screen.getAllByRole("img", { name: "Daichi Ueno, Busy" })[0]).toHaveAttribute(
        "title",
        "Busy until 3 pm",
      );
      expect(screen.getByRole("button", { name: "Daichi Ueno, Busy" })).toBeInTheDocument();
      expect(screen.getByRole("tooltip")).toHaveTextContent("Daichi Ueno, Busy");
    });
  });

  describe("showName", () => {
    it("makes the mark decorative and the name, status word and meta real text", () => {
      const ref = createRef<HTMLSpanElement>();
      const { container } = render(
        <Avatar
          ref={ref}
          name="Haruka Mori"
          kanji="森"
          status="online"
          meta="Lead luthier"
          showName
          className="x"
          data-testid="label"
        />,
      );
      const wrapper = screen.getByTestId("label");
      expect(wrapper).toBe(ref.current);
      expect(wrapper).toHaveClass("ol-avatar-label", "x");
      expect(screen.queryByRole("img")).toBeNull();
      const mark = must(container.querySelector(".ol-avatar"));
      expect(mark).toHaveAttribute("aria-hidden", "true");
      expect(mark).not.toHaveAttribute("title");
      expect(mark).not.toHaveClass("x");
      expect(container.querySelector(".ol-avatar-label__name")).toHaveTextContent("Haruka Mori");
      const meta = must(container.querySelector(".ol-avatar-label__meta"));
      expect(meta).toHaveTextContent("Available · Lead luthier");
      expect(meta.closest("[aria-hidden]")).toBeNull();
      expect(wrapper).toHaveTextContent("Haruka MoriAvailable · Lead luthier");
    });

    it("prints only what it has", () => {
      const { container, rerender } = render(<Avatar name="Sora Ito" showName />);
      expect(container.querySelector(".ol-avatar-label__meta")).toBeNull();
      rerender(<Avatar name="Sora Ito" showName meta="Thu 11:05" />);
      expect(container.querySelector(".ol-avatar-label__meta")).toHaveTextContent(/^Thu 11:05$/);
      rerender(<Avatar name="Sora Ito" showName status="offline" />);
      expect(container.querySelector(".ol-avatar-label__meta")).toHaveTextContent(/^Offline$/);
    });
  });

  describe("motion", () => {
    it("keeps the press class under reduced motion; motion.css shortens --dur-m to its end state", () => {
      const { container } = render(
        <div className={REDUCE_MOTION_CLASS}>
          <Avatar name="Haruka Mori" kanji="森" press />
        </div>,
      );
      expect(container.querySelector(".ol-stamp--press")).not.toBeNull();
    });

    it("never animates photos or initials", () => {
      const { container } = render(
        <>
          <Avatar name="Haruka Mori" src={PHOTO} press />
          <Avatar name="Sora Ito" press />
        </>,
      );
      expect(container.querySelector(".ol-stamp--press")).toBeNull();
    });
  });
});

describe("AvatarGroup", () => {
  const people = (extra: ReactNode = null) => [
    <Avatar key="1" name="Haruka Mori" kanji="森" />,
    <Avatar key="2" name="Daichi Ueno" kanji="上野" />,
    <Avatar key="3" name="Emi Kato" kanji="加藤" size="xl" showName />,
    <Avatar key="4" name="Sora Ito" />,
    <Avatar key="5" name="Ren Abe" />,
    <Avatar key="6" name="Kenji Sato" />,
    extra,
  ];

  it("is a group named by label; members keep their own names", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <AvatarGroup ref={ref} label="Luthiers on this order" className="x">
        {people()}
      </AvatarGroup>,
    );
    const group = screen.getByRole("group", { name: "Luthiers on this order" });
    expect(group).toBe(ref.current);
    expect(group).toHaveClass("ol-avatar-group", "ol-avatar-group--m", "x");
    for (const name of ["Haruka Mori", "Daichi Ueno", "Emi Kato", "Sora Ito"])
      expect(screen.getByRole("img", { name })).toBeInTheDocument();
  });

  it("shows max members and a +N cell named after the hidden people", () => {
    const { container } = render(<AvatarGroup label="Luthiers">{people()}</AvatarGroup>);
    const more = screen.getByRole("img", { name: "2 more: Ren Abe and Kenji Sato" });
    expect(more).toHaveClass("ol-avatar", "ol-avatar--m", "ol-avatar--more");
    expect(more).toHaveTextContent("+2");
    expect(container.querySelectorAll(".ol-avatar:not(.ol-avatar--more)")).toHaveLength(4);
  });

  it("joins hidden names in the reader's language", () => {
    render(
      <Root locale="ja">
        <AvatarGroup label="職人" max={1}>
          <Avatar name="森" />
          <Avatar name="上野" />
          <Avatar name="加藤" />
        </AvatarGroup>
      </Root>,
    );
    expect(screen.getByRole("img", { name: "ほか2名：上野、加藤" })).toBeInTheDocument();
  });

  it("passes its size to every member through context and hides their names", () => {
    const { container } = render(
      <AvatarGroup label="Luthiers" size="xs" max={7}>
        {people(
          <span key="w">
            <Avatar name="Wrapped Person" />
          </span>,
        )}
      </AvatarGroup>,
    );
    const marks = container.querySelectorAll(".ol-avatar");
    expect(marks.length).toBeGreaterThan(0);
    for (const mark of marks) expect(mark).toHaveClass("ol-avatar--xs");
    expect(container.querySelector(".ol-avatar-label")).toBeNull();
    expect(container.querySelector(".ol-avatar-label__name")).toBeNull();
  });

  it("warns about children that are not avatars and leaves them out of the +N names", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <AvatarGroup label="Luthiers" max={1}>
        <Avatar name="Haruka Mori" />
        <span>
          <Avatar name="Wrapped" />
        </span>
        <Avatar name="Sora Ito" />
      </AvatarGroup>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("AvatarGroup"));
    expect(screen.getByRole("img", { name: "2 more: Sora Ito" })).toHaveTextContent("+2");
  });

  it("counts hidden children that are not avatars without naming them", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <AvatarGroup label="Luthiers" max={1}>
        <Avatar name="Haruka Mori" />
        <span>A</span>
        <span>B</span>
      </AvatarGroup>,
    );
    expect(screen.getByRole("img", { name: "2 more" })).toHaveTextContent("+2");
  });

  it.each([0, -3, Number.NaN, Number.POSITIVE_INFINITY])("falls back to 4 for max=%s", (max) => {
    render(
      <AvatarGroup label="Luthiers" max={max}>
        {people()}
      </AvatarGroup>,
    );
    expect(screen.getByRole("img", { name: /^2 more/ })).toBeInTheDocument();
  });

  it("has no +N cell when everyone fits", () => {
    const { container } = render(
      <AvatarGroup label="Luthiers" max={2.9}>
        <Avatar name="Haruka Mori" />
        <Avatar name="Sora Ito" />
      </AvatarGroup>,
    );
    expect(container.querySelector(".ol-avatar--more")).toBeNull();
  });
});

describe("axe", () => {
  it.each(["washi", "sumi"] as const)("has no violations in %s", async (theme) => {
    const { container } = render(
      <Root theme={theme}>
        <Avatar name="Haruka Mori" kanji="森" status="online" />
        <Avatar name="Emi Kato" src={PHOTO} />
        <Avatar name="田中 太郎" />
        <Avatar name="Daichi Ueno" kanji="上野" status="busy" meta="Mon 9:12" showName />
        <AvatarGroup label="Luthiers on this order" max={2}>
          <Avatar name="Haruka Mori" kanji="森" />
          <Avatar name="Sora Ito" status="offline" />
          <Avatar name="Ren Abe" />
        </AvatarGroup>
        <button type="button">
          <Avatar name="Sora Ito" size="xs" />
        </button>
        <Avatar name="Abe Kenji" kanji="阿部" press size="xl" />
        <AvatarGroup label="Watching" size="xs" max={2}>
          <Avatar name="Haruka Mori" status="online" />
          <Avatar name="Daichi Ueno" kanji="上野" status="busy" />
          <Avatar name="Sora Ito" status="away" />
        </AvatarGroup>
        <Tooltip content="Emi Kato, Away" defaultOpen>
          <button type="button">
            <Avatar name="Emi Kato" status="away" title="" />
          </button>
        </Tooltip>
      </Root>,
    );
    // The body, so the tooltip's portal is checked too; landmarks are the page's job.
    expect(
      await runAxe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
    container.remove();
  });

  it("has no violations in Japanese with CJK initials and seals", async () => {
    const { container } = render(
      <Root locale="ja">
        <Avatar name="田中 太郎" status="online" />
        <Avatar name="森 春香" kanji="森" status="busy" showName meta="主任" />
        <AvatarGroup label="職人" max={1}>
          <Avatar name="上野 大地" />
          <Avatar name="加藤 恵美" />
        </AvatarGroup>
      </Root>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
