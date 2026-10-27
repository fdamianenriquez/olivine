# Fonts

All fonts are licensed under the SIL Open Font License 1.1. Each licence sits next to its files.

| Family                              | Files                        | Designer                            | Licence                       |
| ----------------------------------- | ---------------------------- | ----------------------------------- | ----------------------------- |
| Big Shoulders Display 300, 400, 800 | `big-shoulders-display/`     | Patric King / Chicago Design System | `BigShouldersDisplay-OFL.txt` |
| Familjen Grotesk 400, 500, 600      | `familjen-grotesk/`          | Familjen STHLM                      | `FamiljenGrotesk-OFL.txt`     |
| Xanh Mono 400                       | `xanh-mono/`                 | Yellow Type                         | `XanhMono-OFL.txt`            |
| Sprat Condensed Black               | `Sprat-CondensedBlack.woff2` | Collletttivo                        | `Sprat-OFL.txt`               |
| Yuji Syuku 400                      | `yuji-syuku/`                | Kinuta Font Factory                 | `YujiSyuku-OFL.txt`           |

`olivine/fonts.css` (included in `olivine/styles.css`) declares every family except Yuji Syuku.
Yuji Syuku is opt-in through `olivine/fonts-jp.css`: its full character set ships split into
`unicode-range` slices, so browsers only download the slices a page uses. Without it, kanji fall
back to the system's mincho (Hiragino Mincho, Yu Mincho).

Big Shoulders Display, Familjen Grotesk, Xanh Mono and Yuji Syuku are copied from their
`@fontsource` packages with `pnpm fonts:vendor`.
