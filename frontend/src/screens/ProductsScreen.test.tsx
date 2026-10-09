import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProduct,
  listProducts,
  retireProduct,
  uploadProductPhoto,
} from "../api/products";
import { getRoutine } from "../api/routine";
import type { Product } from "../api/types";
import { resizeImage } from "../lib/image";
import { renderWithApp } from "../test/render";
import { ProductsScreen } from "./ProductsScreen";

vi.mock("../api/settings");
vi.mock("../api/products");
vi.mock("../api/routine");
vi.mock("../lib/image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/image")>()),
  resizeImage: vi.fn(),
}));

function product(fields: Partial<Product>): Product {
  return {
    id: 1,
    name: "Snail Mucin",
    brand: "COSRX",
    type: "serum",
    photo_url: null,
    started_on: "2026-09-01",
    retired_on: null,
    is_retired: false,
    ...fields,
  };
}

const ACTIVE = product({ id: 1, name: "Snail Mucin", photo_url: "/api/files/u1/a.jpg" });
const RETIRED = product({
  id: 2,
  name: "Old Toner",
  type: "toner",
  retired_on: "2026-09-20",
  is_retired: true,
});
// A tiny valid JPEG data URL is all the upload path needs.
const JPEG_DATA_URL = "data:image/jpeg;base64,/9j/4AAQ";

beforeEach(() => {
  vi.mocked(listProducts).mockReset().mockResolvedValue([ACTIVE, RETIRED]);
  vi.mocked(createProduct).mockReset();
  vi.mocked(uploadProductPhoto).mockReset();
  vi.mocked(retireProduct).mockReset();
  vi.mocked(resizeImage).mockReset().mockResolvedValue(JPEG_DATA_URL);
  vi.mocked(getRoutine).mockReset().mockResolvedValue({ am: [], pm: [] });
});

describe("ProductsScreen", () => {
  it("lists active products from the server", async () => {
    renderWithApp(<ProductsScreen />);

    expect(await screen.findByText("Snail Mucin")).toBeInTheDocument();
    expect(screen.getByText("COSRX")).toBeInTheDocument();
  });

  it("hides retired products until asked", async () => {
    const user = userEvent.setup();
    renderWithApp(<ProductsScreen />);
    await screen.findByText("Snail Mucin");

    expect(screen.queryByText("Old Toner")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Show retired/ }));
    expect(screen.getByText("Old Toner")).toBeInTheDocument();
  });

  it("adds a product with the right body", async () => {
    vi.mocked(createProduct).mockResolvedValue(product({ id: 3, name: "Gentle Cleanser" }));
    const user = userEvent.setup();
    renderWithApp(<ProductsScreen />);
    await screen.findByText("Snail Mucin");

    await user.click(screen.getByText("Add a product"));
    await user.type(screen.getByLabelText(/Brand/), " CeraVe ");
    await user.type(screen.getByLabelText("Name"), "Gentle Cleanser");
    await user.selectOptions(screen.getByLabelText("Type"), "cleanser");
    await user.click(screen.getByRole("button", { name: "Add product" }));

    expect(createProduct).toHaveBeenCalledWith({
      name: "Gentle Cleanser",
      brand: "CeraVe",
      type: "cleanser",
      started_on: "2026-10-09",
    });
    expect(uploadProductPhoto).not.toHaveBeenCalled();
  });

  it("shows the type icon when there is no photo", async () => {
    vi.mocked(listProducts).mockResolvedValue([product({ id: 4, name: "Sunscreen", type: "spf" })]);
    renderWithApp(<ProductsScreen />);

    const row = (await screen.findByText("Sunscreen")).closest(".product") as HTMLElement;
    expect(within(row).getByRole("img", { name: "SPF" })).toBeInTheDocument();
  });

  it("uploads a pasted image after the product is saved", async () => {
    vi.mocked(createProduct).mockResolvedValue(product({ id: 5, name: "Pasted" }));
    vi.mocked(uploadProductPhoto).mockResolvedValue(product({ id: 5, name: "Pasted" }));
    const user = userEvent.setup();
    renderWithApp(<ProductsScreen />);
    await screen.findByText("Snail Mucin");
    await user.click(screen.getByText("Add a product"));

    const file = new File(["x"], "clip.png", { type: "image/png" });
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(paste, "clipboardData", {
      value: { items: [{ kind: "file", type: "image/png", getAsFile: () => file }] },
    });
    fireEvent(window, paste);
    await screen.findByText("Photo pasted");

    await user.type(screen.getByLabelText("Name"), "Pasted");
    await user.click(screen.getByRole("button", { name: "Add product" }));

    await waitFor(() => expect(uploadProductPhoto).toHaveBeenCalled());
    const [id, blob] = vi.mocked(uploadProductPhoto).mock.calls[0];
    expect(id).toBe(5);
    expect(blob.type).toBe("image/jpeg");
    expect(vi.mocked(createProduct).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(uploadProductPhoto).mock.invocationCallOrder[0],
    );
  });

  it("retires only after confirming", async () => {
    vi.mocked(retireProduct).mockResolvedValue({ ...ACTIVE, retired_on: "2026-10-09", is_retired: true });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const user = userEvent.setup();
    renderWithApp(<ProductsScreen />);
    await screen.findByText("Snail Mucin");

    await user.click(screen.getByRole("button", { name: "Retire Snail Mucin" }));
    expect(retireProduct).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Retire Snail Mucin" }));
    expect(retireProduct).toHaveBeenCalledWith(1);
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("reloads the routine after retiring, since the server drops the product from it", async () => {
    vi.mocked(retireProduct).mockResolvedValue({ ...ACTIVE, retired_on: "2026-10-09", is_retired: true });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderWithApp(<ProductsScreen />);
    await screen.findByRole("heading", { name: "Your routine" });
    await waitFor(() => expect(getRoutine).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "Retire Snail Mucin" }));

    await waitFor(() => expect(getRoutine).toHaveBeenCalledTimes(2));
  });
});
