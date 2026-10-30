/**
 * Accessibility issues that already exist and are planned in the backlog, plus the few that WCAG
 * exempts but axe cannot tell (say so in the note). Each entry hides only
 * the matching nodes of one rule in the matching stories, so anything new still fails. Remove the
 * entry in the same change that fixes it.
 */
export interface KnownIssue {
  /** Story ids it applies to. */
  stories: RegExp;
  /** The axe rule id. */
  rule: string;
  /** Only nodes whose selector matches; omit for every node of the rule. */
  target?: RegExp;
  /** What is wrong and where the fix is planned. */
  note: string;
}

export const KNOWN_ISSUES: KnownIssue[] = [
  {
    stories: /^forms-fileinput--disabled$/,
    rule: "color-contrast",
    target: /^#/,
    note: "Not a defect: the file-name status of a disabled FileInput is text of an inactive component, which WCAG 1.4.3 exempts; axe only sees that the input, not the status, is disabled.",
  },
  {
    stories: /^actions-chip--(disabled|themes)$/,
    rule: "color-contrast",
    target: /ol-chip--removable > \.ol-chip__main > \.ol-chip__label/,
    note: "Not a defect: the label of a disabled remove-only Chip is text of an inactive component, which WCAG 1.4.3 exempts; the label sits in a span, so axe only sees that the × button, not the label, is disabled.",
  },
];
