/** When a catalog product is usually applied. */
export type Slot = "AM" | "PM" | "BOTH";

/** A rating of how the skin looked, 1 (clear) to 5 (flare-up). */
export type Rating = 1 | 2 | 3 | 4 | 5;

/** An entry in the built-in product catalog, and the art it generates. */
export interface CatalogItem {
  id?: string;
  brand: string;
  name: string;
  category: string;
  shape: ProductShape;
  color: string;
  slot: Slot;
  label: string;
  /** Photo of the real product, when it came from an online search. */
  imageUrl?: string;
  /** Where an online result was found, e.g. "nudieglow.com". */
  source?: string;
}

export type ProductShape = "tube" | "pump" | "dropper" | "jar" | "tall" | "small" | "patch";

/** One real product found by the API's online search. */
export interface ProductSearchResult {
  brand: string;
  name: string;
  /** Remote photo URL; load it through fetchProductImage to keep it. */
  image: string;
  source: string;
}

export interface ProductSearchResponse {
  products: ProductSearchResult[];
}
