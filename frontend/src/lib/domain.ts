import type { Log, Product } from "../types";

/** Products in use on a given date, oldest first. */
export function routineFor(products: Product[], date: string): Product[] {
  return products
    .filter((p) => p.startedOn <= date && (!p.stoppedOn || p.stoppedOn >= date))
    .sort((a, b) => a.startedOn.localeCompare(b.startedOn));
}

/**
 * Products actually used on a log. Entries saved before per-product
 * selection existed have no list, so they count as the whole routine.
 */
export function usedOn(products: Product[], log: Log): Product[] {
  const routine = routineFor(products, log.logDate);
  if (!Array.isArray(log.usedProductIds)) return routine;
  return routine.filter((p) => log.usedProductIds.includes(p.id));
}
