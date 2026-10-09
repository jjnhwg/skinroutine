import { useEffect, useState } from "react";
import type { Product, ProductInput } from "../api/types";
import { useProducts } from "../api/useProducts";
import { useSettings } from "../api/useSettings";
import { BottleIcon, PencilIcon } from "../components/Icons";
import { ProductForm } from "../components/ProductForm";
import type { PhotoChange } from "../components/ProductForm";
import { ProductThumb } from "../components/ProductThumb";
import { useToast } from "../components/Toast";
import { PRODUCT_TYPE_LABELS } from "../lib/constants";
import { LONG_DATE, daysBetween, prettyDate } from "../lib/dates";
import { PRODUCT_IMAGE_MAX, dataUrlToBlob, resizeImage } from "../lib/image";

export function ProductsScreen() {
  const { products, loading, error, create, update, retire, unretire, uploadPhoto, removePhoto } =
    useProducts();
  const { today } = useSettings();
  const toast = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [showRetired, setShowRetired] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const active = products.filter((p) => !p.is_retired);
  const retired = products.filter((p) => p.is_retired);

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
      </div>
    );
  }

  return (
    <>
      <h2 className="page-title">Products</h2>
      <p className="page-sub">What you use, with a photo so it's easy to spot.</p>

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
    </>
  );
}
