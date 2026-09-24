import { STORE_KEY } from "./constants";
import type { AppState } from "../types";

const EMPTY: AppState = { products: [], logs: [] };

/** Read saved state, falling back to empty if storage is blocked or corrupt. */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    };
  } catch {
    return EMPTY;
  }
}

/**
 * Persist state. Returns false when the write failed — usually the quota,
 * since photos are stored inline as data URLs.
 */
export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export const uid = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
