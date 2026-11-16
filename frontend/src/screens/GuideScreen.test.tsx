import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GuideScreen } from "./GuideScreen";

function step(name: string) {
  return within(screen.getByRole("region", { name }));
}

describe("GuideScreen", () => {
  it("shows every step with its picks, without creator tags or paid badges", () => {
    render(<GuideScreen />);
    for (const name of ["First cleanse", "Cleanser", "Toner", "Serum", "Moisturizer", "Barrier cream or balm"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(step("Barrier cream or balm").getByText("Cicaplast Baume B5")).toBeInTheDocument();
    expect(screen.queryByText(/\d creators?$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/@\w+/)).not.toBeInTheDocument();
    expect(screen.queryByText("PAID")).not.toBeInTheDocument();
  });

  it("tells people to settle a base routine first and marks toner and serum as later", () => {
    render(<GuideScreen />);
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
    render(<GuideScreen />);
    expect(screen.getByText(/keeping a healthy one strong/)).toBeInTheDocument();
    expect(screen.getByText(/just starting skincare/)).toBeInTheDocument();
    expect(screen.getByText(/worth keeping after your skin heals/)).toBeInTheDocument();
  });

  it("says each intro point only once", () => {
    const { container } = render(<GuideScreen />);
    const intro = container.querySelector(".guide-head")!.textContent!;
    expect(intro.match(/clogged pores/gi)).toHaveLength(1);
    expect(intro.match(/one product at a time/gi)).toHaveLength(1);
    expect(screen.queryByText(/Prone to pimples/)).not.toBeInTheDocument();
  });

  it("keeps the note about switching products, without the products-tried photo", () => {
    render(<GuideScreen />);
    expect(screen.queryByRole("img", { name: "All the different products I tried" })).not.toBeInTheDocument();
    expect(screen.getByText(/I kept switching to something new/)).toBeInTheDocument();
  });

  it("explains why sunscreen needs a first cleanse", () => {
    render(<GuideScreen />);
    expect(step("First cleanse").getByText("Why it’s needed")).toBeInTheDocument();
    expect(step("First cleanse").getByText(/Sunscreen is made to stay on/)).toBeInTheDocument();
  });

  it("explains micellar water, without how-to steps, labels or creator tags", () => {
    render(<GuideScreen />);
    const first = step("First cleanse");
    expect(first.getByText(/gentle micellar water/)).toBeInTheDocument();
    expect(first.queryByText(/Soak a cotton pad/)).not.toBeInTheDocument();
    expect(first.queryByText("Best if sensitive")).not.toBeInTheDocument();
    expect(first.queryByText(/@charinecheungg/)).not.toBeInTheDocument();
  });

  it("shows all six cleansers as cards with best skin type", () => {
    render(<GuideScreen />);
    const cleanser = step("Cleanser");
    expect(cleanser.getAllByRole("article")).toHaveLength(6);
    expect(cleanser.queryByRole("button", { name: /more options/ })).not.toBeInTheDocument();
    const lrp = cleanser.getByText("Toleriane Hydrating Gentle Cleanser").closest("article")!;
    expect(within(lrp as HTMLElement).getByText("Dry to very dry skin, and sensitive skin.")).toBeInTheDocument();
  });

  it("gives every product a best skin type instead of a label", () => {
    const { container } = render(<GuideScreen />);
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(24);
    expect(screen.queryByText("Texture:")).not.toBeInTheDocument();
    for (const card of cards) {
      expect(within(card).getByText("Best skin type:")).toBeInTheDocument();
    }
    expect(container.querySelector(".pick-label")).toBeNull();
    const toner = step("Toner").getByText("Unscented Centella Toner").closest("article")!;
    const jobs = within(toner as HTMLElement).getByRole("list", { name: "Key ingredients" });
    expect(jobs).toHaveTextContent("Calms: Centella, Panthenol");
    expect(jobs).toHaveTextContent("Hydrates: Hyaluronic acid");
    expect(within(toner as HTMLElement).getByText("All skin types, especially red or sensitive skin.")).toBeInTheDocument();
  });

  it("has a sunscreen step that says products are coming soon", () => {
    render(<GuideScreen />);
    const sunscreen = step("Sunscreen");
    expect(sunscreen.getByText("Coming soon")).toBeInTheDocument();
    expect(sunscreen.getByText("I’ll add sunscreen products soon.")).toBeInTheDocument();
    expect(sunscreen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "6 · Sunscreen" })).toBeInTheDocument();
  });

  it("has no skin type filter", () => {
    render(<GuideScreen />);
    expect(screen.queryByRole("group", { name: "Filter by skin type" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Oily" })).not.toBeInTheDocument();
  });

  it("sorts card ingredients by job and explains each job only once, in the grid", () => {
    render(<GuideScreen />);
    for (const card of screen.getAllByRole("article")) {
      expect(card.textContent).not.toMatch(/support the barrier|helps calm|pull water|holds? water/i);
    }
    const cicaplast = step("Barrier cream or balm").getByText("Cicaplast Baume B5").closest("article")!;
    expect(within(cicaplast as HTMLElement).getByText("Key ingredients:").parentElement).toHaveTextContent(
      "Key ingredients: Panthenol, Centella, Shea butter",
    );
    expect(within(cicaplast as HTMLElement).queryByText(/Seals in:/)).not.toBeInTheDocument();
    const serum = step("Serum").getByText("Beta-Glucan Serum").closest("article")!;
    expect(within(serum as HTMLElement).getByRole("list", { name: "Key ingredients" })).toHaveTextContent("Hydrates:");
    expect(screen.getByText("Seal water in")).toBeInTheDocument();
  });
});
