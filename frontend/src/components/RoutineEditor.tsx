import { useEffect, useState } from "react";
import { ApiError } from "../api/http";
import { getRoutine, saveRoutine } from "../api/routine";
import type { Product, RoutineItem, Schedule, TimeOfDay, Weekday } from "../api/types";
import { WEEKDAYS } from "../lib/constants";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import { ProductThumb } from "./ProductThumb";
import { useToast } from "./Toast";

const TITLES: Record<TimeOfDay, string> = { am: "Morning", pm: "Night" };

function toggleDay(schedule: Schedule, day: Weekday): Schedule {
  // From "every day", tapping a day means "only this day".
  if (schedule.kind === "daily") return { kind: "weekdays", days: [day] };
  const days = schedule.days.includes(day)
    ? schedule.days.filter((d) => d !== day)
    : [...schedule.days, day];
  return { kind: "weekdays", days: WEEKDAYS.map((w) => w.day).filter((d) => days.includes(d)) };
}

interface SectionProps {
  timeOfDay: TimeOfDay;
  saved: RoutineItem[];
  /** Active products; the add picker offers the ones not already listed. */
  products: Product[];
  onSaved: (items: RoutineItem[]) => void;
}

function RoutineSection({ timeOfDay, saved, products, onSaved }: SectionProps) {
  const toast = useToast();
  // Starts from `saved`; the parent remounts this section (via key) when saved changes.
  const [items, setItems] = useState(saved);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const title = TITLES[timeOfDay];
  const label = title.toLowerCase();

  const listed = new Set(items.map((i) => i.product.id));
  const addable = products.filter((p) => !listed.has(p.id));
  const missingDays = items.some((i) => i.schedule.kind === "weekdays" && i.schedule.days.length === 0);

  function move(index: number, by: number) {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    setItems(next);
  }

  function setSchedule(index: number, schedule: Schedule) {
    setItems(items.map((item, i) => (i === index ? { ...item, schedule } : item)));
  }

  function add(id: string) {
    const product = products.find((p) => String(p.id) === id);
    if (product) setItems([...items, { product, schedule: { kind: "daily" } }]);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const routine = await saveRoutine(
        timeOfDay,
        items.map((i) => ({ product_id: i.product.id, schedule: i.schedule })),
      );
      onSaved(routine[timeOfDay]);
      toast(`${title} routine saved`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Couldn't save — is the server running?");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label={title} style={{ marginTop: 14 }}>
      <h3 className="section-h">{title}</h3>
      {items.length === 0 && <p className="muted">Nothing here yet.</p>}
      <ul className="routine-list">
        {items.map((item, index) => {
          const { product, schedule } = item;
          return (
            <li className="routine-row" key={product.id}>
              <div className="top">
                <ProductThumb product={product} size="xs" />
                <b>{product.name}</b>
                <button
                  type="button"
                  className="btn small ghost"
                  aria-label={`Move ${product.name} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ChevronLeftIcon size={14} />
                </button>
                <button
                  type="button"
                  className="btn small ghost"
                  aria-label={`Move ${product.name} down`}
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronRightIcon size={14} />
                </button>
                <button
                  type="button"
                  className="btn small ghost danger"
                  aria-label={`Remove ${product.name} from ${label}`}
                  onClick={() => setItems(items.filter((_, i) => i !== index))}
                >
                  ✕
                </button>
              </div>
              <div className="day-chips">
                <button
                  type="button"
                  className="toggle"
                  aria-pressed={schedule.kind === "daily"}
                  onClick={() => setSchedule(index, { kind: "daily" })}
                >
                  Every day
                </button>
                {WEEKDAYS.map(({ day, short, long }) => (
                  <button
                    key={day}
                    type="button"
                    className="toggle day-chip"
                    aria-label={long}
                    aria-pressed={schedule.kind === "weekdays" && schedule.days.includes(day)}
                    onClick={() => setSchedule(index, toggleDay(schedule, day))}
                  >
                    {short}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      {addable.length > 0 && (
        <select
          aria-label={`Add to ${label}`}
          value=""
          style={{ marginTop: 10 }}
          onChange={(e) => add(e.target.value)}
        >
          <option value="">Add a product…</option>
          {addable.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {missingDays && <div className="warn">Pick at least one day, or choose Every day.</div>}
      {error && (
        <div className="warn" role="alert">
          {error}
        </div>
      )}

      <button
        type="button"
        className="btn primary small"
        style={{ marginTop: 10 }}
        disabled={saving || missingDays}
        onClick={save}
      >
        Save {label}
      </button>
    </section>
  );
}

interface RoutineEditorProps {
  /** Active products. A new list (after an add, edit or retire) reloads the routine. */
  products: Product[];
}

/** Set the morning and night routines: order, schedule, add, remove. */
export function RoutineEditor({ products }: RoutineEditorProps) {
  const [am, setAm] = useState<RoutineItem[] | null>(null);
  const [pm, setPm] = useState<RoutineItem[] | null>(null);
  // Bumped when a list comes from the server, so that section starts fresh
  // (one counter each, so saving Morning keeps unsaved Night edits).
  const [amVersion, setAmVersion] = useState(0);
  const [pmVersion, setPmVersion] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getRoutine()
      .then((routine) => {
        if (!live) return;
        setAm(routine.am);
        setPm(routine.pm);
        setAmVersion((v) => v + 1);
        setPmVersion((v) => v + 1);
      })
      .catch(() => live && setError("Couldn't load your routine."));
    return () => {
      live = false;
    };
  }, [products]);

  if (error) return <div className="warn">{error}</div>;
  if (!am || !pm) return <p className="muted">Loading…</p>;

  return (
    <>
      <RoutineSection
        key={`am-${amVersion}`}
        timeOfDay="am"
        saved={am}
        products={products}
        onSaved={(items) => {
          setAm(items);
          setAmVersion((v) => v + 1);
        }}
      />
      <RoutineSection
        key={`pm-${pmVersion}`}
        timeOfDay="pm"
        saved={pm}
        products={products}
        onSaved={(items) => {
          setPm(items);
          setPmVersion((v) => v + 1);
        }}
      />
    </>
  );
}
