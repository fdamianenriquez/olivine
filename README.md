# Olivine

Olivine is a React component library drawn in ink on paper: Japanese minimalism and web
brutalism, fine hairlines, square boxes, mono labels, and an olive-and-maple palette taken
from a Telecaster on cream. It ships typed components, one stylesheet, design tokens and
self-hosted fonts, in two themes (`washi` and `sumi`) and three locales (`en`, `es`, `ja`).

> **Status:** under construction. Nothing is published yet.

## Install

```sh
pnpm add olivine
```

React 18 or later is a peer dependency.

## Usage

```tsx
import "olivine/styles.css";
import { Root, Button } from "olivine";

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

### Themes

Olivine has two themes: `washi` (cream, the default) and `sumi` (ebony). Set `data-theme` on
`<html>` or any element; `auto` follows the system setting.

```html
<html data-theme="auto"></html>
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

Component docs and guidelines: https://fdamianenriquez.github.io/olivine/

## Browser support

The last two versions of evergreen browsers (Chrome, Edge, Firefox, Safari).

## Licence

Code: [MIT](./LICENSE). Fonts: SIL Open Font License 1.1, see `fonts/`.
