import { MIN_ENTRIES_FOR_TREND } from "./constants";
import { addDays, daysBetween } from "./dates";
import type { Insight, Log, Product } from "../types";

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

export const isRough = (l: Log): boolean => l.rating >= 4 || l.tags.includes("Pimple");

const avg = (arr: number[]): number | null =>
  arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null;

/** Per-product numbers: entries, rough days, and before/after averages. */
export function computeInsights(products: Product[], logs: Log[]): Insight[] {
  return products.map((p) => {
    const end = p.stoppedOn || "9999-12-31";
    const since = logs.filter((l) => l.logDate >= p.startedOn && l.logDate <= end);
    const beforeStart = addDays(p.startedOn, -14);
    const before = logs.filter((l) => l.logDate >= beforeStart && l.logDate < p.startedOn);
    const overlaps = products.filter(
      (o) => o.id !== p.id && Math.abs(daysBetween(o.startedOn, p.startedOn)) <= 7,
    );
    return {
      productId: p.id,
      entriesSinceStart: since.length,
      roughDays: since.filter(isRough).length,
      avgSinceStart: avg(since.map((l) => l.rating)),
      avgBeforeStart: before.length >= 3 ? avg(before.map((l) => l.rating)) : null,
      overlappingProductIds: overlaps.map((o) => o.id),
    };
  });
}

/** What the insight line says, as structured parts so React can style it. */
export type InsightVerdict = "none" | "keep-logging" | "no-baseline" | "helps" | "hurts" | "flat";

export interface InsightCopy {
  verdict: InsightVerdict;
  lead: string | null;
  text: string;
}

export function insightCopy(product: Product, ins: Insight): InsightCopy {
  if (ins.entriesSinceStart === 0) {
    return { verdict: "none", lead: null, text: `No entries since you started ${product.name} yet.` };
  }
  if (ins.entriesSinceStart < MIN_ENTRIES_FOR_TREND) {
    const n = MIN_ENTRIES_FOR_TREND - ins.entriesSinceStart;
    return {
      verdict: "keep-logging",
      lead: null,
      text: `Keep logging — ${n} more ${n === 1 ? "entry" : "entries"} before a trend means much.`,
    };
  }
  const since = ins.avgSinceStart as number;
  if (ins.avgBeforeStart === null) {
    return {
      verdict: "no-baseline",
      lead: null,
      text: `Average ${since.toFixed(1)} since starting. Not enough entries in the 2 weeks before to compare.`,
    };
  }
  const diff = since - ins.avgBeforeStart;
  const nums = `(${ins.avgBeforeStart.toFixed(1)} → ${since.toFixed(1)})`;
  if (diff <= -0.5) {
    return {
      verdict: "helps",
      lead: "Seems to help.",
      text: `Skin has been calmer since starting ${product.name} ${nums}.`,
    };
  }
  if (diff >= 0.5) {
    return {
      verdict: "hurts",
      lead: "Might be hurting.",
      text: `Skin has been rougher since starting ${product.name} ${nums}.`,
    };
  }
  return { verdict: "flat", lead: null, text: `No clear change yet ${nums}.` };
}
