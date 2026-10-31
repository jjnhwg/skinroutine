import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { NO_CONDITIONS, NO_SPOTS, NO_STAGES } from "../test/fixtures";
import { CheckInForm } from "./CheckInForm";
import type { CheckIn } from "./CheckInForm";

function Harness({ initial, carriedFrom }: { initial: Partial<CheckIn>; carriedFrom?: string }) {
  const [value, setValue] = useState<CheckIn>({
    skin_score: null,
    stages: NO_STAGES,
    conditions: NO_CONDITIONS,
    ...initial,
  });
  return (
    <>
      <CheckInForm value={value} onChange={setValue} carriedFrom={carriedFrom} />
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

    expect(screen.queryByRole("button", { name: "Oily" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Chin" }));
    await user.click(screen.getByRole("button", { name: "Oily" }));
    await user.click(screen.getByRole("button", { name: "Red" }));
    await user.click(screen.getByRole("button", { name: "Oily" }));

    expect(current().conditions).toEqual({ ...NO_CONDITIONS, chin: ["red"] });
    expect(screen.getByRole("button", { name: "Chin — red" })).toHaveAttribute("data-marked", "true");
  });

  it("steps each stage's count and stops at 0 and 50", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ stages: { ...NO_STAGES, chin: { ...NO_SPOTS, active: 49 } } }} />);

    await user.click(screen.getByRole("button", { name: "Forehead" }));
    expect(screen.getByRole("button", { name: "Fewer clogged pores on forehead" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "More clogged pores on forehead" }));
    expect(current().stages.forehead).toEqual({ ...NO_SPOTS, clogged: 1 });

    await user.click(screen.getByRole("button", { name: "Chin — 49 active" }));
    await user.click(screen.getByRole("button", { name: "More active pimples on chin" }));
    expect(current().stages.chin.active).toBe(50);
    expect(screen.getByRole("button", { name: "More active pimples on chin" })).toBeDisabled();
  });

  it("moves one spot on to its next stage", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ stages: { ...NO_STAGES, chin: { ...NO_SPOTS, active: 2 } } }} />);

    await user.click(screen.getByRole("button", { name: "Chin — 2 active" }));
    expect(screen.queryByRole("button", { name: "Move one to brown mark" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Move one to healing" }));
    expect(current().stages.chin).toEqual({ ...NO_SPOTS, active: 1, healing: 1 });

    // A healing spot can leave either kind of mark.
    await user.click(screen.getByRole("button", { name: "Move one to brown mark" }));
    expect(current().stages.chin).toEqual({ ...NO_SPOTS, active: 1, brown_mark: 1 });
    expect(screen.getByRole("button", { name: "Chin — 1 active, 1 brown mark" })).toBeInTheDocument();
  });

  it("says when the spots were carried over", () => {
    render(<Harness initial={{}} carriedFrom="2026-10-05" />);

    expect(screen.getByText(/Started from your spots on/)).toBeInTheDocument();
  });

  it("clears a zone", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={{
          stages: { ...NO_STAGES, nose: { ...NO_SPOTS, clogged: 2 } },
          conditions: { ...NO_CONDITIONS, nose: ["oily"] },
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Nose — 2 clogged pores, oily" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(current().stages).toEqual(NO_STAGES);
    expect(current().conditions).toEqual(NO_CONDITIONS);
  });
});
