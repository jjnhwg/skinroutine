import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { tapFace } from "../test/face";
import { CheckInForm } from "./CheckInForm";
import type { CheckIn } from "./CheckInForm";

function Harness({ initial, carriedFrom }: { initial: Partial<CheckIn>; carriedFrom?: string }) {
  const [value, setValue] = useState<CheckIn>({ skin_score: null, pins: [], ...initial });
  return (
    <>
      <CheckInForm value={value} onChange={setValue} carriedFrom={carriedFrom} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

const current = (): CheckIn => JSON.parse(screen.getByTestId("value").textContent ?? "{}");
const CHIN = { x: 0.5, y: 0.82 };

describe("CheckInForm", () => {
  it("sets and unsets the optional skin score", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{}} />);

    await user.click(screen.getByRole("button", { name: "4 — Rough" }));
    expect(current().skin_score).toBe(4);

    await user.click(screen.getByRole("button", { name: "4 — Rough" }));
    expect(current().skin_score).toBeNull();
  });

  it("pins the picked kind exactly where the face is tapped", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{}} />);

    // Active is picked to start with.
    expect(screen.getByRole("button", { name: "Active pimple" })).toHaveAttribute("aria-pressed", "true");
    tapFace(50, 130);
    await user.click(screen.getByRole("button", { name: "Dry" }));
    tapFace(150, 65);

    expect(current().pins).toEqual([
      { x: 0.25, y: 0.5, kind: "active" },
      { x: 0.75, y: 0.25, kind: "dry" },
    ]);
    expect(screen.getByText("1 active · dry (1)")).toBeInTheDocument();
  });

  it("moves a tapped pin on to its next stage", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ pins: [{ ...CHIN, kind: "active" }] }} />);

    await user.click(screen.getByRole("button", { name: "Active pimple, pin 1" }));
    expect(screen.queryByRole("button", { name: "→ Brown mark" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "→ Healing" }));
    expect(current().pins).toEqual([{ ...CHIN, kind: "healing" }]);

    // A healing spot can leave either kind of mark.
    await user.click(screen.getByRole("button", { name: "→ Brown mark" }));
    expect(current().pins).toEqual([{ ...CHIN, kind: "brown_mark" }]);
    expect(screen.getByRole("button", { name: "Brown mark, pin 1" })).toHaveAttribute("aria-pressed", "true");
  });

  it("changes a condition pin only to another condition", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ pins: [{ ...CHIN, kind: "dry" }] }} />);

    await user.click(screen.getByRole("button", { name: "Dry, pin 1" }));
    const changeTo = screen.getByRole("group", { name: "Change to" });
    expect(changeTo).toHaveTextContent("DryRedOily");
    await user.click(screen.getAllByRole("button", { name: "Oily" })[1]);

    expect(current().pins).toEqual([{ ...CHIN, kind: "oily" }]);
  });

  it("removes a pin, and clears them all", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={{ pins: [{ ...CHIN, kind: "active" }, { x: 0.3, y: 0.5, kind: "clogged" }, { ...CHIN, kind: "red" }] }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Clogged pore, pin 2" }));
    await user.click(screen.getByRole("button", { name: "Remove this pin" }));
    expect(current().pins.map((p) => p.kind)).toEqual(["active", "red"]);
    expect(screen.queryByLabelText("Selected pin")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(current().pins).toEqual([]);
    expect(screen.getByText("Nothing marked")).toBeInTheDocument();
  });

  it("adds and moves pins from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{}} />);

    screen.getByRole("button", { name: /^Add a pin/ }).focus();
    await user.keyboard("{Enter}");
    expect(current().pins).toEqual([{ x: 0.5, y: 0.5, kind: "active" }]);

    screen.getByRole("button", { name: "Active pimple, pin 1" }).focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowLeft}");
    const [pin] = current().pins;
    expect(pin.x).toBeCloseTo(0.49);
    expect(pin.y).toBeCloseTo(0.52);
  });

  it("says when the spots were carried over", () => {
    render(<Harness initial={{}} carriedFrom="2026-10-05" />);

    expect(screen.getByText(/Started from your spots on/)).toBeInTheDocument();
  });
});
