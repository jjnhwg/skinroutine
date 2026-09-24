import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon } from "./Icons";
import { CATALOG, CATEGORIES, PASTELS, guessKind, productArt } from "../lib/catalog";
import type { CatalogItem } from "../types";

type OnlineState = "idle" | "loading" | "done" | "error";

const OPEN_BEAUTY_FACTS =
  "https://world.openbeautyfacts.org/cgi/search.pl?search_terms=";

interface OpenBeautyProduct {
  product_name?: string;
  brands?: string;
}

/** Turn Open Beauty Facts rows into catalog items with generated art. */
function toCatalogItems(rows: OpenBeautyProduct[]): CatalogItem[] {
  const seen = new Set<string>();
  return rows
    .filter((p) => p.product_name)
    .map((p) => ({
      brand: (p.brands ?? "").split(",")[0].trim(),
      name: (p.product_name as string).trim(),
    }))
    .filter((p) => {
      const key = `${p.brand}|${p.name}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 18)
    .map((p, i) => {
      const [category, shape] = guessKind(p.name);
      return {
        ...p,
        category,
        shape,
        slot: category === "Sunscreen" ? ("AM" as const) : ("BOTH" as const),
        color: PASTELS[(p.brand.length + p.name.length + i) % PASTELS.length],
        label: (p.brand || p.name).split(/\s+/)[0].slice(0, 8).toUpperCase(),
      };
    });
}

interface CatalogSheetProps {
  onPick: (item: CatalogItem) => void;
  onClose: () => void;
}

/** Bottom sheet for choosing a product from the built-in list or online. */
export function CatalogSheet({ onPick, onClose }: CatalogSheetProps) {
  const [category, setCategory] = useState("All");
  const [term, setTerm] = useState("");
  const [online, setOnline] = useState<CatalogItem[]>([]);
  const [onlineState, setOnlineState] = useState<OnlineState>("idle");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "Tab") {
        const focusable = [
          ...(wrapRef.current?.querySelectorAll<HTMLElement>(
            "button:not([disabled]), input",
          ) ?? []),
        ];
        if (!focusable.length) return;
        const at = focusable.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        focusable[(at + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const matches = useMemo(() => {
    const t = term.trim().toLowerCase();
    return CATALOG.filter(
      (it) =>
        (category === "All" || it.category === category) &&
        (!t || `${it.brand} ${it.name}`.toLowerCase().includes(t)),
    );
  }, [category, term]);

  async function searchOnline() {
    setOnlineState("loading");
    try {
      const url = `${OPEN_BEAUTY_FACTS}${encodeURIComponent(
        term.trim(),
      )}&search_simple=1&action=process&json=1&page_size=24&fields=product_name,brands`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { products?: OpenBeautyProduct[] };
      setOnline(toCatalogItems(data.products ?? []));
      setOnlineState("done");
    } catch {
      setOnlineState("error");
    }
  }

  const canSearch = term.trim().length >= 2;

  const item = (it: CatalogItem, key: string) => (
    <button key={key} type="button" className="cat-item" onClick={() => onPick(it)}>
      <img src={productArt(it)} alt="" />
      <span>
        <span className="brand">{it.brand}</span>
        <br />
        <span className="n">{it.name}</span>
      </span>
    </button>
  );

  return (
    <div
      className="sheet-backdrop"
      ref={wrapRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="sheet-head">
          <div className="grab" aria-hidden="true" />
          <div className="title-row">
            <h2 id="sheet-title">Choose a product</h2>
            <button type="button" className="close-x" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="search">
            <SearchIcon />
            <label className="sr-only" htmlFor="cat-search">
              Search products
            </label>
            <input
              type="text"
              id="cat-search"
              placeholder="Search brand or product"
              autoComplete="off"
              ref={inputRef}
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                if (onlineState !== "loading") setOnlineState("idle");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && term.trim().length >= 2) searchOnline();
              }}
            />
          </div>
          <div className="cats" role="group" aria-label="Category">
            {["All", ...CATEGORIES].map((c) => (
              <button
                key={c}
                type="button"
                className="toggle"
                aria-pressed={c === category}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="sheet-body">
          {matches.length ? (
            <div className="catalog">{matches.map((it) => item(it, it.id as string))}</div>
          ) : (
            <div className="empty" style={{ paddingTop: 8 }}>
              <strong>No match in the list</strong>
              Try searching online below.
            </div>
          )}

          {onlineState === "loading" && <div className="online">Searching online…</div>}
          {onlineState === "error" && (
            <div className="online">
              Couldn't reach the online database. Check your connection and try again.
            </div>
          )}
          {onlineState === "done" && (
            <>
              <h3 className="section-h" style={{ margin: "22px 0 10px" }}>
                From Open Beauty Facts
              </h3>
              {online.length ? (
                <div className="catalog">{online.map((it, i) => item(it, `o${i}`))}</div>
              ) : (
                <div className="online">
                  Nothing found online either. Close this and type it in yourself.
                </div>
              )}
            </>
          )}
          {onlineState !== "loading" && onlineState !== "done" && (
            <div className="online">
              Can't find it?
              <br />
              <button
                type="button"
                className="btn small"
                style={{ marginTop: 8 }}
                disabled={!canSearch}
                onClick={searchOnline}
              >
                Search {term.trim() && `“${term.trim()}”`} online
              </button>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {canSearch
                  ? "Uses the free Open Beauty Facts database."
                  : "Type a name above first."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
