import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteDayPhoto, getDay, saveDay, uploadDayPhoto } from "../api/days";
import { ApiError } from "../api/http";
import { listProducts } from "../api/products";
import { listTags } from "../api/tags";
import { day, NO_ZONES, product } from "../test/fixtures";
import { renderWithApp } from "../test/render";
import { LogScreen } from "./LogScreen";

vi.mock("../api/settings");
vi.mock("../api/days");
vi.mock("../api/products");
vi.mock("../api/tags");
vi.mock("../lib/image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/image")>()),
  resizeImage: vi.fn().mockResolvedValue("data:image/jpeg;base64,/9j/4AAQ"),
}));

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
  vi.mocked(uploadDayPhoto).mockReset();
  vi.mocked(deleteDayPhoto).mockReset();
  vi.mocked(listTags).mockReset().mockResolvedValue([
    { id: 7, name: "Bad sleep", is_default: true, hidden: false },
    { id: 8, name: "Alcohol", is_default: true, hidden: false },
  ]);
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
    await user.click(await screen.findByRole("button", { name: "Alcohol" }));
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
      tag_ids: [7, 8],
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

describe("LogScreen photos", () => {
  const photo = () => new File(["x"], "me.jpg", { type: "image/jpeg" });
  const WITH_PHOTO = {
    ...SAVED,
    photos: { front: "/api/files/u1/front.jpg", left: null, right: null },
  };

  it("holds a photo picked before saving, then uploads it after the save", async () => {
    const fresh = day("2026-10-09");
    const savedNow = day("2026-10-09", { status: "logged", skin_score: 2 });
    vi.mocked(getDay).mockResolvedValue(fresh);
    vi.mocked(saveDay).mockResolvedValue(savedNow);
    vi.mocked(uploadDayPhoto).mockResolvedValue({
      ...savedNow,
      photos: { front: null, left: "/api/files/u1/l.jpg", right: null },
    });
    const user = userEvent.setup();
    renderWithApp(<LogScreen date="2026-10-09" />);

    await user.upload(await screen.findByLabelText("Take or choose a left photo"), photo());
    expect(uploadDayPhoto).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "2 — Good" }));
    await user.click(screen.getByRole("button", { name: "Save entry" }));

    await waitFor(() => expect(uploadDayPhoto).toHaveBeenCalledTimes(1));
    const [date, angle, blob] = vi.mocked(uploadDayPhoto).mock.calls[0];
    expect([date, angle, blob.type]).toEqual(["2026-10-09", "left", "image/jpeg"]);
    expect(vi.mocked(saveDay).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(uploadDayPhoto).mock.invocationCallOrder[0],
    );
    expect(await screen.findByRole("img", { name: "Left photo" })).toHaveAttribute("src", "/api/files/u1/l.jpg");
  });

  it("uploads right away on a saved day", async () => {
    vi.mocked(getDay).mockResolvedValue(SAVED);
    vi.mocked(uploadDayPhoto).mockResolvedValue(WITH_PHOTO);
    const user = userEvent.setup();
    renderWithApp(<LogScreen date="2026-10-05" />);

    await user.upload(await screen.findByLabelText("Take or choose a front photo"), photo());

    await waitFor(() => expect(uploadDayPhoto).toHaveBeenCalledWith("2026-10-05", "front", expect.any(Blob)));
    expect(saveDay).not.toHaveBeenCalled();
    expect(await screen.findByRole("img", { name: "Front photo" })).toHaveAttribute(
      "src",
      "/api/files/u1/front.jpg",
    );
  });

  it("deletes a saved photo", async () => {
    vi.mocked(getDay).mockResolvedValue(WITH_PHOTO);
    vi.mocked(deleteDayPhoto).mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderWithApp(<LogScreen date="2026-10-05" />);

    await user.click(await screen.findByRole("button", { name: "Remove front photo" }));

    expect(deleteDayPhoto).toHaveBeenCalledWith("2026-10-05", "front");
    await waitFor(() => expect(screen.queryByRole("img", { name: "Front photo" })).not.toBeInTheDocument());
  });
});
