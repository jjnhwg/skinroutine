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

    expect(await screen.findByText("Breakouts were lower during the trial (strong signal): 2.1 → 0.8 a day")).toBeInTheDocument();
    const table = screen.getAllByRole("table")[0];
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

  it("says when there are too few breakouts to be sure", async () => {
    vi.mocked(getVerdict).mockResolvedValue(
      verdict({
        label: "worse",
        confidence: "weak",
        before: { start: "2026-09-21", end: "2026-10-04", outcome_days: 14, total_breakouts: 2, avg_breakouts: 0.14 },
        during: { start: "2026-10-05", end: "2026-10-18", outcome_days: 14, total_breakouts: 4, avg_breakouts: 0.29 },
      }),
    );
    renderWithApp(<TrialVerdict trial={trial(4, RETINOL)} onClose={() => {}} onEnded={() => {}} />);

    expect(await screen.findByText("Slightly worse, but too few breakouts to be sure: 0.1 → 0.3 a day")).toBeInTheDocument();
    expect(screen.getByText(/2 breakouts before vs 4 during/)).toBeInTheDocument();
  });

  it("shows a purge note and the trial week by week", async () => {
    vi.mocked(getVerdict).mockResolvedValue(
      verdict({
        label: "worse",
        purge_note: "Breakouts went up in weeks 1–2 but dropped in week 3. This can be purging; consider continuing a few more weeks.",
        weeks: [
          { week: 1, start: "2026-10-05", end: "2026-10-11", outcome_days: 7, total_breakouts: 0, avg_breakouts: 3 },
          { week: 2, start: "2026-10-12", end: "2026-10-18", outcome_days: 7, total_breakouts: 0, avg_breakouts: 2.9 },
          { week: 3, start: "2026-10-19", end: "2026-10-25", outcome_days: 6, total_breakouts: 0, avg_breakouts: 1 },
        ],
      }),
    );
    renderWithApp(<TrialVerdict trial={trial(4, RETINOL)} onClose={() => {}} onEnded={() => {}} />);

    expect(await screen.findByText(/This can be purging/)).toBeInTheDocument();
    const weeks = screen.getByRole("table", { name: "Week by week" });
    expect(within(weeks).getByRole("row", { name: /Week 3/ })).toHaveTextContent("1");
  });
});
