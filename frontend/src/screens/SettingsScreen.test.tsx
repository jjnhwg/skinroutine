import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import { importLegacy } from "../api/legacy";
import { getSettings, updateSettings } from "../api/settings";
import type { Settings } from "../api/types";
import { SettingsProvider } from "../api/useSettings";
import { ToastProvider } from "../components/Toast";
import { StoreProvider } from "../store";
import { SettingsScreen } from "./SettingsScreen";

vi.mock("../api/settings");
vi.mock("../api/legacy");

const SAVED: Settings = {
  email: "me@example.com",
  timezone: "America/New_York",
  reminder_time: "21:00",
  reminder_enabled: true,
  lookahead_min_days: 1,
  lookahead_max_days: 5,
  today: "2026-10-09",
};

function renderScreen() {
  return render(
    <ToastProvider>
      <StoreProvider>
        <SettingsProvider>
          <SettingsScreen />
        </SettingsProvider>
      </StoreProvider>
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.mocked(getSettings).mockReset().mockResolvedValue(SAVED);
  vi.mocked(updateSettings).mockReset();
  vi.mocked(importLegacy).mockReset();
});

describe("SettingsScreen reminders & insights", () => {
  it("shows the saved settings", async () => {
    renderScreen();

    expect(await screen.findByLabelText("Email")).toHaveValue("me@example.com");
    expect(screen.getByLabelText("Time zone")).toHaveValue("America/New_York");
    expect(screen.getByLabelText("Reminder time")).toHaveValue("21:00");
    expect(screen.getByLabelText("Send a daily reminder")).toBeChecked();
    expect(screen.getByLabelText("From day")).toHaveValue(1);
    expect(screen.getByLabelText("To day")).toHaveValue(5);
  });

  it("sends only what changed", async () => {
    vi.mocked(updateSettings).mockResolvedValue({ ...SAVED, lookahead_min_days: 2, lookahead_max_days: 4 });
    const user = userEvent.setup();
    renderScreen();

    const from = await screen.findByLabelText("From day");
    await user.clear(from);
    await user.type(from, "2");
    const to = screen.getByLabelText("To day");
    await user.clear(to);
    await user.type(to, "4");
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(updateSettings).toHaveBeenCalledWith({ lookahead_min_days: 2, lookahead_max_days: 4 });
    expect(await screen.findByText("Settings saved")).toBeInTheDocument();
  });

  it("sends a cleared email as null", async () => {
    vi.mocked(updateSettings).mockResolvedValue({ ...SAVED, email: null });
    const user = userEvent.setup();
    renderScreen();

    await user.clear(await screen.findByLabelText("Email"));
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(updateSettings).toHaveBeenCalledWith({ email: null });
  });

  it("shows the server's validation message", async () => {
    vi.mocked(updateSettings).mockRejectedValue(
      new ApiError(422, "The look-ahead start can't be after its end"),
    );
    const user = userEvent.setup();
    renderScreen();

    const from = await screen.findByLabelText("From day");
    await user.clear(from);
    await user.type(from, "9");
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The look-ahead start can't be after its end",
    );
  });
});

describe("SettingsProvider", () => {
  it("offers a retry when the server can't be reached", async () => {
    vi.mocked(getSettings).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    renderScreen();

    await user.click(await screen.findByRole("button", { name: "Retry" }));

    await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument());
    expect(getSettings).toHaveBeenCalledTimes(2);
  });
});

describe("Move this browser's data to the server", () => {
  const stored = {
    products: [
      {
        id: "a1",
        brand: "CeraVe",
        name: "Cleanser",
        slot: "BOTH",
        image: null,
        startedOn: "2026-09-01",
        stoppedOn: null,
        notes: "",
      },
    ],
    logs: [
      {
        id: "l1",
        logDate: "2026-09-02",
        rating: 2,
        tags: [],
        note: "",
        usedProductIds: ["a1"],
        photos: [],
      },
    ],
  };

  it("posts the stored data after confirming and shows the report", async () => {
    localStorage.setItem("skin-test-log-v1", JSON.stringify(stored));
    vi.mocked(importLegacy).mockResolvedValue({
      products_created: 1,
      days_created: 1,
      days_skipped: 0,
      photos_saved: 0,
      warnings: ["Cleanser had a note, which products no longer keep"],
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderScreen();

    await user.click(await screen.findByRole("button", { name: "Move this browser's data to the server" }));

    expect(importLegacy).toHaveBeenCalledWith({ app: "skin-test-log", version: 1, ...stored });
    const report = await screen.findByRole("status", { name: "Import report" });
    expect(report).toHaveTextContent("1 product");
    expect(report).toHaveTextContent("1 day");
    expect(report).toHaveTextContent("Cleanser had a note");
  });

  it("does nothing without confirmation", async () => {
    localStorage.setItem("skin-test-log-v1", JSON.stringify(stored));
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    renderScreen();

    await user.click(await screen.findByRole("button", { name: "Move this browser's data to the server" }));

    expect(importLegacy).not.toHaveBeenCalled();
  });
});
