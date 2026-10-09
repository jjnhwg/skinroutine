import type { Planned, Product, ProductUse, TimeOfDay } from "../api/types";
import { CheckIcon } from "./Icons";
import { ProductThumb } from "./ProductThumb";

const SLOTS: { slot: TimeOfDay; title: string; when: string }[] = [
  { slot: "am", title: "Morning", when: "this morning" },
  { slot: "pm", title: "Night", when: "tonight" },
];

interface RoutineChecklistProps {
  /** Every product, retired ones included, so past days can show what was used. */
  products: Product[];
  planned: Planned;
  uses: ProductUse[];
  onChange: (uses: ProductUse[]) => void;
}

/**
 * Morning and night tiles: the day's planned products plus anything else used.
 * Ticked = used; untick a planned product to record skipping it.
 */
export function RoutineChecklist({ products, planned, uses, onChange }: RoutineChecklistProps) {
  const byId = new Map(products.map((p) => [p.id, p]));

  const isUsed = (id: number, slot: TimeOfDay) =>
    uses.some((u) => u.product_id === id && u.time_of_day === slot);

  function toggle(id: number, slot: TimeOfDay) {
    onChange(
      isUsed(id, slot)
        ? uses.filter((u) => !(u.product_id === id && u.time_of_day === slot))
        : [...uses, { product_id: id, time_of_day: slot }],
    );
  }

  return (
    <>
      {SLOTS.map(({ slot, title, when }) => {
        // Planned first (routine order), then extras in the order they were added.
        const extras = uses.filter((u) => u.time_of_day === slot).map((u) => u.product_id);
        const shown = [...new Set([...planned[slot], ...extras])]
          .map((id) => byId.get(id))
          .filter((p): p is Product => p !== undefined);
        const listed = new Set(shown.map((p) => p.id));
        const addable = products.filter((p) => !p.is_retired && !listed.has(p.id));

        return (
          <div key={slot} role="group" aria-label={title} style={{ marginTop: 12 }}>
            <h3 className="section-h">{title}</h3>
            {shown.length > 0 ? (
              <div className="tiles">
                {shown.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="tile"
                    aria-pressed={isUsed(p.id, slot)}
                    onClick={() => toggle(p.id, slot)}
                  >
                    <span className="img">
                      <ProductThumb product={p} />
                    </span>
                    <span className="check">
                      <CheckIcon />
                    </span>
                    <span>
                      {p.brand && (
                        <>
                          <span className="brand" style={{ fontSize: 10 }}>
                            {p.brand}
                          </span>
                          <br />
                        </>
                      )}
                      <span className="name">{p.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Nothing planned.
              </p>
            )}
            {addable.length > 0 && (
              <select
                aria-label={`Add a product used ${when}`}
                value=""
                style={{ marginTop: 8 }}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  if (id) onChange([...uses, { product_id: id, time_of_day: slot }]);
                }}
              >
                <option value="">Add a product used today…</option>
                {addable.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </>
  );
}
