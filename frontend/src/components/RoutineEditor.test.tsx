import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRoutine, saveRoutine } from "../api/routine";
import type { Routine } from "../api/types";
import { product } from "../test/fixtures";
import { renderWithApp } from "../test/render";
import { RoutineEditor } from "./RoutineEditor";

vi.mock("../api/settings");
vi.mock("../api/routine");

const CLEANSER = product(1, "Cleanser");
const SERUM = product(2, "Serum");
const RETINOL = product(3, "Retinol");
const SPF = product(4, "Sunscreen");
const PRODUCTS = [CLEANSER, SERUM, RETINOL, SPF];

const ROUTINE: Routine = {
  am: [
    { product: CLEANSER, schedule: { kind: "daily" } },
    { product: SERUM, schedule: { kind: "daily" } },
  ],
  pm: [{ product: RETINOL, schedule: { kind: "weekdays", days: ["mon", "wed", "fri"] } }],
};

function section(name: "Morning" | "Night"): HTMLElement {
  return screen.getByRole("region", { name });
}

function names(region: HTMLElement): string[] {
  return within(region)
    .queryAllByRole("listitem")
    .map((li) => li.querySelector("b")?.textContent ?? "");
}

beforeEach(() => {
  vi.mocked(getRoutine).mockReset().mockResolvedValue(ROUTINE);
  vi.mocked(saveRoutine).mockReset().mockResolvedValue(ROUTINE);
});

describe("RoutineEditor", () => {
  it("shows both lists in order", async () => {
    renderWithApp(<RoutineEditor products={PRODUCTS} />);
    await screen.findByRole("region", { name: "Night" });

    expect(names(section("Morning"))).toEqual(["Cleanser", "Serum"]);
    expect(names(section("Night"))).toEqual(["Retinol"]);
    expect(within(section("Night")).getByRole("button", { name: "Wednesday" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("moves a product down and saves the new order", async () => {
    const user = userEvent.setup();
    renderWithApp(<RoutineEditor products={PRODUCTS} />);
    await screen.findByRole("region", { name: "Night" });

    await user.click(screen.getByRole("button", { name: "Move Cleanser down" }));
    expect(names(section("Morning"))).toEqual(["Serum", "Cleanser"]);

    await user.click(within(section("Morning")).getByRole("button", { name: "Save morning" }));
    expect(saveRoutine).toHaveBeenCalledWith("am", [
      { product_id: 2, schedule: { kind: "daily" } },
      { product_id: 1, schedule: { kind: "daily" } },
    ]);
  });

  it("sends a Mon/Wed/Fri schedule", async () => {
    const user = userEvent.setup();
    renderWithApp(<RoutineEditor products={PRODUCTS} />);
    await screen.findByRole("region", { name: "Night" });
    const serumRow = within(section("Morning")).getAllByRole("listitem")[1];

    for (const day of ["Monday", "Wednesday", "Friday"]) {
      await user.click(within(serumRow).getByRole("button", { name: day }));
    }
    await user.click(within(section("Morning")).getByRole("button", { name: "Save morning" }));

    expect(saveRoutine).toHaveBeenCalledWith("am", [
      { product_id: 1, schedule: { kind: "daily" } },
      { product_id: 2, schedule: { kind: "weekdays", days: ["mon", "wed", "fri"] } },
    ]);
  });

  it("won't save a weekday schedule with no days", async () => {
    const user = userEvent.setup();
    renderWithApp(<RoutineEditor products={PRODUCTS} />);
    await screen.findByRole("region", { name: "Night" });
    const night = section("Night");

    for (const day of ["Monday", "Wednesday", "Friday"]) {
      await user.click(within(night).getByRole("button", { name: day }));
    }

    expect(within(night).getByRole("button", { name: "Save night" })).toBeDisabled();
    expect(within(night).getByText(/Pick at least one day/)).toBeInTheDocument();
    expect(saveRoutine).not.toHaveBeenCalled();
  });

  it("only offers products not already in that list", async () => {
    const user = userEvent.setup();
    renderWithApp(<RoutineEditor products={PRODUCTS} />);
    await screen.findByRole("region", { name: "Night" });

    const add = within(section("Morning")).getByLabelText("Add to morning");
    const offered = within(add)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(offered).toEqual(["Add a product…", "Retinol", "Sunscreen"]);

    await user.selectOptions(add, "4");
    expect(names(section("Morning"))).toEqual(["Cleanser", "Serum", "Sunscreen"]);
  });

  it("shows the server's error", async () => {
    const { ApiError } = await import("../api/http");
    vi.mocked(saveRoutine).mockRejectedValue(new ApiError(422, "Retinol is retired"));
    const user = userEvent.setup();
    renderWithApp(<RoutineEditor products={PRODUCTS} />);
    await screen.findByRole("region", { name: "Night" });

    await user.click(within(section("Night")).getByRole("button", { name: "Save night" }));

    expect(await within(section("Night")).findByRole("alert")).toHaveTextContent("Retinol is retired");
  });
});
