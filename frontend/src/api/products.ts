import { apiGet, apiSend, apiUpload } from "./http";
import type { Product, ProductInput } from "./types";

export function listProducts(includeRetired: boolean): Promise<Product[]> {
  return apiGet<Product[]>(`/api/products?include_retired=${includeRetired}`);
}

export function createProduct(input: ProductInput): Promise<Product> {
  return apiSend<Product>("POST", "/api/products", input);
}

export function updateProduct(id: number, patch: Partial<ProductInput>): Promise<Product> {
  return apiSend<Product>("PATCH", `/api/products/${id}`, patch);
}

/** Retire as of `retiredOn`, or the server's today when omitted. */
export function retireProduct(id: number, retiredOn?: string): Promise<Product> {
  return apiSend<Product>("POST", `/api/products/${id}/retire`, { retired_on: retiredOn ?? null });
}

export function unretireProduct(id: number): Promise<Product> {
  return apiSend<Product>("POST", `/api/products/${id}/unretire`);
}

export function uploadProductPhoto(id: number, photo: Blob): Promise<Product> {
  const form = new FormData();
  form.append("file", photo, "photo.jpg");
  return apiUpload<Product>("PUT", `/api/products/${id}/photo`, form);
}

export function deleteProductPhoto(id: number): Promise<void> {
  return apiSend<void>("DELETE", `/api/products/${id}/photo`);
}
