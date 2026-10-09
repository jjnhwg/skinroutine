import { apiSend } from "./http";
import type { ImportReport } from "./types";

/** Where the old app kept everything in this browser. */
const LEGACY_KEY = "skin-test-log-v1";

/**
 * The old app's data: {products, logs}. The server checks every field, so the
 * entries are passed through as-is.
 */
export interface LegacyData {
  products: unknown[];
  logs: unknown[];
}

/** The old app's backup file shape; also what this browser's stored data becomes. */
export interface LegacyBackup extends LegacyData {
  app: "skin-test-log";
  version: 1;
}

/** This browser's old data, or null if there is none (or storage is blocked). */
export function readLegacyBackup(): LegacyData | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LegacyData>;
    const products = Array.isArray(parsed.products) ? parsed.products : [];
    const logs = Array.isArray(parsed.logs) ? parsed.logs : [];
    return products.length || logs.length ? { products, logs } : null;
  } catch {
    return null;
  }
}

export function importLegacy(backup: LegacyBackup): Promise<ImportReport> {
  return apiSend<ImportReport>("POST", "/api/import/legacy", backup);
}
