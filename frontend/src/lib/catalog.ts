import type { CatalogItem, ProductShape, Slot } from "../types";

export const CATEGORIES = ["Cleanser", "Toner", "Serum", "Moisturizer", "Sunscreen", "Treatment"];

type CatalogRow = [string, string, string, ProductShape, string, Slot, string];

// [brand, name, category, shape, color, slot, label]
const ROWS: CatalogRow[] = [
  ["CeraVe", "Hydrating Facial Cleanser", "Cleanser", "pump", "#bcd8ef", "BOTH", "CeraVe"],
  ["CeraVe", "Foaming Facial Cleanser", "Cleanser", "pump", "#a9cbe8", "BOTH", "CeraVe"],
  ["CeraVe", "Moisturizing Cream", "Moisturizer", "jar", "#c7dcf0", "BOTH", "CeraVe"],
  ["CeraVe", "PM Facial Moisturizing Lotion", "Moisturizer", "pump", "#b6c9e6", "PM", "PM"],
  ["CeraVe", "AM Facial Moisturizing Lotion SPF 30", "Sunscreen", "pump", "#f2d9a8", "AM", "AM"],
  ["La Roche-Posay", "Toleriane Hydrating Gentle Cleanser", "Cleanser", "tube", "#d7e6f2", "BOTH", "LRP"],
  ["La Roche-Posay", "Effaclar Duo", "Treatment", "tube", "#c6d8ec", "PM", "LRP"],
  ["La Roche-Posay", "Anthelios Melt-in Milk SPF 60", "Sunscreen", "tube", "#f4c98f", "AM", "SPF 60"],
  ["La Roche-Posay", "Cicaplast Baume B5", "Moisturizer", "tube", "#dfe4ee", "PM", "B5"],
  ["The Ordinary", "Niacinamide 10% + Zinc 1%", "Serum", "dropper", "#e8e4dc", "BOTH", "NIA"],
  ["The Ordinary", "Hyaluronic Acid 2% + B5", "Serum", "dropper", "#dfe7ee", "BOTH", "HA"],
  ["The Ordinary", "Azelaic Acid Suspension 10%", "Treatment", "tube", "#ece6dc", "PM", "AZA"],
  ["The Ordinary", "Glycolic Acid 7% Toning Solution", "Toner", "tall", "#f0dcd4", "PM", "AHA"],
  ["The Ordinary", "Retinol 0.5% in Squalane", "Serum", "dropper", "#efe2c6", "PM", "RET"],
  ["The Ordinary", "Natural Moisturizing Factors + HA", "Moisturizer", "jar", "#eeece8", "BOTH", "NMF"],
  ["Paula's Choice", "Skin Perfecting 2% BHA Liquid Exfoliant", "Toner", "tall", "#d6e9d2", "PM", "BHA"],
  ["Paula's Choice", "10% Niacinamide Booster", "Serum", "dropper", "#dce8d9", "BOTH", "10%"],
  ["COSRX", "Advanced Snail 96 Mucin Power Essence", "Serum", "pump", "#ece8de", "BOTH", "SNAIL"],
  ["COSRX", "Low pH Good Morning Gel Cleanser", "Cleanser", "tube", "#d8ecd9", "AM", "COSRX"],
  ["COSRX", "Acne Pimple Master Patch", "Treatment", "patch", "#f2d7cf", "PM", "PATCH"],
  ["Beauty of Joseon", "Relief Sun: Rice + Probiotics SPF 50+", "Sunscreen", "tube", "#f3e5c4", "AM", "SPF 50"],
  ["Beauty of Joseon", "Glow Serum: Propolis + Niacinamide", "Serum", "dropper", "#f0d49a", "BOTH", "GLOW"],
  ["Anua", "Heartleaf 77% Soothing Toner", "Toner", "tall", "#d7e8cf", "BOTH", "ANUA"],
  ["Anua", "Heartleaf Pore Control Cleansing Oil", "Cleanser", "pump", "#e6efc9", "PM", "OIL"],
  ["Laneige", "Water Sleeping Mask", "Moisturizer", "jar", "#cdd8f7", "PM", "MASK"],
  ["Laneige", "Lip Sleeping Mask", "Treatment", "jar", "#f6c9d6", "PM", "LIP"],
  ["SKIN1004", "Madagascar Centella Ampoule", "Serum", "dropper", "#ede3cc", "BOTH", "CICA"],
  ["Round Lab", "1025 Dokdo Toner", "Toner", "tall", "#d3e3f3", "BOTH", "DOKDO"],
  ["Supergoop!", "Unseen Sunscreen SPF 40", "Sunscreen", "tube", "#f8d6be", "AM", "SPF 40"],
  ["EltaMD", "UV Clear Broad-Spectrum SPF 46", "Sunscreen", "pump", "#cfe0f2", "AM", "SPF 46"],
  ["Differin", "Adapalene Gel 0.1%", "Treatment", "tube", "#f1d0d0", "PM", "0.1%"],
  ["Neutrogena", "Hydro Boost Water Gel", "Moisturizer", "jar", "#bcd3f5", "BOTH", "HYDRO"],
  ["Cetaphil", "Gentle Skin Cleanser", "Cleanser", "pump", "#d9e6f3", "BOTH", "Cetaphil"],
  ["Vanicream", "Moisturizing Cream", "Moisturizer", "jar", "#e7ebef", "BOTH", "VANI"],
  ["Glossier", "Milky Jelly Cleanser", "Cleanser", "tube", "#f2dfe6", "BOTH", "MILKY"],
  ["Drunk Elephant", "Protini Polypeptide Cream", "Moisturizer", "jar", "#d9dcf3", "BOTH", "PROTINI"],
  ["Tatcha", "The Dewy Skin Cream", "Moisturizer", "jar", "#e3d2ec", "BOTH", "DEWY"],
  ["Kiehl's", "Ultra Facial Cream", "Moisturizer", "jar", "#e6ecef", "BOTH", "KIEHL'S"],
  ["Clinique", "Moisture Surge 100H", "Moisturizer", "jar", "#f5d3df", "BOTH", "SURGE"],
  ["First Aid Beauty", "Ultra Repair Cream", "Moisturizer", "jar", "#dde6f5", "BOTH", "FAB"],
  ["Mario Badescu", "Drying Lotion", "Treatment", "small", "#f3ded4", "PM", "DRY"],
  ["Bioderma", "Sensibio H2O Micellar Water", "Cleanser", "tall", "#f5d8e0", "PM", "H2O"],
  ["Aquaphor", "Healing Ointment", "Moisturizer", "tube", "#d5e1f1", "PM", "AQUA"],
  ["The Inkey List", "Retinol Serum", "Serum", "dropper", "#e9e9e6", "PM", "RET"],
  ["Naturium", "Niacinamide Serum 12% Plus Zinc 2%", "Serum", "dropper", "#dde9ec", "BOTH", "B3"],
  ["Aveeno", "Calm + Restore Oat Gel Moisturizer", "Moisturizer", "jar", "#ece9d6", "BOTH", "OAT"],
];

export const CATALOG: CatalogItem[] = ROWS.map(
  ([brand, name, category, shape, color, slot, label], i) => ({
    id: `c${i}`,
    brand,
    name,
    category,
    shape,
    color,
    slot,
    label,
  }),
);

export const PASTELS = [
  "#bcd8ef", "#f4c98f", "#d6e9d2", "#f2dfe6", "#d9dcf3",
  "#efe2c6", "#f3ded4", "#dde9ec", "#e3d2ec",
];

/** Blend two hex colors (without the leading #) by t. */
function mix(hex: string, other: string, t: number): string {
  const a = (hex.match(/\w\w/g) ?? []).map((h) => parseInt(h, 16));
  const b = (other.match(/\w\w/g) ?? []).map((h) => parseInt(h, 16));
  return (
    "#" +
    a
      .map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0"))
      .join("")
  );
}

function escapeXml(s: string): string {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

/** Consistent illustrated product art as an SVG data URL. */
export function productArt({
  shape,
  color,
  label,
}: Pick<CatalogItem, "shape" | "color" | "label">): string {
  const bg = mix(color.slice(1), "ffffff", 0.62);
  const body = color;
  const cap = mix(color.slice(1), "3a3a48", 0.45);
  const shine = "rgba(255,255,255,.45)";

  const lbl = (x: number, y: number, w: number, h: number) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="rgba(255,255,255,.88)"/>
     <text x="${x + w / 2}" y="${y + h / 2 + 2.6}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="700" font-size="${
       label.length > 6 ? 5.2 : 6.5
     }" fill="#3a3a48" letter-spacing=".3">${escapeXml(label)}</text>`;

  const shapes: Record<ProductShape, string> = {
    tube: `<rect x="33" y="14" width="34" height="6" rx="1.5" fill="${cap}" opacity=".55"/><path d="M33 20h34l-4 54H37z" fill="${body}"/><rect x="39" y="74" width="22" height="12" rx="3" fill="${cap}"/><path d="M38 24h4l-2.6 44h-3z" fill="${shine}"/>${lbl(38, 40, 24, 13)}`,
    pump: `<rect x="47" y="14" width="18" height="4" rx="2" fill="${cap}"/><rect x="47.5" y="16" width="5" height="14" fill="${cap}"/><rect x="42" y="29" width="16" height="9" rx="2" fill="${cap}"/><rect x="33" y="37" width="34" height="50" rx="8" fill="${body}"/><rect x="37" y="42" width="4" height="38" rx="2" fill="${shine}"/>${lbl(38, 52, 24, 14)}`,
    dropper: `<ellipse cx="50" cy="22" rx="7" ry="9" fill="${cap}"/><rect x="43" y="28" width="14" height="12" rx="2" fill="${cap}"/><rect x="35" y="40" width="30" height="46" rx="7" fill="${body}"/><rect x="39" y="45" width="3.5" height="34" rx="1.75" fill="${shine}"/>${lbl(39, 55, 22, 13)}`,
    jar: `<rect x="22" y="40" width="56" height="14" rx="5" fill="${cap}"/><rect x="24" y="52" width="52" height="32" rx="9" fill="${body}"/><rect x="28" y="57" width="4" height="22" rx="2" fill="${shine}"/>${lbl(36, 61, 28, 14)}`,
    tall: `<rect x="40" y="12" width="20" height="16" rx="4" fill="${cap}"/><rect x="35" y="27" width="30" height="60" rx="8" fill="${body}"/><rect x="39" y="32" width="4" height="48" rx="2" fill="${shine}"/>${lbl(38, 48, 24, 14)}`,
    small: `<rect x="42" y="28" width="16" height="16" rx="3" fill="${cap}"/><rect x="36" y="43" width="28" height="42" rx="7" fill="${body}"/><rect x="40" y="48" width="3.5" height="30" rx="1.75" fill="${shine}"/>${lbl(38, 56, 24, 13)}`,
    patch: `<rect x="24" y="26" width="52" height="54" rx="10" fill="${body}"/>${[0, 1, 2]
      .map((r) =>
        [0, 1, 2]
          .map(
            (c) =>
              `<circle cx="${37 + c * 13}" cy="${40 + r * 13}" r="4.6" fill="rgba(255,255,255,.75)"/>`,
          )
          .join(""),
      )
      .join("")}`,
  };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><ellipse cx="50" cy="89" rx="24" ry="3" fill="rgba(0,0,0,.07)"/>${
    shapes[shape] || shapes.small
  }</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/** Guess a category and bottle shape from a product name found online. */
export function guessKind(name: string): [string, ProductShape] {
  const n = name.toLowerCase();
  if (/spf|sun/.test(n)) return ["Sunscreen", "tube"];
  if (/micellar|toner|toning|exfoliant|essence|water/.test(n)) return ["Toner", "tall"];
  if (/clean|wash|foam/.test(n)) return ["Cleanser", "pump"];
  if (/serum|ampoule|booster|drops|oil/.test(n)) return ["Serum", "dropper"];
  if (/cream|moistur|lotion|gel|balm|mask|butter/.test(n)) return ["Moisturizer", "jar"];
  return ["Treatment", "small"];
}
