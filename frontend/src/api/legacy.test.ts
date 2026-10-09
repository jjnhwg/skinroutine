import { describe, expect, it } from "vitest";
import { readLegacyBackup } from "./legacy";

describe("readLegacyBackup", () => {
  it("reads the old app's data from this browser", () => {
    localStorage.setItem("skin-test-log-v1", JSON.stringify({ products: [{ id: "a" }], logs: [] }));

    expect(readLegacyBackup()).toEqual({ products: [{ id: "a" }], logs: [] });
  });

  it("is null when there's nothing or it's corrupt", () => {
    expect(readLegacyBackup()).toBeNull();
    localStorage.setItem("skin-test-log-v1", JSON.stringify({ products: [], logs: [] }));
    expect(readLegacyBackup()).toBeNull();
    localStorage.setItem("skin-test-log-v1", "{not json");
    expect(readLegacyBackup()).toBeNull();
  });
});
