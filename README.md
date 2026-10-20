# Olivine

[![CI](https://github.com/fdamianenriquez/olivine/actions/workflows/ci.yml/badge.svg)](https://github.com/fdamianenriquez/olivine/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/olivine.svg?color=2f3a1a)](https://www.npmjs.com/package/olivine)
[![License: MIT](https://img.shields.io/badge/license-MIT-2f3a1a.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/types-included-2f3a1a.svg)](#usage)

Olivine is a React component library drawn in ink on paper: Japanese minimalism and web
brutalism, fine hairlines, square boxes, mono labels, and an olive-and-maple palette taken
from a Telecaster on cream. It ships typed components, one stylesheet, design tokens and
self-hosted fonts, in two themes (`washi` and `sumi`) and three locales (`en`, `es`, `ja`).

- **50 components**: layout, actions, forms, navigation, content, feedback and overlays.
- **Accessible**: built for WCAG 2.2 AA. Keyboard support, visible focus, correct ARIA, and
  `axe` checks in every component's tests.
- **Themed and localised**: cream and ebony themes (or follow the system), and every built-in
  string goes through a locale you can override.
- **Light**: plain CSS with BEM classes (`ol-` prefix), no CSS-in-JS, no runtime style
  injection. The only runtime dependency is `@floating-ui/dom`.

## Install

```sh
pnpm add olivine
```

React 18 or 19 is a peer dependency (`react` and `react-dom` `^18.0.0 || ^19.0.0`).

## Usage

```tsx
import "olivine/styles.css";
import { Button, Root } from "olivine";

export function App() {
  return (
    <Root locale="en">
      <Button variant="accent" brackets arrow>
        Send inquiry
      </Button>
    </Root>
  );
}
```

Wrap the app in one `Root`. It sets the ground colour, the fonts, the focus ring and the
language of the built-in labels.

### Themes

Olivine has two themes: `washi` (cream, the default) and `sumi` (ebony). Set `data-theme` on
`<html>` or any element, or pass `theme` to `Root`. `auto` follows the system setting.

```html
<html data-theme="auto"></html>
```

### Locales

`Root` takes `locale="en" | "es" | "ja"`, and `labels` to override single strings:

```tsx
<Root locale="es" labels={{ close: "Salir" }}>
  <App />
</Root>
```

### Stylesheets

| Import                   | Contains                                                  |
| ------------------------ | --------------------------------------------------------- |
| `olivine/styles.css`     | Tokens, fonts, base styles, components and utilities      |
| `olivine/tokens.css`     | Design tokens as CSS custom properties, both themes       |
| `olivine/fonts.css`      | `@font-face` rules for the self-hosted fonts              |
| `olivine/fonts-jp.css`   | Opt-in Zen Old Mincho for kanji (loaded by unicode slice) |
| `olivine/components.css` | Base styles, components and utilities only                |

Typed token values are available from `olivine/tokens`.

## Documentation

Component docs, guides and a full demo page: https://fdamianenriquez.github.io/olivine/

To run them locally:

```sh
pnpm install
pnpm dev
```

## Browser support

The last two versions of evergreen browsers (Chrome, Edge, Firefox, Safari).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Please read the [Code of Conduct](./CODE_OF_CONDUCT.md),
and report security issues as described in [SECURITY.md](./SECURITY.md).

## Licence

Code: [MIT](./LICENSE). Fonts: SIL Open Font License 1.1, see `fonts/`.
