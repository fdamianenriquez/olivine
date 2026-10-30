# olivine

## 0.3.0

### Minor Changes

- [#27](https://github.com/fdamianenriquez/olivine/pull/27) [`70ca903`](https://github.com/fdamianenriquez/olivine/commit/70ca903ac01cd2b8fd8e5501adfe7792d1e7530f) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the motion foundation: v2 motion tokens (`--ease-move` jo-ha-kyū, `--ease-effect`, `--ease-standard`, `--ease-print`, `--dur-s|m|l|xl`, `--stagger`), the six core motions in `olivine/styles.css`, the opt-in `ol-motion-*` classes in a new `olivine/motion-extras.css`, and motion helpers (`startViewTransition`, `useViewTransition`, `useReducedMotion`, `useEntrance`, `useSumi`, `useOrigami`, `ENSO`). The stepped `--motion-*` duration tokens are deprecated and keep their values until each component migrates.

- [#33](https://github.com/fdamianenriquez/olivine/pull/33) [`41fa2f7`](https://github.com/fdamianenriquez/olivine/commit/41fa2f7fb57798990cd3f634a18e2cb61008a9f3) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add Avatar and AvatarGroup: a photo, hanko seal or initials in a square, a status dot that always carries its word, and a group with shared borders and a named +N cell. New locale keys `avatarStatus`, `avatarLabel` and `avatarMore`.

- [#33](https://github.com/fdamianenriquez/olivine/pull/33) [`0cdea9b`](https://github.com/fdamianenriquez/olivine/commit/0cdea9b69f2da62f3e578631b30dc3b573fd6c01) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add ChipGroup: a labelled toolbar of chips with shared selection (none, single or multiple), roving focus, Escape to clear, removal that hands focus to the neighbour with a polite announcement, hidden inputs for forms and an `actionRef` focus handle.

- [#33](https://github.com/fdamianenriquez/olivine/pull/33) [`b76a4be`](https://github.com/fdamianenriquez/olivine/commit/b76a4beced20122ea0625a73d69db8f6ea11968c) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add Chip: a 32px hairline token that can be an action, toggle, link or removable value, with a hanko-stamped ✓ when selected. New locale keys `removeChip`, `chipRemoved` and `chipsCleared`.

- [#33](https://github.com/fdamianenriquez/olivine/pull/33) [`021d8bc`](https://github.com/fdamianenriquez/olivine/commit/021d8bc153eefcfb9e401fd5d0f944a594c917ca) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Dropdown now runs on a shared menu layer. The pointer moves the highlight, so only one row is ever inverted; long menus stop at the viewport edge and scroll; headers name their group (`role="group"`); typeahead ignores case and accents in the page language and takes an optional item `textValue`. New props `restoreFocus` and item `id`, `textValue` and `closeOnSelect`; `onOpenChange` also receives why the menu closed. `kbd` takes a `Shortcut` (`"mod+r"`, or glyphs such as `"⌘R"`), drawn with Kbd and exposed as `aria-keyshortcuts`. The menu stays mounted and inert while an exit motion plays (`ol-motion-noren`). Rows are taller on touch screens.

- [#33](https://github.com/fdamianenriquez/olivine/pull/33) [`06aa9e5`](https://github.com/fdamianenriquez/olivine/commit/06aa9e55fcd324ae648868de9af533b7b7c7dcc8) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add Fab: a floating action button for the one primary action of a view, with an extended label, collapse on scroll and an optional menu of up to six related actions. New utility class `.ol-has-fab` for scroll containers under a Fab.

- [#33](https://github.com/fdamianenriquez/olivine/pull/33) [`392066c`](https://github.com/fdamianenriquez/olivine/commit/392066cafb9f9432c49ae40a38ccac80f1edde10) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add Kbd and KbdGroup for keys and shortcuts, with platform-aware symbols and spoken key names from the locale (new `keys` dictionary, merged one level deep like `tags`), plus the shared `Shortcut` type and the `formatShortcut`, `parseShortcut`, `toAriaKeyShortcuts` and `useKbdPlatform` helpers. New tokens `--kbd-size` and `--kbd-pad`.

- [#33](https://github.com/fdamianenriquez/olivine/pull/33) [`3ba7f12`](https://github.com/fdamianenriquez/olivine/commit/3ba7f1270f5c2c993cd7d1ad114bdb0ae2411717) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Root: new `platform` prop (`"auto" | "apple" | "other"`), the keyboard Kbd draws shortcuts for, so server-rendered shortcuts match after hydration.

- [#33](https://github.com/fdamianenriquez/olivine/pull/33) [`5431888`](https://github.com/fdamianenriquez/olivine/commit/5431888043d3423c0036c82bdf2b51365aa45f6f) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add SegmentedControl: 2–5 joined cells for choosing one option (a radio group with arrow-key selection) or several (`multiple`, toggle buttons), with an ink wipe that travels from the previous choice.

- [#33](https://github.com/fdamianenriquez/olivine/pull/33) [`b1e9c07`](https://github.com/fdamianenriquez/olivine/commit/b1e9c079c2a26eaba90d40d61d49580c6d4bfeeb) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Button: new `square` prop for a single glyph (32 / 44 / 56px; the types require `aria-label` or `aria-labelledby`), which replaces the `ol-btn--icon` class with `ol-btn--square`; colour and arrow transitions use the motion tokens. Buttons with `aria-pressed` hover with `paper-2` while unpressed and ignore hover while pressed (the rule moves from ButtonGroup to Button). Tooltip no longer adds `aria-describedby` when its text only repeats the trigger's name. ToastStack and ToastProvider now default to the top-right corner (`tr`), since Fab owns the bottom-end corner.
  
  Tabs: arrow keys with Ctrl, Alt or Meta, and keys typed during IME composition, are left to the browser.

- [#33](https://github.com/fdamianenriquez/olivine/pull/33) [`767d3f5`](https://github.com/fdamianenriquez/olivine/commit/767d3f510a6c852dfccd3e06f30621b238e0446e) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - New `.ol-stamp` seal utility (shubun and hakubun, `--shu`, `--olivo`, `--square`, `--vertical`, `--round`, `--tilt`, `--press`); `Root` renders its edge filter once. New tokens `--shu` (seal vermilion, decorative only) and `--control-xl`. `--z-dropdown` is now 350, so menus and popovers stack above the navbar, Modal and Offcanvas.

- [#33](https://github.com/fdamianenriquez/olivine/pull/33) [`bb802e5`](https://github.com/fdamianenriquez/olivine/commit/bb802e5ffdb6491ff13b59d26db5c2fee1d48637) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add SplitButton: a primary button and a square menu trigger joined into one ruled bar, with Dropdown's menu lined up with the whole bar. New locale key `moreActions`.

- [#33](https://github.com/fdamianenriquez/olivine/pull/33) [`f7f0653`](https://github.com/fdamianenriquez/olivine/commit/f7f06534e31975ac7e757c6b134e77854d82c292) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Tabs: new `activation` (`automatic` | `manual`), `orientation` (`horizontal` | `vertical`) and `keepMounted` (default `true`) props; scroll buttons when the tabs overflow; the selected tab scrolls into view; the olive edge slides between tabs on the motion tokens; a disabled or out-of-range value falls back to the first enabled tab; only the visible panel is a tab stop, and only when it has nothing focusable.

- [#33](https://github.com/fdamianenriquez/olivine/pull/33) [`782eac9`](https://github.com/fdamianenriquez/olivine/commit/782eac98424efb59c9a1d3a68afe4c491addce80) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add ToggleButton, a Button that holds an on/off state (`pressed` / `defaultPressed` / `onPressedChange`, `outline` and `ghost`, `square`, `pressedIcon`). Disabled selectable buttons no longer fill on hover.

- [#32](https://github.com/fdamianenriquez/olivine/pull/32) [`39085ed`](https://github.com/fdamianenriquez/olivine/commit/39085edcc424af3ec5508b4cb5a13da913f44537) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Typography v2: titles in Big Shoulders Display, interface and reading text in Familjen Grotesk, code and data in Xanh Mono, kanji in Yuji Syuku (opt-in `olivine/fonts-jp.css`); amounts stay in Sprat Condensed. Labels, buttons, badges, tabs and meta lines are sentence case with no letter-spacing (nothing is uppercased outside stamps), table amount columns use the figure face at 16px, glyphs use the label face, and the active index of Nav and Accordion is ink. New type styles `label-s` and `figure-xs`; the `--font-serif` family is replaced by `--font-heading` and `--font-label`. Redaction, Ronzino, Martian Mono and Zen Old Mincho are no longer shipped.

### Patch Changes

- [#33](https://github.com/fdamianenriquez/olivine/pull/33) [`99a09d1`](https://github.com/fdamianenriquez/olivine/commit/99a09d140ea33e956d5016e71f9202aa4bc7b67e) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Accessibility fixes found by running axe on every story in a real browser: Pagination shows page numbers without zero padding, so the visible number is part of each page's name ("Page 1"), and the decorative index numbers of Tabs, Nav and Accordion use `ink-2` (4.5:1 or more) instead of `ink-3`; the active tab's index is `ink` (its olivo bar still marks the tab), so it reads on `paper-2` too.

- [#33](https://github.com/fdamianenriquez/olivine/pull/33) [`acc90cc`](https://github.com/fdamianenriquez/olivine/commit/acc90cc5170b0d24dd5ade92850c02c112bb96fd) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Kbd draws arrows and modifier symbols in the new `--font-symbols` token, one system symbol face, so they match in weight.

- [#33](https://github.com/fdamianenriquez/olivine/pull/33) [`74a0859`](https://github.com/fdamianenriquez/olivine/commit/74a08591f6a3c75dcfbd899a2ae622211aebeb0e) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - `--stroke-hair` is 1px on every screen. The 0.5px override on high-density screens is gone: browsers drew it at 1px while shared borders overlapped by half that, so joined controls showed doubled seams.

## 0.2.1

### Patch Changes

- [#25](https://github.com/fdamianenriquez/olivine/pull/25) [`658b5b4`](https://github.com/fdamianenriquez/olivine/commit/658b5b4618aded0a8e804e5034e572bee9cf9fa3) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Stop `Tooltip` logging "Accessing element.ref was removed in React 19" in development. It now reads its child's ref the same way `Popover` does, through a shared helper that works on React 18 and 19.

## 0.2.0

### Minor Changes

- [#23](https://github.com/fdamianenriquez/olivine/pull/23) [`0461c6c`](https://github.com/fdamianenriquez/olivine/commit/0461c6c82bf1eee224851547da3ab6c38a975f2b) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Narrow the `react` and `react-dom` peer dependency range from `>=18` to `^18.0.0 || ^19.0.0`. Olivine is tested against React 18.3 and React 19.3; React 20 and later are no longer accepted until they are tested. Apps on React 18 or 19 are not affected. Also make a few internal ref and test types compatible with `@types/react` 18.

## 0.1.1

### Patch Changes

- [#19](https://github.com/fdamianenriquez/olivine/pull/19) [`5bc344f`](https://github.com/fdamianenriquez/olivine/commit/5bc344f1608a5a66b4ce59ffcddcbcf78c472031) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Publish releases through npm trusted publishing, so each version carries a provenance attestation.

## 0.1.0

### Minor Changes

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`f355c6f`](https://github.com/fdamianenriquez/olivine/commit/f355c6f95e0497f9c3eb75c4a59671217402abe6) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Accordion` component: a ruled list of disclosure rows with an index, title and +/− sign; single or `multiple` open rows, controlled `value`, arrow-key navigation between headers and a `headingLevel`.

- [#8](https://github.com/fdamianenriquez/olivine/pull/8) [`d21f6bc`](https://github.com/fdamianenriquez/olivine/commit/d21f6bc30f33c12aec967cafb3393e36ae11bf50) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add Alert component: an inline status message with a word tag, optional title, action and dismiss button.

- [#5](https://github.com/fdamianenriquez/olivine/pull/5) [`aab4927`](https://github.com/fdamianenriquez/olivine/commit/aab49273b3029f80240670f5899f579f5e867e25) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Badge` component: a mono tag with `neutral`, `solid`, `accent` (maple), `olivo` and status tones, a `dot` and a square `count`. Status tones warn in development when they carry no word.

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`1848f15`](https://github.com/fdamianenriquez/olivine/commit/1848f159311e95bb65c7da37338d2712808c5724) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Breadcrumb` component: the path as mono labels separated by "/", with the last item as the current page and a localised navigation name.

- [#5](https://github.com/fdamianenriquez/olivine/pull/5) [`47719c4`](https://github.com/fdamianenriquez/olivine/commit/47719c4a4ff78d60afdf3939aa60bdf1bf8b70e7) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Button` component: `outline`, `solid`, `accent`, `ghost` and `danger` variants in sizes `s`, `m` and `l`, with `brackets`, `arrow`, `icon`, `loading` (announced from the locale), `block` and `href` (renders a link).

- [#5](https://github.com/fdamianenriquez/olivine/pull/5) [`6498c26`](https://github.com/fdamianenriquez/olivine/commit/6498c26810367d9cb69577d3816d8d9d4954f61a) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `ButtonGroup` component: buttons joined into one ruled bar with shared borders, horizontal or `vertical`; mark the selected one with `aria-pressed`.

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`3cbba6a`](https://github.com/fdamianenriquez/olivine/commit/3cbba6a053fa38d789621712ab462f1662ba411a) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Card` component: an ink-framed box with an optional head (index and meta), media, title, body and footer, a `flat` variant, an `interactive` lift, and `href` cards that link through the title (one short link name, footer controls stay usable).

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`d5bc915`](https://github.com/fdamianenriquez/olivine/commit/d5bc91588d92b199ddcbe89bd540275581c4d542) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Carousel` component: one slide at a time with a tick bar, a "01 / 03" counter, previous/next cells and arrow keys when focused. Optional autoplay pauses on hover and focus, has a play/pause control and stays off under reduced motion. Slides move with a stepped 160ms transition.

- [#5](https://github.com/fdamianenriquez/olivine/pull/5) [`a1777fb`](https://github.com/fdamianenriquez/olivine/commit/a1777fb4a66ae8ae3f2dece510eb528063990e33) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Checkbox` component: a 20px square with `label`, `hint` and an `indeterminate` state, wired to its `Field`.

- [#5](https://github.com/fdamianenriquez/olivine/pull/5) [`f2cd01a`](https://github.com/fdamianenriquez/olivine/commit/f2cd01a3471a228620c12212d0013f495e85a026) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `CheckGroup` component: a fieldset with a mono legend for checkboxes or radios, in a column or `inline`.

- [#5](https://github.com/fdamianenriquez/olivine/pull/5) [`07f9470`](https://github.com/fdamianenriquez/olivine/commit/07f94709f6e6e2d934b535abb3cee9e4362b2bd2) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `CloseButton` component: a 32px square "×" whose accessible name comes from the locale (`close`) unless `label` is given.

- [#4](https://github.com/fdamianenriquez/olivine/pull/4) [`1db807e`](https://github.com/fdamianenriquez/olivine/commit/1db807ea115206b8f10717abda3a48be89dfce64) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Col` component: a `Grid` cell with a responsive `span` (a number from 720px up, or `{ base, sm, md, lg, xl }`) and `start`.

- [#4](https://github.com/fdamianenriquez/olivine/pull/4) [`81298c9`](https://github.com/fdamianenriquez/olivine/commit/81298c96b8dd65647b78edfacfb2e8ffb6c57004) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Container` component: a centred layout wrapper at `container-max` with side gutters and a `fluid` option.

- [#7](https://github.com/fdamianenriquez/olivine/pull/7) [`0674e19`](https://github.com/fdamianenriquez/olivine/commit/0674e19035ca2dddfc53348016ea04b694cc2b75) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Divider: add `headingLevel` so a labelled section marker can be a real heading.

- [#4](https://github.com/fdamianenriquez/olivine/pull/4) [`4c541ec`](https://github.com/fdamianenriquez/olivine/commit/4c541ecc0983731fcf81f29602e2c0f27643ad47) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Divider` component: a hairline rule with `heavy` and `soft` weights, a `vertical` mode and a labelled section marker (`label`, `index`).

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`dcb190f`](https://github.com/fdamianenriquez/olivine/commit/dcb190f21f2a77ac8cd3de4f093520661d07b175) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Dropdown` component: a raised menu opened from a `Button`, rendered in a portal that keeps the theme, flipping and shifting at the viewport edge. Arrow keys, Home/End and typeahead move between items; Escape, Tab and outside presses close it and return focus.

- [#5](https://github.com/fdamianenriquez/olivine/pull/5) [`9442ac5`](https://github.com/fdamianenriquez/olivine/commit/9442ac567c377cf08111418d2999dbec52bc2636) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Field` component: a mono label, `hint`, `error`, `valid`, `required` mark and `aside` around one control. Olivine controls wire their id, description and validity through it automatically (also inside an `InputGroup`); plain elements are wired by cloning and custom inputs through the `Field.Control` render prop. Messages are announced through a polite live region.

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`95a263e`](https://github.com/fdamianenriquez/olivine/commit/95a263e1e2904f16761832ad904cf7f34d602dc7) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `figure` label to every locale.

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`138d34b`](https://github.com/fdamianenriquez/olivine/commit/138d34ba4b0ab66539aca5981aca57fe3fea9689) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Figure` component: media with a mono caption line ("FIG. 01 — caption …… credit"); the prefix comes from the locale.

- [#7](https://github.com/fdamianenriquez/olivine/pull/7) [`6b97c0b`](https://github.com/fdamianenriquez/olivine/commit/6b97c0b1d87f03abb72ceeb820f4fafb7d3d8bdd) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - FileInput: add `maxSize`, `onReject` and `onFilesChange` to reject files by size or `accept` type and receive only the accepted ones.

- [#5](https://github.com/fdamianenriquez/olivine/pull/5) [`81bf416`](https://github.com/fdamianenriquez/olivine/commit/81bf416b2194b84546fd4299e42aa5d4c32c811d) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `FileInput` component: a dashed drop zone around a native file input that lists the chosen file names (announced politely). Label, browse and empty texts come from the locale. The drag highlight no longer flickers over child elements.

- [#4](https://github.com/fdamianenriquez/olivine/pull/4) [`92d0d8f`](https://github.com/fdamianenriquez/olivine/commit/92d0d8f5444dc651bdadb823589db1573a66998d) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add layout tokens (`container-max`, breakpoints `bp-sm` to `bp-xl`), `dot-size`, the vertical kanji tracking and fluid sizes for the display and `figure-xl` styles (`--text-<style>-size` resolves to a `clamp()`).

- [#4](https://github.com/fdamianenriquez/olivine/pull/4) [`8da4d60`](https://github.com/fdamianenriquez/olivine/commit/8da4d607aba79b380f7d5ff2d8a59f493a232155) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Grid` component: a column grid with spacing-step `gap`, a `ruled` variant with shared ink lines, and polymorphic `as`.

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`23c8f8a`](https://github.com/fdamianenriquez/olivine/commit/23c8f8a07f2780abf3d2f9b9da39ee26f05e318d) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Image` component: a responsive image with a `framed` ink frame and paper mat and a `mono` grayscale that clears on hover; `alt` is required.

- [#5](https://github.com/fdamianenriquez/olivine/pull/5) [`da51bac`](https://github.com/fdamianenriquez/olivine/commit/da51bacfacd8fb006fcd15a0dd43ebd052f76fa1) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Input` component: a square text field with sizes `s`, `m` and `l`, a bottom-rule `line` variant, and automatic wiring to its `Field`.

- [#5](https://github.com/fdamianenriquez/olivine/pull/5) [`e9aad11`](https://github.com/fdamianenriquez/olivine/commit/e9aad11ceaf39dedfb671f72e0daed50bfe8c324) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `InputGroup` component: joins `Input`, `Select`, `Button` and `InputGroup.Text` affixes into one ruled bar with shared borders. Controls inside still wire to the surrounding `Field`.

- [#4](https://github.com/fdamianenriquez/olivine/pull/4) [`f7c30c3`](https://github.com/fdamianenriquez/olivine/commit/f7c30c3df859da96d11a416c3983c57a5a2f8b09) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Label` component: the mono uppercase voice of the interface, with optional `index`, `dot` and `muted`.

- [#5](https://github.com/fdamianenriquez/olivine/pull/5) [`b4c04d1`](https://github.com/fdamianenriquez/olivine/commit/b4c04d1e2a623daacfbb99fb48cdbf5aa17c55c3) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Link` component: inline text navigation with a 1px underline, a `plain` variant whose underline draws in on hover, and `external` links that open in a new tab and say so to assistive technology (localised). Adds the `newTab` label to the locales.

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`03113f8`](https://github.com/fdamianenriquez/olivine/commit/03113f848307677e5cc6bf98320049823fbf68a0) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `ListGroup` component: ruled rows with a title, description and meta, as static, link or button rows, `numbered`, `boxed` or `flush`; the active row gets an olive edge and `aria-current`.

- [#8](https://github.com/fdamianenriquez/olivine/pull/8) [`3b32fee`](https://github.com/fdamianenriquez/olivine/commit/3b32feee32f3b53216a0814d25db6f7fd792932a) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add Modal component: a portal-mounted dialog with scrim, focus trap, Escape, inert page and scroll lock without layout shift. Adds the modal-width tokens.

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`7cbc04e`](https://github.com/fdamianenriquez/olivine/commit/7cbc04e48b9a94486941d8c19f1792b4fbe21f9d) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Nav` component: links or buttons in `line`, `boxed` and `vertical` variants, optionally `indexed`, with the current item marked by shape and `aria-current`.

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`01cb1d0`](https://github.com/fdamianenriquez/olivine/commit/01cb1d09b7b4edb5e4e690032299a7d3ae0e9cf2) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Navbar` component: brand (with an optional kanji mark), links with an olive dot on the current page, an end cell and `sticky`. Under 720px the links fold behind a localised menu button with `aria-expanded` and `aria-controls`.

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`950b341`](https://github.com/fdamianenriquez/olivine/commit/950b3413b80e66cdc1dc03007e821b10c3b5144c) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `brand`, `ui`, `figure-s` and `kanji-s` type styles, the `glyph-xl`, `menu-min-width` and `skeleton-min-height` tokens, and the `sortedAscending`, `sortedDescending`, `currentPage`, `play` and `pause` labels in every locale.

- [#8](https://github.com/fdamianenriquez/olivine/pull/8) [`f63f4e6`](https://github.com/fdamianenriquez/olivine/commit/f63f4e62cd262e4792aed3886a0deda0c6ff2760) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add Offcanvas: a panel that slides in from the start, end or bottom edge with focus trap, inert page and scroll lock. Adds the offcanvas-width token.

- [#7](https://github.com/fdamianenriquez/olivine/pull/7) [`094870a`](https://github.com/fdamianenriquez/olivine/commit/094870af606ad9eb36a13b31f601dc8fe93c6607) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Pagination: add `getHref` to render page cells as links for router- or server-based paging.

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`bb1626c`](https://github.com/fdamianenriquez/olivine/commit/bb1626cacabe222715ed3c436fa9ac8e7327301d) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Pagination` component: joined square cells with zero-padded numbers in the figure face, sibling truncation with ellipses, localised previous/next and page names, and the current page ink-filled.

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`f6837ad`](https://github.com/fdamianenriquez/olivine/commit/f6837ada43173637a1e0d13195aa6ec6e27765ed) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Placeholder` component: paper-2 skeleton text lines and blocks with a stepped sweep (opacity on an overlay, off under reduced motion), hidden from assistive technology, with an optional localised loading label.

- [#8](https://github.com/fdamianenriquez/olivine/pull/8) [`eb101af`](https://github.com/fdamianenriquez/olivine/commit/eb101af1f8a172d775451ef294122f4d753c8717) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add Popover: a click-toggled non-modal dialog panel with a title row, flip and shift positioning, and focus return to its trigger.

- [#8](https://github.com/fdamianenriquez/olivine/pull/8) [`3fabbc1`](https://github.com/fdamianenriquez/olivine/commit/3fabbc1fb99ec02488b1701334ca70f374555dc5) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add Progress component: olivo bar, ink bar or block segments with a zero-padded percentage, plus an indeterminate state.

- [#5](https://github.com/fdamianenriquez/olivine/pull/5) [`1bd4b85`](https://github.com/fdamianenriquez/olivine/commit/1bd4b85df618a9007d818a89f4e93307b6fb425c) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Radio` component: the round option, sharing Checkbox's label, hint and target-size behaviour.

- [#5](https://github.com/fdamianenriquez/olivine/pull/5) [`d4602f4`](https://github.com/fdamianenriquez/olivine/commit/d4602f4e7bbf062a1e840e07a467ff77344494d0) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Range` component: a hairline slider with a block thumb and an optional mono scale (min, current, max). `format` formats the scale and sets `aria-valuetext`.

- [#4](https://github.com/fdamianenriquez/olivine/pull/4) [`04d6e0d`](https://github.com/fdamianenriquez/olivine/commit/04d6e0d129a0975a6e9d1aa68b5a4da502ec0d6d) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Ratio` component: a fixed aspect-ratio frame whose child fills and covers.

- [#4](https://github.com/fdamianenriquez/olivine/pull/4) [`ed7cfce`](https://github.com/fdamianenriquez/olivine/commit/ed7cfce126c71cf02dd164c29929c8a5835e0fdc) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Root` component and the locale system: `Root` sets the Olivine ground, an optional `theme` (`washi`, `sumi`, or `auto` to follow the system) and the `locale` (`en`, `es`, `ja` or a full dictionary) with `labels` overrides. `locales`, `makeLabels`, `useLabels` and the `OlivineLabels` type are exported.

- [#5](https://github.com/fdamianenriquez/olivine/pull/5) [`38617b0`](https://github.com/fdamianenriquez/olivine/commit/38617b0d02cd8d2defa0dc71e75adc4a23985ffe) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Select` component: a native select restyled square with its arrow in an ink-ruled cell, `options` or `<option>` children, a `placeholder` and sizes `s` and `m`.

- [#4](https://github.com/fdamianenriquez/olivine/pull/4) [`7db3f30`](https://github.com/fdamianenriquez/olivine/commit/7db3f30577360834a02d6f4ae272c5d09a804ec5) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Sheet` component: the archive panel with an index, title and meta bar, a `flush` body and optional `crosshair` marks. A titled sheet is labelled by its title.

- [#8](https://github.com/fdamianenriquez/olivine/pull/8) [`fd5733b`](https://github.com/fdamianenriquez/olivine/commit/fd5733bcd4d8ac979005f191caa41fe935956868) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add Spinner component: a stepped square or blinking blocks with a locale-aware status label.

- [#4](https://github.com/fdamianenriquez/olivine/pull/4) [`1c41fed`](https://github.com/fdamianenriquez/olivine/commit/1c41fed852ae4b72f2a71233017406db682c8329) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Stack` component: a column or row layout with a spacing-step `gap`, `align`, `justify` and polymorphic `as`.

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`3436bf8`](https://github.com/fdamianenriquez/olivine/commit/3436bf88184b6ae27b5f41876e1ecfa1b999dad3) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Stat` component: one number in the figure face with a mono label, a symbol `unit`, a change line with a spoken trend (`up`/`down`), sizes `m`, `l` and `xl`, and an olive `accent`. Words in `value` or `unit` warn in development.

- [#5](https://github.com/fdamianenriquez/olivine/pull/5) [`3ecc63e`](https://github.com/fdamianenriquez/olivine/commit/3ecc63ed3f9f1982efdfedb26fea39ddf9302b5d) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Switch` component: an instant on/off setting with a localised state word (`showState`), controlled or uncontrolled. It requires a `label`, `aria-label` or `aria-labelledby`.

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`5db6f9c`](https://github.com/fdamianenriquez/olivine/commit/5db6f9c3351b4305957440e0784ce67f4abf929a) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Table` component: ruled data table typed by row, with numeric columns, client-side or controlled sorting (announced in the locale), a caption and `bordered`, `striped`, `hover` and `dense` variants. Named tables scroll in a keyboard-reachable region.

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`9774024`](https://github.com/fdamianenriquez/olivine/commit/9774024cb4f19b4892c4673fd6a3e429fc9cb108) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Tabs` component: WAI-ARIA tabs with automatic activation, arrow keys plus Home/End, disabled tabs skipped, `indexed` and `fill` variants, and focusable panels only when they have no focusable content.

- [#4](https://github.com/fdamianenriquez/olivine/pull/4) [`7334f96`](https://github.com/fdamianenriquez/olivine/commit/7334f960153b64718197a25a1b6f5964a017a323) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Text` component: every type style as a `variant` (display, headings, figures, body, mono, kanji), `muted`/`accent` tones, vertical writing and polymorphic `as`. Figure variants warn in development when given letters.

- [#5](https://github.com/fdamianenriquez/olivine/pull/5) [`0487993`](https://github.com/fdamianenriquez/olivine/commit/04879939495ba43a99054787baf603d5d99cf3e7) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `Textarea` component: the multi-line `Input`, resizing vertically only, wired to its `Field`.

- [#8](https://github.com/fdamianenriquez/olivine/pull/8) [`94350cf`](https://github.com/fdamianenriquez/olivine/commit/94350cf1c025dd7c9f83c566c1e27d4b7126f70a) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add Toast component: a brief raised notice with a tone dot, meta line, dismiss button and an optional timer that pauses on hover and focus. Adds the toast-width token.

- [#8](https://github.com/fdamianenriquez/olivine/pull/8) [`5e38008`](https://github.com/fdamianenriquez/olivine/commit/5e38008919eaa6ce88697cdc8a19d95ce3fbcff8) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add ToastStack with ToastProvider and useToast: a positioned polite live region, queued toasts with a max-visible setting, and a programmatic show, dismiss and clear API.

- [#3](https://github.com/fdamianenriquez/olivine/pull/3) [`5d316d8`](https://github.com/fdamianenriquez/olivine/commit/5d316d804fcd85f92c272da5779bca0affa9ee28) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add design tokens, self-hosted fonts and base styles. `olivine/styles.css` now includes the
  `washi` and `sumi` themes (plus `data-theme="auto"`), the fonts and the base and utility styles;
  `olivine/tokens.css`, `olivine/fonts.css`, `olivine/fonts-jp.css` (opt-in kanji font) and
  `olivine/components.css` are available on their own, and typed token values ship as
  `olivine/tokens`.

- [#8](https://github.com/fdamianenriquez/olivine/pull/8) [`96d2909`](https://github.com/fdamianenriquez/olivine/commit/96d29096a25e8248cd21e3d8cf212825618693a1) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add Tooltip: a hover, focus and touch long-press tooltip with open and close delays, flipping at viewport edges and a hoverable popup. Adds the tooltip-max-width token.

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`d27c217`](https://github.com/fdamianenriquez/olivine/commit/d27c217b8c756bee0e26c1c511e06e88d3613d51) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `trendUp` and `trendDown` labels to every locale.

### Patch Changes

- [#13](https://github.com/fdamianenriquez/olivine/pull/13) [`e59d9c9`](https://github.com/fdamianenriquez/olivine/commit/e59d9c9eec7ce699fda06bf821d6f283cd326ba3) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Field: when an Olivine control inside it has its own `id`, the label now points at that `id`. Before, the label kept pointing at the id the Field generated and no longer named the control.

- [#6](https://github.com/fdamianenriquez/olivine/pull/6) [`a13779e`](https://github.com/fdamianenriquez/olivine/commit/a13779e1ef855c3d8828c9a54f0ed86949b7f3ae) Thanks [@fdamianenriquez](https://github.com/fdamianenriquez)! - Add the `z-raised` token for lifting a hovered or focused cell in joined groups.
