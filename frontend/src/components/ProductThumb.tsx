import type { ComponentType } from "react";
import type { Product, ProductType } from "../api/types";
import { colorFor } from "../lib/avatar";
import { PRODUCT_TYPE_LABELS } from "../lib/constants";
import {
  BottleIcon,
  CleanserIcon,
  MoisturizerIcon,
  SerumIcon,
  SunIcon,
  TonerIcon,
  TubeIcon,
} from "./Icons";

const TYPE_ICONS: Record<ProductType, ComponentType<{ size?: number }>> = {
  cleanser: CleanserIcon,
  toner: TonerIcon,
  serum: SerumIcon,
  moisturizer: MoisturizerIcon,
  spf: SunIcon,
  treatment: TubeIcon,
  other: BottleIcon,
};

interface ProductThumbProps {
  product: Product;
  size?: "" | "lg" | "xs";
}

/** A server product's photo, or an icon for its type on its own color. */
export function ProductThumb({ product, size = "" }: ProductThumbProps) {
  const className = size ? `avatar ${size}` : "avatar";
  if (product.photo_url) {
    return (
      <span className={className}>
        <img src={product.photo_url} alt="" />
      </span>
    );
  }
  const Icon = TYPE_ICONS[product.type];
  return (
    <span
      className={className}
      style={{ background: colorFor({ id: String(product.id) }) }}
      role="img"
      aria-label={PRODUCT_TYPE_LABELS[product.type]}
    >
      <Icon size={size === "xs" ? 16 : size === "lg" ? 30 : 22} />
    </span>
  );
}
