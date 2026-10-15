import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { FieldContext, type FieldContextValue } from "../../hooks/useFieldControl";
import { runAxe } from "../../test/axe";
import { Field } from "../Field";
import { Root } from "../Root";
import { FileInput } from "./FileInput";

const file = (name: string) => new File(["x"], name, { type: "text/plain" });
function pick(root: ParentNode, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`Missing ${selector}`);
  return el;
}
const zone = (c: HTMLElement) => pick(c, ".ol-file");

function inField(ui: ReactNode) {
  let owner: string | null = null;
  const value: FieldContextValue = {
    id: "f1",
    describedBy: "f1-hint",
    invalid: false,
    required: false,
    claim: (id) => {
      owner ??= id;
      return owner === id;
    },
  };
  return render(
    <FieldContext.Provider value={value}>
      <label htmlFor="f1">Attachments</label>
      <span id="f1-hint">Hint</span>
      {ui}
    </FieldContext.Provider>,
  );
}

describe("FileInput", () => {
  it("renders the zone with class, className and native attributes", () => {
    const { container } = render(
      <FileInput className="extra" data-testid="i" accept="image/*" multiple />,
    );
    expect(zone(container)).toHaveClass("ol-file", "extra");
    const input = screen.getByTestId("i");
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", "image/*");
    expect(input).toHaveAttribute("multiple");
  });

  it("uses the locale defaults and names the input by its label", () => {
    render(<FileInput />);
    expect(screen.getByText("Browse")).toBeInTheDocument();
    expect(screen.getByText("No file selected")).toBeInTheDocument();
    expect(screen.getByLabelText("Drop files or browse")).toHaveAttribute("type", "file");
  });

  it.each([
    ["es", "Arrastra archivos o búscalos", "Buscar", "Ningún archivo seleccionado"],
    ["ja", "ファイルをドロップまたは選択", "選択", "未選択"],
  ] as const)("localizes the built-in text in %s", (locale, label, browse, empty) => {
    render(
      <Root locale={locale}>
        <FileInput />
      </Root>,
    );
    expect(screen.getByLabelText(label)).toBeInTheDocument();
    expect(screen.getByText(browse)).toBeInTheDocument();
    expect(screen.getByText(empty)).toBeInTheDocument();
  });

  it("lets label, browseLabel and hint override the locale", () => {
    render(
      <Root locale="es">
        <FileInput label="Adjuntos" browseLabel="Elegir" hint="PDF, hasta 20 MB" />
      </Root>,
    );
    expect(screen.getByLabelText("Adjuntos")).toBeInTheDocument();
    expect(screen.getByText("Elegir")).toBeInTheDocument();
    expect(screen.getByText("PDF, hasta 20 MB")).toBeInTheDocument();
  });

  it("lists the chosen file names and calls onChange", async () => {
    const onChange = vi.fn();
    render(<FileInput onChange={onChange} />);
    await userEvent.upload(screen.getByLabelText("Drop files or browse"), file("brief.txt"));
    expect(screen.getByRole("status")).toHaveTextContent("brief.txt");
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("lists several files and describes the input with the names", async () => {
    render(<FileInput multiple />);
    const input = screen.getByLabelText("Drop files or browse");
    await userEvent.upload(input, [file("a.txt"), file("b.txt")]);
    expect(screen.getByRole("status")).toHaveTextContent("a.txt, b.txt");
    expect(input).toHaveAccessibleDescription("a.txt, b.txt");
  });

  it("keeps the over state while dragging across child elements", () => {
    const { container } = render(<FileInput />);
    const root = zone(container);
    const child = pick(root, ".ol-file__label");
    const input = pick(root, "input");
    fireEvent.dragEnter(root);
    fireEvent.dragEnter(child);
    expect(root).toHaveAttribute("data-state", "over");
    fireEvent.dragLeave(root);
    expect(root).toHaveAttribute("data-state", "over");
    fireEvent.dragLeave(child);
    expect(root).not.toHaveAttribute("data-state");
    fireEvent.dragEnter(input);
    fireEvent.dragEnter(child);
    fireEvent.drop(input);
    expect(root).not.toHaveAttribute("data-state");
    // The counter was reset by the drop, so one enter/leave pair works again.
    fireEvent.dragEnter(root);
    fireEvent.dragLeave(root);
    expect(root).not.toHaveAttribute("data-state");
  });

  it("ignores drag events when disabled", () => {
    const { container } = render(<FileInput disabled />);
    fireEvent(zone(container), createEvent.dragEnter(zone(container)));
    expect(zone(container)).not.toHaveAttribute("data-state");
    expect(zone(container)).toHaveAttribute("data-disabled");
  });

  it("works inside a Field: the Field label names the input", () => {
    inField(<FileInput />);
    const input = screen.getByLabelText("Attachments");
    expect(input).toHaveAttribute("id", "f1");
    expect(input.getAttribute("aria-describedby")).toContain("f1-hint");
  });

  it("an explicit aria-label wins", () => {
    render(<FileInput aria-label="Cover" />);
    expect(screen.getByLabelText("Cover")).toBeInTheDocument();
  });

  it("forwards the ref to the file input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<FileInput ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe("file");
  });

  it("has no axe violations", async () => {
    const { container } = render(<FileInput hint="PDF" multiple />);
    expect(await runAxe(container)).toHaveNoViolations();
    await userEvent.upload(pick(container, "input"), file("a.txt"));
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("describes the input by the names only once files are chosen", async () => {
    render(<FileInput />);
    const input = screen.getByLabelText("Drop files or browse");
    expect(input).not.toHaveAttribute("aria-describedby");
    await userEvent.upload(input, file("a.txt"));
    expect(input).toHaveAccessibleDescription("a.txt");
  });

  it("returns to the hint when the selection is cleared", async () => {
    render(<FileInput hint="PDF only" />);
    const input = screen.getByLabelText("Drop files or browse");
    await userEvent.upload(input, file("a.txt"));
    await userEvent.upload(input, []);
    expect(screen.getByRole("status")).toHaveTextContent("PDF only");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("hides the visual prompt when a Field or aria-label names the input", () => {
    const { container, unmount } = render(
      <Field label="Attachments">
        <FileInput />
      </Field>,
    );
    expect(pick(container, ".ol-file__label")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByLabelText("Attachments")).toHaveAttribute("type", "file");
    unmount();
    const again = render(<FileInput aria-label="Cover" />);
    expect(pick(again.container, ".ol-file__label")).toHaveAttribute("aria-hidden", "true");
  });

  it("clears the over state when disabled turns on mid-drag and on dragend", () => {
    const { container, rerender } = render(<FileInput />);
    fireEvent.dragEnter(zone(container));
    expect(zone(container)).toHaveAttribute("data-state", "over");
    rerender(<FileInput disabled />);
    expect(zone(container)).not.toHaveAttribute("data-state");
    rerender(<FileInput />);
    fireEvent.dragEnter(zone(container));
    fireEvent.dragEnd(zone(container));
    expect(zone(container)).not.toHaveAttribute("data-state");
  });

  it("is not focusable when disabled", async () => {
    render(<FileInput disabled />);
    await userEvent.tab();
    expect(screen.getByLabelText("Drop files or browse")).not.toHaveFocus();
  });

  it("has no axe violations when disabled, in a Field and while dragging over", async () => {
    const a = render(<FileInput disabled />);
    expect(await runAxe(a.container)).toHaveNoViolations();
    a.unmount();
    const b = render(
      <Field label="Attachments" hint="PDF">
        <FileInput />
      </Field>,
    );
    expect(await runAxe(b.container)).toHaveNoViolations();
    b.unmount();
    const c = render(<FileInput />);
    fireEvent.dragEnter(zone(c.container));
    expect(await runAxe(c.container)).toHaveNoViolations();
  });
});
