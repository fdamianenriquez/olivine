import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Alert, type AlertTone } from "./Alert";

const noop = () => undefined;

describe("Alert", () => {
  it("renders with defaults, root class, className and native props", () => {
    render(
      <Alert className="x" data-testid="a">
        Body
      </Alert>,
    );
    const el = screen.getByTestId("a");
    expect(el).toHaveClass("ol-alert", "ol-alert--neutral", "x");
    expect(el).toHaveAttribute("role", "status");
    expect(el).toHaveTextContent("Memo");
    expect(el).toHaveTextContent("Body");
  });

  it.each([
    ["neutral", "status", "Memo"],
    ["info", "status", "Info"],
    ["success", "status", "Done"],
    ["warning", "alert", "Note"],
    ["danger", "alert", "Error"],
  ] as [AlertTone, string, string][])("maps tone %s to class, role and tag", (tone, role, word) => {
    render(<Alert tone={tone} data-testid="a" />);
    const el = screen.getByTestId("a");
    expect(el).toHaveClass(`ol-alert--${tone}`);
    expect(el).toHaveAttribute("role", role);
    expect(el).toHaveTextContent(word);
  });

  it("renders title, action and a custom tag", () => {
    render(
      <Alert tone="info" title="Heading" tag="FYI" action={<button>Retry</button>}>
        Text
      </Alert>,
    );
    expect(screen.getByText("Heading")).toHaveClass("ol-alert__title");
    expect(screen.getByText("FYI")).toBeInTheDocument();
    expect(screen.queryByText("Info")).toBeNull();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows a dismiss button only with onClose, via click and keyboard", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(<Alert>Body</Alert>);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<Alert onClose={onClose}>Body</Alert>);
    const btn = screen.getByRole("button", { name: "Dismiss" });
    await user.click(btn);
    await user.tab();
    btn.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["es", "Error", "Descartar"],
    ["ja", undefined, undefined],
  ] as const)("localises built-ins in %s", (locale, tagEs, dismissEs) => {
    render(
      <Root locale={locale}>
        <Alert tone="danger" onClose={noop} data-testid="a" />
      </Root>,
    );
    const el = screen.getByTestId("a");
    if (tagEs) expect(el).toHaveTextContent(tagEs);
    if (dismissEs) expect(screen.getByRole("button", { name: dismissEs })).toBeInTheDocument();
    if (locale === "ja") {
      expect(el).not.toHaveTextContent("Error");
      expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
    }
  });

  it("lets tag override the locale", () => {
    render(
      <Root locale="es">
        <Alert tone="danger" tag="Ojo" data-testid="a" />
      </Root>,
    );
    expect(screen.getByTestId("a")).toHaveTextContent("Ojo");
  });

  it("forwards the ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Alert ref={ref} data-testid="a" />);
    expect(ref.current).toBe(screen.getByTestId("a"));
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <>
        {(["neutral", "info", "success", "warning", "danger"] as const).map((tone) => (
          <Alert key={tone} tone={tone} title="Title" onClose={noop} action={<button>Go</button>}>
            Body text
          </Alert>
        ))}
      </>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
