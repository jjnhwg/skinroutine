import { AVATAR_COLORS } from "./constants";

/** Stable per-product color, so the same product always looks the same. */
export function colorFor(product: { id: string }): string {
  let h = 0;
  for (const ch of product.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
