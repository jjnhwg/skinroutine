import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Tag } from "../api/types";
import { TagPicker } from "./TagPicker";

const TAGS: Tag[] = [
  { id: 1, name: "Bad sleep", is_default: true, hidden: false },
  { id: 2, name: "Alcohol", is_default: true, hidden: false },
  { id: 3, name: "Old habit", is_default: false, hidden: true },
];

describe("TagPicker", () => {
  it("toggles tags on and off", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<TagPicker tags={TAGS} selected={[]} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Alcohol" }));
    expect(onChange).toHaveBeenLastCalledWith([2]);

    rerender(<TagPicker tags={TAGS} selected={[2]} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Alcohol" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Alcohol" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("hides hidden tags unless the day already has them", () => {
    const { rerender } = render(<TagPicker tags={TAGS} selected={[]} onChange={() => {}} />);
    expect(screen.queryByRole("button", { name: /Old habit/ })).not.toBeInTheDocument();

    rerender(<TagPicker tags={TAGS} selected={[3]} onChange={() => {}} />);
    const chip = screen.getByRole("button", { name: /Old habit/ });
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip).toHaveClass("muted-chip");
  });
});
