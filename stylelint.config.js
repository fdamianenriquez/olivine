/** @type {import("stylelint").Config} */
export default {
  extends: ["stylelint-config-standard"],
  // Generated from tokens.json: the one place literal colours and font names live.
  ignoreFiles: ["src/styles/tokens.css", "src/styles/fonts.css"],
  rules: {
    "import-notation": "string",
    // Tokens only: colours come from custom properties, never literals.
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": [
      ["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color"],
      { message: "Use a colour token (var(--…)) instead of a literal colour" },
    ],
    // BEM with the ol- prefix: .ol, .ol-block, .ol-block__element, .ol-block--modifier
    "selector-class-pattern": [
      "^ol(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$",
      { message: "Use BEM class names with the ol- prefix" },
    ],
  },
};
