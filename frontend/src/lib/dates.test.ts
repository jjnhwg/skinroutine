import { describe, expect, it } from "vitest";
import { addDays, daysBetween, fmt } from "./dates";

describe("dates", () => {
  it("pads months and days", () => {
    expect(fmt(2026, 3, 7)).toBe("2026-03-07");
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("counts days between dates, signed", () => {
    expect(daysBetween("2026-01-30", "2026-02-02")).toBe(3);
    expect(daysBetween("2026-02-02", "2026-01-30")).toBe(-3);
    // Daylight saving starts on 2026-03-08 in the US; still exactly one day.
    expect(daysBetween("2026-03-08", "2026-03-09")).toBe(1);
  });
});
