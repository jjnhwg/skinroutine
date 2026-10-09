import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDay, getPhotoDays } from "../api/days";
import { day } from "../test/fixtures";
import { renderWithApp } from "../test/render";
import { PhotoCompare } from "./PhotoCompare";

vi.mock("../api/settings");
vi.mock("../api/days");

const PHOTOS: Record<string, ReturnType<typeof day>["photos"]> = {
  "2026-09-01": { front: "/api/files/u1/sep-front.jpg", left: "/api/files/u1/sep-left.jpg", right: null },
  "2026-09-20": { front: "/api/files/u1/mid-front.jpg", left: null, right: null },
  "2026-10-08": { front: "/api/files/u1/oct-front.jpg", left: null, right: null },
};

beforeEach(() => {
  vi.mocked(getPhotoDays).mockReset().mockResolvedValue(Object.keys(PHOTOS));
  vi.mocked(getDay)
    .mockReset()
    .mockImplementation(async (date) => day(date, { status: "logged", photos: PHOTOS[date] ?? day(date).photos }));
});

const side = (n: "Before" | "After") => screen.findByRole("group", { name: n });

describe("PhotoCompare", () => {
  it("starts with the earliest and latest photo days", async () => {
    renderWithApp(<PhotoCompare onClose={() => {}} />);

    expect(await within(await side("Before")).findByRole("img")).toHaveAttribute("src", "/api/files/u1/sep-front.jpg");
    expect(await within(await side("After")).findByRole("img")).toHaveAttribute("src", "/api/files/u1/oct-front.jpg");
    expect(screen.getByLabelText("Before date")).toHaveValue("2026-09-01");
    expect(screen.getByLabelText("After date")).toHaveValue("2026-10-08");
  });

  it("can start from a chosen day", async () => {
    renderWithApp(<PhotoCompare initialDate="2026-09-20" onClose={() => {}} />);

    expect(await within(await side("Before")).findByRole("img")).toHaveAttribute("src", "/api/files/u1/mid-front.jpg");
  });

  it("switching the angle swaps both sides, with a placeholder where there's no photo", async () => {
    const user = userEvent.setup();
    renderWithApp(<PhotoCompare onClose={() => {}} />);
    await within(await side("After")).findByRole("img");

    await user.click(screen.getByRole("button", { name: "Left side" }));

    expect(within(await side("Before")).getByRole("img")).toHaveAttribute("src", "/api/files/u1/sep-left.jpg");
    expect(within(await side("After")).queryByRole("img")).not.toBeInTheDocument();
    expect(within(await side("After")).getByText("No photo")).toBeInTheDocument();
  });

  it("loads the photos for a newly picked date", async () => {
    renderWithApp(<PhotoCompare onClose={() => {}} />);
    await within(await side("After")).findByRole("img");

    // A date picker sets the whole value at once.
    fireEvent.change(screen.getByLabelText("After date"), { target: { value: "2026-09-20" } });

    const afterSide = await side("After");
    await waitFor(() =>
      expect(within(afterSide).getByRole("img")).toHaveAttribute("src", "/api/files/u1/mid-front.jpg"),
    );
  });

  it("explains when there are no photos yet", async () => {
    vi.mocked(getPhotoDays).mockResolvedValue([]);
    renderWithApp(<PhotoCompare onClose={() => {}} />);

    expect(await screen.findByText(/No photos yet/)).toBeInTheDocument();
  });
});
