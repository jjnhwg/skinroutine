import { useMemo, useRef, useState } from "react";
import { Avatar } from "../components/Avatar";
import { CatalogSheet } from "../components/CatalogSheet";
import { BottleIcon, CameraIcon, ChevronRightIcon, PencilIcon } from "../components/Icons";
import { useToast } from "../components/Toast";
import { CATALOG, productArt } from "../lib/catalog";
import { SLOT_LABELS } from "../lib/constants";
import { LONG_DATE, daysBetween, prettyDate, todayStr } from "../lib/dates";
import { computeInsights, insightCopy } from "../lib/domain";
import { PRODUCT_IMAGE_MAX, resizeImage } from "../lib/image";
import { loadProductPhoto } from "../lib/productPhoto";
import { uid } from "../lib/storage";
import { useStore } from "../store";
import type { CatalogItem, Insight, Product, Slot } from "../types";

/** The four bottles shown stacked on the "choose from popular" button. */
const TEASER_INDEXES = [9, 0, 20, 24];

export function ProductsScreen() {
  const { products, logs, commit } = useStore();
  const toast = useToast();
  const today = todayStr();

  const [addOpen, setAddOpen] = useState(products.length === 0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [slot, setSlot] = useState<Slot>("BOTH");
  const [startedOn, setStartedOn] = useState(today);
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const startRef = useRef<HTMLInputElement>(null);
  // The catalog item whose photo is still downloading; cleared when the user
  // picks their own image, so a late download can't overwrite it.
  const photoFor = useRef<CatalogItem | null>(null);

  const insights = useMemo(() => {
    const list = computeInsights(products, logs);
    return Object.fromEntries(list.map((i) => [i.productId, i])) as Record<string, Insight>;
  }, [products, logs]);

  const active = useMemo(
    () =>
      products.filter((p) => !p.stoppedOn).sort((a, b) => b.startedOn.localeCompare(a.startedOn)),
    [products],
  );
  const stopped = useMemo(
    () =>
      products
        .filter((p) => p.stoppedOn)
        .sort((a, b) => (b.stoppedOn as string).localeCompare(a.stoppedOn as string)),
    [products],
  );

  function resetForm() {
    setBrand("");
    setName("");
    setSlot("BOTH");
    setStartedOn(today);
    setNotes("");
    setImage(null);
    photoFor.current = null;
  }

  function addProduct(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const product: Product = {
      id: uid(),
      brand: brand.trim(),
      name: trimmed,
      slot,
      image,
      startedOn: startedOn || today,
      stoppedOn: null,
      notes: notes.trim(),
    };
    if (!commit((c) => ({ ...c, products: [...c.products, product] }))) return;
    resetForm();
    toast(`Added ${trimmed}`);
  }

  async function pickFromCatalog(item: CatalogItem) {
    setSheetOpen(false);
    setImage(productArt(item)); // shown until the real photo arrives
    setBrand(item.brand);
    setName(item.name);
    setSlot(item.slot);
    toast("Pick when you started, then tap Add");
    requestAnimationFrame(() => startRef.current?.focus());

    photoFor.current = item;
    let photo: string | null = null;
    try {
      photo = await loadProductPhoto(item);
    } catch {
      // Offline or the shop said no: the drawn bottle stays.
    }
    if (photo && photoFor.current === item) setImage(photo);
    if (photoFor.current === item) photoFor.current = null;
  }

  async function onNewImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Only images can be added.");
      return;
    }
    photoFor.current = null;
    try {
      setImage(await resizeImage(file, PRODUCT_IMAGE_MAX, "crop"));
    } catch {
      toast("Couldn't read that image.");
    }
  }

  async function changeProductImage(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Only images can be added.");
      return;
    }
    let next: string;
    try {
      next = await resizeImage(file, PRODUCT_IMAGE_MAX, "crop");
    } catch {
      toast("Couldn't read that image.");
      return;
    }
    if (
      commit((c) => ({
        ...c,
        products: c.products.map((p) => (p.id === id ? { ...p, image: next } : p)),
      }))
    ) {
      toast("Photo updated");
    }
  }

  function stopUsing(product: Product) {
    const stopDate = today < product.startedOn ? product.startedOn : today;
    if (
      commit((c) => ({
        ...c,
        products: c.products.map((p) => (p.id === product.id ? { ...p, stoppedOn: stopDate } : p)),
      }))
    ) {
      toast(`Stopped ${product.name}`);
    }
  }

  function deleteProduct(id: string) {
    if (commit((c) => ({ ...c, products: c.products.filter((p) => p.id !== id) }))) {
      setPendingDelete(null);
      toast("Product deleted");
    }
  }

  const nameOf = (id: string) => products.find((p) => p.id === id)?.name ?? "";

  function productRow(p: Product) {
    const ins = insights[p.id];
    const copy = insightCopy(p, ins);
    const confirming = pendingDelete === p.id;
    return (
      <div className="product" key={p.id}>
        <div className="head">
          <label className="avatar-btn" title="Change photo">
            <Avatar product={p} size="lg" />
            <span className="edit">
              <PencilIcon />
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label={`Change photo for ${p.name}`}
              onChange={(e) => changeProductImage(p.id, e)}
            />
          </label>
          <div className="grow">
            {p.brand && <div className="brand">{p.brand}</div>}
            <h3>{p.name}</h3>
            <div className="muted">
              {SLOT_LABELS[p.slot]} ·{" "}
              {p.stoppedOn
                ? `${prettyDate(p.startedOn, LONG_DATE)} – ${prettyDate(p.stoppedOn, LONG_DATE)}`
                : `Day ${daysBetween(p.startedOn, today) + 1} · since ${prettyDate(
                    p.startedOn,
                    LONG_DATE,
                  )}`}
            </div>
            {p.notes && <div style={{ fontSize: 14, marginTop: 2 }}>{p.notes}</div>}
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <b>{ins.entriesSinceStart}</b>
            <span>entries</span>
          </div>
          <div className="stat">
            <b>{ins.roughDays}</b>
            <span>rough days</span>
          </div>
          <div className="stat">
            <b>{ins.avgBeforeStart?.toFixed(1) ?? "–"}</b>
            <span>avg before</span>
          </div>
          <div className="stat">
            <b>{ins.avgSinceStart?.toFixed(1) ?? "–"}</b>
            <span>avg since</span>
          </div>
        </div>

        <div className="insight">
          {copy.lead && (
            <span className={copy.verdict === "helps" ? "good" : "bad"}>{copy.lead} </span>
          )}
          {copy.text}
        </div>

        {ins.overlappingProductIds.length > 0 && (
          <div className="warn" role="note">
            ⚠ You started {ins.overlappingProductIds.map(nameOf).join(", ")} within a week of{" "}
            {p.name}, so it's hard to tell which one is making the difference. Try adding one new
            product at a time.
          </div>
        )}

        <div className="row" style={{ marginTop: 12 }}>
          {!p.stoppedOn && (
            <button className="btn small" onClick={() => stopUsing(p)}>
              Stop using
            </button>
          )}
          {confirming ? (
            <>
              <button className="btn small danger" onClick={() => deleteProduct(p.id)}>
                Yes, delete
              </button>
              <button className="btn small ghost" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
            </>
          ) : (
            <button className="btn small ghost danger" onClick={() => setPendingDelete(p.id)}>
              Delete
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="page-title">Products</h2>
      <p className="page-sub">What you're testing, and how your skin has responded.</p>

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
        <form className="content" onSubmit={addProduct}>
          <button type="button" className="pick-btn" onClick={() => setSheetOpen(true)}>
            <span className="stack" aria-hidden="true">
              {TEASER_INDEXES.map((i) => (
                <img key={i} src={productArt(CATALOG[i])} alt="" />
              ))}
            </span>
            <span className="grow">
              <b style={{ display: "block", fontSize: 15 }}>Choose from popular products</b>
              <span className="muted" style={{ fontSize: 13 }}>
                {CATALOG.length}+ products, or search online
              </span>
            </span>
            <ChevronRightIcon />
          </button>

          <div className="or">or type your own</div>

          <div className="img-pick" style={{ marginTop: 12 }}>
            <label className="preview" style={{ cursor: "pointer" }}>
              {image ? <img src={image} alt="" /> : <CameraIcon />}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Product photo"
                onChange={onNewImage}
              />
            </label>
            <div className="muted" style={{ fontSize: 13 }}>
              Add a photo of the bottle so it's easy to spot in your routine.{" "}
              {image && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    photoFor.current = null;
                    setImage(null);
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <label className="field" htmlFor="pbrand">
            Brand <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="text"
            id="pbrand"
            placeholder="e.g. The Ordinary"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />

          <label className="field" htmlFor="pname">
            Name
          </label>
          <input
            type="text"
            id="pname"
            required
            placeholder="e.g. Azelaic Acid Suspension 10%"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="row">
            <div className="grow">
              <label className="field" htmlFor="pslot">
                When
              </label>
              <select
                id="pslot"
                value={slot}
                onChange={(e) => setSlot(e.target.value as Slot)}
              >
                <option value="AM">Morning</option>
                <option value="PM">Night</option>
                <option value="BOTH">Morning + night</option>
              </select>
            </div>
            <div className="grow">
              <label className="field" htmlFor="pstart">
                Started on
              </label>
              <input
                type="date"
                id="pstart"
                ref={startRef}
                value={startedOn}
                max={today}
                required
                onChange={(e) => setStartedOn(e.target.value)}
              />
            </div>
          </div>

          <label className="field" htmlFor="pnotes">
            Notes <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="text"
            id="pnotes"
            placeholder="Pea-sized amount, after toner"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <button className="btn primary" style={{ marginTop: 16, width: "100%" }}>
            Add product
          </button>
        </form>
      </details>

      <div className="card">
        <h2 className="section-h">
          Using now <span className="count">{active.length}</span>
        </h2>
        {active.length ? (
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

      {stopped.length > 0 && (
        <div className="card">
          <h2 className="section-h">
            Stopped <span className="count">{stopped.length}</span>
          </h2>
          {stopped.map(productRow)}
        </div>
      )}

      {sheetOpen && (
        <CatalogSheet onPick={pickFromCatalog} onClose={() => setSheetOpen(false)} />
      )}
    </>
  );
}
