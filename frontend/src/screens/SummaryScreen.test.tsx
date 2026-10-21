import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSummary, type Summary } from "../api/summary";
import { renderWithApp } from "../test/render";
import { SummaryScreen } from "./SummaryScreen";

vi.mock("../api/settings");
vi.mock("../api/summary");

const SUMMARY: Summary = {
  generated_on: "2026-10-09",
  first_logged: "2026-09-01",
  logged_days: 36,
  products: [
    { name: "Retinol", brand: "The Ordinary", type: "treatment", started_on: "2026-09-10", retired_on: null, may_purge: true },
    { name: "Mystery Serum", brand: "", type: "serum", started_on: "2026-08-01", retired_on: "2026-09-20", may_purge: false },
  ],
  trials: [
    {
      product: "Retinol",
      start_date: "2026-09-10",
      end_date: "2026-10-09",
      status: "active",
      label: "worse",
      confidence: "weak",
      before_avg: 0.4,
      during_avg: 0.9,
      purge_note: "This product can cause purging.",
    },
  ],
  insights_ready: true,
  suspects: [{ sentence: "Mystery Serum tends to come before breakouts.", confidence: "strong" }],
  shared_ingredients: [],
  cycle: null,
  first_photo: { date: "2026-09-01", url: "/api/files/u1/a.jpg" },
  latest_photo: { date: "2026-10-09", url: "/api/files/u1/b.jpg" },
};

beforeEach(() => {
  vi.mocked(getSummary).mockReset().mockResolvedValue(SUMMARY);
});

describe("SummaryScreen", () => {
  it("lists products in use and stopped ones", async () => {
    renderWithApp(<SummaryScreen />);

    expect(await screen.findByText("The Ordinary Retinol")).toBeInTheDocument();
    expect(screen.getByText(/may purge/)).toBeInTheDocument();
    expect(screen.getByText("Stopped")).toBeInTheDocument();
  });

  it("shows each trial's verdict with its confidence and purge note", async () => {
    renderWithApp(<SummaryScreen />);

    const row = (await screen.findByRole("row", { name: /Retinol/ })) as HTMLElement;
    expect(row).toHaveTextContent("0.4 → 0.9");
    expect(within(row).getByText(/Slightly worse \(too few breakouts to be sure\)/)).toBeInTheDocument();
    expect(within(row).getByText("This product can cause purging.")).toBeInTheDocument();
  });

  it("shows suspects and first vs latest photos", async () => {
    renderWithApp(<SummaryScreen />);

    expect(await screen.findByText(/Mystery Serum tends to come before breakouts/)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "First" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Latest" })).toBeInTheDocument();
  });

  it("prints", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const user = userEvent.setup();
    renderWithApp(<SummaryScreen />);

    await user.click(await screen.findByRole("button", { name: "Print or save as PDF" }));
    expect(print).toHaveBeenCalled();
  });
});
