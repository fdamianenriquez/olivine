import type { StorybookConfig } from "@storybook/react-vite";
import remarkGfm from "remark-gfm";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: [
    "../docs/**/*.mdx",
    "../stories/**/*.stories.@(ts|tsx)",
    "../src/**/*.mdx",
    "../src/**/*.stories.@(ts|tsx)",
  ],
  addons: [
    {
      name: "@storybook/addon-docs",
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    "@storybook/addon-a11y",
  ],
  core: { disableTelemetry: true },
  typescript: { reactDocgen: "react-docgen-typescript" },
  // Vite's default CSS target is older than our browser support (last two evergreen versions), so
  // the minifier lowered `:dir(rtl)` into a `:lang(ar, he, …)` list and RTL stories lost their CSS.
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    build: {
      ...viteConfig.build,
      cssTarget: ["chrome120", "edge120", "firefox121", "safari17"],
    },
  }),
};

export default config;
