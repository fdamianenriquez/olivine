# Fonts

All fonts are licensed under the SIL Open Font License 1.1. Each licence sits next to its files.

| Family                                   | Files                        | Designer                             | Licence                |
| ---------------------------------------- | ---------------------------- | ------------------------------------ | ---------------------- |
| Redaction (Regular, Italic)              | `Redaction-*.woff2`          | Titus Kaphar and Jeremy Mickel, MCKL | `Redaction-OFL.txt`    |
| Ronzino (Regular, Oblique, Medium, Bold) | `Ronzino-*.woff2`            | Collletttivo                         | `Ronzino-OFL.txt`      |
| Sprat Condensed Black                    | `Sprat-CondensedBlack.woff2` | Collletttivo                         | `Sprat-OFL.txt`        |
| Martian Mono 400                         | `martian-mono/`              | Evil Martians                        | `MartianMono-OFL.txt`  |
| Zen Old Mincho 500                       | `zen-old-mincho/`            | Yoshimichi Ohira                     | `ZenOldMincho-OFL.txt` |

`olivine/fonts.css` (included in `olivine/styles.css`) declares every family except Zen Old
Mincho. Zen Old Mincho is opt-in through `olivine/fonts-jp.css`: its full character set ships
split into `unicode-range` slices, so browsers only download the slices a page uses. Without it,
kanji fall back to the system's mincho (Hiragino Mincho, Yu Mincho).

Martian Mono and Zen Old Mincho are copied from their `@fontsource` packages with
`pnpm fonts:vendor`.
