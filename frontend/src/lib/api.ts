import type { ProductSearchResponse, ProductSearchResult } from "../types";

/**
 * Search real products, with photos, through the API. It asks Open Beauty Facts
 * and a few K-beauty shops, which the browser can't reach itself (no CORS).
 */
export async function searchProducts(query: string): Promise<ProductSearchResult[]> {
  const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error(`Server responded ${response.status}`);
  return ((await response.json()) as ProductSearchResponse).products;
}

/** Download a search result's photo through the API, so it can be drawn on a canvas. */
export async function fetchProductImage(url: string): Promise<Blob> {
  const response = await fetch(`/api/products/image?url=${encodeURIComponent(url)}`);
  if (!response.ok) throw new Error(`Server responded ${response.status}`);
  return response.blob();
}
