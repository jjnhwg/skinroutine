import type { CatalogItem, ProductSearchResult } from "../types";
import { fetchProductImage, searchProducts } from "./api";
import { PRODUCT_IMAGE_MAX, resizeImage } from "./image";

function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9%]+/).filter(Boolean);
}

/**
 * The result whose name adds the fewest words to what we searched for.
 *
 * Searching "Sensibio H2O Micellar Water" also finds the wipes; the plain
 * bottle is the one with nothing extra in its name.
 */
function closestMatch(item: CatalogItem, results: ProductSearchResult[]): ProductSearchResult | null {
  const wanted = new Set(words(`${item.brand} ${item.name}`));
  let best: ProductSearchResult | null = null;
  let bestExtra = Infinity;
  for (const r of results) {
    const extra = words(r.name).filter((w) => !wanted.has(w)).length;
    if (extra < bestExtra) {
      best = r;
      bestExtra = extra;
    }
  }
  return best;
}

/**
 * A real photo of a catalog item, resized to a data URL for storage.
 *
 * Online results carry their photo; built-in items are looked up by brand
 * and name. Resolves to null when nothing is found — the caller keeps the
 * drawn bottle then.
 */
export async function loadProductPhoto(item: CatalogItem): Promise<string | null> {
  let url = item.imageUrl;
  if (!url) {
    const results = await searchProducts(`${item.brand} ${item.name}`);
    url = closestMatch(item, results)?.image;
  }
  if (!url) return null;
  return resizeImage(await fetchProductImage(url), PRODUCT_IMAGE_MAX, "pad");
}
