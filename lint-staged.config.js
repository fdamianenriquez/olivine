/** @type {import("lint-staged").Configuration} */
export default {
  "*.{ts,tsx,js}": ["eslint --fix --max-warnings 0", "prettier --write"],
  "*.css": ["stylelint --fix", "prettier --write"],
  "*.{json,md,mdx,yml,yaml}": "prettier --write",
};
