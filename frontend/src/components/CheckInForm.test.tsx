import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { NO_ZONES } from "../test/fixtures";
import { CheckInForm } from "./CheckInForm";
import type { CheckIn } from "./CheckInForm";

function Harness({ initial }: { initial: Partial<CheckIn> }) {
  const [value, setValue] = useState<CheckIn>({
    skin_score: null,
    zones: NO_ZONES,
    ...initial,
  });
  return (
    <>
      <CheckInForm value={value} onChange={setValue} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

const current = (): CheckIn => JSON.parse(screen.getByTestId("value").textContent ?? "{}");

describe("CheckInForm", () => {
  it("sets the skin score", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{}} />);

    await user.click(screen.getByRole("button", { name: "4 — Rough" }));

    expect(current().skin_score).toBe(4);
  });

  it("steps zone counts and stops at 0 and 50", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ zones: { ...NO_ZONES, chin: 49 } }} />);

    expect(screen.getByRole("button", { name: "Fewer on forehead" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "More on forehead" }));
    expect(current().zones.forehead).toBe(1);

    await user.click(screen.getByRole("button", { name: "More on chin" }));
    expect(current().zones.chin).toBe(50);
    expect(screen.getByRole("button", { name: "More on chin" })).toBeDisabled();
  });
});
