import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PhotoCapture } from "./PhotoCapture";

vi.mock("../lib/image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/image")>()),
  resizeImage: vi.fn().mockResolvedValue("data:image/jpeg;base64,/9j/4AAQ"),
}));

const noop = () => {};

describe("PhotoCapture", () => {
  it("draws a face oval for the front", () => {
    render(<PhotoCapture angle="front" url={null} onPick={noop} onRemove={noop} onOpen={noop} />);

    expect(screen.getByTestId("guide-front")).toHaveAttribute("data-guide", "front");
  });

  it("draws a profile for each side, mirrored for the right", () => {
    const { rerender } = render(
      <PhotoCapture angle="left" url={null} onPick={noop} onRemove={noop} onOpen={noop} />,
    );
    expect(screen.getByTestId("guide-left")).toHaveAttribute("data-guide", "profile");
    expect(screen.getByTestId("guide-left")).not.toHaveAttribute("data-mirrored");

    rerender(<PhotoCapture angle="right" url={null} onPick={noop} onRemove={noop} onOpen={noop} />);
    expect(screen.getByTestId("guide-right")).toHaveAttribute("data-mirrored", "true");
  });

  it("keeps the overlay on an existing photo so framing can be compared", () => {
    render(
      <PhotoCapture angle="front" url="/api/files/u1/a.jpg" onPick={noop} onRemove={noop} onOpen={noop} />,
    );

    expect(screen.getByRole("img", { name: "Front photo" })).toHaveAttribute("src", "/api/files/u1/a.jpg");
    expect(screen.getByTestId("guide-front")).toBeInTheDocument();
  });

  it("opens the camera input and resizes what it gets", async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<PhotoCapture angle="front" url={null} onPick={onPick} onRemove={noop} onOpen={noop} />);

    const input = screen.getByLabelText("Take or choose a front photo");
    expect(input).toHaveAttribute("capture", "user");
    await user.upload(input, new File(["x"], "me.jpg", { type: "image/jpeg" }));

    expect(onPick).toHaveBeenCalledWith("data:image/jpeg;base64,/9j/4AAQ");
  });
});
