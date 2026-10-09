import { useEffect, useRef, useState } from "react";
import { ApiError } from "../api/http";
import type { Product, ProductInput, ProductType } from "../api/types";
import { CATALOG, productArt } from "../lib/catalog";
import { CATEGORY_TYPES, PRODUCT_TYPE_LABELS, PRODUCT_TYPES } from "../lib/constants";
import { PRODUCT_IMAGE_MAX, resizeImage } from "../lib/image";
import { loadProductPhoto } from "../lib/productPhoto";
import type { CatalogItem } from "../types";
import { CatalogSheet } from "./CatalogSheet";
import { CameraIcon, ChevronRightIcon } from "./Icons";
import { useToast } from "./Toast";

/** The four bottles shown stacked on the "choose from popular" button. */
const TEASER_INDEXES = [9, 0, 20, 24];

/** What to do with the photo once the product itself is saved. */
export type PhotoChange = { kind: "keep" } | { kind: "set"; dataUrl: string } | { kind: "remove" };

interface ProductFormProps {
  /** The product being edited; omit to add a new one. */
  initial?: Product;
  today: string;
  submitLabel: string;
  /** Rejects with ApiError to show its detail; resolves once saved. */
  onSubmit: (input: ProductInput, photo: PhotoChange) => Promise<void>;
  onCancel?: () => void;
}

/** Add or edit a product: catalog picker (add only), photo, brand, name, type, start date. */
export function ProductForm({ initial, today, submitLabel, onSubmit, onCancel }: ProductFormProps) {
  const toast = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<ProductType>(initial?.type ?? "other");
  const [startedOn, setStartedOn] = useState(initial?.started_on ?? today);
  const [image, setImage] = useState<string | null>(initial?.photo_url ?? null);
  const [imageChanged, setImageChanged] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const startRef = useRef<HTMLInputElement>(null);
  const brandRef = useRef<HTMLInputElement>(null);
  // The catalog item whose photo is still downloading; cleared when the user
  // picks their own image, so a late download can't overwrite it.
  const photoFor = useRef<CatalogItem | null>(null);

  function setPhoto(next: string | null) {
    setImage(next);
    setImageChanged(true);
  }

  function reset() {
    setBrand("");
    setName("");
    setType("other");
    setStartedOn(today);
    setImage(null);
    setImageChanged(false);
    photoFor.current = null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    let photo: PhotoChange = { kind: "keep" };
    if (imageChanged) photo = image ? { kind: "set", dataUrl: image } : { kind: "remove" };

    setSaving(true);
    setError("");
    try {
      await onSubmit(
        { name: trimmed, brand: brand.trim(), type, started_on: startedOn || today },
        photo,
      );
      if (!initial) reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Couldn't save — is the server running?");
    } finally {
      setSaving(false);
    }
  }

  async function pickFromCatalog(item: CatalogItem) {
    setSheetOpen(false);
    setPhoto(productArt(item)); // shown until the real photo arrives
    setBrand(item.brand);
    setName(item.name);
    setType(CATEGORY_TYPES[item.category] ?? "other");
    toast(`Pick when you started, then tap ${submitLabel}`);
    requestAnimationFrame(() => startRef.current?.focus());

    photoFor.current = item;
    let photo: string | null = null;
    try {
      photo = await loadProductPhoto(item);
    } catch {
      // Offline or the shop said no: the drawn bottle stays.
    }
    if (photo && photoFor.current === item) setPhoto(photo);
    if (photoFor.current === item) photoFor.current = null;
  }

  /** Came from the picker with a product it didn't have: start the form from the search. */
  function addOwnFromCatalog(typed: string) {
    setSheetOpen(false);
    photoFor.current = null;
    setPhoto(null);
    setBrand("");
    setName(typed);
    setType("other");
    toast(`Add the brand and a photo if you like, then tap ${submitLabel}`);
    requestAnimationFrame(() => brandRef.current?.focus());
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
      setPhoto(await resizeImage(file, PRODUCT_IMAGE_MAX, "crop"));
    } catch {
      toast("Couldn't read that image.");
    }
  }

  useEffect(() => {
    if (sheetOpen) return;
    async function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find(
        (i) => i.kind === "file" && i.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (!file) return;
      e.preventDefault();
      photoFor.current = null;
      try {
        setImage(await resizeImage(file, PRODUCT_IMAGE_MAX, "pad"));
        setImageChanged(true);
        toast("Photo pasted");
      } catch {
        toast("Couldn't read that image.");
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [sheetOpen, toast]);

  const idPrefix = initial ? `p${initial.id}` : "pnew";

  return (
    <form className="content" onSubmit={submit}>
      {!initial && (
        <>
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
        </>
      )}

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
          Add a photo of the bottle so it's easy to spot in your routine, or copy one from the web
          and paste it here (⌘V).{" "}
          {image && (
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                photoFor.current = null;
                setPhoto(null);
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <label className="field" htmlFor={`${idPrefix}-brand`}>
        Brand <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
      </label>
      <input
        type="text"
        id={`${idPrefix}-brand`}
        ref={brandRef}
        placeholder="e.g. The Ordinary"
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
      />

      <label className="field" htmlFor={`${idPrefix}-name`}>
        Name
      </label>
      <input
        type="text"
        id={`${idPrefix}-name`}
        required
        placeholder="e.g. Azelaic Acid Suspension 10%"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="row">
        <div className="grow">
          <label className="field" htmlFor={`${idPrefix}-type`}>
            Type
          </label>
          <select
            id={`${idPrefix}-type`}
            value={type}
            onChange={(e) => setType(e.target.value as ProductType)}
          >
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>
                {PRODUCT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="grow">
          <label className="field" htmlFor={`${idPrefix}-start`}>
            Started on
          </label>
          <input
            type="date"
            id={`${idPrefix}-start`}
            ref={startRef}
            value={startedOn}
            max={today}
            required
            onChange={(e) => setStartedOn(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="warn" role="alert">
          {error}
        </div>
      )}

      <div className="row" style={{ marginTop: 16 }}>
        <button type="submit" className="btn primary grow" disabled={saving}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>

      {sheetOpen && (
        <CatalogSheet
          onPick={pickFromCatalog}
          onAddOwn={addOwnFromCatalog}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </form>
  );
}
