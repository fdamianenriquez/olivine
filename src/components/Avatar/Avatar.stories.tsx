import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Root } from "../Root";
import { Tooltip } from "../Tooltip";
import { Avatar, AvatarGroup } from "./Avatar";
import type { AvatarSize } from "./AvatarGroupContext";

/** A birch wood in fog, drawn as a small image so the stories need no network. */
const birches =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <rect width="160" height="160" fill="#d9d6cc"/>
      <rect y="110" width="160" height="50" fill="#b9a77a"/>
      <g fill="#f4f1ea" stroke="#3a372f" stroke-width="1">
        <rect x="18" y="0" width="9" height="160"/><rect x="58" y="0" width="6" height="160"/>
        <rect x="96" y="0" width="11" height="160"/><rect x="134" y="0" width="5" height="160"/>
      </g>
      <g fill="#3a372f">
        <rect x="18" y="40" width="5" height="2"/><rect x="98" y="70" width="6" height="2"/>
        <rect x="58" y="96" width="4" height="2"/><rect x="21" y="120" width="5" height="2"/>
      </g>
    </svg>`,
  );
/** Bytes that are not an image: the photo fails at once. */
const broken = "data:image/png;base64,AAAA";

const SIZES: readonly AvatarSize[] = ["xs", "s", "m", "l", "xl"];

const row: CSSProperties = {
  display: "flex",
  gap: "var(--space-4)",
  flexWrap: "wrap",
  alignItems: "center",
};
const stack: CSSProperties = { display: "grid", gap: "var(--space-6)", alignContent: "start" };
const table: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "calc(var(--space-24) + var(--space-4)) repeat(5, auto)",
  gap: "var(--space-4) var(--space-6)",
  alignItems: "center",
  justifyContent: "start",
};
const caption: CSSProperties = {
  color: "var(--ink-2)",
  fontFamily: "var(--text-label-family)",
  fontSize: "var(--text-label-size)",
};
const heading: CSSProperties = {
  margin: 0,
  fontFamily: "var(--text-label-family)",
  fontSize: "var(--text-label-size)",
  fontWeight: "var(--text-label-weight)",
};
const line: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: "var(--space-3)",
  alignItems: "start",
  paddingBlock: "var(--space-3)",
  borderBottom: "var(--stroke-hair) solid var(--rule)",
  fontFamily: "var(--text-body-s-family)",
  fontSize: "var(--text-body-s-size)",
};

const meta = {
  title: "Content/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  args: { name: "Haruka Mori", kanji: "森" },
  parameters: {
    docs: {
      description: {
        component:
          "Avatar marks a person or an organisation in a square: a photo, a hanko seal of the name in kanji (negative `.ol-stamp`, shu by default), or initials on paper-2. Fallback order: photo → seal → initials. AvatarGroup joins avatars so their borders are shared, with a `+N` overflow cell.\n\n**Props (Avatar)** — `name` (required: accessible name and initials), `src`, `initials` (overrides the derived initials), `kanji` (1–4 characters; `xs` holds 1–2), `ink` (`shu` | `ink` | `olivo`), `size` (`xs` 24 | `s` 32 | `m` 44 | `l` 56 | `xl` 80), `status` (`online` | `away` | `busy` | `offline`), `showName`, `meta`, `press`, `lang` (the name's language: upper-cases the initials and tags the initials and visible name; the accessible name stays in the locale's language), plus span attributes and `ref`. No `alt`: the photo is decorative and the name is on the root.\n\n**Props (AvatarGroup)** — `label` (required), `max` (default 4), `size` (passed to members through context).\n\nThe root is `role=\"img\"` named \"{name}, {status word}\", and its hover title shows the status word. With `showName` the mark is decorative and the name, status word and meta are real text. Initials come from the data: the first letter of the first and last word, or for Han, kana and Hangul the first character of the first word (family name first). Presence changes are not announced live; use a live region in the app if they must be.\n\n- Do use the seal when you have the person's name in kanji; keep a group to one size.\n- Do wrap an avatar in a Button or Link to act on the person (`xs` is the 24px minimum target).\n- Do use `showName`, or a Button with a Tooltip, wherever the status matters: a hover title never reaches touch or keyboard users.\n- Don't show a status without its word or title; don't put `onClick` on an Avatar.\n- Don't mix a seal and a photo of the same person; don't use `press` in lists (one or two per view).",
      },
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Sizes() {
  const rows: [string, (size: AvatarSize) => React.ReactNode][] = [
    ["Initials", (size) => <Avatar name="Emi Kato" size={size} />],
    ["Seal · 2 kanji", (size) => <Avatar name="Emi Kato" kanji="加藤" size={size} />],
    ["Seal · 4 kanji", (size) => <Avatar name="Shirakaba Gakki" kanji="白樺楽器" size={size} />],
    ["Photo", (size) => <Avatar name="Haruka Mori" src={birches} size={size} />],
  ];
  return (
    <div style={table}>
      {rows.map(([title, draw]) => (
        <div key={title} style={{ display: "contents" }}>
          <span style={caption}>{title}</span>
          {SIZES.map((size) => (
            <span key={size}>{draw(size)}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

export const AllSizes: Story = { render: () => <Sizes /> };

function Inks() {
  return (
    <div style={row}>
      <Avatar name="Daichi Ueno" kanji="上野" size="l" />
      <Avatar name="Daichi Ueno" kanji="上野" ink="ink" size="l" />
      <Avatar name="Daichi Ueno" kanji="上野" ink="olivo" size="l" />
      <Avatar name="Haruka Mori" kanji="森" size="l" />
    </div>
  );
}

export const SealInks: Story = { render: () => <Inks /> };

function Fallback() {
  return (
    <div style={row}>
      <Avatar name="Abe Kenji" src={broken} kanji="阿部" size="l" />
      <Avatar name="Kenji Sato" src={broken} size="l" />
      <Avatar name="Haruka Mori" src={birches} size="l" />
      <Avatar name="田中 太郎" size="l" />
    </div>
  );
}

export const FallbackOrder: Story = { render: () => <Fallback /> };

function Status() {
  return (
    <div style={stack}>
      <Avatar name="Haruka Mori" kanji="森" status="online" showName />
      <Avatar name="Daichi Ueno" kanji="上野" status="busy" showName />
      <Avatar name="Emi Kato" kanji="加藤" status="away" showName />
      <Avatar name="Sora Ito" status="offline" showName />
      <div style={row}>
        {SIZES.map((size) => (
          <Avatar key={size} name="Haruka Mori" kanji="森" status="online" size={size} />
        ))}
      </div>
    </div>
  );
}

export const WithStatus: Story = { render: () => <Status /> };

function Groups() {
  return (
    <div style={stack}>
      <AvatarGroup label="Luthiers on this order">
        <Avatar name="Haruka Mori" kanji="森" />
        <Avatar name="Daichi Ueno" kanji="上野" />
        <Avatar name="Emi Kato" kanji="加藤" />
        <Avatar name="Sora Ito" status="online" />
        <Avatar name="Ren Abe" />
        <Avatar name="Kenji Sato" />
      </AvatarGroup>
      <AvatarGroup label="Watching this order" size="xs" max={5}>
        <Avatar name="Haruka Mori" />
        <Avatar name="Daichi Ueno" />
        <Avatar name="Emi Kato" />
        <Avatar name="Sora Ito" />
        <Avatar name="Ren Abe" />
        <Avatar name="Kenji Sato" />
      </AvatarGroup>
    </div>
  );
}

export const Group: Story = { render: () => <Groups /> };

function InContext() {
  return (
    <div style={{ ...stack, maxWidth: "calc(var(--space-32) * 4)" }}>
      <div
        style={{
          ...row,
          justifyContent: "space-between",
          paddingBottom: "var(--space-3)",
          borderBottom: "var(--stroke-hair) solid var(--rule)",
        }}
      >
        <h3 style={{ ...heading, fontSize: "var(--text-label-l-size)" }}>
          Norikura · olive, alder
        </h3>
        <Avatar name="Haruka Mori" kanji="森" status="online" meta="Lead luthier" showName press />
      </div>
      <div>
        {[
          [
            "Daichi Ueno",
            "上野",
            "Mon 9:12",
            "Body roughed out. Alder weighs 1.9 kg, nicely light.",
          ],
          ["Emi Kato", "加藤", "Wed 16:40", "First coat of olive nitro. Curing for 5 days."],
          ["Sora Ito", undefined, "Thu 11:05", "Asked for the D profile instead of C — changed."],
        ].map(([name = "", kanji, time, text]) => (
          <div key={name} style={line}>
            <Avatar name={name} {...(kanji ? { kanji } : {})} size="s" />
            <div>
              <strong style={{ fontFamily: "var(--text-label-family)" }}>{name}</strong>{" "}
              <span style={{ color: "var(--ink-2)" }}>{time}</span>
              <div>{text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const OrderThread: Story = { render: () => <InContext /> };

function Gallery() {
  return (
    <div style={stack}>
      <Sizes />
      <Inks />
      <Fallback />
      <Status />
      <Groups />
    </div>
  );
}

export const Themes: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <Gallery />
        </Root>
      ))}
    </div>
  ),
};

export const InAButton: Story = {
  name: "In a button, with a tooltip",
  render: () => (
    <div style={row}>
      <Tooltip content="Daichi Ueno, Busy">
        <button
          type="button"
          style={{ padding: 0, border: 0, background: "none", cursor: "pointer" }}
        >
          <Avatar name="Daichi Ueno" kanji="上野" status="busy" title="" />
        </button>
      </Tooltip>
      <span style={caption}>Focus or hover the avatar: the button is named by it.</span>
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div style={stack}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <div style={row}>
            <Avatar name="Haruka Mori" kanji="森" status="online" showName />
            <Avatar name="Sora Ito" status="offline" showName />
            <AvatarGroup label="Luthiers" size="s" max={2}>
              <Avatar name="森 春香" />
              <Avatar name="上野 大地" />
              <Avatar name="加藤 恵美" />
              <Avatar name="伊藤 空" />
            </AvatarGroup>
          </div>
        </Root>
      ))}
    </div>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <div style={row}>
      <Avatar name="Haruka Mori" kanji="森" size="xl" press />
      <div className={REDUCE_MOTION_CLASS}>
        <Avatar name="Haruka Mori" kanji="森" size="xl" press />
      </div>
      <span style={caption}>Press motion, then the same seal with reduced motion (end state).</span>
    </div>
  ),
};
