import { describe, expect, it } from "vitest";
import { matchScore } from "./fuzzy";

describe("matchScore", () => {
  it.each([
    ["cosrx snail", "COSRX", "Advanced Snail 96 Mucin Power Essence"],
    ["cosrx snial", "COSRX", "Advanced Snail 96 Mucin Power Essence"],
    ["ceravee", "CeraVe", "Moisturizing Cream"],
    ["centela", "SKIN1004", "Madagascar Centella Ampoule"],
    ["hyalu", "Torriden", "Dive-In Low Molecule Hyaluronic Acid Serum"],
    ["dr jart", "Dr.Jart+", "Cicapair Tiger Grass Cream"],
  ])("matches %s despite typos or half-typed words", (q, brand, name) => {
    expect(matchScore(q, brand, name)).toBeGreaterThan(0);
  });

  it.each([
    ["cerave", "COSRX", "Balancium Comfort Ceramide Cream"],
    ["torriden snail", "Torriden", "Dive-In Serum"],
    ["tea", "Some", "Peach Cream"],
  ])("rejects %s for an unrelated product", (q, brand, name) => {
    expect(matchScore(q, brand, name)).toBe(0);
  });

  it("scores an exact match above a typo", () => {
    const exact = matchScore("snail", "COSRX", "Snail Mucin");
    const typo = matchScore("snial", "COSRX", "Snail Mucin");
    expect(exact).toBeGreaterThan(typo);
    expect(typo).toBeGreaterThan(0);
  });
});
