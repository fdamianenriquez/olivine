import axe, { type AxeResults, type RunOptions } from "axe-core";

/**
 * Runs axe on a rendered container. Colour contrast is off because jsdom does not
 * compute styles; contrast is covered by the token contrast check and Storybook.
 */
export function runAxe(container: Element, options: RunOptions = {}): Promise<AxeResults> {
  return axe.run(container, {
    ...options,
    rules: { "color-contrast": { enabled: false }, ...options.rules },
  });
}

export function toHaveNoViolations(results: AxeResults) {
  const { violations } = results;
  return {
    pass: violations.length === 0,
    message: () =>
      violations.length === 0
        ? "Expected axe violations, found none"
        : violations
            .map(
              (v) =>
                `${v.id} (${v.impact ?? "unknown"}): ${v.help}\n` +
                v.nodes.map((n) => `  ${n.html}`).join("\n"),
            )
            .join("\n\n"),
  };
}

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- must mirror Vitest's signature
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
    toHaveNoViolations(): R;
  }
}
