import { describe, expect, it } from "vitest";
import { routineFor, usedOn } from "./domain";
import type { Log, Product } from "../types";

function product(id: string, startedOn: string, stoppedOn: string | null = null): Product {
  return { id, brand: "", name: id, slot: "AM", image: null, startedOn, stoppedOn, notes: "" };
}

const products = [
  product("serum", "2026-02-10"),
  product("cleanser", "2026-01-01", "2026-02-05"),
  product("toner", "2026-01-15"),
];

describe("routineFor", () => {
  it("lists products in use that day, oldest first", () => {
    expect(routineFor(products, "2026-02-01").map((p) => p.id)).toEqual(["cleanser", "toner"]);
    expect(routineFor(products, "2026-02-10").map((p) => p.id)).toEqual(["toner", "serum"]);
  });

  it("includes a product on its start and stop dates", () => {
    expect(routineFor(products, "2026-02-05").map((p) => p.id)).toContain("cleanser");
    expect(routineFor(products, "2026-02-06").map((p) => p.id)).not.toContain("cleanser");
  });
});

describe("usedOn", () => {
  const log = (usedProductIds?: string[]): Log =>
    ({ id: "l", logDate: "2026-02-12", rating: 2, tags: [], note: "", photos: [], usedProductIds }) as Log;

  it("keeps only the products ticked that day", () => {
    expect(usedOn(products, log(["serum"])).map((p) => p.id)).toEqual(["serum"]);
  });

  it("treats a legacy entry without a list as the whole routine", () => {
    expect(usedOn(products, log(undefined)).map((p) => p.id)).toEqual(["toner", "serum"]);
  });
});
