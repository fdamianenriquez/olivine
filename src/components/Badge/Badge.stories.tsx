import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "./Badge";

const meta = {
  title: "Actions/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: { children: "Draft" },
  parameters: {
    docs: {
      description: {
        component:
          'Badge is a 22px tag in the label style for status and counts.\n\n**Props** — `tone`: `neutral` | `solid` | `accent` (maple fill, ink text) | `olivo` | `info` | `success` | `warning` | `danger`; `dot`; `count` (square numeric badge).\n\n- Status tones always keep a word inside — colour never carries meaning alone.\n- A bare `count` reads as just a number to screen readers; keep context words next to it, or put them in visually hidden text inside the badge: `<Badge count>12<span className="ol-sr"> unread</span></Badge>`.',
      },
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

const row = { display: "flex", gap: "var(--space-2)", flexWrap: "wrap" } as const;

export const Default: Story = {};

export const Tones: Story = {
  render: () => (
    <div style={row}>
      <Badge>Draft</Badge>
      <Badge tone="solid">v1.0</Badge>
      <Badge tone="accent">New</Badge>
      <Badge tone="olivo">Olive</Badge>
      <Badge tone="info">Info</Badge>
      <Badge tone="success">Shipped</Badge>
      <Badge tone="warning">Pending</Badge>
      <Badge tone="danger">Failed</Badge>
    </div>
  ),
};

export const Dot: Story = {
  render: () => (
    <div style={row}>
      <Badge tone="info" dot>
        Info
      </Badge>
      <Badge tone="success" dot>
        Shipped
      </Badge>
      <Badge tone="warning" dot>
        Pending
      </Badge>
      <Badge tone="danger" dot>
        Failed
      </Badge>
    </div>
  ),
};

export const Count: Story = {
  render: () => (
    <div style={row}>
      <Badge count>
        3<span className="ol-sr"> unread</span>
      </Badge>
      <Badge tone="solid" count>
        12
        <span className="ol-sr"> unread</span>
      </Badge>
      <Badge tone="olivo" count>
        99
        <span className="ol-sr"> unread</span>
      </Badge>
    </div>
  ),
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {(["washi", "sumi"] as const).map((theme) => (
        <div
          key={theme}
          className="ol"
          data-theme={theme}
          style={{ ...row, padding: "var(--space-4)", background: "var(--paper)" }}
        >
          <Badge>Draft</Badge>
          <Badge tone="solid">v1.0</Badge>
          <Badge tone="accent">New</Badge>
          <Badge tone="olivo">Olive</Badge>
          <Badge tone="info" dot>
            Info
          </Badge>
          <Badge tone="success" dot>
            Shipped
          </Badge>
          <Badge tone="warning" dot>
            Pending
          </Badge>
          <Badge tone="danger" dot>
            Failed
          </Badge>
          <Badge tone="solid" count>
            12
            <span className="ol-sr"> unread</span>
          </Badge>
        </div>
      ))}
    </div>
  ),
};
