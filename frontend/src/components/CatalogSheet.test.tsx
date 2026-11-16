import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchProducts } from "../lib/api";
import { CatalogSheet } from "./CatalogSheet";

vi.mock("../lib/api");

function renderSheet() {
  render(<CatalogSheet onPick={vi.fn()} onAddOwn={vi.fn()} onClose={vi.fn()} />);
  return screen.getByRole("textbox", { name: "Search products" });
}

describe("CatalogSheet", () => {
  beforeEach(() => {
    vi.mocked(searchProducts)
      .mockReset()
      .mockImplementation(async (q) => [
        { brand: "Torriden", name: `${q} result`, image: "", source: "sokoglam.com", ingredients: "" },
      ]);
  });

  it("searches online on its own once typing pauses", async () => {
    const input = renderSheet();
    await userEvent.type(input, "torriden");

    expect(await screen.findByText("Found online")).toBeInTheDocument();
    expect(screen.getByText("torriden result")).toBeInTheDocument();
    // One search for the whole word, not one per letter.
    expect(searchProducts).toHaveBeenCalledTimes(1);
    expect(searchProducts).toHaveBeenCalledWith("torriden");
  });

  it("finds built-in products despite a typo", async () => {
    const input = renderSheet();
    await userEvent.type(input, "cosrx snial");

    expect(screen.getByText("Advanced Snail 96 Mucin Power Essence")).toBeInTheDocument();
  });

  it("doesn't search online for one or two letters", async () => {
    const input = renderSheet();
    await userEvent.type(input, "to");

    await new Promise((r) => setTimeout(r, 600));
    expect(searchProducts).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Search “to” online" })).toBeInTheDocument();
  });

  it("shows only the latest search when an older answer arrives late", async () => {
    let finishFirst: (rows: never[]) => void = () => {};
    vi.mocked(searchProducts).mockImplementationOnce(
      () => new Promise((resolve) => (finishFirst = resolve)),
    );
    const input = renderSheet();
    await userEvent.type(input, "tor");
    await waitFor(() => expect(searchProducts).toHaveBeenCalledWith("tor"));

    await userEvent.type(input, "riden");
    expect(await screen.findByText("torriden result")).toBeInTheDocument();
    finishFirst([]);

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText("torriden result")).toBeInTheDocument();
  });
});
