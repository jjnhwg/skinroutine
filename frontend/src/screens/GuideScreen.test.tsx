import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GuideScreen } from "./GuideScreen";

function step(name: string) {
  return within(screen.getByRole("region", { name }));
}

describe("GuideScreen", () => {
  it("shows every step with its picks and sources", () => {
    render(<GuideScreen />);
    for (const name of ["First cleanse", "Cleanser", "Toner", "Serum", "Moisturizer", "Barrier cream or balm", "Sunscreen"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(step("Barrier cream or balm").getByText("Cicaplast Baume B5")).toBeInTheDocument();
    expect(screen.queryByText(/\d creators?$/)).not.toBeInTheDocument();
  });

  it("explains why sunscreen needs a first cleanse", () => {
    render(<GuideScreen />);
    expect(step("First cleanse").getByText("Why it’s needed:")).toBeInTheDocument();
    expect(step("First cleanse").getByText(/Sunscreen is made to stay on/)).toBeInTheDocument();
  });

  it("explains how to use micellar water with a cotton pad, without labels or creator tags", () => {
    render(<GuideScreen />);
    const first = step("First cleanse");
    expect(first.getByText(/gentle micellar water/)).toBeInTheDocument();
    expect(first.getByText(/Soak a cotton pad/)).toBeInTheDocument();
    expect(first.queryByText("Best if sensitive")).not.toBeInTheDocument();
    expect(first.queryByText(/@charinecheungg/)).not.toBeInTheDocument();
  });

  it("shows all six cleansers as cards with texture and best skin type", () => {
    render(<GuideScreen />);
    const cleanser = step("Cleanser");
    expect(cleanser.getAllByRole("article")).toHaveLength(6);
    expect(cleanser.queryByRole("button", { name: /more options/ })).not.toBeInTheDocument();
    const lrp = cleanser.getByText("Toleriane Hydrating Gentle Cleanser").closest("article")!;
    expect(within(lrp as HTMLElement).getByText("Cream, no foam")).toBeInTheDocument();
    expect(within(lrp as HTMLElement).getByText("Dry to very dry skin, and sensitive skin.")).toBeInTheDocument();
  });

  it("highlights and moves first the options that fit the picked skin need", async () => {
    render(<GuideScreen />);
    await userEvent.click(screen.getByRole("button", { name: "Oily" }));

    expect(screen.getByRole("button", { name: "Oily" })).toHaveAttribute("aria-pressed", "true");
    const serum = step("Serum");
    const names = serum.getAllByRole("article").map((a) => a.textContent ?? "");
    expect(names[0]).toContain("Poremizing Fresh Ampoule");
    expect(names[0]).toContain("Fits your skin");
    // Non-matching options stay visible.
    expect(serum.getByText("Beta-Glucan Serum")).toBeInTheDocument();
  });

  it("opens the extra options, counting the ones that fit", async () => {
    render(<GuideScreen />);
    await userEvent.click(screen.getByRole("button", { name: "Oily" }));
    const toggle = step("Serum").getByRole("button", { name: /6 more options · 4 fit your skin/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("SOS Serum")).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("TIRTIR SOS Serum")).toBeInTheDocument();
  });
});
