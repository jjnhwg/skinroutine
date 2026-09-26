/** When during the day a product is applied. */
export type Slot = "AM" | "PM" | "BOTH";

/** A rating of how the skin looked, 1 (clear) to 5 (flare-up). */
export type Rating = 1 | 2 | 3 | 4 | 5;

/** A product being tested, with the window it was in use. */
export interface Product {
  id: string;
  brand: string;
  name: string;
  slot: Slot;
  /** Square data-URL image: either an uploaded photo or generated catalog art. */
  image: string | null;
  /** YYYY-MM-DD */
  startedOn: string;
  /** YYYY-MM-DD, or null while still in use. */
  stoppedOn: string | null;
  notes: string;
}

/** One day's skin entry. */
export interface Log {
  id: string;
  /** YYYY-MM-DD */
  logDate: string;
  rating: Rating;
  tags: string[];
  note: string;
  /** Ids of the products actually used that day. */
  usedProductIds: string[];
  /** Resized JPEG data URLs. */
  photos: string[];
}

/** Everything persisted to localStorage. */
export interface AppState {
  products: Product[];
  logs: Log[];
}

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

/** Per-product numbers derived from the logs. */
export interface Insight {
  productId: string;
  entriesSinceStart: number;
  roughDays: number;
  avgSinceStart: number | null;
  avgBeforeStart: number | null;
  overlappingProductIds: string[];
}

/** Shape of the data we send to Flask when saving today's routine. */
export interface SaveRoutineRequest {
  products: string[];
}

/** Shape of the response Flask sends back after a successful save. */
export interface SaveRoutineResponse {
  message: string;
}

/** One real product found by Flask's online search. */
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
