// Photographs of the fictional workshop, bundled by Vite. Keys are the file names without the extension.
// The images are AI-generated (the page footer says so) and never ship in the npm package.

import birch from "./images/birch.webp";
import detBridge from "./images/det-bridge.webp";
import detHardtail from "./images/det-hardtail.webp";
import detHead from "./images/det-head.webp";
import detSlot from "./images/det-slot.webp";
import hands from "./images/hands.webp";
import shed from "./images/shed.webp";
import standKaichi from "./images/stand-kaichi.webp";
import standNorikura from "./images/stand-norikura.webp";
import standUtsukushi from "./images/stand-utsukushi.webp";
import swBoardEbony from "./images/sw-board-ebony.webp";
import swBoardPauferro from "./images/sw-board-pauferro.webp";
import swFinishAi from "./images/sw-finish-ai.webp";
import swFinishCream from "./images/sw-finish-cream.webp";
import swFinishKakishibu from "./images/sw-finish-kakishibu.webp";
import swFinishNatural from "./images/sw-finish-natural.webp";
import swFinishOlive from "./images/sw-finish-olive.webp";
import swFinishSumi from "./images/sw-finish-sumi.webp";
import swGuardBlack from "./images/sw-guard-black.webp";
import swGuardCream from "./images/sw-guard-cream.webp";
import swGuardMint from "./images/sw-guard-mint.webp";
import swGuardTort from "./images/sw-guard-tort.webp";
import swHwAged from "./images/sw-hw-aged.webp";
import swHwBlack from "./images/sw-hw-black.webp";
import swHwChrome from "./images/sw-hw-chrome.webp";
import swNeckMahogany from "./images/sw-neck-mahogany.webp";
import swNeckMaple from "./images/sw-neck-maple.webp";
import swNeckRoasted from "./images/sw-neck-roasted.webp";
import swPuHumbucker from "./images/sw-pu-humbucker.webp";
import swPuP90 from "./images/sw-pu-p90.webp";
import swPuSingle from "./images/sw-pu-single.webp";
import swWoodAlder from "./images/sw-wood-alder.webp";
import swWoodAsh from "./images/sw-wood-ash.webp";
import swWoodKiri from "./images/sw-wood-kiri.webp";
import swWoodMahogany from "./images/sw-wood-mahogany.webp";
import w01 from "./images/w01.webp";
import w02 from "./images/w02.webp";
import w03 from "./images/w03.webp";
import w05 from "./images/w05.webp";
import w06 from "./images/w06.webp";
import w09 from "./images/w09.webp";
import w11 from "./images/w11.webp";
import w12 from "./images/w12.webp";

/** Every photograph by key. A key with no file simply has no entry. */
export const PHOTOS: Readonly<Record<string, string>> = {
  birch: birch,
  "det-bridge": detBridge,
  "det-hardtail": detHardtail,
  "det-head": detHead,
  "det-slot": detSlot,
  hands: hands,
  shed: shed,
  "stand-kaichi": standKaichi,
  "stand-norikura": standNorikura,
  "stand-utsukushi": standUtsukushi,
  "sw-board-ebony": swBoardEbony,
  "sw-board-pauferro": swBoardPauferro,
  "sw-finish-ai": swFinishAi,
  "sw-finish-cream": swFinishCream,
  "sw-finish-kakishibu": swFinishKakishibu,
  "sw-finish-natural": swFinishNatural,
  "sw-finish-olive": swFinishOlive,
  "sw-finish-sumi": swFinishSumi,
  "sw-guard-black": swGuardBlack,
  "sw-guard-cream": swGuardCream,
  "sw-guard-mint": swGuardMint,
  "sw-guard-tort": swGuardTort,
  "sw-hw-aged": swHwAged,
  "sw-hw-black": swHwBlack,
  "sw-hw-chrome": swHwChrome,
  "sw-neck-mahogany": swNeckMahogany,
  "sw-neck-maple": swNeckMaple,
  "sw-neck-roasted": swNeckRoasted,
  "sw-pu-humbucker": swPuHumbucker,
  "sw-pu-p90": swPuP90,
  "sw-pu-single": swPuSingle,
  "sw-wood-alder": swWoodAlder,
  "sw-wood-ash": swWoodAsh,
  "sw-wood-kiri": swWoodKiri,
  "sw-wood-mahogany": swWoodMahogany,
  w01: w01,
  w02: w02,
  w03: w03,
  w05: w05,
  w06: w06,
  w09: w09,
  w11: w11,
  w12: w12,
};

/** The URL of a photograph, or `undefined` when there is none (the caller draws a vector fallback). */
export const photo = (key: string): string | undefined => PHOTOS[key];
