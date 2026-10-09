import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDay, getPhotoDays, listDays } from "../api/days";
import { listProducts } from "../api/products";
import { listTags } from "../api/tags";
import { day, NO_ZONES, product } from "../test/fixtures";
import { renderWithApp } from "../test/render";
import { TimelineScreen } from "./TimelineScreen";

vi.mock("../api/settings");
vi.mock("../api/days");
vi.mock("../api/products");
vi.mock("../api/tags");

function cell(date: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-date="${date}"]`);
  if (!found) throw new Error(`No cell for ${date}`);
  return found;
}

beforeEach(() => {
  vi.mocked(listDays).mockReset().mockResolvedValue([
    { date: "2026-10-01", status: "logged", skin_score: 4, total_breakouts: 3, has_photos: true },
    { date: "2026-10-02", status: "routine_confirmed", skin_score: null, total_breakouts: 0, has_photos: false },
    { date: "2026-10-03", status: "gap", skin_score: null, total_breakouts: 0, has_photos: false },
  ]);
  vi.mocked(getDay).mockReset().mockResolvedValue(
    day("2026-10-01", {
      status: "logged",
      skin_score: 4,
      zones: { ...NO_ZONES, chin: 3 },
      total_breakouts: 3,
      dryness: 1,
      redness: 2,
      oiliness: 0,
      notes: "Spot on chin",
      product_uses: [
        { product_id: 1, time_of_day: "am" },
        { product_id: 2, time_of_day: "pm" },
      ],
      tag_ids: [7],
      photos: { front: "/api/files/u1/f.jpg", left: null, right: null },
    }),
  );
  vi.mocked(getPhotoDays).mockReset().mockResolvedValue(["2026-09-01", "2026-10-01"]);
  vi.mocked(listProducts).mockReset().mockResolvedValue([
    product(1, "Cleanser", { type: "cleanser" }),
    product(2, "Retinol", { type: "treatment" }),
  ]);
  vi.mocked(listTags).mockReset().mockResolvedValue([
    { id: 7, name: "Bad sleep", is_default: true, hidden: false },
  ]);
});

describe("TimelineScreen", () => {
  it("asks for the whole visible grid, Monday to Sunday", async () => {
    renderWithApp(<TimelineScreen />);

    await waitFor(() => expect(listDays).toHaveBeenCalledWith("2026-09-28", "2026-11-01"));
  });

  it("colours each day by status and score", async () => {
    renderWithApp(<TimelineScreen />);
    await waitFor(() => expect(cell("2026-10-01")).toHaveClass("score-4"));

    expect(within(cell("2026-10-01")).getByTestId("photo-dot")).toBeInTheDocument();
    expect(cell("2026-10-02")).toHaveClass("confirmed");
    expect(cell("2026-10-03")).toHaveClass("gap");
    expect(cell("2026-10-04")).toHaveClass("unlogged");
    expect(cell("2026-10-09")).toHaveClass("today");
    expect(cell("2026-10-10")).toHaveClass("future");
    expect(cell("2026-10-10")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
  });

  it("opens a day's detail with everything logged", async () => {
    const user = userEvent.setup();
    renderWithApp(<TimelineScreen />);
    await waitFor(() => expect(cell("2026-10-01")).toHaveClass("score-4"));

    await user.click(cell("2026-10-01"));

    const sheet = await screen.findByRole("dialog");
    expect(getDay).toHaveBeenCalledWith("2026-10-01");
    expect(await within(sheet).findByText("4 — Rough")).toBeInTheDocument();
    expect(within(sheet).getByText(/Chin 3/)).toBeInTheDocument();
    expect(within(sheet).getByText("Cleanser")).toBeInTheDocument();
    expect(within(sheet).getByText("Retinol")).toBeInTheDocument();
    expect(within(sheet).getByText("Bad sleep")).toBeInTheDocument();
    expect(within(sheet).getByText("Spot on chin")).toBeInTheDocument();
    expect(within(sheet).getByRole("img", { name: "Front photo" })).toHaveAttribute("src", "/api/files/u1/f.jpg");
    expect(within(sheet).getByRole("link", { name: "Edit" })).toHaveAttribute("href", "#/log/2026-10-01");
  });

  it("moves between months", async () => {
    const user = userEvent.setup();
    renderWithApp(<TimelineScreen />);
    await screen.findByText("October 2026");

    await user.click(screen.getByRole("button", { name: "Previous month" }));

    expect(await screen.findByText("September 2026")).toBeInTheDocument();
    await waitFor(() => expect(listDays).toHaveBeenLastCalledWith("2026-08-31", "2026-10-04"));
  });
});

describe("Timeline photo comparison", () => {
  it("opens from the Timeline with the default dates", async () => {
    const user = userEvent.setup();
    renderWithApp(<TimelineScreen />);

    await user.click(await screen.findByRole("button", { name: /Compare photos/ }));

    expect(await screen.findByRole("dialog", { name: "Compare photos" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Before date")).toHaveValue("2026-09-01");
  });

  it("opens from a day with that day on the left", async () => {
    const user = userEvent.setup();
    renderWithApp(<TimelineScreen />);
    await waitFor(() => expect(cell("2026-10-01")).toHaveClass("score-4"));
    await user.click(cell("2026-10-01"));

    await user.click(await screen.findByRole("button", { name: "Compare with…" }));

    expect(await screen.findByLabelText("Before date")).toHaveValue("2026-10-01");
    expect(screen.queryByRole("dialog", { name: /Thursday/ })).not.toBeInTheDocument();
  });
});
