import "../src/styles/fonts.css";
import "../src/styles/fonts-jp.css";
import "../src/styles/tokens.css";
import "../src/styles/index.css";
import "./preview.css";

import type { Preview } from "@storybook/react-vite";

import { Root, type RootProps } from "../src";
import { theme } from "./theme";

const preview: Preview = {
  tags: ["autodocs"],
  globalTypes: {
    theme: {
      description: "Colour theme",
      toolbar: {
        title: "Theme",
        icon: "contrast",
        dynamicTitle: true,
        items: [
          { value: "washi", title: "Washi (cream)" },
          { value: "sumi", title: "Sumi (ebony)" },
          { value: "auto", title: "Auto (system)" },
        ],
      },
    },
    locale: {
      description: "Locale of built-in strings",
      toolbar: {
        title: "Locale",
        icon: "globe",
        dynamicTitle: true,
        items: [
          { value: "en", title: "English" },
          { value: "es", title: "Español" },
          { value: "ja", title: "日本語" },
        ],
      },
    },
  },
  initialGlobals: { theme: "washi", locale: "en" },
  decorators: [
    (Story, { globals, viewMode }) => {
      const themeName = String(globals.theme) as NonNullable<RootProps["theme"]>;
      const locale = String(globals.locale);
      // In the canvas the whole page follows the theme; on docs pages only the story frame does.
      if (viewMode === "story") {
        document.documentElement.dataset.theme = themeName;
        document.documentElement.lang = locale;
      }
      return (
        <Root
          locale={locale}
          theme={themeName}
          className={viewMode === "story" ? "ol-sb-canvas ol-sb-canvas--fill" : "ol-sb-canvas"}
        >
          <Story />
        </Root>
      );
    },
  ],
  parameters: {
    layout: "fullscreen",
    a11y: { test: "error" },
    controls: { expanded: true },
    docs: { theme },
    options: {
      storySort: { order: ["Foundations", ["Principles", "Colour", "Type", "Tokens"], "*"] },
    },
  },
};

export default preview;
