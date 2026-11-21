import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { locales } from "../../../src/locale";
import { runAxe } from "../../../src/test/axe";
import { DETAILS, MODELS, RAIL, STAGES } from "./data";
import { fretAt } from "./fret";
import { ShirakabaPage } from "./ShirakabaPage";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ShirakabaPage", () => {
  it("renders the twelve parts of the page", () => {
    const { container } = render(<ShirakabaPage />);
    // 1 · the fret rail, a landmark with one link per section
    const rail = screen.getByRole("navigation", { name: locales.en.railLabel });
    expect(within(rail).getAllByRole("link").length).toBe(RAIL.length + 2); // + brand and Order
    // 2 · the demo alert
    expect(screen.getByText("Demonstration site")).toBeInTheDocument();
    // 3 · the hero column: one photograph per model
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/foot of the Alps/);
    for (const m of MODELS)
      expect(screen.getByAltText(`${m.name}, front view`)).toBeInTheDocument();
    // 4 · the ledger
    expect(screen.getByText("Weeks from deposit")).toBeInTheDocument();
    // 5 · the workshop: the bench panel and its four vertical meters
    expect(screen.getByText("Bench 03")).toBeInTheDocument();
    expect(screen.getAllByRole("meter")).toHaveLength(4);
    // 6 · the wall: one hang-tag and one Build button per model
    for (const m of MODELS)
      expect(screen.getByRole("button", { name: `Build a ${m.name}` })).toBeVisible();
    // 7 · the band
    expect(
      screen.getByText(/Every board in this store already belongs to someone/),
    ).toBeInTheDocument();
    // 8 · up close: four details with alt text
    for (const d of DETAILS) expect(screen.getByAltText(d.alt)).toHaveAttribute("loading", "lazy");
    // 9 · the configurator
    expect(screen.getByRole("navigation", { name: "Build your guitar" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Quote" })).toBeInTheDocument();
    // 10 · twelve weeks
    expect(screen.getByRole("heading", { name: "Twelve weeks, one octave." })).toBeInTheDocument();
    // 11 · FAQ
    expect(screen.getByRole("button", { name: /Do you ship outside Japan/ })).toBeInTheDocument();
    // 12 · closing and footer
    expect(
      screen.getByRole("heading", { name: "Shirakaba means white birch." }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No personal data is collected/)).toBeInTheDocument();
    // the vector guitar is drawn on the wall and in the case
    expect(container.querySelectorAll("svg[role='img']").length).toBeGreaterThanOrEqual(4);
  });

  it("gives every image alt text and lazy-loads the ones below the fold", () => {
    const { container } = render(<ShirakabaPage />);
    const images = Array.from(container.querySelectorAll("img"));
    expect(images.length).toBeGreaterThan(15);
    for (const img of images) expect(img).toHaveAttribute("alt");
    const eager = images.filter((img) => img.getAttribute("loading") !== "lazy");
    // Only the first hero photograph is eager.
    expect(eager).toHaveLength(1);
    expect(eager[0]).toHaveAttribute("alt", "Norikura, front view");
  });

  it("has no axe violations", async () => {
    const { container } = render(<ShirakabaPage />);
    const results = await runAxe(container);
    expect(results.violations).toEqual([]);
    // axe walks the whole page, which can pass the 5 s default on a busy CI runner.
  }, 30_000);

  it.each(["es", "ja"] as const)("takes the library's own words from the %s locale", (locale) => {
    render(<ShirakabaPage locale={locale} />);
    expect(screen.getByRole("navigation", { name: locales[locale].railLabel })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: locales.en.railLabel })).toBeNull();
    const stepper = screen.getByRole("navigation", { name: "Build your guitar" });
    expect(stepper).toHaveTextContent(locales[locale].stepper.step);
  });

  it("closes the demo alert", () => {
    render(<ShirakabaPage />);
    fireEvent.click(screen.getByRole("button", { name: locales.en.dismiss }));
    expect(screen.queryByText("Demonstration site")).toBeNull();
  });
});

describe("hero column", () => {
  it("swaps the name, price and blurb when a photograph crosses the middle of the viewport", () => {
    const callbacks: IntersectionObserverCallback[] = [];
    class FakeObserver {
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback);
      }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = () => [];
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const { container } = render(<ShirakabaPage />);
    const side = container.querySelector(".sg-col__side");
    expect(side).toHaveTextContent("¥420,000");
    const second = container.querySelectorAll(".sg-col__item")[1];
    act(() => {
      for (const notify of callbacks) {
        notify(
          [{ isIntersecting: true, target: second } as unknown as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      }
    });
    expect(side).toHaveTextContent("¥460,000");
    expect(side).toHaveTextContent(MODELS[1]?.blurb ?? "");
    expect(side?.querySelector(".sg-col__word--on")).toHaveTextContent("Utsukushi");
    // The first name has left upward; the third waits below.
    expect(side?.querySelector(".sg-col__word--past")).toHaveTextContent("Norikura");
  });
});

describe("twelve weeks", () => {
  it("moves the cursor along the fret scale and shows the stage of the week", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const { container } = render(<ShirakabaPage />);
    const section = container.querySelector<HTMLElement>("#process");
    if (!section) throw new Error("no weeks section");
    // Halfway through the pinned travel: 2700 tall in an 768 viewport.
    const travel = 2700 - window.innerHeight;
    vi.spyOn(section, "getBoundingClientRect").mockReturnValue({
      top: -travel / 2,
      height: 2700,
    } as DOMRect);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    const cursor = container.querySelector<HTMLElement>(".sg-neck__cursor");
    expect(cursor?.style.top).toBe(`${(fretAt(6) * 100).toFixed(3)}%`);
    const stage = STAGES.find((s) => s.from <= 6 && s.to >= 6);
    expect(container.querySelector(".sg-weeks__now")).toHaveTextContent(stage?.title ?? "");
    // Only the current frame is announced.
    expect(screen.getByAltText(stage?.alt ?? "")).toBeInTheDocument();
    expect(container.querySelectorAll(".sg-weeks__img[aria-hidden='true']")).toHaveLength(
      STAGES.length - 1,
    );
  });
});

describe("configurator", () => {
  it("updates the total and the drawing when an option changes", () => {
    render(<ShirakabaPage />);
    const slip = screen.getByRole("complementary", { name: "Quote" });
    expect(within(slip).getByText("¥503,800")).toBeInTheDocument();
    const steps = screen.getByRole("navigation", { name: "Build your guitar" });
    fireEvent.click(within(steps).getByRole("button", { name: /Body/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Mahogany/ }));
    // Mahogany adds 45,000 before tax: 503,800 + 49,500.
    expect(within(slip).getByText("¥553,300")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /as configured, lying in its case/ }),
    ).toBeInTheDocument();
  });

  it("starts a build from the wall: picks the model and opens the Body step", () => {
    const scroll = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scroll;
    render(<ShirakabaPage />);
    fireEvent.click(screen.getByRole("button", { name: "Build a Kaichi" }));
    expect(scroll).toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: /Alder/ })).toBeInTheDocument();
    const slip = screen.getByRole("complementary", { name: "Quote" });
    expect(within(slip).getByText(/Quote · Kaichi/)).toBeInTheDocument();
  });

  it("walks the six steps with the quote slip buttons", () => {
    render(<ShirakabaPage />);
    for (const next of ["Body", "Neck", "Sound", "Extras", "Order"]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${next}`) }));
    }
    expect(screen.getByRole("button", { name: /Reserve my guitar/ })).toBeInTheDocument();
  });

  it("validates the order form after a submit attempt and records nothing outside the page", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<ShirakabaPage />);
    fireEvent.click(screen.getByRole("button", { name: /Order$/, current: false }));
    expect(screen.queryByText("Enter your name.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Reserve my guitar/ }));
    expect(screen.getByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText(/Enter a full address/)).toBeInTheDocument();
    expect(screen.getByText("Tick the box to continue.")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: /Name/ }), { target: { value: "Hana" } });
    fireEvent.change(screen.getByRole("textbox", { name: /Email/ }), {
      target: { value: "hana@mail.jp" },
    });
    fireEvent.click(screen.getByLabelText(/I understand this is a demo/));
    fireEvent.click(screen.getByRole("button", { name: /Reserve my guitar/ }));

    expect(screen.getByText("Order SG-2026-0142 · demo")).toBeInTheDocument();
    expect(screen.getByText(/Nothing was sent/)).toBeInTheDocument();
    // Nothing leaves the page and nothing is persisted.
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });
});
