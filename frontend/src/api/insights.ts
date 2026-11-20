import { apiGet, apiSend } from "./http";
import type { ProductWeeks, Recap, SharedIngredient, Suspects } from "./types";

/** Each product, week by week: days with a new pimple, something forming, or redness. */
export async function getProductWeeks(): Promise<ProductWeeks[]> {
  return (await apiGet<{ products: ProductWeeks[] }>("/api/insights/products")).products;
}

export function getSuspects(): Promise<Suspects> {
  return apiGet<Suspects>("/api/insights/suspects");
}

/** The last 7 days vs the 7 before. Useful from day one. */
export function getRecap(): Promise<Recap> {
  return apiGet<Recap>("/api/insights/recap");
}

/** Ingredients in this list that were also in a product that tends to come before breakouts. */
export async function checkIngredients(ingredients: string, excludeProductId?: number): Promise<SharedIngredient[]> {
  const body = { ingredients, exclude_product_id: excludeProductId ?? null };
  return (await apiSend<{ matches: SharedIngredient[] }>("POST", "/api/insights/ingredient-check", body)).matches;
}
