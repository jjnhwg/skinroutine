import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import { sendBugReport } from "../api/bugReports";
import { BugReportSheet } from "./BugReportSheet";

vi.mock("../api/bugReports", () => ({ sendBugReport: vi.fn() }));
const send = vi.mocked(sendBugReport);

describe("BugReportSheet", () => {
  beforeEach(() => {
    send.mockReset();
  });

  it("sends what was typed and closes", async () => {
    send.mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<BugReportSheet onClose={onClose} />);

    const button = screen.getByRole("button", { name: "Send report" });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText("What went wrong?"), "Photo won't upload");
    await userEvent.click(button);

    expect(send).toHaveBeenCalledWith("Photo won't upload");
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the words and shows why when sending fails", async () => {
    send.mockImplementation(async () => {
      throw new ApiError(500, "Server responded 500");
    });
    const onClose = vi.fn();
    render(<BugReportSheet onClose={onClose} />);

    await userEvent.type(screen.getByLabelText("What went wrong?"), "Crash");
    await userEvent.click(screen.getByRole("button", { name: "Send report" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Server responded 500");
    expect(screen.getByLabelText("What went wrong?")).toHaveValue("Crash");
    expect(onClose).not.toHaveBeenCalled();
  });
});
