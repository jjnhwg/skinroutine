import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/http";
import { listTrials, startTrial } from "../api/trials";
import type { Product, ProductInput, Trial } from "../api/types";
import { useProducts } from "../api/useProducts";
import { useSettings } from "../api/useSettings";
import { BottleIcon, PencilIcon } from "../components/Icons";
import { ProductForm } from "../components/ProductForm";
import type { PhotoChange } from "../components/ProductForm";
import { ProductThumb } from "../components/ProductThumb";
import { RoutineEditor } from "../components/RoutineEditor";
import { useToast } from "../components/useToast";
import { TrialVerdict } from "../components/TrialVerdict";
import { PRODUCT_TYPE_LABELS } from "../lib/constants";
import { LONG_DATE, daysBetween, prettyDate } from "../lib/dates";
import { PRODUCT_IMAGE_MAX, dataUrlToBlob, resizeImage } from "../lib/image";

export function ProductsScreen() {
  const {
    products,
    loading,
    error,
    reload,
    create,
    update,
    retire,
    unretire,
    uploadPhoto,
    removePhoto,
  } = useProducts();
  const { today } = useSettings();
  const toast = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [showRetired, setShowRetired] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [startingId, setStartingId] = useState<number | null>(null);
  const [trialLength, setTrialLength] = useState("21");
  const [trialStart, setTrialStart] = useState(today);
  const [trialWarning, setTrialWarning] = useState("");
  const [viewing, setViewing] = useState<Trial | null>(null);

  // Memoised: the routine editor reloads whenever this list changes.
  const active = useMemo(() => products.filter((p) => !p.is_retired), [products]);
  const retired = products.filter((p) => p.is_retired);

  // Trials change whenever products do (starting one, retiring a product ends one).
  useEffect(() => {
    let live = true;
    listTrials()
      .then((loaded) => live && setTrials(loaded))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [products]);

  const activeTrials = trials.filter((t) => t.status === "active");
  /** The product's most recent trial (a running one is always the most recent). */
  const trialOf = (p: Product): Trial | undefined =>
    trials
      .filter((t) => t.product.id === p.id)
      .sort((a, b) => b.start_date.localeCompare(a.start_date))[0];

  function openTrialForm(p: Product) {
    setStartingId(p.id);
    setTrialLength("21");
    setTrialStart(today);
  }

  async function beginTrial(e: React.FormEvent, p: Product) {
    e.preventDefault();
    const others = activeTrials.map((t) => t.product.name);
    if (
      others.length > 0 &&
      !confirm(
        `You're already testing ${others.join(", ")}. Starting ${p.name} now means both ` +
          "verdicts will be marked overlapping, so it's harder to tell which made the difference. " +
          "Start anyway?",
      )
    ) {
      return;
    }
    try {
      const started = await startTrial({
        product_id: p.id,
        start_date: trialStart || today,
        length_days: Number(trialLength),
      });
      setStartingId(null);
      setTrialWarning(started.warning?.message ?? "");
      toast(`Started a ${started.trial.length_days}-day trial of ${p.name}`);
      await reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "Couldn't start the trial.");
    }
  }

  // A new user lands on the add form instead of an empty list.
  useEffect(() => {
    if (!loading && !error && products.length === 0) setAddOpen(true);
  }, [loading, error, products.length]);

  /** Apply a photo change once the product exists; the product itself is already saved. */
  async function applyPhoto(id: number, photo: PhotoChange) {
    try {
      if (photo.kind === "set") await uploadPhoto(id, dataUrlToBlob(photo.dataUrl));
      if (photo.kind === "remove") await removePhoto(id);
    } catch {
      toast("Saved, but the photo didn't upload.");
    }
  }

  async function addProduct(input: ProductInput, photo: PhotoChange) {
    const created = await create(input);
    await applyPhoto(created.id, photo);
    toast(`Added ${created.name}`);
  }

  async function editProduct(id: number, input: ProductInput, photo: PhotoChange) {
    await update(id, input);
    await applyPhoto(id, photo);
    setEditingId(null);
    toast("Product updated");
  }

  async function changePhoto(p: Product, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Only images can be added.");
      return;
    }
    try {
      const resized = await resizeImage(file, PRODUCT_IMAGE_MAX, "crop");
      await uploadPhoto(p.id, dataUrlToBlob(resized));
      toast("Photo updated");
    } catch {
      toast("Couldn't update the photo.");
    }
  }

  async function retireOne(p: Product) {
    if (!confirm(`Retire ${p.name}? It leaves your routine but stays in your history.`)) return;
    try {
      await retire(p.id);
      toast(`Retired ${p.name}`);
    } catch {
      toast(`Couldn't retire ${p.name}.`);
    }
  }

  async function unretireOne(p: Product) {
    if (!confirm(`Start using ${p.name} again?`)) return;
    try {
      await unretire(p.id);
      toast(`${p.name} is back`);
    } catch {
      toast(`Couldn't bring back ${p.name}.`);
    }
  }

  function productRow(p: Product) {
    if (editingId === p.id) {
      return (
        <div className="product" key={p.id}>
          <ProductForm
            initial={p}
            today={today}
            submitLabel="Save changes"
            onSubmit={(input, photo) => editProduct(p.id, input, photo)}
            onCancel={() => setEditingId(null)}
          />
        </div>
      );
    }
    const lastTrial = trialOf(p);
    const running = lastTrial?.status === "active" ? lastTrial : null;
    return (
      <div className="product" key={p.id}>
        <div className="head">
          <label className="avatar-btn" title="Change photo">
            <ProductThumb product={p} size="lg" />
            <span className="edit">
              <PencilIcon />
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label={`Change photo for ${p.name}`}
              onChange={(e) => changePhoto(p, e)}
            />
          </label>
          <div className="grow">
            {p.brand && <div className="brand">{p.brand}</div>}
            <h3>{p.name}</h3>
            {running && (
              <span className="chip" style={{ marginBottom: 4 }}>
                Trial · day {running.day_number} of {running.length_days}
              </span>
            )}
            <div className="muted">
              {PRODUCT_TYPE_LABELS[p.type]} ·{" "}
              {p.retired_on
                ? `${prettyDate(p.started_on, LONG_DATE)} – ${prettyDate(p.retired_on, LONG_DATE)}`
                : `Day ${daysBetween(p.started_on, today) + 1} · since ${prettyDate(
                    p.started_on,
                    LONG_DATE,
                  )}`}
            </div>
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn small" onClick={() => setEditingId(p.id)}>
            Edit
          </button>
          {!p.is_retired && p.active_trial_id === null && (
            <button
              className="btn small ghost"
              aria-label={`Start a trial of ${p.name}`}
              onClick={() => openTrialForm(p)}
            >
              Start trial
            </button>
          )}
          {lastTrial && (
            <button
              className="btn small ghost"
              aria-label={`See the ${p.name} trial`}
              onClick={() => setViewing(lastTrial)}
            >
              Trial verdict
            </button>
          )}
          {p.is_retired ? (
            <button
              className="btn small ghost"
              aria-label={`Use ${p.name} again`}
              onClick={() => unretireOne(p)}
            >
              Use again
            </button>
          ) : (
            <button
              className="btn small ghost"
              aria-label={`Retire ${p.name}`}
              onClick={() => retireOne(p)}
            >
              Retire
            </button>
          )}
        </div>

        {startingId === p.id && (
          <form className="trial-form" onSubmit={(e) => beginTrial(e, p)}>
            <div>
              <label className="field" htmlFor={`trial-len-${p.id}`}>
                Trial length (days)
              </label>
              <input
                type="number"
                id={`trial-len-${p.id}`}
                min={1}
                max={90}
                required
                value={trialLength}
                onChange={(e) => setTrialLength(e.target.value)}
              />
            </div>
            <div>
              <label className="field" htmlFor={`trial-start-${p.id}`}>
                Start date
              </label>
              <input
                type="date"
                id={`trial-start-${p.id}`}
                max={today}
                required
                value={trialStart}
                onChange={(e) => setTrialStart(e.target.value)}
              />
            </div>
            <button type="submit" className="btn primary small">
              Start trial
            </button>
            <button type="button" className="btn ghost small" onClick={() => setStartingId(null)}>
              Cancel
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <>
      <h2 className="page-title">Products</h2>
      <p className="page-sub">Your routine, and everything in it.</p>

      {!loading && !error && active.length > 0 && (
        <div className="card">
          <h2>Your routine</h2>
          <p className="muted" style={{ margin: 0 }}>
            Each day's log starts with these ticked. Set a schedule for anything you don't use
            daily.
          </p>
          <RoutineEditor products={active} />
        </div>
      )}

      <details
        className="card add"
        open={addOpen}
        onToggle={(e) => setAddOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary>
          <span className="plus" aria-hidden="true">
            +
          </span>
          Add a product
        </summary>
        {addOpen && <ProductForm today={today} submitLabel="Add product" onSubmit={addProduct} />}
      </details>

      {error && (
        <div className="warn" role="alert">
          {error}
        </div>
      )}
      {trialWarning && (
        <div className="warn" role="status" aria-label="Trial warning">
          ⚠ {trialWarning}{" "}
          <button type="button" className="link-btn" onClick={() => setTrialWarning("")}>
            Dismiss
          </button>
        </div>
      )}

      <div className="card">
        <h2 className="section-h">
          Using now <span className="count">{active.length}</span>
        </h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : active.length ? (
          active.map(productRow)
        ) : (
          <div className="empty">
            <div className="em-ic">
              <BottleIcon />
            </div>
            <strong>No active products</strong>
            Add what you're using so each day's routine fills in automatically.
          </div>
        )}
      </div>

      {retired.length > 0 && (
        <div className="card">
          <button
            type="button"
            className="toggle"
            aria-pressed={showRetired}
            onClick={() => setShowRetired((v) => !v)}
          >
            Show retired ({retired.length})
          </button>
          {showRetired && <div style={{ marginTop: 14 }}>{retired.map(productRow)}</div>}
        </div>
      )}

      {viewing && (
        <TrialVerdict
          trial={viewing}
          onClose={() => setViewing(null)}
          onEnded={() => {
            setViewing(null);
            void reload();
          }}
        />
      )}
    </>
  );
}
