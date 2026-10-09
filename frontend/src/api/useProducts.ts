import { useCallback, useEffect, useState } from "react";
import { ApiError } from "./http";
import * as api from "./products";
import type { Product, ProductInput } from "./types";

/**
 * Every product, retired ones included (screens filter), plus actions that
 * refresh the list once the server has accepted the change.
 */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setProducts(await api.listProducts(true));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Can't reach the server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const after = useCallback(
    <T>(action: Promise<T>): Promise<T> =>
      action.then(async (result) => {
        await reload();
        return result;
      }),
    [reload],
  );

  return {
    products,
    loading,
    error,
    reload,
    create: (input: ProductInput) => after(api.createProduct(input)),
    update: (id: number, patch: Partial<ProductInput>) => after(api.updateProduct(id, patch)),
    retire: (id: number) => after(api.retireProduct(id)),
    unretire: (id: number) => after(api.unretireProduct(id)),
    uploadPhoto: (id: number, photo: Blob) => after(api.uploadProductPhoto(id, photo)),
    removePhoto: (id: number) => after(api.deleteProductPhoto(id)),
  };
}
