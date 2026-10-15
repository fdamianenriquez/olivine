import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { useLabels } from "../../locale";
import { runAxe } from "../../test/axe";
import { Root } from "./Root";

function Probe() {
  const l = useLabels();
  return <p data-testid="probe">{`${l.close}|${l.tags.warning}`}</p>;
}
const probe = () => screen.getByTestId("probe").textContent;

describe("Root", () => {
  it("renders the ol class, className and native props", () => {
    render(
      <Root className="extra" data-testid="root" id="app">
        x
      </Root>,
    );
    const el = screen.getByTestId("root");
    expect(el).toHaveClass("ol", "extra");
    expect(el).toHaveAttribute("id", "app");
    expect(el.tagName).toBe("DIV");
  });

  it("sets data-theme only when theme is given", () => {
    const { rerender } = render(<Root data-testid="root" />);
    expect(screen.getByTestId("root")).not.toHaveAttribute("data-theme");
    rerender(<Root data-testid="root" theme="sumi" />);
    expect(screen.getByTestId("root")).toHaveAttribute("data-theme", "sumi");
  });

  it("renders another element with as", () => {
    render(<Root as="main" data-testid="root" />);
    expect(screen.getByTestId("root").tagName).toBe("MAIN");
  });

  it("forwards its ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Root ref={ref} />);
    expect(ref.current).toHaveClass("ol");
  });

  it("defaults to English and omits lang", () => {
    render(
      <Root data-testid="root">
        <Probe />
      </Root>,
    );
    expect(probe()).toBe("Close|Note");
    expect(screen.getByTestId("root")).not.toHaveAttribute("lang");
  });

  it("keeps the regional tag in lang and omits it for unknown locales", () => {
    const { rerender } = render(<Root locale="es-MX" data-testid="root" />);
    expect(screen.getByTestId("root")).toHaveAttribute("lang", "es-MX");
    rerender(
      <Root locale="fr" data-testid="root">
        <Probe />
      </Root>,
    );
    expect(screen.getByTestId("root")).not.toHaveAttribute("lang");
    expect(probe()).toBe("Close|Note");
  });

  it("keeps the parent language in a theme-only island", () => {
    render(
      <Root locale="es">
        <Root theme="sumi" data-testid="inner">
          <Probe />
        </Root>
      </Root>,
    );
    expect(probe()).toBe(`${Root.locales.es.close}|${Root.locales.es.tags.warning}`);
    expect(screen.getByTestId("inner")).not.toHaveAttribute("lang");
  });

  it("merges labels onto the parent dictionary", () => {
    render(
      <Root locale="es">
        <Root labels={{ close: "Salir" }}>
          <Probe />
        </Root>
      </Root>,
    );
    expect(probe()).toBe(`Salir|${Root.locales.es.tags.warning}`);
  });

  it("updates consumers when labels change", () => {
    const { rerender } = render(
      <Root labels={{ close: "A" }}>
        <Probe />
      </Root>,
    );
    expect(probe()).toMatch(/^A\|/);
    rerender(
      <Root labels={{ close: "B" }}>
        <Probe />
      </Root>,
    );
    expect(probe()).toMatch(/^B\|/);
  });

  it.each(["es", "ja"] as const)("switches to %s", (locale) => {
    render(
      <Root locale={locale} data-testid="root">
        <Probe />
      </Root>,
    );
    expect(probe()).toBe(`${Root.locales[locale].close}|${Root.locales[locale].tags.warning}`);
    expect(screen.getByTestId("root")).toHaveAttribute("lang", locale);
  });

  it("resolves a regional tag", () => {
    render(
      <Root locale="es-MX">
        <Probe />
      </Root>,
    );
    expect(probe()).toContain(Root.locales.es.close);
  });

  it("accepts a full dictionary and omits lang", () => {
    const dict = { ...Root.locales.en, close: "Shut" };
    render(
      <Root locale={dict} data-testid="root">
        <Probe />
      </Root>,
    );
    expect(probe()).toMatch(/^Shut\|/);
    expect(screen.getByTestId("root")).not.toHaveAttribute("lang");
  });

  it("applies label overrides including tags", () => {
    render(
      <Root locale="es" labels={{ close: "Salir", tags: { warning: "Ojo" } }}>
        <Probe />
      </Root>,
    );
    expect(probe()).toBe("Salir|Ojo");
  });

  it("lets a nested Root override the language", () => {
    render(
      <Root locale="es">
        <Root locale="ja">
          <Probe />
        </Root>
      </Root>,
    );
    expect(probe()).toContain(Root.locales.ja.close);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Root theme="washi">
        <p>Olivine</p>
      </Root>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("has no axe violations with theme sumi and locale ja", async () => {
    const { container } = render(
      <Root theme="sumi" locale="ja">
        <p>オリビン</p>
      </Root>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
