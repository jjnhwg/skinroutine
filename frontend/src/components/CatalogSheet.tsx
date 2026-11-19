import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon } from "./Icons";
import { searchProducts } from "../lib/api";
import { CATALOG, CATEGORIES, PASTELS, guessKind, productArt } from "../lib/catalog";
import { matchScore } from "../lib/fuzzy";
import type { CatalogItem, ProductSearchResult } from "../types";

type OnlineState = "idle" | "loading" | "done" | "error";

/** Wait this long after the last keystroke before searching online; the shops rate-limit. */
const TYPING_PAUSE_MS = 450;
/** Search online on its own from this many letters; Enter searches from 2. */
const AUTO_SEARCH_MIN = 3;

const OPEN_BEAUTY_FACTS =
  "https://world.openbeautyfacts.org/cgi/search.pl?search_terms=";

interface OpenBeautyProduct {
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
}

/**
 * Ask Open Beauty Facts directly. Only used when the backend is down: it works
 * without the server, but knows few Korean brands.
 */
async function searchOpenBeautyFacts(term: string): Promise<ProductSearchResult[]> {
  const url = `${OPEN_BEAUTY_FACTS}${encodeURIComponent(
    term,
  )}&search_simple=1&action=process&json=1&page_size=24&fields=product_name,brands,ingredients_text`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as { products?: OpenBeautyProduct[] };
  return (data.products ?? [])
    .filter((p) => p.product_name)
    .map((p) => ({
      brand: (p.brands ?? "").split(",")[0].trim(),
      name: (p.product_name as string).trim(),
      source: "openbeautyfacts.org",
      ingredients: (p.ingredients_text ?? "").trim(),
    }));
}

/** Turn search results into catalog items, shown with generated bottle art. */
function toCatalogItems(rows: ProductSearchResult[]): CatalogItem[] {
  const seen = new Set<string>();
  return rows
    .filter((p) => {
      const key = `${p.brand}|${p.name}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 24)
    .map((p, i) => {
      const [category, shape] = guessKind(p.name);
      return {
        brand: p.brand,
        name: p.name,
        category,
        shape,
        slot: category === "Sunscreen" ? ("AM" as const) : ("BOTH" as const),
        color: PASTELS[(p.brand.length + p.name.length + i) % PASTELS.length],
        label: (p.brand || p.name).split(/\s+/)[0].slice(0, 8).toUpperCase(),
        source: p.source,
        ingredients: p.ingredients || undefined,
      };
    });
}

interface CatalogSheetProps {
  onPick: (item: CatalogItem) => void;
  /** Leave the sheet to type in a product that isn't listed, starting from the search. */
  onAddOwn: (name: string) => void;
  onClose: () => void;
}

/** Bottom sheet for choosing a product from the built-in list or online. */
export function CatalogSheet({ onPick, onAddOwn, onClose }: CatalogSheetProps) {
  const [category, setCategory] = useState("All");
  const [term, setTerm] = useState("");
  const [online, setOnline] = useState<CatalogItem[]>([]);
  const [onlineState, setOnlineState] = useState<OnlineState>("idle");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Bumped on every search, so an answer that arrives after a newer one started is dropped.
  const searchId = useRef(0);
  const lastQuery = useRef("");

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
    const inCategory = CATALOG.filter((it) => category === "All" || it.category === category);
    const t = term.trim();
    if (!t) return inCategory;
    // Closest first; sort is stable, so equal scores keep the list's order.
    return inCategory
      .map((it) => ({ it, score: matchScore(t, it.brand, it.name) }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((m) => m.it);
  }, [category, term]);

  async function searchOnline(query: string) {
    if (query === lastQuery.current) return;
    lastQuery.current = query;
    const id = ++searchId.current;
    setOnlineState("loading");
    try {
      let rows: ProductSearchResult[];
      try {
        rows = await searchProducts(query);
      } catch {
        rows = await searchOpenBeautyFacts(query);
      }
      if (id !== searchId.current) return;
      setOnline(toCatalogItems(rows));
      setOnlineState("done");
    } catch {
      if (id === searchId.current) setOnlineState("error");
    }
  }

  // Search online once typing pauses, so similar products show up without a tap.
  useEffect(() => {
    const query = term.trim();
    if (query.length < AUTO_SEARCH_MIN) return;
    const timer = setTimeout(() => searchOnline(query), TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
    // searchOnline only touches refs and state setters.
  }, [term]);

  function changeTerm(value: string) {
    setTerm(value);
    if (value.trim() === lastQuery.current) return;
    // Forget the old search: its results no longer fit what's typed.
    searchId.current++;
    lastQuery.current = "";
    setOnlineState(value.trim().length >= AUTO_SEARCH_MIN ? "loading" : "idle");
  }

  function retry() {
    lastQuery.current = "";
    searchOnline(term.trim());
  }

  const canSearch = term.trim().length >= 2;

  const addOwn = (label: string) => (
    <button type="button" className="link-btn" onClick={() => onAddOwn(term.trim())}>
      {label} {term.trim() && `“${term.trim()}”`} yourself
    </button>
  );

  const item = (it: CatalogItem, key: string) => (
    <button key={key} type="button" className="cat-item" onClick={() => onPick(it)}>
      <img
        src={productArt(it)}
        alt=""
        loading="lazy"
      />
      <span>
        <span className="brand">{it.brand}</span>
        <br />
        <span className="n">{it.name}</span>
        {it.source && (
          <>
            <br />
            <span className="src">{it.source}</span>
          </>
        )}
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
              onChange={(e) => changeTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSearch) searchOnline(term.trim());
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
              {term.trim().length >= AUTO_SEARCH_MIN
                ? "Looking online below."
                : "Keep typing to search online."}
            </div>
          )}

          {onlineState === "loading" && <div className="online">Searching online…</div>}
          {onlineState === "error" && (
            <div className="online">
              Couldn't reach the online database. Check your connection and try again.
              <br />
              <button type="button" className="btn small" style={{ marginTop: 8 }} onClick={retry}>
                Try again
              </button>
              <br />
              {addOwn("Or add")}
            </div>
          )}
          {onlineState === "done" && (
            <>
              <h3 className="section-h" style={{ margin: "22px 0 10px" }}>
                Found online
              </h3>
              {online.length ? (
                <>
                  <div className="catalog">{online.map((it, i) => item(it, `o${i}`))}</div>
                  <div className="online">
                    Not the right one?
                    <br />
                    {addOwn("Add")}
                  </div>
                </>
              ) : (
                <div className="online">
                  Nothing found online either.
                  <br />
                  <button
                    type="button"
                    className="btn small"
                    style={{ marginTop: 8 }}
                    onClick={() => onAddOwn(term.trim())}
                  >
                    Add {term.trim() && `“${term.trim()}”`} yourself
                  </button>
                </div>
              )}
            </>
          )}
          {onlineState === "idle" && (
            <div className="online">
              {canSearch && term.trim().length < AUTO_SEARCH_MIN ? (
                <>
                  Can't find it?
                  <br />
                  <button
                    type="button"
                    className="btn small"
                    style={{ marginTop: 8 }}
                    onClick={() => searchOnline(term.trim())}
                  >
                    Search “{term.trim()}” online
                  </button>
                </>
              ) : (
                <div className="muted" style={{ fontSize: 12 }}>
                  Type {AUTO_SEARCH_MIN}+ letters to also search Open Beauty Facts and K-beauty
                  shops.
                </div>
              )}
              {term.trim() && <div style={{ marginTop: 4 }}>{addOwn("Or add")}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
