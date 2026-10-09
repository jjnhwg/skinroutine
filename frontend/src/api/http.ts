/**
 * The one way the app talks to the FastAPI backend. Every non-2xx response
 * becomes an ApiError carrying the server's human-readable `detail`.
 */

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** FastAPI sends `detail` as a string, or (for 422) a list of {msg} objects. */
function detailOf(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && typeof detail[0]?.msg === "string") return detail[0].msg;
  return `Server responded ${status}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, detailOf(body, response.status));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, undefined);
}

export function apiSend<T>(method: string, path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Multipart upload; the browser sets the boundary header itself. */
export function apiUpload<T>(method: string, path: string, form: FormData): Promise<T> {
  return request<T>(path, { method, body: form });
}
