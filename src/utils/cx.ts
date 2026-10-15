export type ClassValue = string | false | null | undefined;

/** Joins truthy class names with a space. */
export function cx(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
