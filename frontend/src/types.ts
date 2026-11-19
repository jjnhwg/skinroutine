/** When a catalog product is usually applied. */
export type Slot = "AM" | "PM" | "BOTH";

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
  /** Where an online result was found, e.g. "nudieglow.com". */
  source?: string;
  /** The label's ingredient list, when the source knows it. */
  ingredients?: string;
}

export type ProductShape = "tube" | "pump" | "dropper" | "jar" | "tall" | "small" | "patch" | "drop";

/** One real product found by the API's online search. */
export interface ProductSearchResult {
  brand: string;
  name: string;
  source: string;
  /** "" when the source doesn't list ingredients. */
  ingredients?: string;
}

export interface ProductSearchResponse {
  products: ProductSearchResult[];
}
