/**
 * True outside production builds. Consumers' bundlers replace `process.env.NODE_ENV`, so
 * development-only checks are removed from production bundles.
 */
export const DEV: boolean = typeof process === "undefined" || process.env.NODE_ENV !== "production";

/** Logs a development-only warning, prefixed with the component name. */
export function devWarn(component: string, message: string): void {
  if (DEV) console.warn(`[olivine] ${component}: ${message}`);
}
