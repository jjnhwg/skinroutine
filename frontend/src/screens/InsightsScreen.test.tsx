import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { backfill, getBackfillDates } from "../api/backfill";
import { getRecap, getSuspects } from "../api/insights";
import { getRoutine } from "../api/routine";
import { listTrials } from "../api/trials";
import type { Suspects } from "../api/types";
import { product, trial } from "../test/fixtures";
import { renderWithApp } from "../test/render";
import { InsightsScreen } from "./InsightsScreen";

vi.mock("../api/settings");
vi.mock("../api/insights");
vi.mock("../api/trials");
vi.mock("../api/backfill");
vi.mock("../api/routine");

const READY: Suspects = {
  status: "ready",
  logged_days: 28,
  required: 14,
  breakouts: 6,
  required_breakouts: 3,
  suspects: [
    {
      factor: { kind: "product", id: 2, name: "Mystery Serum" },
      kind: "breakouts",
      sentence:
        "Mystery Serum tends to come before breakouts: 1.0 a day in the 1–5 days after it, vs 0.0 on other days. 5 of your last 5 breakouts came 1–5 days after Mystery Serum.",
      after: { avg: 0.96, days: 25 },
      otherwise: { avg: 0, days: 3 },
      recent: { hits: 5, total: 5 },
      confidence: "strong",
    },
    {
      factor: { kind: "tag", id: 11, name: "Alcohol" },
      kind: "breakouts",
      sentence:
        "“Alcohol” tends to come before breakouts: 0.7 a day in the 1–5 days after it, vs 0.0 on other days. 2 of your last 5 breakouts came 1–5 days after “Alcohol”.",
      after: { avg: 0.69, days: 13 },
      otherwise: { avg: 0, days: 15 },
      recent: { hits: 2, total: 5 },
      confidence: "weak",
    },
  ],
  low_contrast: [{ kind: "product", id: 1, name: "Cleanser", reason: "used on nearly every day" }],
  shared_ingredients: [],
};

const RECAP = {
  week: { start: "2026-10-03", end: "2026-10-09", logged_days: 6, clear_days: 4, breakout_days: 2, breakouts: 3, top_zone: "chin" as const },
  previous: { start: "2026-09-26", end: "2026-10-02", logged_days: 5, clear_days: 1, breakout_days: 4, breakouts: 6, top_zone: "chin" as const },
  sentence: "4 clear days, 2 with breakouts, mostly chin.",
};

beforeEach(() => {
  vi.mocked(getSuspects).mockReset().mockResolvedValue(READY);
  vi.mocked(getRecap).mockReset().mockResolvedValue(RECAP);
  vi.mocked(getBackfillDates).mockReset().mockResolvedValue([]);
  vi.mocked(listTrials).mockReset().mockResolvedValue([]);
});

describe("InsightsScreen", () => {
  it("shows progress while collecting", async () => {
    vi.mocked(getSuspects).mockResolvedValue({ ...READY, status: "collecting", logged_days: 9, suspects: [], low_contrast: [] });
    renderWithApp(<InsightsScreen />);

    expect(await screen.findByText("9 of 14 days logged — insights start at 14.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "9");
  });

  it("lists each suspect as a sentence", async () => {
    renderWithApp(<InsightsScreen />);

    expect(await screen.findByText(/Mystery Serum tends to come before breakouts/)).toBeInTheDocument();
    expect(screen.getByText(/“Alcohol” tends to come before breakouts/)).toBeInTheDocument();
  });

  it("expands a suspect into a chart with both groups", async () => {
    const user = userEvent.setup();
    renderWithApp(<InsightsScreen />);

    await user.click(await screen.findByRole("button", { name: /Mystery Serum tends to come before/ }));

    const chart = screen.getByRole("img", { name: /Breakouts a day: 1.0 after Mystery Serum, 0.0 on other days/ });
    expect(within(chart).getByText("1.0")).toBeInTheDocument();
    expect(within(chart).getByText("0.0")).toBeInTheDocument();
    expect(screen.getByText(/25 days after · 3 other days · within 1–5 days/)).toBeInTheDocument();
  });

  it("labels each suspect strong or too few to be sure", async () => {
    renderWithApp(<InsightsScreen />);

    expect(await screen.findByRole("button", { name: /Mystery Serum.*Strong signal/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Alcohol.*Weak signal · too few breakouts to be sure/ })).toBeInTheDocument();
  });

  it("points out an ingredient shared by suspects", async () => {
    vi.mocked(getSuspects).mockResolvedValue({
      ...READY,
      shared_ingredients: [{ ingredient: "coconut oil", products: ["Mystery Serum", "Night Cream"] }],
    });
    renderWithApp(<InsightsScreen />);

    expect(await screen.findByText(/Both suspects contain/)).toHaveTextContent(
      "Both suspects contain coconut oil (Mystery Serum, Night Cream).",
    );
  });

  it("lists what couldn't be judged, with the reason", async () => {
    const user = userEvent.setup();
    renderWithApp(<InsightsScreen />);

    await user.click(await screen.findByText("Not enough contrast to judge (1)"));

    expect(screen.getByText("Cleanser")).toBeInTheDocument();
    expect(screen.getByText("used on nearly every day")).toBeInTheDocument();
  });

  it("only says 'cause' in the footnote", async () => {
    renderWithApp(<InsightsScreen />);
    await screen.findByText(/Mystery Serum tends to come before/);

    const text = document.body.textContent ?? "";
    const mentions = text.match(/cause/gi) ?? [];
    expect(mentions).toHaveLength(1);
    expect(screen.getByText(/not what causes them/)).toBeInTheDocument();
  });

  it("summarises running trials", async () => {
    vi.mocked(listTrials).mockResolvedValue([trial(4, product(2, "Retinol"), { day_number: 6, length_days: 21 })]);
    renderWithApp(<InsightsScreen />);

    expect(await screen.findByText(/Retinol · day 6 of 21/)).toBeInTheDocument();
  });

  it("shows this week's recap from day one", async () => {
    renderWithApp(<InsightsScreen />);

    expect(await screen.findByText("4 clear days, 2 with breakouts, mostly chin.")).toBeInTheDocument();
    expect(screen.getByText("Fewer breakouts than last week: 1.2 → 0.5 a day.")).toBeInTheDocument();
  });

  it("counts breakouts while collecting", async () => {
    vi.mocked(getSuspects).mockResolvedValue({ ...READY, status: "collecting", logged_days: 9, breakouts: 1, suspects: [], low_contrast: [] });
    renderWithApp(<InsightsScreen />);

    expect(await screen.findByText(/a few breakouts to compare against: 1 of 3 so far/)).toBeInTheDocument();
  });

  it("offers to fill in the last 2 weeks from the routine", async () => {
    const user = userEvent.setup();
    vi.mocked(getSuspects).mockResolvedValue({ ...READY, status: "collecting", logged_days: 0, suspects: [], low_contrast: [] });
    vi.mocked(getBackfillDates).mockResolvedValue(["2026-09-30", "2026-10-01"]);
    vi.mocked(getRoutine).mockResolvedValue({
      am: [{ product: product(1, "Cleanser"), schedule: { kind: "daily" } }],
      pm: [{ product: product(2, "Retinol"), schedule: { kind: "daily" } }],
    });
    vi.mocked(backfill).mockResolvedValue(2);
    renderWithApp(<InsightsScreen />);

    await user.click(await screen.findByRole("button", { name: "Fill in the last 2 weeks" }));
    await user.click(await screen.findByRole("checkbox", { name: "Retinol" }));
    await user.click(screen.getByRole("button", { name: "Fill in 2 days" }));

    expect(backfill).toHaveBeenCalledWith([1]);
    expect(await screen.findByText("Filled in 2 days")).toBeInTheDocument();
  });
});
