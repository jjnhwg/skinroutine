import { colorFor, initials } from "../lib/avatar";
import type { Product } from "../types";

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
