import { readFileSync } from "node:fs";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, Fragment } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Badge } from "../Badge";
import { Link } from "../Link";
import { Root } from "../Root";
import { DescriptionList, type DescriptionListEntry } from "./DescriptionList";

afterEach(() => vi.restoreAllMocks());

const entries: DescriptionListEntry[] = [
  { term: "Body wood", description: "Birch" },
  { term: "Scale length", description: "648", numeric: true, unit: "mm" },
  { term: "Serial", description: "SK-0042-A", mono: true },
];

describe("DescriptionList", () => {
  it("renders data rows as dl > div > dt + dd with no roles or extra attributes", () => {
    const { container } = render(<DescriptionList items={entries} data-testid="dl" />);
    const dl = screen.getByTestId("dl");
    expect(dl.tagName).toBe("DL");
    expect(dl).toHaveClass("ol-dl");
    const rows = Array.from(dl.children);
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.tagName).toBe("DIV");
      expect(row).toHaveClass("ol-dl__item");
      expect(Array.from(row.children).map((c) => c.tagName)).toEqual(["DT", "DD"]);
    }
    expect(
      container.querySelector("[role], [aria-label], [aria-labelledby], [tabindex]"),
    ).toBeNull();
    expect(screen.getByText("Body wood").tagName).toBe("DT");
    expect(screen.getByText("Birch").tagName).toBe("DD");
  });

  it("renders parts from children and ignores items when children are given", () => {
    render(
      <DescriptionList items={entries}>
        <DescriptionList.Item term="Finish">Satin</DescriptionList.Item>
      </DescriptionList>,
    );
    expect(screen.getByText("Satin")).toBeInTheDocument();
    expect(screen.queryByText("Body wood")).not.toBeInTheDocument();
  });

  it("renders nothing inside the list when there are no rows", () => {
    const { container } = render(<DescriptionList />);
    expect(container.querySelector("dl")).toBeEmptyDOMElement();
  });

  it("renders several terms and several values for one row", () => {
    render(
      <DescriptionList
        items={[
          { term: ["Neck", "Fretboard"], description: "Maple", key: "neck" },
          { term: "Pickups", description: ["Bridge", "Neck"] },
        ]}
        data-testid="dl"
      />,
    );
    const [first, second] = Array.from(screen.getByTestId("dl").children);
    expect(Array.from(first?.children ?? []).map((c) => c.tagName)).toEqual(["DT", "DT", "DD"]);
    expect(Array.from(second?.children ?? []).map((c) => c.tagName)).toEqual(["DT", "DD", "DD"]);
    expect(screen.getByText("Fretboard")).toHaveClass("ol-dl__term");
  });

  it("does not wrap Description children a second time", () => {
    render(
      <DescriptionList data-testid="dl">
        <DescriptionList.Item term="Colour">
          <DescriptionList.Description>Natural</DescriptionList.Description>
          <DescriptionList.Description>Black</DescriptionList.Description>
        </DescriptionList.Item>
      </DescriptionList>,
    );
    const row = screen.getByTestId("dl").firstElementChild;
    expect(row?.querySelectorAll("dd")).toHaveLength(2);
    expect(row?.querySelector("dd dd")).toBeNull();
  });

  it("finds Description elements inside a fragment", () => {
    render(
      <DescriptionList data-testid="dl">
        <DescriptionList.Item term="Colour">
          <Fragment>
            <DescriptionList.Description>Natural</DescriptionList.Description>
            <DescriptionList.Description>Black</DescriptionList.Description>
          </Fragment>
        </DescriptionList.Item>
      </DescriptionList>,
    );
    expect(screen.getByTestId("dl").querySelectorAll("dd")).toHaveLength(2);
  });

  it("accepts bare Term elements next to Descriptions", () => {
    render(
      <DescriptionList data-testid="dl">
        <DescriptionList.Item>
          <DescriptionList.Term>Neck</DescriptionList.Term>
          <DescriptionList.Term>Fretboard</DescriptionList.Term>
          <DescriptionList.Description>Maple</DescriptionList.Description>
        </DescriptionList.Item>
      </DescriptionList>,
    );
    expect(screen.getByTestId("dl").querySelectorAll("dt")).toHaveLength(2);
    expect(screen.getByText("Maple").tagName).toBe("DD");
  });

  it("maps orientation, variant, dense and termWidth to classes", () => {
    render(
      <DescriptionList
        items={entries}
        orientation="vertical"
        variant="bordered"
        dense
        termWidth="l"
        data-testid="dl"
      />,
    );
    expect(screen.getByTestId("dl")).toHaveClass(
      "ol-dl--vertical",
      "ol-dl--bordered",
      "ol-dl--dense",
      "ol-dl--term-l",
    );
  });

  it("defaults to the ruled horizontal layout with the medium term column", () => {
    render(<DescriptionList items={entries} data-testid="dl" />);
    const dl = screen.getByTestId("dl");
    expect(dl).toHaveClass("ol-dl--term-m");
    for (const modifier of ["vertical", "bordered", "plain", "dense"]) {
      expect(dl).not.toHaveClass(`ol-dl--${modifier}`);
    }
  });

  it("marks the plain variant", () => {
    render(<DescriptionList items={entries} variant="plain" data-testid="dl" />);
    expect(screen.getByTestId("dl")).toHaveClass("ol-dl--plain");
  });

  it("forwards ref, id, className and other dl props to the root", () => {
    const ref = createRef<HTMLDListElement>();
    render(<DescriptionList ref={ref} id="spec" className="extra" lang="ja" items={entries} />);
    expect(ref.current).toBeInstanceOf(HTMLDListElement);
    expect(ref.current).toHaveAttribute("id", "spec");
    expect(ref.current).toHaveClass("ol-dl", "extra");
    expect(ref.current).toHaveAttribute("lang", "ja");
  });

  it("forwards props and refs on Item, Term and Description", () => {
    const item = createRef<HTMLDivElement>();
    const term = createRef<HTMLElement>();
    const desc = createRef<HTMLElement>();
    render(
      <DescriptionList>
        <DescriptionList.Item ref={item} className="row" data-testid="row">
          <DescriptionList.Term ref={term} className="t">
            Neck
          </DescriptionList.Term>
          <DescriptionList.Description ref={desc} className="d">
            Maple
          </DescriptionList.Description>
        </DescriptionList.Item>
      </DescriptionList>,
    );
    expect(item.current).toBe(screen.getByTestId("row"));
    expect(item.current).toHaveClass("ol-dl__item", "row");
    expect(term.current).toHaveClass("ol-dl__term", "t");
    expect(desc.current).toHaveClass("ol-dl__desc", "d");
  });

  describe("numeric and mono values", () => {
    it("sets a numeric value in the figure span and the unit outside it", () => {
      render(<DescriptionList items={entries} />);
      const dd = screen.getByText("648").closest("dd");
      expect(dd).toHaveClass("ol-dl__desc--numeric");
      const fig = screen.getByText("648");
      expect(fig).toHaveClass("ol-dl__fig");
      const unit = screen.getByText("mm");
      expect(unit).toHaveClass("ol-dl__unit");
      expect(fig).not.toContainElement(unit);
      expect(dd).toHaveTextContent("648 mm");
    });

    it("renders a numeric value without a unit", () => {
      render(
        <DescriptionList items={[{ term: "Price", description: "¥480,000", numeric: true }]} />,
      );
      expect(screen.getByText("¥480,000")).toHaveClass("ol-dl__fig");
      expect(document.querySelector(".ol-dl__unit")).toBeNull();
    });

    it("sets a mono value in the mono class and leaves text values plain", () => {
      render(<DescriptionList items={entries} />);
      expect(screen.getByText("SK-0042-A")).toHaveClass("ol-dl__desc--mono");
      expect(screen.getByText("Birch")).not.toHaveClass(
        "ol-dl__desc--mono",
        "ol-dl__desc--numeric",
      );
    });

    it("lets numeric win over mono and warns", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <DescriptionList items={[{ term: "No.", description: "42", numeric: true, mono: true }]} />,
      );
      expect(screen.getByText("42").closest("dd")).not.toHaveClass("ol-dl__desc--mono");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("not combined"));
    });

    it("applies numeric, mono and unit to every value of an array", () => {
      render(
        <DescriptionList
          items={[{ term: "Range", description: ["24", "648"], numeric: true, unit: "mm" }]}
        />,
      );
      expect(document.querySelectorAll(".ol-dl__fig")).toHaveLength(2);
      expect(document.querySelectorAll(".ol-dl__unit")).toHaveLength(2);
    });

    it("applies numeric, mono and unit from an Item to its generated value", () => {
      render(
        <DescriptionList>
          <DescriptionList.Item term="Lead time" numeric unit="weeks">
            14
          </DescriptionList.Item>
        </DescriptionList>,
      );
      expect(screen.getByText("14")).toHaveClass("ol-dl__fig");
      expect(screen.getByText("weeks")).toHaveClass("ol-dl__unit");
    });

    it("warns when a numeric value holds words", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <DescriptionList items={[{ term: "Lead time", description: "14 weeks", numeric: true }]} />,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("put words in `unit`"));
    });

    it("warns when Item props cannot reach custom Description children", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <DescriptionList>
          <DescriptionList.Item term="Lead time" numeric>
            <DescriptionList.Description>14</DescriptionList.Description>
          </DescriptionList.Item>
        </DescriptionList>,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("set them on each `Description`"));
    });
  });

  describe("empty values", () => {
    it.each([
      ["null", null],
      ["undefined", undefined],
      ["false", false],
      ["an empty string", ""],
      ["an empty array", []],
    ])("shows the empty glyph and the spoken string for %s", (_name, description) => {
      render(<DescriptionList items={[{ term: "Finish", description }]} />);
      const dd = screen.getByText("Finish").nextElementSibling as HTMLElement;
      expect(within(dd).getByText("—")).toHaveAttribute("aria-hidden", "true");
      expect(within(dd).getByText("Not provided")).toHaveClass("ol-sr");
      expect(dd).toHaveTextContent("—Not provided");
    });

    it.each([
      ["the number 0", 0],
      ['the string "0"', "0"],
    ])("treats %s as a value", (_name, description) => {
      render(<DescriptionList items={[{ term: "Count", description }]} />);
      expect(screen.queryByText("Not provided")).not.toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("uses the emptyValue of the list, then the one of the row", () => {
      render(
        <DescriptionList emptyValue="n/a">
          <DescriptionList.Item term="One">{null}</DescriptionList.Item>
          <DescriptionList.Item term="Two" emptyValue="none">
            {null}
          </DescriptionList.Item>
        </DescriptionList>,
      );
      expect(screen.getByText("n/a")).toHaveAttribute("aria-hidden", "true");
      expect(screen.getByText("none")).toHaveAttribute("aria-hidden", "true");
      expect(screen.getAllByText("Not provided")).toHaveLength(2);
    });

    it("keeps a row for an empty description in the data shorthand", () => {
      render(<DescriptionList items={[{ term: "Finish", description: null }]} data-testid="dl" />);
      expect(screen.getByTestId("dl").querySelectorAll(".ol-dl__item")).toHaveLength(1);
    });

    it("shows the empty glyph instead of the figure and the unit in a numeric value", () => {
      render(
        <DescriptionList
          items={[{ term: "Weight", description: null, numeric: true, unit: "kg" }]}
        />,
      );
      expect(document.querySelector(".ol-dl__fig")).toBeNull();
      expect(screen.queryByText("kg")).not.toBeInTheDocument();
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("speaks the string of each locale", () => {
      const { rerender } = render(
        <Root locale="es">
          <DescriptionList items={[{ term: "Finish", description: null }]} />
        </Root>,
      );
      expect(screen.getByText("No indicado")).toBeInTheDocument();
      rerender(
        <Root locale="ja">
          <DescriptionList items={[{ term: "Finish", description: null }]} />
        </Root>,
      );
      expect(screen.getByText("記載なし")).toBeInTheDocument();
    });
  });

  describe("keys", () => {
    it("warns about duplicate keys and about terms that are not strings", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <DescriptionList
          items={[
            { term: "Wood", description: "Birch" },
            { term: "Wood", description: "Maple" },
            { term: <em>Neck</em>, description: "Maple" },
          ]}
        />,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('duplicate item key "Wood"'));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("needs a `key`"));
      expect(screen.getAllByText("Maple")).toHaveLength(2);
    });

    it("does not warn when keys are given or terms are unique strings", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <DescriptionList
          items={[
            { term: "Wood", description: "Birch" },
            { key: "neck", term: <em>Neck</em>, description: "Maple" },
          ]}
        />,
      );
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe("keyboard", () => {
    it("never takes focus; Tab stops only on interactive content in a value", async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">Before</button>
          <DescriptionList data-testid="dl">
            <DescriptionList.Item term="Maker">Shirakaba</DescriptionList.Item>
            <DescriptionList.Item term="Manual">
              <Link href="#manual">Read the manual</Link>
            </DescriptionList.Item>
            <DescriptionList.Item term="Status">
              <Badge>In stock</Badge>
            </DescriptionList.Item>
          </DescriptionList>
          <button type="button">After</button>
        </>,
      );
      await user.tab();
      expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("link", { name: "Read the manual" })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
      await user.tab({ shift: true });
      expect(screen.getByRole("link", { name: "Read the manual" })).toHaveFocus();
    });

    it("has no tab stop of its own", () => {
      render(<DescriptionList items={entries} data-testid="dl" />);
      const dl = screen.getByTestId("dl");
      expect(dl).not.toHaveAttribute("tabindex");
      expect(dl.querySelector("[tabindex]")).toBeNull();
    });
  });

  describe("accessibility", () => {
    const variants = [
      { variant: "ruled" },
      { variant: "bordered" },
      { variant: "plain" },
      { variant: "ruled", orientation: "vertical" },
      { variant: "bordered", orientation: "vertical", dense: true },
    ] as const;

    it.each(["washi", "sumi"] as const)("has no axe violations in %s", async (theme) => {
      const { container } = render(
        <Root theme={theme}>
          <h2 id="spec-title">Specification</h2>
          {variants.map((props, i) => (
            <DescriptionList key={i} {...props}>
              <DescriptionList.Item term="Body wood">Birch</DescriptionList.Item>
              <DescriptionList.Item term="Scale length" numeric unit="mm">
                648
              </DescriptionList.Item>
              <DescriptionList.Item term="Serial" mono>
                SK-0042-A
              </DescriptionList.Item>
              <DescriptionList.Item term={["Neck", "Fretboard"]}>Maple</DescriptionList.Item>
              <DescriptionList.Item term="Colours">
                <DescriptionList.Description>Natural</DescriptionList.Description>
                <DescriptionList.Description>Black</DescriptionList.Description>
              </DescriptionList.Item>
              <DescriptionList.Item term="Finish">{null}</DescriptionList.Item>
              <DescriptionList.Item term="Manual">
                <Link href="#manual">Read the manual</Link>
              </DescriptionList.Item>
            </DescriptionList>
          ))}
        </Root>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });

    it.each(["es", "ja"] as const)("has no axe violations in %s", async (locale) => {
      const { container } = render(
        <Root locale={locale}>
          <DescriptionList items={[...entries, { term: "Finish", description: null }]} />
        </Root>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });

  describe("styling hooks", () => {
    it("adds no inline styles, so a narrow container can restack the rows from CSS alone", () => {
      const { container } = render(<DescriptionList items={entries} />);
      expect(container.querySelector("[style]")).toBeNull();
    });
  });
  describe("nested lists", () => {
    it("keeps a nested list's variant apart from the outer one", () => {
      render(
        <DescriptionList variant="bordered" dense data-testid="outer">
          <DescriptionList.Item term="Neck">
            <DescriptionList items={[{ term: "Wood", description: "Maple" }]} data-testid="inner" />
          </DescriptionList.Item>
        </DescriptionList>,
      );
      const inner = screen.getByTestId("inner");
      expect(screen.getByTestId("outer")).toContainElement(inner);
      expect(inner).toHaveClass("ol-dl");
      expect(inner).not.toHaveClass("ol-dl--bordered", "ol-dl--dense");
      expect(inner.closest(".ol-dl__item")?.parentElement).toBe(screen.getByTestId("outer"));
    });

    it("has no axe violations", async () => {
      const { container } = render(
        <DescriptionList variant="bordered">
          <DescriptionList.Item term="Neck">
            <DescriptionList items={[{ term: "Wood", description: "Maple" }]} />
          </DescriptionList.Item>
        </DescriptionList>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });

  describe("terms", () => {
    it("warns when an Item has no term and no Term child", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <DescriptionList>
          <DescriptionList.Item>Orphan</DescriptionList.Item>
        </DescriptionList>,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("needs a `term`"));
    });

    it("does not warn with a term or a Term child, also inside a fragment", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      render(
        <DescriptionList>
          <DescriptionList.Item term="One">Value</DescriptionList.Item>
          <DescriptionList.Item>
            <Fragment>
              <DescriptionList.Term>Two</DescriptionList.Term>
            </Fragment>
            <DescriptionList.Description>Value</DescriptionList.Description>
          </DescriptionList.Item>
        </DescriptionList>,
      );
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe("right to left", () => {
    it("has no axe violations", async () => {
      const { container } = render(
        <Root>
          <div dir="rtl" lang="ar">
            <DescriptionList
              variant="bordered"
              items={[
                { term: "الخشب", description: "البتولا" },
                { term: "طول المقياس", description: "648", numeric: true, unit: "مم" },
                { term: "التشطيب", description: null },
              ]}
            />
          </div>
        </Root>,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    });
  });

  describe("css contract", () => {
    const css = readFileSync("src/components/DescriptionList/DescriptionList.css", "utf8");
    const rule = (selector: string) =>
      new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`).exec(
        css,
      )?.[1] ?? "";

    it("sets terms and units in ink-2", () => {
      expect(rule(".ol-dl__term")).toMatch(/color: var\(--ink-2\)/);
      expect(rule(".ol-dl__unit")).toMatch(/color: var\(--ink-2\)/);
    });

    it("never clips, so a focus ring in a value stays visible", () => {
      expect(css).not.toMatch(/overflow(?!-wrap)/);
      expect(css).not.toMatch(/clip/);
      expect(css).not.toMatch(/contain:[^;]*paint/);
    });

    it("has one container rule, and the base row is a single column", () => {
      expect(css.match(/@container/g)).toHaveLength(1);
      expect(rule(".ol-dl__item")).toMatch(/grid-template-columns: minmax\(0, 1fr\)/);
    });

    it("uses logical properties only", () => {
      expect(css).not.toMatch(/(?:^|[\s;{])(?:left|right|top|bottom)\s*:/m);
      expect(css).not.toMatch(/-(?:left|right|top|bottom)\s*:/);
      expect(css).not.toMatch(/text-align:\s*(?:left|right)/);
    });

    it("scopes variant and orientation selectors to the list's own rows", () => {
      const selectors =
        css.match(/\.ol-dl--(?:bordered|plain|dense)(?::not\([^)]*\))?[^{,]*/g) ?? [];
      const scoped = selectors.filter((s) => / [.\w:-]/.test(s.trim()));
      expect(scoped.length).toBeGreaterThan(0);
      for (const s of scoped) expect(s).toMatch(/^\S+ > /);
      expect(css).not.toMatch(/\.ol-dl:not\(\.ol-dl--vertical\) \.ol-dl__/);
    });

    it("keeps a line under a stacked bordered term in forced colours", () => {
      const forced = css.slice(css.indexOf("@media (forced-colors: active)"));
      expect(forced).toMatch(/border-block-end: var\(--stroke-hair\) solid CanvasText/);
    });
  });
});
