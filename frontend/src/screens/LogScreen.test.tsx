import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDay, saveDay } from "../api/days";
import { ApiError } from "../api/http";
import { listProducts } from "../api/products";
import { day, NO_ZONES, product } from "../test/fixtures";
import { renderWithApp } from "../test/render";
import { LogScreen } from "./LogScreen";

vi.mock("../api/settings");
vi.mock("../api/days");
vi.mock("../api/products");

const CLEANSER = product(1, "Cleanser", { type: "cleanser" });
const RETINOL = product(2, "Retinol", { type: "treatment" });

const SAVED = day("2026-10-05", {
  status: "logged",
  skin_score: 4,
  zones: { ...NO_ZONES, chin: 3 },
  total_breakouts: 3,
  dryness: 1,
  redness: 2,
  oiliness: 0,
  notes: "Spot on chin",
  product_uses: [{ product_id: 1, time_of_day: "am" }],
  tag_ids: [7],
  planned: { am: [1], pm: [2] },
});

beforeEach(() => {
  vi.mocked(listProducts).mockReset().mockResolvedValue([CLEANSER, RETINOL]);
  vi.mocked(getDay).mockReset();
  vi.mocked(saveDay).mockReset();
});

describe("LogScreen", () => {
  it("shows a saved day's values", async () => {
    vi.mocked(getDay).mockResolvedValue(SAVED);
    renderWithApp(<LogScreen date="2026-10-05" />);

    expect(await screen.findByRole("button", { name: "4 — Rough" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Chin breakouts")).toHaveTextContent("3");
    expect(screen.getByRole("button", { name: "Redness / irritation: 2 — Moderate" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Notes")).toHaveValue("Spot on chin");
    expect(screen.getByRole("button", { name: /Retinol/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/Editing your saved entry/)).toBeInTheDocument();
    expect(getDay).toHaveBeenCalledWith("2026-10-05");
  });

  it("saves the expected body", async () => {
    vi.mocked(getDay).mockResolvedValue(SAVED);
    vi.mocked(saveDay).mockResolvedValue(SAVED);
    const user = userEvent.setup();
    renderWithApp(<LogScreen date="2026-10-05" />);
    await screen.findByLabelText("Notes");

    await user.click(screen.getByRole("button", { name: /Retinol/ }));
    await user.click(screen.getByRole("button", { name: "More on nose" }));
    await user.type(screen.getByLabelText("Notes"), "!");
    await user.click(screen.getByRole("button", { name: "Update entry" }));

    expect(saveDay).toHaveBeenCalledWith("2026-10-05", {
      skin_score: 4,
      zones: { ...NO_ZONES, chin: 3, nose: 1 },
      dryness: 1,
      redness: 2,
      oiliness: 0,
      notes: "Spot on chin!",
      product_uses: [
        { product_id: 1, time_of_day: "am" },
        { product_id: 2, time_of_day: "pm" },
      ],
      // Kept as loaded until the Log screen gets its tag picker.
      tag_ids: [7],
    });
    expect(await screen.findByText("Entry updated")).toBeInTheDocument();
  });

  it("needs a skin score before saving", async () => {
    vi.mocked(getDay).mockResolvedValue(day("2026-10-09", { planned: { am: [1], pm: [] } }));
    const user = userEvent.setup();
    renderWithApp(<LogScreen date="2026-10-09" />);

    await user.click(await screen.findByRole("button", { name: "Save entry" }));

    expect(saveDay).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Pick a skin score first.");
  });

  it("shows the server's error", async () => {
    vi.mocked(getDay).mockResolvedValue(SAVED);
    vi.mocked(saveDay).mockRejectedValue(new ApiError(422, "Retinol was retired before this day"));
    const user = userEvent.setup();
    renderWithApp(<LogScreen date="2026-10-05" />);

    await user.click(await screen.findByRole("button", { name: "Update entry" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Retinol was retired before this day");
  });

  it("won't go past today from the server", async () => {
    vi.mocked(getDay).mockResolvedValue(day("2026-10-09"));
    renderWithApp(<LogScreen date="2026-10-09" />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Next day" })).toBeDisabled());
  });

  it("explains imported days", async () => {
    vi.mocked(getDay).mockResolvedValue({ ...SAVED, imported: true, dryness: null });
    renderWithApp(<LogScreen date="2026-10-05" />);

    expect(await screen.findByText(/Imported — zones and reactions weren't recorded/)).toBeInTheDocument();
  });
});
