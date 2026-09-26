import type {
  ProductSearchResponse,
  ProductSearchResult,
  SaveRoutineRequest,
  SaveRoutineResponse,
} from "../types";

/**
 * Mirror today's routine to the Flask API.
 *
 * The log itself lives in localStorage; this is the one thing the backend
 * currently accepts, so it is best-effort and never blocks a local save.
 */
export async function saveRoutineToServer(products: string[]): Promise<SaveRoutineResponse> {
  const body: SaveRoutineRequest = { products };
  const response = await fetch("/api/routine/today", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Server responded ${response.status}`);
  return (await response.json()) as SaveRoutineResponse;
}

/**
 * Search real products, with photos, through Flask. It asks Open Beauty Facts
 * and a few K-beauty shops, which the browser can't reach itself (no CORS).
 */
export async function searchProducts(query: string): Promise<ProductSearchResult[]> {
  const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error(`Server responded ${response.status}`);
  return ((await response.json()) as ProductSearchResponse).products;
}

/** Download a search result's photo through Flask, so it can be drawn on a canvas. */
export async function fetchProductImage(url: string): Promise<Blob> {
  const response = await fetch(`/api/products/image?url=${encodeURIComponent(url)}`);
  if (!response.ok) throw new Error(`Server responded ${response.status}`);
  return response.blob();
}
