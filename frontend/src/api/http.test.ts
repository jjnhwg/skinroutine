import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiGet, apiSend, apiUpload } from "./http";

// A stand-in Supabase whose session each test sets: signed in with a token, or null.
const auth = vi.hoisted(() => ({ session: null as { access_token: string } | null }));
vi.mock("../lib/supabase", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: auth.session } }) } },
}));

function mockFetch(status: number, body?: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** The ApiError a call rejects with. */
function failure(call: Promise<unknown>): Promise<ApiError> {
  return call.then(
    () => {
      throw new Error("Expected the call to fail");
    },
    (error: ApiError) => error,
  );
}

beforeEach(() => {
  auth.session = { access_token: "token-123" };
});
afterEach(() => vi.unstubAllGlobals());

describe("http", () => {
  it("returns parsed JSON on success", async () => {
    const fetchMock = mockFetch(200, { status: "ok" });

    expect(await apiGet<{ status: string }>("/api/health")).toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith("/api/health", { headers: { Authorization: "Bearer token-123" } });
  });

  it("sends no Authorization header when signed out", async () => {
    auth.session = null;
    const fetchMock = mockFetch(200, { status: "ok" });

    await apiGet("/api/health");

    expect(fetchMock).toHaveBeenCalledWith("/api/health", { headers: {} });
  });

  it("sends a JSON body with the method", async () => {
    const fetchMock = mockFetch(200, { ok: true });

    await apiSend("PATCH", "/api/settings", { timezone: "Europe/London" });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PATCH");
    expect(init.headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer token-123" });
    expect(JSON.parse(init.body)).toEqual({ timezone: "Europe/London" });
  });

  it("returns undefined for 204", async () => {
    mockFetch(204);

    expect(await apiSend("DELETE", "/api/products/1/photo")).toBeUndefined();
  });

  it("uploads form data without setting a content type", async () => {
    const fetchMock = mockFetch(200, { id: 1 });
    const form = new FormData();
    form.append("file", new Blob(["x"]), "a.jpg");

    await apiUpload("PUT", "/api/products/1/photo", form);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe(form);
    // No Content-Type: the browser adds it with the multipart boundary.
    expect(init.headers).toEqual({ Authorization: "Bearer token-123" });
  });

  it("throws ApiError with a string detail", async () => {
    mockFetch(409, { detail: "Products can't be deleted; retire it instead." });

    const error = await failure(apiSend("DELETE", "/api/products/1"));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.detail).toBe("Products can't be deleted; retire it instead.");
  });

  it("uses the first message of a 422 list", async () => {
    mockFetch(422, {
      detail: [
        { loc: ["body", "timezone"], msg: "Unknown time zone" },
        { loc: ["body", "lookahead_min_days"], msg: "Second problem" },
      ],
    });

    const error = await failure(apiSend("PATCH", "/api/settings", {}));

    expect(error.status).toBe(422);
    expect(error.detail).toBe("Unknown time zone");
  });

  it("falls back to the status when the body isn't JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Bad gateway", { status: 502 })));

    const error = await failure(apiGet("/api/settings"));

    expect(error.status).toBe(502);
    expect(error.detail).toBe("Server responded 502");
  });
});
