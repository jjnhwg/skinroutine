import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { skinTypeOnly } from "../lib/barrierGuide";
import { GuideScreen } from "./GuideScreen";

function step(name: string) {
  return within(screen.getByRole("region", { name }));
}

describe("GuideScreen", () => {
  it("shows every step with its picks, without creator tags or paid badges", () => {
    render(<GuideScreen signedIn />);
    for (const name of ["First cleanse", "Cleanser", "Toner", "Serum", "Moisturizer", "Barrier cream or balm"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(step("Barrier cream or balm").getByText("Cicaplast Baume B5")).toBeInTheDocument();
    expect(screen.queryByText(/\d creators?$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/@\w+/)).not.toBeInTheDocument();
    expect(screen.queryByText("PAID")).not.toBeInTheDocument();
  });

  it("tells people to settle a base routine first and marks toner and serum as later", () => {
    render(<GuideScreen signedIn />);
    expect(screen.getByText(/find a base routine that doesn’t break you out/i)).toBeInTheDocument();
    expect(screen.getByText(/Be patient/)).toBeInTheDocument();
    expect(screen.getByText(/These are options, not the only products/)).toBeInTheDocument();
    expect(screen.getByText("What ingredients are good for your skin barrier?")).toBeInTheDocument();
    const grid = within(screen.getByRole("region", { name: "What ingredients are good for your skin barrier?" }));
    expect(grid.getByText("Repair the barrier")).toBeInTheDocument();
    expect(grid.getByText(/Ceramides, Cholesterol/)).toBeInTheDocument();
    expect(screen.getByText(/Niacinamide is a common one/)).toBeInTheDocument();
    expect(step("Toner").getByText("Add later")).toBeInTheDocument();
    expect(step("Serum").getByText("Add later")).toBeInTheDocument();
    expect(step("Cleanser").queryByText("Add later")).not.toBeInTheDocument();
    expect(step("Moisturizer").queryByText("Add later")).not.toBeInTheDocument();
  });

  it("says the routine is also for healthy skin and for beginners", () => {
    render(<GuideScreen signedIn />);
    expect(screen.getByText(/keeping a healthy one strong/)).toBeInTheDocument();
    expect(screen.getByText(/just starting skincare/)).toBeInTheDocument();
    expect(screen.getByText(/worth keeping after your skin heals/)).toBeInTheDocument();
  });

  it("says each intro point only once", () => {
    const { container } = render(<GuideScreen signedIn />);
    const intro = container.querySelector(".guide-head")!.textContent!;
    expect(intro.match(/clogged pores/gi)).toHaveLength(1);
    expect(intro.match(/one product at a time/gi)).toHaveLength(1);
    expect(screen.queryByText(/Prone to pimples/)).not.toBeInTheDocument();
  });

  it("keeps the note about switching products, without the products-tried photo", () => {
    render(<GuideScreen signedIn />);
    expect(screen.queryByRole("img", { name: "All the different products I tried" })).not.toBeInTheDocument();
    expect(screen.getByText(/I kept switching to something new/)).toBeInTheDocument();
  });

  it("explains why sunscreen needs a first cleanse", () => {
    render(<GuideScreen signedIn />);
    expect(step("First cleanse").getByText("Why it’s needed")).toBeInTheDocument();
    expect(step("First cleanse").getByText(/Sunscreen is made to stay on/)).toBeInTheDocument();
  });

  it("explains micellar water, without how-to steps, labels or creator tags", () => {
    render(<GuideScreen signedIn />);
    const first = step("First cleanse");
    expect(first.getByText(/gentle micellar water/)).toBeInTheDocument();
    expect(first.queryByText(/Soak a cotton pad/)).not.toBeInTheDocument();
    expect(first.queryByText("Best if sensitive")).not.toBeInTheDocument();
    expect(first.queryByText(/@charinecheungg/)).not.toBeInTheDocument();
  });

  it("shows all six cleansers as cards with best skin type", () => {
    render(<GuideScreen signedIn />);
    const cleanser = step("Cleanser");
    expect(cleanser.getAllByRole("article")).toHaveLength(6);
    expect(cleanser.queryByRole("button", { name: /more options/ })).not.toBeInTheDocument();
    const lrp = cleanser.getByText("Toleriane Hydrating Gentle Cleanser").closest("article")!;
    expect(within(lrp as HTMLElement).getByText("Dry to very dry skin, and sensitive skin.")).toBeInTheDocument();
  });

  it("gives every product a best skin type instead of a label", () => {
    const { container } = render(<GuideScreen signedIn />);
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(24);
    expect(screen.queryByText("Texture:")).not.toBeInTheDocument();
    for (const card of cards) {
      expect(within(card).getByText("Best skin type:")).toBeInTheDocument();
    }
    expect(container.querySelector(".pick-label")).toBeNull();
    const toner = step("Toner").getByText("Unscented Centella Toner").closest("article")!;
    expect(within(toner as HTMLElement).queryByRole("list")).not.toBeInTheDocument();
    expect(within(toner as HTMLElement).getByText("All skin types, especially red or sensitive skin.")).toBeInTheDocument();
  });

  it("has a sunscreen step that says products are coming soon", () => {
    render(<GuideScreen signedIn />);
    const sunscreen = step("Sunscreen");
    expect(sunscreen.getByText("Coming soon")).toBeInTheDocument();
    expect(sunscreen.getByText("I’ll add sunscreen products soon.")).toBeInTheDocument();
    expect(sunscreen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "6 · Sunscreen" })).toBeInTheDocument();
  });

  it("has no skin type filter", () => {
    render(<GuideScreen signedIn />);
    expect(screen.queryByRole("group", { name: "Filter by skin type" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Oily" })).not.toBeInTheDocument();
  });

  it("keeps cards short: skin type in one sentence, no ingredient tags", () => {
    render(<GuideScreen signedIn />);
    for (const card of screen.getAllByRole("article")) {
      expect(card.textContent).not.toMatch(/support the barrier|helps calm|pull water|holds? water/i);
      // Caveats after the first sentence ("Very reactive skin should be careful…") are left off.
      expect(card.textContent).not.toMatch(/should be careful|Key ingredients|Also:/);
    }
    const cicaplast = step("Barrier cream or balm").getByText("Cicaplast Baume B5").closest("article")!;
    expect(within(cicaplast as HTMLElement).queryByText("Calms")).not.toBeInTheDocument();
    expect(within(cicaplast as HTMLElement).getByText(/^Dry or sensitive skin\.$/)).toBeInTheDocument();
    expect(screen.getByText("Repair the barrier")).toBeInTheDocument();
    // Only ingredients on the listed products get a grid entry; no sealing balms are listed.
    expect(screen.queryByText("Seal water in")).not.toBeInTheDocument();
  });

  it("cuts a skin type down to its first sentence", () => {
    expect(skinTypeOnly("Most skin types. Very reactive skin should be careful, since it has niacinamide.")).toBe(
      "Most skin types.",
    );
    expect(skinTypeOnly("Dry to very dry skin, and sensitive skin.")).toBe("Dry to very dry skin, and sensitive skin.");
  });

  it("signed out, shows the steps but hides the products behind a log-in prompt", () => {
    render(<GuideScreen signedIn={false} />);
    // The routine itself is readable.
    expect(screen.getByRole("heading", { name: "Moisturizer" })).toBeInTheDocument();
    expect(screen.getByText(/Be patient/)).toBeInTheDocument();
    // The product cards are blurred and hidden from screen readers; the extra options aren't there at all.
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /more options/ })).not.toBeInTheDocument();
    // Each locked step offers sign-up and log-in.
    expect(screen.getAllByRole("link", { name: "Sign up free" })[0]).toHaveAttribute("href", "#/log");
    expect(screen.getAllByRole("link", { name: "Log in" })[0]).toHaveAttribute("href", "#/login");
  });
});
