import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendTestPush } from "../api/push";
import { currentSubscription, disablePush, enablePush, pushSupported } from "../lib/push";
import { renderWithApp } from "../test/render";
import { PushSettings } from "./PushSettings";

vi.mock("../api/settings");
vi.mock("../api/push");
vi.mock("../lib/push");

beforeEach(() => {
  vi.mocked(pushSupported).mockReset().mockReturnValue(true);
  vi.mocked(currentSubscription).mockReset().mockResolvedValue(null);
  vi.mocked(enablePush).mockReset().mockResolvedValue();
  vi.mocked(disablePush).mockReset().mockResolvedValue();
  vi.mocked(sendTestPush).mockReset().mockResolvedValue();
});

describe("PushSettings", () => {
  it("turns notifications on", async () => {
    const user = userEvent.setup();
    renderWithApp(<PushSettings />);

    await user.click(await screen.findByRole("button", { name: "Turn on notifications" }));

    expect(enablePush).toHaveBeenCalled();
    expect(await screen.findByText("Notifications are on for this device.")).toBeInTheDocument();
  });

  it("explains why it couldn't turn on", async () => {
    vi.mocked(enablePush).mockRejectedValue(new Error("Notifications are blocked."));
    const user = userEvent.setup();
    renderWithApp(<PushSettings />);

    await user.click(await screen.findByRole("button", { name: "Turn on notifications" }));

    expect(await screen.findByText("Notifications are blocked.")).toBeInTheDocument();
  });

  it("sends a test and turns off when already subscribed", async () => {
    vi.mocked(currentSubscription).mockResolvedValue({ endpoint: "https://push.example.com/abc" } as PushSubscription);
    const user = userEvent.setup();
    renderWithApp(<PushSettings />);

    await user.click(await screen.findByRole("button", { name: "Send a test" }));
    expect(sendTestPush).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Turn off" }));
    expect(disablePush).toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Turn on notifications" })).toBeInTheDocument();
  });

  it("says when the browser can't do push", async () => {
    vi.mocked(pushSupported).mockReturnValue(false);
    renderWithApp(<PushSettings />);

    expect(await screen.findByText("This browser doesn't support push notifications.")).toBeInTheDocument();
  });
});
