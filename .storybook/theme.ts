import { create } from "storybook/theming";

import { tokens } from "../src/tokens";

const color = (name: keyof typeof tokens.color) => tokens.color[name].washi;

/** Storybook chrome and docs pages in the washi palette. */
export const theme = create({
  base: "light",
  brandTitle: "Olivine",
  brandUrl: "https://github.com/fdamianenriquez/olivine",
  colorPrimary: color("olivo"),
  colorSecondary: color("olivo"),
  appBg: color("paper"),
  appContentBg: color("paper"),
  appPreviewBg: color("paper"),
  appBorderColor: color("rule"),
  appBorderRadius: 0,
  textColor: color("ink"),
  textInverseColor: color("on-ink"),
  textMutedColor: color("ink-2"),
  barBg: color("paper"),
  barTextColor: color("ink-2"),
  barSelectedColor: color("olivo"),
  barHoverColor: color("olivo"),
  inputBg: color("paper-3"),
  inputBorder: color("rule"),
  inputTextColor: color("ink"),
  inputBorderRadius: 0,
  fontBase: tokens.font.sans,
  fontCode: tokens.font.mono,
});
