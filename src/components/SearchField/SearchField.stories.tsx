import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useEffect, useRef, useState } from "react";

import { REDUCE_MOTION_CLASS } from "../../motion";
import { Field } from "../Field";
import { Navbar } from "../Navbar";
import { Root } from "../Root";
import { SearchField } from "./SearchField";

const meta = {
  title: "Forms/SearchField",
  component: SearchField,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `SearchField is a field for a query that is submitted. It shows a search glyph, takes the query, submits it with Enter (or an optional Search button) and clears it with a × that appears only when there is text; Escape closes the suggestions, then clears. Give it \`options\` and a list of suggestions opens under the field (focus stays in the input, ArrowDown moves through them, picking one submits it). Give it \`fullscreen="compact"\` and on small screens it becomes a bar that opens a full-screen view, unrolled like a hanging scroll, where the app shows suggestions and results. It renders the \`search\` landmark for you. It does not fetch or filter: you supply the suggestions and results. Use \`Input\` for ordinary text, \`Combobox\` to choose a value from a list, and \`CommandPalette\` to run commands.

- Do put one SearchField in the page header (for example in the Navbar \`end\` cell) and give extra ones a \`landmarkLabel\`.
- Do put the results in your main content (or in \`children\` of the view), not inside the landmark.
- Do announce changing results with \`resultCount\`; the field is silent about results it cannot see.
- Do debounce your own request with \`onQueryChange\` rather than on every \`onChange\`.
- Don't use it to pick a value from a list (use \`Combobox\`) or to run commands (use \`CommandPalette\`).
- Don't bind a bare key such as \`/\` as the shortcut unless the app lets people turn it off (WCAG 2.1.4); prefer \`mod+k\`.
- Don't store or show recent searches inside the component; keep them in your app and pass them as \`options\`.
- Don't put the field in a Modal and also use \`fullscreen\`; the view is already a dialog.`,
      },
    },
  },
} satisfies Meta<typeof SearchField>;

export default meta;

type Story = StoryObj<typeof meta>;

const column: CSSProperties = { width: "calc(var(--space-32) * 3)", maxWidth: "100%" };
const stack: CSSProperties = { ...column, display: "grid", gap: "var(--space-6)" };
const list: CSSProperties = { margin: 0, paddingInlineStart: "var(--space-4)" };

const PRINTS = [
  "The Great Wave off Kanagawa",
  "Fine Wind, Clear Morning",
  "Plum Park in Kameido",
  "Sudden Shower over Shin-Ōhashi",
  "Evening Snow at Kanbara",
  "Night Rain at Karasaki",
  "Moon over Ships Moored at Tsukudajima",
];

const RECENT = [
  { group: "Recent", options: ["Hokusai", "Hiroshige"] },
  { group: "Popular", options: ["Ukiyo-e", "Woodblock", "Meisho"] },
];

/** Enter submits; the × appears with text; Escape clears. */
export const Default: Story = {
  render: () => (
    <div style={column}>
      <SearchField placeholder="Search the archive" />
    </div>
  ),
};

/** Static suggestions under the field; picking one submits it. */
export const WithSuggestions: Story = {
  render: () => (
    <div style={column}>
      <SearchField
        options={PRINTS}
        filter={(option, query) => option.value.toLowerCase().includes(query.trim().toLowerCase())}
        placeholder="Search prints"
      />
    </div>
  ),
};

function ServerSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState("");
  const timer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );
  // A pretend request: the answer arrives 600ms after the debounced query.
  const search = (next: string) => {
    setQuery(next);
    window.clearTimeout(timer.current);
    if (next === "") {
      setFound([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = window.setTimeout(() => {
      setFound(PRINTS.filter((p) => p.toLowerCase().includes(next.toLowerCase())));
      setLoading(false);
    }, 600);
  };
  return (
    <div style={stack}>
      <SearchField
        options={found}
        loading={loading}
        onQueryChange={search}
        onSubmit={setSubmitted}
        resultCount={query === "" || loading ? undefined : found.length}
        placeholder="Type “night” or “wind”"
      />
      <p className="ol-label">Submitted: {submitted || "—"}</p>
    </div>
  );
}

/** `onQueryChange` fires after typing pauses; `loading` shows a spinner; `resultCount` is announced. */
export const ServerSuggestions: Story = { render: () => <ServerSearch /> };

/** `openOnFocus` with recent and popular searches kept by the app. */
export const RecentSearches: Story = {
  render: () => (
    <div style={column}>
      <SearchField options={RECENT} openOnFocus placeholder="Search" />
    </div>
  ),
};

function Results() {
  const [query, setQuery] = useState("");
  const hits = query === "" ? PRINTS : PRINTS.filter((p) => p.toLowerCase().includes(query));
  return (
    <div style={stack}>
      <SearchField
        onQueryChange={(next) => {
          setQuery(next.toLowerCase());
        }}
        resultCount={hits.length}
        placeholder="Filter prints"
      />
      <ul style={list}>
        {hits.map((hit) => (
          <li key={hit}>{hit}</li>
        ))}
      </ul>
    </div>
  );
}

/** Search as you type: the results live outside the landmark and their count is announced. */
export const ResultCount: Story = { render: () => <Results /> };

/** `submitButton` joins a solid Search button; `line` and size `l`. */
export const Variants: Story = {
  render: () => (
    <div style={stack}>
      <SearchField submitButton placeholder="With a Search button" landmarkLabel="Button" />
      <SearchField line placeholder="Line" landmarkLabel="Line" />
      <SearchField size="l" submitButton placeholder="Large" landmarkLabel="Large" />
      <SearchField defaultValue="Kanbara" loading landmarkLabel="Loading" />
    </div>
  ),
};

/** `shortcut="mod+k"` focuses the field from anywhere; the hint shows while the field is empty. */
export const WithShortcut: Story = {
  render: () => (
    <div style={column}>
      <SearchField shortcut="mod+k" placeholder="Search" />
    </div>
  ),
};

/** Inside a `Field`, the label names the input and the hint describes it. */
export const InField: Story = {
  render: () => (
    <div style={column}>
      <Field label="Archive" hint="Titles, artists or places">
        <SearchField landmark={false} placeholder="Hokusai" />
      </Field>
    </div>
  ),
};

function View({ fullscreen }: { fullscreen: "compact" | "always" }) {
  const [query, setQuery] = useState("");
  const hits = PRINTS.filter((p) => p.toLowerCase().includes(query.toLowerCase()));
  return (
    <div style={column}>
      <SearchField
        fullscreen={fullscreen}
        shortcut="mod+k"
        options={query === "" ? RECENT : hits}
        onQueryChange={setQuery}
        placeholder="Search prints"
      >
        <p className="ol-label">{query === "" ? "Browse" : `${String(hits.length)} prints`}</p>
        <ul style={list}>
          {hits.map((hit) => (
            <li key={hit}>{hit}</li>
          ))}
        </ul>
      </SearchField>
    </div>
  );
}

/**
 * Below 720px the field is a bar that unrolls a full-screen view (kakejiku); docked above. Use a
 * phone-sized viewport. The first server render is docked and switches after hydration.
 */
export const FullscreenCompact: Story = { render: () => <View fullscreen="compact" /> };

/** The bar and the view at any width. Escape or ← closes it; the query stays in the bar. */
export const FullscreenAlways: Story = { render: () => <View fullscreen="always" /> };

/** The view opened, as a static frame. */
export const FullscreenOpen: Story = {
  render: () => (
    <div style={column}>
      <SearchField fullscreen="always" defaultOpen defaultValue="night" options={PRINTS.slice(5)}>
        <p className="ol-label">2 prints</p>
        <ul style={list}>
          <li>Night Rain at Karasaki</li>
          <li>Moon over Ships Moored at Tsukudajima</li>
        </ul>
      </SearchField>
    </div>
  ),
};

/** The view appears and disappears at once under reduced motion. */
export const ReducedMotion: Story = {
  render: () => (
    <div className={REDUCE_MOTION_CLASS}>
      <View fullscreen="always" />
    </div>
  ),
};

/** In the Navbar end cell (the end cell folds away under 720px). */
export const InNavbar: Story = {
  parameters: { flush: true },
  render: () => (
    <Navbar
      brand="Olivine"
      links={[
        { label: "Prints", href: "#", active: true },
        { label: "Artists", href: "#" },
      ]}
      end={<SearchField shortcut="mod+k" placeholder="Search" />}
    />
  ),
};

function Gallery() {
  return (
    <div style={stack}>
      <SearchField placeholder="Search the archive" shortcut="mod+k" landmarkLabel="Empty" />
      <SearchField defaultValue="Hiroshige" submitButton landmarkLabel="Filled" />
      <SearchField line defaultValue="Evening snow" loading landmarkLabel="Line" />
      <SearchField fullscreen="always" placeholder="Bar" shortcut="mod+k" landmarkLabel="Bar" />
      <SearchField disabled placeholder="Disabled" submitButton landmarkLabel="Disabled" />
    </div>
  );
}

/** Disabled, read-only and size `l`. */
export const States: Story = {
  render: () => (
    <div style={stack}>
      <SearchField disabled defaultValue="Kanbara" submitButton landmarkLabel="Disabled" />
      <SearchField fullscreen="always" disabled placeholder="Disabled bar" landmarkLabel="Bar" />
      <SearchField readOnly defaultValue="Ukiyo-e" landmarkLabel="Read-only" />
      <SearchField size="l" defaultValue="Large" landmarkLabel="Large" />
    </div>
  ),
};

/** Both themes side by side. */
export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-6)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <Root key={theme} theme={theme} style={{ padding: "var(--space-6)" }}>
          <Gallery />
        </Root>
      ))}
    </div>
  ),
};
