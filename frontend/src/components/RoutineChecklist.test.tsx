import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Planned, ProductUse } from "../api/types";
import { product } from "../test/fixtures";
import { RoutineChecklist } from "./RoutineChecklist";

const CLEANSER = product(1, "Cleanser");
const RETINOL = product(2, "Retinol");
const SPF = product(3, "Sunscreen");
const OLD = product(4, "Old Toner", { is_retired: true, retired_on: "2026-09-10" });
const PRODUCTS = [CLEANSER, RETINOL, SPF, OLD];

// What the server sends for an unsaved day: uses pre-filled from the plan.
// Retinol is Mon/Wed/Fri, so it's planned on Monday and not on Tuesday.
const MONDAY: Planned = { am: [1], pm: [2] };
const TUESDAY: Planned = { am: [1], pm: [] };
const prefill = (planned: Planned): ProductUse[] => [
  ...planned.am.map((id) => ({ product_id: id, time_of_day: "am" as const })),
  ...planned.pm.map((id) => ({ product_id: id, time_of_day: "pm" as const })),
];

function Harness({ planned, onChange }: { planned: Planned; onChange?: (u: ProductUse[]) => void }) {
  const [uses, setUses] = useState(prefill(planned));
  return (
    <RoutineChecklist
      products={PRODUCTS}
      planned={planned}
      uses={uses}
      onChange={(next) => {
        setUses(next);
        onChange?.(next);
      }}
    />
  );
}

const night = () => screen.getByRole("group", { name: "Night" });
const morning = () => screen.getByRole("group", { name: "Morning" });

describe("RoutineChecklist", () => {
  it("pre-ticks a Monday-only product on Monday", () => {
    render(<Harness planned={MONDAY} />);

    expect(within(night()).getByRole("button", { name: /Retinol/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(morning()).getByRole("button", { name: /Cleanser/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("doesn't show it on Tuesday", () => {
    render(<Harness planned={TUESDAY} />);

    expect(within(night()).queryByRole("button", { name: /Retinol/ })).not.toBeInTheDocument();
  });

  it("unticking a planned product drops it from the uses but keeps it visible", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness planned={MONDAY} onChange={onChange} />);

    await user.click(within(night()).getByRole("button", { name: /Retinol/ }));

    expect(onChange).toHaveBeenLastCalledWith([{ product_id: 1, time_of_day: "am" }]);
    expect(within(night()).getByRole("button", { name: /Retinol/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("adds an extra product to a slot", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness planned={TUESDAY} onChange={onChange} />);

    const add = within(morning()).getByLabelText("Add a product used this morning");
    // Active products not already listed in the morning; retired ones aren't offered.
    expect(within(add).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Add a product used today…",
      "Retinol",
      "Sunscreen",
    ]);
    await user.selectOptions(add, "3");

    expect(onChange).toHaveBeenLastCalledWith([
      { product_id: 1, time_of_day: "am" },
      { product_id: 3, time_of_day: "am" },
    ]);
    expect(within(morning()).getByRole("button", { name: /Sunscreen/ })).toHaveAttribute("aria-pressed", "true");
  });
});
