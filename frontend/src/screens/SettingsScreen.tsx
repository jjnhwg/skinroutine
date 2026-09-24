import { useToast } from "../components/Toast";
import { todayStr } from "../lib/dates";
import { useStore } from "../store";
import type { AppState, Log, Product } from "../types";

const BACKUP_APP = "skin-test-log";
const BACKUP_VERSION = 1;

interface Backup extends AppState {
  app: string;
  version: number;
  exportedAt: string;
}

function looksLikeBackup(data: unknown): data is Backup {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Partial<Backup>;
  return d.app === BACKUP_APP && Array.isArray(d.products) && Array.isArray(d.logs);
}

export function SettingsScreen() {
  const { products, logs, replaceAll } = useStore();
  const toast = useToast();

  const photoCount = logs.reduce((sum, l) => sum + l.photos.length, 0);

  function exportBackup() {
    const payload: Backup = {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      products,
      logs,
    };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `skin-test-log-${todayStr()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function importBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      toast("That file isn't valid JSON.");
      return;
    }
    if (!looksLikeBackup(data)) {
      toast("That doesn't look like a Skin Test Log backup.");
      return;
    }

    const replace = confirm(
      `Backup has ${data.products.length} products and ${data.logs.length} entries.\n\n` +
        "OK = replace everything here\nCancel = merge (backup wins on the same day)",
    );

    let next: AppState;
    if (replace) {
      next = { products: data.products, logs: data.logs };
    } else {
      const ids = new Set(data.products.map((p: Product) => p.id));
      const dates = new Set(data.logs.map((l: Log) => l.logDate));
      next = {
        products: [...products.filter((p) => !ids.has(p.id)), ...data.products],
        logs: [...logs.filter((l) => !dates.has(l.logDate)), ...data.logs],
      };
    }
    if (replaceAll(next)) toast("Backup imported");
  }

  return (
    <>
      <h2 className="page-title">Settings</h2>
      <p className="page-sub">Back up your log so you never lose it.</p>

      <div className="card">
        <h2>Backup</h2>
        <div className="warn" style={{ marginTop: 0 }}>
          Your log lives only in this browser. Clearing browser data or switching phones deletes
          everything unless you've exported a backup.
        </div>

        <div className="stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="stat">
            <b>{products.length}</b>
            <span>products</span>
          </div>
          <div className="stat">
            <b>{logs.length}</b>
            <span>entries</span>
          </div>
          <div className="stat">
            <b>{photoCount}</b>
            <span>photos</span>
          </div>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn primary grow" onClick={exportBackup}>
            Export backup
          </button>
          <label className="btn grow">
            Import backup
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={importBackup}
            />
          </label>
        </div>
      </div>
    </>
  );
}
