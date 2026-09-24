import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useToast } from "./components/Toast";
import { loadState, saveState } from "./lib/storage";
import type { AppState, Log, Product } from "./types";

interface Store {
  products: Product[];
  logs: Log[];
  /**
   * Apply a change and persist it. Returns false and rolls back if
   * localStorage rejected the write, so the UI never shows a phantom save.
   */
  commit: (next: (current: AppState) => AppState) => boolean;
  /** Replace everything, used by backup import. */
  replaceAll: (next: AppState) => boolean;
}

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const toast = useToast();

  const commit = useCallback(
    (next: (current: AppState) => AppState) => {
      const candidate = next(state);
      if (!saveState(candidate)) {
        toast("Storage is full — remove some photos or export a backup.");
        return false;
      }
      setState(candidate);
      return true;
    },
    [state, toast],
  );

  const replaceAll = useCallback((next: AppState) => commit(() => next), [commit]);

  const value = useMemo(
    () => ({ products: state.products, logs: state.logs, commit, replaceAll }),
    [state, commit, replaceAll],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
