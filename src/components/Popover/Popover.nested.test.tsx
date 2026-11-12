import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { stubNoAnimations } from "../../test/animations";
import { Dropdown } from "../Dropdown";
import { Root } from "../Root";
import { Popover } from "./Popover";

describe("Popover with a menu opened from it", () => {
  stubNoAnimations();

  it("keeps the popover open when a row of the menu is pressed", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Root>
        <Popover
          title="Filters"
          content={<Dropdown label="Sort" items={[{ label: "Newest", onSelect }]} />}
          trigger={<button type="button">Open</button>}
        />
      </Root>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog", { name: "Filters" });
    await user.click(screen.getByRole("button", { name: "Sort" }));
    await user.click(await screen.findByRole("menuitem", { name: "Newest" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole("menu")).toBeNull();
    });
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
  });
});
