import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { endTrial, getVerdict } from "../api/trials";
import { product, trial, verdict } from "../test/fixtures";
import { renderWithApp } from "../test/render";
import { TrialVerdict } from "./TrialVerdict";

vi.mock("../api/settings");
vi.mock("../api/trials");

const RETINOL = product(2, "Retinol", { type: "treatment" });

beforeEach(() => {
  vi.mocked(getVerdict).mockReset().mockResolvedValue(verdict());
  vi.mocked(endTrial).mockReset();
});

describe("TrialVerdict", () => {
  it("shows the before and during numbers in plain words", async () => {
    renderWithApp(<TrialVerdict trial={trial(4, RETINOL)} onClose={() => {}} onEnded={() => {}} />);

    expect(await screen.findByText("Breakouts were lower during the trial: 2.1 → 0.8 a day")).toBeInTheDocument();
    const table = screen.getByRole("table");
    const breakouts = within(table).getByRole("row", { name: /Breakouts/ });
    expect(breakouts).toHaveTextContent("2.1");
    expect(breakouts).toHaveTextContent("0.8");
    expect(within(table).getByRole("row", { name: /Days logged/ })).toHaveTextContent("105");
    expect(getVerdict).toHaveBeenCalledWith(4);
  });

  it("shows flags as chips", async () => {
    vi.mocked(getVerdict).mockResolvedValue(
      verdict({ flags: { overlapping: true, ended_early: true, in_progress: false } }),
    );
    renderWithApp(<TrialVerdict trial={trial(4, RETINOL)} onClose={() => {}} onEnded={() => {}} />);

    expect(await screen.findByText("Overlapping")).toBeInTheDocument();
    expect(screen.getByText("Ended early")).toBeInTheDocument();
    expect(screen.queryByText("In progress")).not.toBeInTheDocument();
  });

  it("says when there isn't enough data yet", async () => {
    vi.mocked(getVerdict).mockResolvedValue(
      verdict({
        enough_data: false,
        label: null,
        during: { ...verdict().during, outcome_days: 2 },
      }),
    );
    renderWithApp(<TrialVerdict trial={trial(4, RETINOL)} onClose={() => {}} onEnded={() => {}} />);

    expect(await screen.findByText(/Not enough data yet/)).toHaveTextContent("2 of 5 days logged during");
  });

  it("shows the first and last photos", async () => {
    renderWithApp(<TrialVerdict trial={trial(4, RETINOL)} onClose={() => {}} onEnded={() => {}} />);

    const first = await screen.findByRole("group", { name: "First day" });
    expect(within(first).getByRole("img")).toHaveAttribute("src", "/api/files/u1/first.jpg");
    expect(within(screen.getByRole("group", { name: "Last day" })).getByRole("img")).toHaveAttribute(
      "src",
      "/api/files/u1/last.jpg",
    );
  });

  it("ends a running trial after confirming", async () => {
    vi.mocked(endTrial).mockResolvedValue(trial(4, RETINOL, { status: "ended_early" }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onEnded = vi.fn();
    const user = userEvent.setup();
    renderWithApp(<TrialVerdict trial={trial(4, RETINOL)} onClose={() => {}} onEnded={onEnded} />);

    await user.click(await screen.findByRole("button", { name: "End trial" }));

    expect(endTrial).toHaveBeenCalledWith(4);
    expect(onEnded).toHaveBeenCalled();
  });

  it("has no End button once a trial is over", async () => {
    renderWithApp(
      <TrialVerdict trial={trial(4, RETINOL, { status: "completed" })} onClose={() => {}} onEnded={() => {}} />,
    );

    await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: "End trial" })).not.toBeInTheDocument();
  });
});
