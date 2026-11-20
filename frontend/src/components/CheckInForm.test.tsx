import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { tapFace } from "../test/face";
import { CheckInForm } from "./CheckInForm";
import type { CheckIn } from "./CheckInForm";

function Harness({ initial, carriedFrom }: { initial: Partial<CheckIn>; carriedFrom?: string }) {
  const [value, setValue] = useState<CheckIn>({ events: [], pins: [], ...initial });
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
  it("picks any mix of what happened, and unpicks on a second tap", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{}} />);

    await user.click(screen.getByRole("button", { name: "New pimple showed up" }));
    await user.click(screen.getByRole("button", { name: "Something's forming" }));
    expect(current().events).toEqual(["new_spot", "forming"]);

    await user.click(screen.getByRole("button", { name: "New pimple showed up" }));
    expect(current().events).toEqual(["forming"]);
  });

  it("keeps \"Nothing new\" apart from the others", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ events: ["new_spot", "forming"] }} />);

    await user.click(screen.getByRole("button", { name: "Nothing new" }));
    expect(current().events).toEqual(["nothing_new"]);

    await user.click(screen.getByRole("button", { name: "Something's forming" }));
    expect(current().events).toEqual(["forming"]);
  });

  it("pins the picked kind exactly where the face is tapped", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{}} />);

    // Active is picked to start with.
    expect(screen.getByRole("button", { name: "Active pimple" })).toHaveAttribute("aria-pressed", "true");
    tapFace(50, 130);
    await user.click(screen.getByRole("button", { name: "Red / irritated area" }));
    tapFace(150, 65);

    expect(current().pins).toEqual([
      { x: 0.25, y: 0.5, kind: "active" },
      { x: 0.75, y: 0.25, kind: "red" },
    ]);
    expect(screen.getByText("1 active · red / irritated area (1)")).toBeInTheDocument();
  });

  it("moves a tapped pin on to its next stage", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ pins: [{ ...CHIN, kind: "active" }] }} />);

    await user.click(screen.getByRole("button", { name: "Active pimple, pin 1" }));
    expect(screen.queryByRole("button", { name: "→ Coming up" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "→ Healing" }));
    expect(current().pins).toEqual([{ ...CHIN, kind: "healing" }]);

    // Healing is the last stage: nothing to move it on to.
    expect(screen.getByRole("button", { name: "Healing, pin 1" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: /^→/ })).not.toBeInTheDocument();
  });

  it("doesn't offer spot stages for a red / irritated pin", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ pins: [{ ...CHIN, kind: "red" }] }} />);

    await user.click(screen.getByRole("button", { name: "Red / irritated area, pin 1" }));
    expect(screen.getByRole("group", { name: "Change to" })).toHaveTextContent(/^Red \/ irritated area$/);
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

  it("guides moving a carried-over active pimple to healing, until dismissed", async () => {
    const user = userEvent.setup();
    const active = { pins: [{ ...CHIN, kind: "active" as const }] };
    const { unmount } = render(<Harness initial={active} carriedFrom="2026-10-05" />);

    expect(screen.getByRole("heading", { name: "Is a pimple healing?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Active pimple, pin 1" }));
    expect(screen.getByText(/Going down, flatter or scabbed\?/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByRole("heading", { name: "Is a pimple healing?" })).not.toBeInTheDocument();

    // Stays dismissed next time.
    unmount();
    render(<Harness initial={active} carriedFrom="2026-10-05" />);
    expect(screen.queryByRole("heading", { name: "Is a pimple healing?" })).not.toBeInTheDocument();
  });

  it("skips the healing guide when nothing active was carried over", () => {
    render(<Harness initial={{ pins: [{ ...CHIN, kind: "active" }] }} />);
    expect(screen.queryByRole("heading", { name: "Is a pimple healing?" })).not.toBeInTheDocument();
  });
});
