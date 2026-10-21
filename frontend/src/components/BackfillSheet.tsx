import { useEffect, useState } from "react";
import { backfill } from "../api/backfill";
import { getRoutine } from "../api/routine";
import type { Product } from "../api/types";
import { ProductThumb } from "./ProductThumb";
import { useToast } from "./useToast";

interface BackfillSheetProps {
  /** How many of the last 14 days have no entry. */
  openDays: number;
  onClose: () => void;
  onDone: () => void;
}

/** "What have you used in the last 2 weeks?" — fills empty days from the saved routine. */
export function BackfillSheet({ openDays, onClose, onDone }: BackfillSheetProps) {
  const toast = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    getRoutine()
      .then((routine) => {
        if (!live) return;
        const seen = new Map<number, Product>();
        for (const item of [...routine.am, ...routine.pm]) seen.set(item.product.id, item.product);
        setProducts([...seen.values()]);
        setChosen(new Set(seen.keys()));
      })
      .catch(() => live && setProducts([]));
    return () => {
      live = false;
    };
  }, []);

  function toggle(id: number) {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setBusy(true);
    try {
      const filled = await backfill([...chosen]);
      toast(`Filled in ${filled} day${filled === 1 ? "" : "s"}`);
      onDone();
    } catch {
      toast("Couldn't fill in those days.");
      setBusy(false);
    }
  }

  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet short" role="dialog" aria-modal="true" aria-labelledby="backfill-title">
        <div className="sheet-head">
          <div className="grab" aria-hidden="true" />
          <div className="title-row">
            <h2 id="backfill-title">What have you used in the last 2 weeks?</h2>
            <button type="button" className="close-x" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <div className="sheet-body">
          <p className="muted" style={{ marginTop: 0 }}>
            Tick the routine products you were already using. They'll be recorded on your {openDays} empty
            day{openDays === 1 ? "" : "s"}, following each product's schedule, so trials and insights have a
            baseline to compare with. Skin check-ins stay blank.
          </p>
          {products === null && <p className="muted">Loading…</p>}
          {products?.length === 0 && (
            <p className="muted">
              Your routine is empty. Add products to it on the <a href="#/products">Products</a> screen first.
            </p>
          )}
          {products && products.length > 0 && (
            <>
              <ul className="detail-list" style={{ listStyle: "none", padding: 0 }}>
                {products.map((p) => (
                  <li key={p.id}>
                    <label className="check-row" style={{ minHeight: 52 }}>
                      <input type="checkbox" checked={chosen.has(p.id)} onChange={() => toggle(p.id)} />
                      <span aria-hidden="true">
                        <ProductThumb product={p} size="xs" />
                      </span>
                      {p.name}
                    </label>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="btn primary"
                style={{ marginTop: 12, width: "100%" }}
                disabled={busy || chosen.size === 0}
                onClick={save}
              >
                Fill in {openDays} day{openDays === 1 ? "" : "s"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
