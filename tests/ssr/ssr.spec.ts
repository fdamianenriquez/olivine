import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

// The root class of each component family that must be in the server-rendered HTML.
const SERVER_CLASSES = [
  "ol",
  "ol-accordion",
  "ol-alert",
  "ol-badge",
  "ol-breadcrumb",
  "ol-btn",
  "ol-btngroup",
  "ol-card",
  "ol-carousel",
  "ol-check",
  "ol-checkgroup",
  "ol-close",
  "ol-col",
  "ol-container",
  "ol-divider",
  "ol-field",
  "ol-figure",
  "ol-file",
  "ol-grid",
  "ol-img",
  "ol-input",
  "ol-inputgroup",
  "ol-label",
  "ol-link",
  "ol-list",
  "ol-nav",
  "ol-navbar",
  "ol-page",
  "ol-ph",
  "ol-progress",
  "ol-range",
  "ol-ratio",
  "ol-select",
  "ol-sheet",
  "ol-spinner",
  "ol-stack",
  "ol-stat",
  "ol-switch",
  "ol-table",
  "ol-tabs",
  "ol-text",
  "ol-textarea",
  "ol-toast",
  "ol-toaststack",
];

test("the package entry carries the client directive", () => {
  const entry = readFileSync("dist/index.js", "utf8");
  expect(entry.startsWith('"use client";')).toBe(true);
  expect(readFileSync("dist/tokens.js", "utf8")).not.toContain('"use client"');
});

test("renders the page on the server with every component", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('data-testid="server-page"');
  const classes = new Set(
    Array.from(html.matchAll(/class="([^"]+)"/g), (match) => match[1] ?? "").flatMap((value) =>
      value.split(/\s+/),
    ),
  );
  for (const name of SERVER_CLASSES) {
    expect(classes.has(name), `${name} is missing from the server HTML`).toBe(true);
  }
  // Layers that need the DOM render nothing until the client has mounted.
  expect(html).not.toContain('role="dialog"');
});

test("hydrates without warnings or errors", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type()))
      problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Server rendering" })).toBeVisible();
  expect(problems).toEqual([]);
});

test("the interactive components work after hydration", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Open modal" }).click();
  const dialog = page.getByRole("dialog", { name: "Modal" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Open modal" })).toBeFocused();

  await page.getByRole("button", { name: "Show toast" }).click();
  await expect(page.getByText("A toast from the hook.")).toBeVisible();

  await page.getByRole("button", { name: "Open panel" }).click();
  await expect(page.getByRole("dialog", { name: "Offcanvas" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Popover", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Popover" })).toBeVisible();

  expect(problems).toEqual([]);
});
