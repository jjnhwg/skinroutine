import { AVATAR_COLORS } from "../lib/constants";
import type { Product } from "../types";

/** Stable per-product color, so the same product always looks the same. */
export function colorFor(product: Pick<Product, "id">): string {
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

interface AvatarProps {
  product: Product;
  size?: "" | "lg" | "xs";
}

/** The product's photo, or its initials on a generated color. */
export function Avatar({ product, size = "" }: AvatarProps) {
  const className = size ? `avatar ${size}` : "avatar";
  if (product.image) {
    return (
      <span className={className}>
        <img src={product.image} alt="" />
      </span>
    );
  }
  return (
    <span className={className} style={{ background: colorFor(product) }} aria-hidden="true">
      {initials(product.name)}
    </span>
  );
}
