import type { ProductSearchResponse, ProductSearchResult } from "../types";

/**
 * Search real products through the API. It asks Open Beauty Facts
 * and a few K-beauty shops, which the browser can't reach itself (no CORS).
 */
export async function searchProducts(query: string): Promise<ProductSearchResult[]> {
  const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error(`Server responded ${response.status}`);
  return ((await response.json()) as ProductSearchResponse).products;
}

