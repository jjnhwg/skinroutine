// Typo-tolerant product matching. Mirrors _score in backend/skinlog/product_search.py,
// so the built-in list and the online results agree on what counts as a match.

/** Lowercase and drop everything but letters and digits: "Dr.Jart+" -> "drjart". */
function squash(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** How many typos turn a into b: a letter added, dropped, changed, or two swapped. */
function edits(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i * j === 0 ? i + j : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** 1 for an exact or partial hit, less for a typo, 0 for no match. */
function wordScore(word: string, haystack: string, tokens: string[]): number {
  if (haystack.includes(word)) return 1;
  const allowed = word.length < 4 ? 0 : word.length <= 6 ? 1 : 2;
  let best = allowed + 1;
  for (const t of tokens) {
    best = Math.min(best, edits(word, t), edits(word, t.slice(0, word.length)));
  }
  return best > allowed ? 0 : 0.9 - 0.2 * (best - 1);
}

/**
 * How closely a product matches the query, 0 to 1; 0 means leave it out.
 * Every typed word has to fit, allowing a typo or two in longer words.
 */
export function matchScore(query: string, brand: string, name: string): number {
  const words = query.split(/\s+/).map(squash).filter(Boolean);
  if (!words.length) return 0;
  const text = `${brand} ${name}`;
  const haystack = squash(text);
  const tokens = text.split(/[\s\-/]+/).map(squash).filter(Boolean);
  let total = 0;
  for (const w of words) {
    const s = wordScore(w, haystack, tokens);
    if (!s) return 0;
    total += s;
  }
  return total / words.length;
}
