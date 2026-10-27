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
| `pnpm visual`                  | Visual regression against the baselines (Docker)   |
| `pnpm visual:update`           | Rewrite the visual baselines (Docker)              |
| `pnpm ssr:prepare` / `ssr`     | Build and check the Next.js example (see below)    |
| `pnpm check`                   | The checks CI runs, except `visual` and `ssr`      |

## Quality gates

CI runs these jobs, and all of them must pass before a merge:

- **visual**: Playwright takes one screenshot per component and compares it with the baseline in
  `tests/visual/__screenshots__/`. That is the component's "Themes" story, captured once because it
  already shows both themes, or its first story in `washi` and `sumi` when it has none. The baselines are rendered in the same
  Playwright Docker image CI uses, so they match there. Run `pnpm visual` to compare locally.
  When a change to the look is intended, run `pnpm visual:update`, look at the images that
  changed in the diff, and commit them with the change. Docker must be running. The first run
  pulls the image and is slow on Apple Silicon, because the image is x86-64.
- **ssr**: `examples/next-app` is a Next.js App Router app that server-renders every component
  and hydrates it. CI builds the library, packs it and installs the tarball, so the check runs
  against what consumers install. It fails on any hydration warning or console error. Run
  `pnpm ssr:prepare` and then `pnpm ssr` to reproduce it.
- **Coverage and size**: `pnpm test` enforces coverage thresholds on `src/` and `pnpm size`
  enforces the bundle budgets in `.size-limit.json`. If a change legitimately needs more, raise
  the limit in the same pull request and say why.

When Dependabot updates `@playwright/test`, set the image tag in `.github/workflows/ci.yml` to
the same version (`pnpm check:playwright` tells you), then run `pnpm visual:update`.

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
- Titles in Big Shoulders Display, amounts in Sprat Condensed, interface text and labels in
  Familjen Grotesk (sentence case), code and data in Xanh Mono.
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
