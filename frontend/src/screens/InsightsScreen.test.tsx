import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSuspects } from "../api/insights";
import { listTrials } from "../api/trials";
import type { Suspects } from "../api/types";
import { product, trial } from "../test/fixtures";
import { renderWithApp } from "../test/render";
import { InsightsScreen } from "./InsightsScreen";

vi.mock("../api/settings");
vi.mock("../api/insights");
vi.mock("../api/trials");

const READY: Suspects = {
  status: "ready",
  logged_days: 28,
  required: 14,
  suspects: [
    {
      factor: { kind: "product", id: 2, name: "Mystery Serum" },
      kind: "breakouts",
      sentence:
        "Mystery Serum tends to come before breakouts: 1.0 a day in the 1–5 days after it, vs 0.0 on other days. 5 of your last 5 breakouts came 1–5 days after Mystery Serum.",
      after: { avg: 0.96, days: 25 },
      otherwise: { avg: 0, days: 3 },
      recent: { hits: 5, total: 5 },
    },
    {
      factor: { kind: "tag", id: 11, name: "Alcohol" },
      kind: "redness",
      sentence: "“Alcohol” tends to come before redness: 0.7 in the 1–5 days after it, vs 0.0 on other days (0–3 scale).",
      after: { avg: 0.69, days: 13 },
      otherwise: { avg: 0, days: 15 },
      recent: { hits: 2, total: 5 },
    },
  ],
  low_contrast: [{ kind: "product", id: 1, name: "Cleanser", reason: "used on nearly every day" }],
};

beforeEach(() => {
  vi.mocked(getSuspects).mockReset().mockResolvedValue(READY);
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
    expect(screen.getByText(/“Alcohol” tends to come before redness/)).toBeInTheDocument();
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
});
