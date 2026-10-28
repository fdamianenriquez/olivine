import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runAxe } from "../../test/axe";
import { Root } from "../Root";
import { Toast } from "../Toast";
import { type ToastApi, type ToastOptions, useToast } from "./ToastContext";
import { ToastProvider } from "./ToastProvider";
import { ToastStack } from "./ToastStack";

const holder: { api: ToastApi | null } = { api: null };
function Grab() {
  const current = useToast();
  useEffect(() => {
    holder.api = current;
  });
  return null;
}
function getApi(): ToastApi {
  if (!holder.api) throw new Error("provider not mounted");
  return holder.api;
}
const api = {
  show: (o: ToastOptions) => getApi().show(o),
  dismiss: (id: string) => {
    getApi().dismiss(id);
  },
  clear: () => {
    getApi().clear();
  },
};

function setup(props: Parameters<typeof ToastProvider>[0] = {}) {
  return render(
    <ToastProvider {...props}>
      <Grab />
    </ToastProvider>,
  );
}

function show(options: ToastOptions) {
  let id = "";
  act(() => {
    id = api.show(options);
  });
  return id;
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("ToastStack", () => {
  it("renders the polite live region even when empty", () => {
    render(<ToastStack data-testid="s" className="x" />);
    const el = screen.getByTestId("s");
    expect(el).toHaveClass("ol-toaststack", "ol-toaststack--tr", "x");
    expect(el).toHaveAttribute("aria-live", "polite");
    expect(el).toHaveAttribute("aria-atomic", "false");
    expect(el).toHaveAttribute("aria-relevant", "additions text");
  });

  it.each(["br", "tr", "bl", "tc", "static"] as const)("maps position %s to its modifier", (p) => {
    render(<ToastStack data-testid="s" position={p} />);
    expect(screen.getByTestId("s")).toHaveClass(`ol-toaststack--${p}`);
  });

  it("forwards the ref to the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ToastStack ref={ref} />);
    expect(ref.current).toHaveClass("ol-toaststack");
  });

  it("keeps toasts keyboard reachable", () => {
    render(
      <ToastStack>
        <Toast title="Hi" onClose={() => undefined} />
      </ToastStack>,
    );
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    vi.useRealTimers();
    const { container } = render(
      <ToastStack position="static">
        <Toast title="Shipped" meta="Order" onClose={() => undefined} />
      </ToastStack>,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

describe("ToastProvider and useToast", () => {
  it("has the live region in the DOM before the first toast", () => {
    setup();
    const region = document.querySelector(".ol-toaststack");
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region?.children).toHaveLength(0);
  });

  it("throws a clear error outside a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Grab />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });

  it("shows a toast with options and returns a stable id", () => {
    setup({ position: "bl" });
    const id = show({
      id: "a",
      title: "Saved",
      description: "Stored.",
      meta: "Draft",
      tone: "success",
    });
    expect(id).toBe("a");
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Stored.")).toBeInTheDocument();
    expect(document.querySelector(".ol-toaststack")).toHaveClass("ol-toaststack--bl");
    expect(document.querySelector(".ol-toast")).toHaveClass("ol-toast--success");
  });

  it("auto-dismisses after the default duration and unmounts", () => {
    setup();
    show({ title: "Gone" });
    advance(4999);
    expect(screen.getByText("Gone")).toBeInTheDocument();
    advance(1);
    expect(screen.queryByText("Gone")).toBeNull();
  });

  it("honours a per-toast and a provider duration", () => {
    setup({ duration: 1000 });
    show({ title: "Short" });
    show({ title: "Long", duration: 3000 });
    advance(1000);
    expect(screen.queryByText("Short")).toBeNull();
    expect(screen.getByText("Long")).toBeInTheDocument();
    advance(2000);
    expect(screen.queryByText("Long")).toBeNull();
  });

  it.each([0, null])("keeps a toast with duration %s until dismissed", (d) => {
    setup();
    show({ title: "Stay", duration: d });
    advance(60000);
    expect(screen.getByText("Stay")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Stay")).toBeNull();
  });

  it("queues beyond max and promotes as earlier toasts close", () => {
    setup({ max: 2, duration: null });
    show({ id: "1", title: "One" });
    show({ id: "2", title: "Two" });
    show({ id: "3", title: "Three" });
    expect(screen.queryByText("Three")).toBeNull();
    act(() => {
      api.dismiss("1");
    });
    expect(screen.queryByText("One")).toBeNull();
    expect(screen.getByText("Three")).toBeInTheDocument();
  });

  it("dismisses queued toasts by id and calls onClose once", () => {
    setup({ max: 1, duration: null });
    const onClose = vi.fn();
    show({ id: "1", title: "One" });
    show({ id: "2", title: "Two", onClose });
    act(() => {
      api.dismiss("2");
      api.dismiss("2");
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => {
      api.dismiss("1");
    });
    expect(screen.queryByText("Two")).toBeNull();
  });

  it("clear removes everything, queued included", () => {
    setup({ max: 1, duration: null });
    show({ title: "One" });
    show({ title: "Two" });
    act(() => {
      api.clear();
    });
    expect(document.querySelectorAll(".ol-toast")).toHaveLength(0);
  });

  it("puts the newest toast nearest the corner", () => {
    const { unmount } = setup({ position: "br", duration: null });
    show({ title: "First" });
    show({ title: "Second" });
    let titles = [...document.querySelectorAll(".ol-toast__title")].map((n) => n.textContent);
    expect(titles).toEqual(["First", "Second"]);
    unmount();

    setup({ position: "tr", duration: null });
    show({ title: "First" });
    show({ title: "Second" });
    titles = [...document.querySelectorAll(".ol-toast__title")].map((n) => n.textContent);
    expect(titles).toEqual(["Second", "First"]);
  });

  it("has no axe violations with toasts open", async () => {
    vi.useRealTimers();
    setup({ duration: null });
    show({ title: "Shipped", description: "On its way", meta: "Order" });
    expect(await runAxe(document.body)).toHaveNoViolations();
  });

  it("dismisses with the keyboard: Tab to Dismiss, then Enter", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    setup({ duration: null });
    show({ title: "Keyboard" });
    await user.tab();
    expect(screen.getByRole("button", { name: "Dismiss" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.queryByText("Keyboard")).toBeNull();
  });

  it("pauses every toast while one is hovered, resuming on leave", () => {
    setup();
    show({ title: "A" });
    show({ title: "B" });
    const first = document.querySelector<HTMLElement>(".ol-toast");
    if (!first) throw new Error("no toast");
    fireEvent.mouseEnter(first);
    advance(20000);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    fireEvent.mouseLeave(first);
    advance(5000);
    expect(screen.queryByText("A")).toBeNull();
    expect(screen.queryByText("B")).toBeNull();
  });

  it("pauses while focus is inside the stack", () => {
    setup();
    show({ title: "A" });
    show({ title: "B" });
    const [button] = screen.getAllByRole("button", { name: "Dismiss" });
    act(() => {
      button?.focus();
    });
    advance(20000);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("pauses while the document is hidden", () => {
    setup();
    show({ title: "A" });
    const spy = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(20000);
    expect(screen.getByText("A")).toBeInTheDocument();
    spy.mockReturnValue(false);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(5000);
    expect(screen.queryByText("A")).toBeNull();
    spy.mockRestore();
  });

  it.each([
    ["es", "Descartar"],
    ["ja", "閉じる"],
  ])("keeps the %s language in the portal layer", (locale, word) => {
    render(
      <Root locale={locale}>
        <ToastProvider>
          <Grab />
        </ToastProvider>
      </Root>,
    );
    show({ title: "T", duration: null });
    expect(document.querySelector(".ol-portal")).toHaveAttribute("lang", locale);
    expect(screen.getByRole("button", { name: word })).toBeInTheDocument();
  });

  it("keeps the theme in the portal layer", () => {
    render(
      <Root theme="sumi">
        <ToastProvider>
          <Grab />
        </ToastProvider>
      </Root>,
    );
    expect(document.querySelector(".ol-portal")).toHaveAttribute("data-theme", "sumi");
  });

  it("has no axe violations in sumi and after a queued toast is promoted", async () => {
    vi.useRealTimers();
    render(
      <Root theme="sumi">
        <ToastProvider max={1} duration={null}>
          <Grab />
        </ToastProvider>
      </Root>,
    );
    show({ id: "1", title: "One" });
    show({ id: "2", title: "Two" });
    act(() => {
      api.dismiss("1");
    });
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(await runAxe(document.body)).toHaveNoViolations();
  });
});
