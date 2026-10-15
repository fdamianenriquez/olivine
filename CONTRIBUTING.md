# Contributing to Olivine

## Setup

```sh
corepack enable   # uses the pnpm version pinned in package.json
pnpm install
pnpm dev          # Storybook on http://localhost:6006
```

Node: see `.nvmrc` (Active LTS). The minimum supported version is in `package.json#engines`.

## Scripts

| Script                         | What it does                                       |
| ------------------------------ | -------------------------------------------------- |
| `pnpm dev`                     | Storybook in development mode                      |
| `pnpm build`                   | Library (ESM + CJS + types) and `dist/olivine.css` |
| `pnpm lint`                    | ESLint and Stylelint, zero warnings allowed        |
| `pnpm format` / `format:check` | Prettier                                           |
| `pnpm typecheck`               | `tsc --noEmit`                                     |
| `pnpm test`                    | Vitest with coverage (includes axe checks)         |
| `pnpm check:package`           | publint and Are the Types Wrong                    |
| `pnpm size`                    | size-limit budgets                                 |
| `pnpm check`                   | Everything above, as CI runs it                    |

## Commits and pull requests

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/), in English and
  the imperative mood: `feat(button): add brackets prop`. A commit-msg hook checks this.
- A pre-commit hook lints and formats staged files.
- Every user-facing change needs a changeset: `pnpm changeset`. While on `0.x`, breaking
  changes are a minor bump.
- Releases are published by CI only. Never publish from a local machine.

## Design rules

- Every value comes from a token: no literal colours, sizes, spacing, radii or shadows in
  component CSS (Stylelint enforces colours).
- Words in Redaction, numbers in Sprat Condensed, interface text in Ronzino, labels in
  Martian Mono.
- `olivo` is the single accent; `maple` is a fill only, always with `ink` text.
- CSS classes are BEM with the `ol-` prefix.
- Every built-in string goes through the locale (`en`, `es`, `ja`).

## Adding a component

A component is done when:

1. `Name.tsx`, `Name.css` and `index.ts` live in `src/components/Name/` and it is exported
   from `src/index.ts`; its CSS is imported from `src/styles/index.css`.
2. Props are documented with TSDoc and match the component guideline.
3. Tests cover rendering, variants, controlled and uncontrolled behaviour, keyboard paths,
   axe, and locale strings.
4. Stories show every variant, both themes, and `es`/`ja` where text is built in.
5. It visually matches the reference design.
6. Its CSS uses tokens only and passes Stylelint.
