import { afterEach, describe, expect, it } from "vitest";
import { navigate } from "./router";

afterEach(() => {
  location.hash = "";
});

describe("navigate", () => {
  it("works with or without a leading slash", () => {
    navigate("/log/2026-10-05");
    expect(location.hash).toBe("#/log/2026-10-05");

    navigate("timeline");
    expect(location.hash).toBe("#/timeline");

    navigate("#/settings");
    expect(location.hash).toBe("#/settings");
  });
});
