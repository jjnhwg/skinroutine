import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { NO_CONDITIONS, NO_ZONES } from "../test/fixtures";
import { CheckInForm } from "./CheckInForm";
import type { CheckIn } from "./CheckInForm";

function Harness({ initial }: { initial: Partial<CheckIn> }) {
  const [value, setValue] = useState<CheckIn>({
    skin_score: null,
    zones: NO_ZONES,
    conditions: NO_CONDITIONS,
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
  it("sets and unsets the optional skin score", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{}} />);

    await user.click(screen.getByRole("button", { name: "4 — Rough" }));
    expect(current().skin_score).toBe(4);

    await user.click(screen.getByRole("button", { name: "4 — Rough" }));
    expect(current().skin_score).toBeNull();
  });

  it("opens a zone to mark conditions", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{}} />);

    expect(screen.queryByRole("button", { name: "Pimple forming" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Chin" }));
    await user.click(screen.getByRole("button", { name: "Pimple forming" }));
    await user.click(screen.getByRole("button", { name: "Red" }));
    await user.click(screen.getByRole("button", { name: "Pimple forming" }));

    expect(current().conditions).toEqual({ ...NO_CONDITIONS, chin: ["red"] });
    expect(screen.getByRole("button", { name: "Chin — red" })).toHaveAttribute("data-marked", "true");
  });

  it("steps zone counts and stops at 0 and 50", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ zones: { ...NO_ZONES, chin: 49 } }} />);

    await user.click(screen.getByRole("button", { name: "Forehead" }));
    expect(screen.getByRole("button", { name: "Fewer on forehead" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "More on forehead" }));
    expect(current().zones.forehead).toBe(1);

    await user.click(screen.getByRole("button", { name: "Chin — 49 breakouts" }));
    await user.click(screen.getByRole("button", { name: "More on chin" }));
    expect(current().zones.chin).toBe(50);
    expect(screen.getByRole("button", { name: "More on chin" })).toBeDisabled();
  });

  it("clears a zone", async () => {
    const user = userEvent.setup();
    render(
      <Harness initial={{ zones: { ...NO_ZONES, nose: 2 }, conditions: { ...NO_CONDITIONS, nose: ["oily"] } }} />,
    );

    await user.click(screen.getByRole("button", { name: "Nose — 2 breakouts, oily" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(current().zones).toEqual(NO_ZONES);
    expect(current().conditions).toEqual(NO_CONDITIONS);
  });
});
