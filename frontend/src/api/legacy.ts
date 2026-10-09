import type { AppState } from "../types";
import { apiSend } from "./http";
import type { ImportReport } from "./types";

/** The old app's backup file shape; also what this browser's stored data becomes. */
export interface LegacyBackup extends AppState {
  app: "skin-test-log";
  version: 1;
}

export function importLegacy(backup: LegacyBackup): Promise<ImportReport> {
  return apiSend<ImportReport>("POST", "/api/import/legacy", backup);
}
