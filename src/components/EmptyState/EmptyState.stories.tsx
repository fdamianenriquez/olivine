import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";

import { Button } from "../Button";
import { Card } from "../Card";
import { Link } from "../Link";
import { Root } from "../Root";
import { Text } from "../Text";
import { EmptyState } from "./EmptyState";

const meta = {
  title: "Feedback/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `EmptyState is the message that replaces a region with nothing to show: a title that says what is missing, an optional line of explanation, an optional decorative mark and at most one action. It comes in three variants (\`no-data\`, \`no-results\`, \`error\`) that carry their own default copy from the locale. All three look the same: it never changes colour, moves focus or animates.

**Props** — \`variant\`; \`title\`; \`description\` (\`null\` hides the variant's text); \`media\` (decorative, hidden from assistive technology); \`action\` (one \`Button\` or link); \`headingLevel\` (1–6, default 2, look unchanged); \`size\` (\`s\` card, table body or popup, \`m\` region, \`l\` full page); \`align\`; \`framed\`; \`announce\` (\`polite\` | \`assertive\`); \`announcement\`.

- Do replace the list, table or panel with it; don't show it under an empty table header or a filter bar that has nothing to filter.
- Do state what is missing in the title (sentence case, no "Oops", no "please") and what to do in the description.
- Do give \`no-results\` an action that widens the search ("Clear filters"), \`error\` one that retries ("Try again") and \`no-data\` the one that creates the first item.
- Do set \`headingLevel\` from the page outline: 1 on a full page with no other \`h1\`, otherwise the level under the container's heading.
- Do use \`announce="polite"\` when it appears because the reader searched, filtered or deleted; keep it off when the page simply loads this way.
- Don't colour it, add a status tag or shake it to look like an error; if a failure needs status, use \`Alert\`.
- Don't use it for a loading state (\`Placeholder\`, \`Spinner\`) or a one-row "no options" note.
- Don't put more than one action in it, or several \`accent\` buttons.
- Don't put the only label in \`media\`, and don't write the title in the display face yourself: use \`size\`.
- Don't use \`announce="assertive"\` for empty data or no results.
- The component never moves focus: move it yourself in the handler that removes the empty state.`,
      },
    },
  },
  args: {
    variant: "no-data",
    title: "No kitchens yet",
    description: "Kitchens you add will show up here.",
    action: <Button brackets>Add a kitchen</Button>,
  },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

const noop = () => undefined;
const stack = { display: "grid", gap: "var(--space-6)" } as const;
const box = { border: "var(--stroke-hair) solid var(--rule)" } as const;

export const Default: Story = {};

export const NoData: Story = {
  args: {
    variant: "no-data",
    title: "No kitchens yet",
    description: "Kitchens you add will show up here, ready to quote.",
    action: <Button brackets>Add a kitchen</Button>,
  },
};

export const NoResults: Story = {
  render: () => (
    <div style={box}>
      <EmptyState
        variant="no-results"
        description="No kitchens match “oak, steel” in 2026."
        action={<Button>Clear filters</Button>}
      />
    </div>
  ),
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

function ErrorWithRetry() {
  const [view, setView] = useState<"error" | "list">("error");
  // The first load that fails is silent; a failure after the reader asked to refresh is announced.
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // The retry button disappears with the empty state: move focus to the new content's heading.
    if (view === "list" && requested) heading.current?.focus();
  }, [view, requested]);
  const retry = () => {
    setLoading(true);
    void sleep(1200).then(() => {
      setLoading(false);
      setView("list");
    });
  };
  const refresh = () => {
    setRequested(true);
    setView("error");
  };
  return (
    <div style={{ maxWidth: 480 }}>
      <Button size="s" onClick={refresh}>
        Refresh (fails)
      </Button>
      {view === "error" ? (
        <EmptyState
          variant="error"
          announce={requested ? "assertive" : undefined}
          action={
            <Button
              loading={loading}
              onClick={() => {
                setRequested(true);
                retry();
              }}
            >
              Try again
            </Button>
          }
        />
      ) : (
        <div style={{ padding: "var(--space-6)" }}>
          <Text as="h2" variant="h2" ref={heading} tabIndex={-1}>
            Kitchens
          </Text>
          <Text>Kitchen 04, Kitchen 05.</Text>
        </div>
      )}
    </div>
  );
}

export const ErrorRetry: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The error that shows on first load is silent. After the reader asks to refresh and it fails, `announce="assertive"` is set. When Try again succeeds the button disappears with the empty state, so the handler moves focus to the new content\'s heading (`tabIndex={-1}`).',
      },
    },
  },
  render: () => <ErrorWithRetry />,
};

export const Sizes: Story = {
  render: () => (
    <div style={stack}>
      {(["s", "m", "l"] as const).map((size) => (
        <div key={size} style={box}>
          <EmptyState
            size={size}
            variant="no-results"
            headingLevel={size === "l" ? 1 : 2}
            action={<Button size={size === "s" ? "s" : "m"}>Clear filters</Button>}
          />
        </div>
      ))}
    </div>
  ),
};

export const CenteredFramed: Story = {
  render: () => (
    <div style={{ maxWidth: 560 }}>
      <EmptyState
        framed
        align="center"
        variant="no-results"
        media="×"
        action={<Button>Clear filters</Button>}
      />
    </div>
  ),
};

export const Media: Story = {
  render: () => (
    <div style={stack}>
      <EmptyState
        media="+"
        title="No kitchens yet"
        action={<Button brackets>Add a kitchen</Button>}
      />
      <EmptyState
        media={<Text variant="kanji">空</Text>}
        title="Nothing on the shelf"
        description="Empty is part of the room: the pause between pieces."
      />
      <EmptyState
        framed
        align="center"
        media={
          <svg viewBox="0 0 160 120" width="160" height="120" fill="none" stroke="currentColor">
            <rect x="8" y="8" width="144" height="104" strokeWidth="1" />
            <path d="M8 88h144M56 8v80" strokeWidth="1" />
          </svg>
        }
        title="No plans uploaded"
        description="Drawings in PDF or DWG show up here."
      />
    </div>
  ),
};

export const InsideCard: Story = {
  parameters: {
    docs: {
      description: {
        story: "The card body already pads, so nested use sets the EmptyState padding to zero.",
      },
    },
  },
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <Card title="Studio notes">
        <EmptyState
          size="s"
          title="No notes"
          description="Notes from site visits appear here."
          headingLevel={3}
          style={{ padding: 0 }}
          action={<Button size="s">Add a note</Button>}
        />
      </Card>
    </div>
  ),
};

export const InsideSidePanel: Story = {
  render: () => (
    <aside aria-label="Activity" style={{ ...box, maxWidth: 320, padding: "var(--space-4)" }}>
      <Text as="h2" variant="h3">
        Activity
      </Text>
      <EmptyState
        size="s"
        headingLevel={3}
        title="No activity"
        description="Changes to this kitchen show up here."
        style={{ padding: "var(--space-4) 0 0" }}
        action={<Button size="s">Invite a teammate</Button>}
      />
    </aside>
  ),
};

function AnnouncedResults() {
  const [query, setQuery] = useState("oak");
  const showOak = useRef<HTMLButtonElement>(null);
  const empty = query === "maple";
  const clear = () => {
    setQuery("oak");
    // The action removes the empty state while it has focus: put focus on a control that stays.
    showOak.current?.focus();
  };
  return (
    <div style={{ maxWidth: 480 }}>
      <Text variant="body-s" tone="muted">
        Announced politely when the list becomes empty. Use a screen reader to hear it.
      </Text>
      <div style={{ display: "flex", gap: "var(--space-3)", margin: "var(--space-3) 0" }}>
        <Button
          ref={showOak}
          onClick={() => {
            setQuery("oak");
          }}
        >
          Show oak
        </Button>
        <Button
          onClick={() => {
            setQuery("maple");
          }}
        >
          Search maple
        </Button>
      </div>
      {empty ? (
        <EmptyState
          variant="no-results"
          size="s"
          announce="polite"
          description={
            <>
              Nothing matches “maple”. <Link href="#catalogue">Browse the catalogue</Link>.
            </>
          }
          action={<Button onClick={clear}>Clear filters</Button>}
        />
      ) : (
        <Text>Oak shelf, steel hook, washi lamp.</Text>
      )}
    </div>
  );
}

export const Announced: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`announce="polite"` because the empty state appears after a search. The component never moves focus: the Clear filters handler focuses a control that stays on the page (here Show oak, otherwise the list or its heading with `tabIndex={-1}`).',
      },
    },
  },
  render: () => <AnnouncedResults />,
};

export const Themes: Story = {
  render: () => (
    <div style={stack}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ padding: "var(--space-4)", background: "var(--paper)", color: "var(--ink)" }}
        >
          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            <EmptyState
              variant="no-data"
              media="+"
              title="No kitchens yet"
              description="Kitchens you add will show up here."
              action={<Button brackets>Add a kitchen</Button>}
            />
            <EmptyState
              framed
              align="center"
              size="s"
              variant="no-results"
              media="×"
              action={<Button onClick={noop}>Clear filters</Button>}
            />
            <EmptyState
              variant="error"
              size="s"
              action={<Button onClick={noop}>Try again</Button>}
            />
          </div>
        </div>
      ))}
    </div>
  ),
};

export const Locales: Story = {
  render: () => (
    <div style={stack}>
      {(["en", "es", "ja"] as const).map((locale) => (
        <Root key={locale} locale={locale}>
          <div style={{ display: "grid", gap: "var(--space-4)", ...box }}>
            <EmptyState size="s" variant="no-data" />
            <EmptyState size="s" variant="no-results" />
            <EmptyState size="s" variant="error" />
          </div>
        </Root>
      ))}
    </div>
  ),
};
