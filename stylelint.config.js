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
  overrides: [
    {
      // Demo code keeps its own sg- prefix and may also use library classes in selectors.
      files: ["stories/**/*.css"],
      rules: {
        "selector-class-pattern": [
          "^(ol|sg)(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$",
          { message: "Use BEM class names with the ol- or sg- prefix" },
        ],
      },
    },
    {
      // Component CSS: every duration, curve and stagger is a motion token (styles/motion.css).
      // The bare `linear` keyword stays allowed for timers (Toast's drain).
      files: ["src/components/**/*.css"],
      rules: {
        "function-disallowed-list": [
          [
            ...["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color"],
            ...["cubic-bezier", "steps", "linear"],
          ],
          { message: "Use a colour token or a motion token (--ease-*) instead of a literal value" },
        ],
        "declaration-property-value-disallowed-list": [
          {
            "/^(transition|animation)(-duration|-delay|-timing-function)?$/": [
              "/(?<![\\w.-])\\d*\\.?\\d+m?s\\b/",
              "/(?<![\\w-])(ease|ease-in|ease-out|ease-in-out|step-start|step-end)(?![\\w-])/",
            ],
            "/^--/": ["/^\\s*\\d*\\.?\\d+m?s\\s*$/"],
          },
          { message: "Use a motion token (--dur-*, --ease-*, --stagger) instead of a literal" },
        ],
      },
    },
  ],
};
