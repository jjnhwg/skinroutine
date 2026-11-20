import { afterEach, describe, expect, it } from "vitest";
import { navigate, parse } from "./router";

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

describe("parse", () => {
  it("reads #/login as the Log tab with the log-in form", () => {
    expect(parse("#/login")).toEqual({ tab: "log", date: null, login: true });
    expect(parse("#/log/2026-10-05")).toEqual({ tab: "log", date: "2026-10-05", login: false });
  });
});
