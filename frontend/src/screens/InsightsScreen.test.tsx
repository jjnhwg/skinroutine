import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { backfill, getBackfillDates } from "../api/backfill";
import { getProductWeeks, getRecap, getSuspects } from "../api/insights";
import { getRoutine } from "../api/routine";
import { listTrials } from "../api/trials";
import type { ProductWeeks, Suspects } from "../api/types";
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
  cycle: null,
};

const RETINAL: ProductWeeks = {
  product_id: 7,
  name: "Retinal",
  started_on: "2026-09-22",
  retired_on: null,
  rows: [
    { label: "Before you started", start: "2026-09-08", end: "2026-09-21", logged_days: 0, new_spot: 0, forming: 0, irritated: 0 },
    { label: "Week 1", start: "2026-09-22", end: "2026-09-28", logged_days: 5, new_spot: 3, forming: 1, irritated: 2 },
    { label: "Week 2", start: "2026-09-29", end: "2026-10-05", logged_days: 4, new_spot: 0, forming: 2, irritated: 0 },
  ],
};

const OLD_ACID: ProductWeeks = {
  ...RETINAL,
  product_id: 9,
  name: "Old Acid",
  started_on: "2026-09-01",
  retired_on: "2026-09-15",
  rows: [{ label: "Week 1 after stopping", start: "2026-09-15", end: "2026-09-21", logged_days: 2, new_spot: 1, forming: 0, irritated: 0 }],
};

const RECAP = {
  week: { start: "2026-10-03", end: "2026-10-09", logged_days: 6, clear_days: 4, breakout_days: 2, breakouts: 3, top_zone: "chin" as const },
  previous: { start: "2026-09-26", end: "2026-10-02", logged_days: 5, clear_days: 1, breakout_days: 4, breakouts: 6, top_zone: "chin" as const },
  sentence: "4 clear days, 2 with breakouts, mostly chin.",
};

beforeEach(() => {
  vi.mocked(getProductWeeks).mockReset().mockResolvedValue([RETINAL, OLD_ACID]);
  vi.mocked(getSuspects).mockReset().mockResolvedValue(READY);
  vi.mocked(getRecap).mockReset().mockResolvedValue(RECAP);
  vi.mocked(getBackfillDates).mockReset().mockResolvedValue([]);
  // Retinal is on trial; Old Acid isn't.
  vi.mocked(listTrials).mockReset().mockResolvedValue([trial(4, product(7, "Retinal"))]);
});

describe("InsightsScreen", () => {
  it("shows each product week by week", async () => {
    renderWithApp(<InsightsScreen />);

    const card = (await screen.findByRole("heading", { name: "Retinal" })).closest(".card") as HTMLElement;
    expect(within(card).getByText("Started Sep 22 · still using")).toBeInTheDocument();
    const week1 = within(card).getByRole("row", { name: /Week 1/ });
    expect(within(week1).getByText("Sep 22 – 28")).toBeInTheDocument();
    expect(within(week1).getByLabelText("New pimple: 3 of 5 days")).toHaveTextContent("3");
    expect(within(week1).getByLabelText("Forming: 1 of 5 days")).toBeInTheDocument();
    expect(within(week1).getByLabelText("Red: 2 of 5 days")).toBeInTheDocument();
    expect(within(card).getByRole("row", { name: /Week 2/ })).toHaveTextContent("Sep 29 – Oct 5");
  });

  it("says when nothing was logged before a product started", async () => {
    renderWithApp(<InsightsScreen />);

    const card = (await screen.findByRole("heading", { name: "Retinal" })).closest(".card") as HTMLElement;
    expect(within(card).getByRole("row", { name: /Before you started/ })).toHaveTextContent("Nothing logged");
  });

  it("only shows products on a running trial", async () => {
    renderWithApp(<InsightsScreen />);

    await screen.findByRole("heading", { name: "Retinal" });
    expect(screen.queryByRole("heading", { name: "Old Acid" })).not.toBeInTheDocument();
  });

  it("points to Products when nothing is on trial", async () => {
    vi.mocked(listTrials).mockResolvedValue([]);
    renderWithApp(<InsightsScreen />);

    expect(await screen.findByRole("link", { name: "Products" })).toHaveAttribute("href", "#/products");
    expect(screen.queryByRole("heading", { name: "Retinal" })).not.toBeInTheDocument();
  });

  it("only says 'cause' in the footnote", async () => {
    renderWithApp(<InsightsScreen />);
    await screen.findByRole("heading", { name: "Retinal" });

    const text = document.body.textContent ?? "";
    expect(text.match(/caus/gi) ?? []).toHaveLength(1);
    expect(screen.getByText(/not what caused it/)).toBeInTheDocument();
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

  it("shows the cycle insight for users who track it", async () => {
    vi.mocked(getSuspects).mockResolvedValue({
      ...READY,
      cycle: {
        status: "ready",
        period_starts: 3,
        before_period: { avg: 1.8, days: 18 },
        otherwise: { avg: 0.4, days: 60 },
        sentence: "Breakouts tend to come in the week before your period: 1.8 a day, vs 0.4 on other days. Keep this in mind before blaming a product.",
        confidence: "strong",
      },
    });
    renderWithApp(<InsightsScreen />);

    expect(await screen.findByText(/Breakouts tend to come in the week before your period/)).toBeInTheDocument();
  });
});
