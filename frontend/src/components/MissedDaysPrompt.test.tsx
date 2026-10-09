import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmRoutine, getMissedDays, skipDay } from "../api/missed";
import { day } from "../test/fixtures";
import { renderWithApp } from "../test/render";
import { MissedDaysPrompt } from "./MissedDaysPrompt";

vi.mock("../api/settings");
vi.mock("../api/missed");

beforeEach(() => {
  location.hash = "";
  vi.mocked(getMissedDays).mockReset().mockResolvedValue(["2026-10-05", "2026-10-06", "2026-10-07"]);
  vi.mocked(confirmRoutine).mockReset().mockImplementation(async (d) => day(d, { status: "routine_confirmed" }));
  vi.mocked(skipDay).mockReset().mockImplementation(async (d) => day(d, { status: "gap" }));
});

describe("MissedDaysPrompt", () => {
  it("asks about each day in turn and calls the matching endpoint", async () => {
    const user = userEvent.setup();
    renderWithApp(<MissedDaysPrompt />);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("You didn't log Monday, Oct 5. Did you follow your usual routine?");
    expect(dialog).toHaveTextContent("1 of 3");
    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(confirmRoutine).toHaveBeenCalledWith("2026-10-05");

    expect(await screen.findByText(/Tuesday, Oct 6/)).toBeInTheDocument();
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "No" }));
    expect(skipDay).toHaveBeenCalledWith("2026-10-06");

    expect(await screen.findByText(/Wednesday, Oct 7/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(skipDay).toHaveBeenCalledWith("2026-10-07");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(confirmRoutine).toHaveBeenCalledTimes(1);
    expect(skipDay).toHaveBeenCalledTimes(2);
  });

  it("'Fill it in' closes the prompt and opens that day", async () => {
    const user = userEvent.setup();
    renderWithApp(<MissedDaysPrompt />);

    await user.click(await screen.findByRole("button", { name: "Fill it in" }));

    expect(location.hash).toBe("#/log/2026-10-05");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(confirmRoutine).not.toHaveBeenCalled();
    expect(skipDay).not.toHaveBeenCalled();
  });

  it("moves on after an error", async () => {
    vi.mocked(confirmRoutine).mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    renderWithApp(<MissedDaysPrompt />);

    await user.click(await screen.findByRole("button", { name: "Yes" }));

    expect(await screen.findByText(/Couldn't save Monday/)).toBeInTheDocument();
    expect(await screen.findByText(/Tuesday, Oct 6/)).toBeInTheDocument();
  });

  it("shows nothing when no days were missed", async () => {
    vi.mocked(getMissedDays).mockResolvedValue([]);
    renderWithApp(<MissedDaysPrompt />);

    await waitFor(() => expect(getMissedDays).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
