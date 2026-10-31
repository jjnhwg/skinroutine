// Barrier repair guide: creator-recommended products for each routine step.
// From the "Recommended: pick by your skin" board of the Barrier Repair Guide design.

export type Need = "oily" | "dehyd" | "red" | "dry" | "acne";

export const NEEDS: { id: Need | "all"; label: string }[] = [
  { id: "all", label: "Show everything" },
  { id: "oily", label: "Oily" },
  { id: "dehyd", label: "Dehydrated or tight" },
  { id: "red", label: "Red, itchy or stinging" },
  { id: "dry", label: "Dry or raw patches" },
  { id: "acne", label: "Breaking out" },
];

export interface GuideProduct {
  /** Who it's best for, e.g. "Best if oily". */
  label: string;
  needs: Need[];
  brand: string;
  name: string;
  /** How many independent creators recommended it. */
  creators: number;
  why: string;
  /** Video and timestamp, e.g. "v40 0:22 @charinecheungg". */
  source: string;
  paid?: boolean;
  /** The name wasn't fully readable in the video. */
  unconfirmed?: boolean;
  /** How it feels, e.g. "Light foam". */
  texture?: string;
  /** Which skin types it suits, in a sentence or two. */
  bestFor?: string;
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Where a product's photo lives: drop a file with this name into frontend/public/products/. */
export const productImage = (p: GuideProduct) => `/products/${slug(p.brand)}--${slug(p.name)}.jpg`;

export interface GuideStep {
  id: string;
  name: string;
  when: string;
  does: string;
  /** Why the step matters, when it isn't obvious. General background, not from the videos. */
  why?: string;
  /** Step-by-step how-to, when the technique matters. */
  how?: string[];
  /** Shown as cards. */
  picks: GuideProduct[];
  /** Shown in the "more options" list. */
  rest: GuideProduct[];
}

type Flag = "paid" | "unc";

function P(label: string, needs: Need[], brand: string, name: string, creators: number, why: string, source: string, flags: Flag[] = []): GuideProduct {
  return { label, needs, brand, name, creators, why, source, paid: flags.includes("paid"), unconfirmed: flags.includes("unc") };
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: "first-cleanse",
    name: "First cleanse",
    when: "Night, only after SPF or makeup",
    does: "Lifts sunscreen and makeup gently so your second cleanse doesn’t have to scrub. For most people that’s a gentle micellar water: it looks like plain water, but it’s full of tiny clusters of mild cleanser (micelles) that grab onto oil, sunscreen and makeup and lift them off without rinsing or rubbing. Skip cleansing oils and balms while healing.",
    how: [
      "Soak a cotton pad with micellar water until it’s wet all the way through, not just damp.",
      "Hold it on your skin for a few seconds so it can dissolve the sunscreen or makeup.",
      "Wipe gently outward, from the center of your face to the edges. Don’t scrub or press hard.",
      "Use a fresh pad when the old one looks dirty, and repeat until a pad comes away clean.",
      "For eye makeup, hold a soaked pad on your closed eye for 10 seconds, then wipe down and out.",
      "Then go straight to your second cleanse. No need to rinse in between.",
    ],
    why: "Sunscreen is made to stay on through sweat and water, so it’s full of film-formers, silicones and oils (and mineral filters that cling to skin). Water-based cleansers don’t dissolve that well, so one wash usually leaves a thin film behind that can clog pores and sit between your skin and your serums. Oil dissolves oil: a micellar water or cleansing milk breaks that film up first, so a gentle second cleanser can finish the job. Two gentle cleanses are kinder to a damaged barrier than one harsh cleanser or scrubbing harder. On mornings, or days without SPF or makeup, one cleanse is enough.",
    picks: [
      P("", ["red"], "Bioderma", "Sensibio H2O Micellar Water", 2, "Gentle first cleanse instead of balms or oils", ""),
      P("", ["dry"], "ma:nyo", "Pure Cleansing Water Sensitive", 1, "Gentle, with ceramides; she avoids oils on a damaged barrier", ""),
    ],
    rest: [
    ],
  },
  {
    id: "cleanser",
    name: "Cleanser",
    when: "Morning, and second cleanse at night",
    does: "Cleans without stripping oil. Stripped skin overproduces oil, which makes oily-dehydrated skin worse. Avoid harsh, squeaky foaming cleansers while healing; the light foams here are gentle enough.",
    picks: [
      { ...P("", ["oily", "dehyd"], "beplain", "Mung Bean pH-Balanced Cleansing Foam", 1, "Hydrates without stripping; mung bean calms inflammation", "v45 0:09 @ginaseooo"), texture: "Light foam", bestFor: "Oily or combination skin. Also good for “oily but dehydrated” skin, which is shiny but still feels thirsty." },
      { ...P("", ["oily", "acne"], "107 Beauty", "Chaga Jelly Low pH Cleanser", 1, "Low pH; doesn’t strip oil or the barrier", "v11 0:47 · v19 0:14 @sunnyfromsunnybread"), texture: "Jelly, light foam", bestFor: "Combination or oily skin, especially if it’s acne-prone." },
      { ...P("", ["oily", "acne", "red"], "Vanicream", "Gentle Facial Cleanser", 2, "Basic and non-stripping, so skin won’t overproduce oil", "v40 0:22 @charinecheungg · v46 0:24 @jordynwoodruff"), texture: "Thin gel-lotion, barely foams", bestFor: "Normal, oily or acne-prone skin. Also the best pick if your skin reacts to almost everything, since it leaves out most common irritants." },
      { ...P("", ["dry", "dehyd", "red"], "Haruharu Wonder", "Black Rice Moisture 5.5 Soft Cleansing Gel", 0, "pH 5.5 gel with black rice and hyaluronic acid; cleans without stripping", "Your pick"), texture: "Soft gel, light lather", bestFor: "Normal, dry or combination skin, and sensitive skin. A good middle ground if gel-lotions feel too plain and foams feel too drying." },
      { ...P("", ["dry", "dehyd"], "Prequel", "Gleanser Non-Drying Glycerin Cleanser", 0, "Glycerin-rich gel that cleans without leaving skin tight", "Your pick"), texture: "Glycerin gel", bestFor: "Normal to dry skin, or any skin that feels tight after washing." },
      { ...P("", ["dry", "red"], "La Roche-Posay", "Toleriane Hydrating Gentle Cleanser", 0, "Creamy, non-foaming wash with ceramides, niacinamide and glycerin", "Your pick"), texture: "Cream, no foam", bestFor: "Dry to very dry skin, and sensitive skin." },
    ],
    rest: [],
  },
  {
    id: "toner",
    name: "Toner",
    when: "Morning and night",
    does: "The first layer of water. Put it on damp skin right after washing and layer it in thin coats (v21 0:16).",
    why: "With a damaged barrier, skin can’t hold on to water, so it loses moisture all day and feels tight even when it looks oily. That’s why the goal of toner while healing is hydration and calming, not exfoliating or “clearing pores”. Skip toners with acids (AHA, BHA, PHA), alcohol or fragrance, which strip and sting already-weak skin. Pick a plain hydrating toner (hyaluronic acid, beta-glucan, panthenol, centella) and pat on a few thin layers: several light coats soak in better than one heavy one, and they give your serum a damp base to sink into.",
    note: "If your skin feels heavy or breaks out easily, skip toner at first. Stacking layers of toner can be too much and leave skin congested. Add it once your routine is settled and your skin is calm, so you can tell whether it actually helps.",
    picks: [
      P("Best if dehydrated", ["dehyd"], "107 Beauty", "Micro Drizzle Hydro Toner", 1, "Made for dehydrated skin, with hyaluronic acid; layer 4–5 times", "v11 1:50 · v19 0:21 · v24 0:41 @sunnyfromsunnybread"),
      P("Best for drier skin", ["dry"], "TIRTIR", "Milk Skin Toner", 1, "Thicker and more nourishing, with rice and ceramides", "v35 0:32 · v33 1:26 @charinecheungg"),
      P("Best if red", ["red"], "Purito", "Unscented Centella Toner", 1, "Reduces redness and inflammation, and hydrates", "v38 1:39 @charinecheungg"),
      P("Best if oily", ["oily"], "Anua", "Rice 70 Glow Milky Toner", 1, "Light milky toner with ceramides and panthenol", "v38 1:35 · v35 0:32 @charinecheungg", ["paid"]),
    ],
    rest: [
      P("Best if dehydrated", ["dehyd"], "Cecith", "Bubble Toner", 1, "Bubble texture penetrates better; layer small amounts", "v14 0:54 · v24 0:41 @sunnyfromsunnybread"),
      P("Best if you avoid niacinamide", [], "Beauty of Joseon", "Rice milk toner", 1, "Rice and ceramides without niacinamide", "v35 0:32 @charinecheungg"),
      P("Best for a damaged barrier", ["dry"], "IUNIK", "Beta-Glucan Toner", 1, "A toner to layer for the barrier-damage type", "v18 2:00 @sunnyfromsunnybread"),
      P("Best for a broken barrier", ["dry"], "AXIS-Y", "Triple PDRN Gel Toner", 1, "Thick hydrating gel with PDRN and panthenol", "v47 0:24 @leeskincare7", ["paid"]),
      P("Best if very dehydrated", ["dehyd"], "Pink Wonders", "Jojoba Toner", 1, "Jojoba and squalane resemble skin’s own oil", "v10 2:52 @sunnyfromsunnybread", ["unc"]),
    ],
  },
  {
    id: "serum",
    name: "Serum",
    when: "Morning and night",
    does: "Each serum has one job, so pick it for the reason your skin needs it: calming red, irritated skin (centella, madecassoside), strengthening the barrier (ceramides, panthenol), or hydrating (beta-glucan, hyaluronic acid). Choose the one that matches what your skin needs most right now. Skip retinol, vitamin C and acids while healing.",
    why: "Serums are where most “active” products live, but a damaged barrier isn’t the time for actives. Retinol, vitamin C and exfoliating acids all work by pushing skin to turn over or by being slightly irritating, and broken skin can’t take that: it ends up redder, drier and more reactive. While healing, a serum has three jobs only: hydrate (beta-glucan, hyaluronic acid), repair (ceramides, panthenol, PDRN) and calm (centella, madecassoside). One or two gentle serums are plenty; layering lots of products means more chances to irritate. Bring actives back slowly, one at a time, once skin stops stinging and stays calm for a few weeks.",
    picks: [
      P("Best if dehydrated and sensitive", ["dehyd", "red"], "IUNIK", "Beta-Glucan Serum", 3, "Deep hydration and barrier support that keeps skin calm", "v01 0:24 @tiffkimmm · v40 1:14 @charinecheungg · v46 1:30 @jordynwoodruff"),
      P("Best for barrier repair", ["dry"], "Anua", "7 Rice Ceramide Hydrating Barrier Serum", 3, "Ceramides and panthenol repair the barrier", "v38 1:58 · v44 0:33 · v45 0:36", ["paid"]),
      P("Best if very oily", ["oily"], "SKIN1004", "Madagascar Centella Poremizing Fresh Ampoule", 1, "Reduces oil production while adding some hydration", "v44 0:18 @ginaseooo"),
      P("Best if red and bumpy", ["red"], "SKIN1004", "Probio-Cica Intensive Ampoule", 1, "Very nourishing; calms irritation bumps", "v33 1:53 @charinecheungg"),
      P("Best if dehydrated", ["dehyd"], "Torriden", "DIVE-IN Low Molecule Hyaluronic Acid Serum", 1, "Hydrating; not ideal for sensitive skin or rosacea", "v46 1:30 @jordynwoodruff"),
      P("Best for soothing and barrier repair", ["red", "dry"], "Dr.Althea", "345 Relief Serum", 0, "Panthenol, ceramide NP and niacinamide soothe and strengthen the barrier", "Your pick"),
      P("Best if red or sensitive", ["red"], "Purito", "Wonder Releaf Centella Serum Unscented", 0, "Fragrance-free centella with madecassoside and panthenol to calm redness", "Your pick"),
    ],
    rest: [
      P("Best for repair", [], "Dear, Klairs", "Blue Youth Activating Drops (EGF)", 2, "EGF for repair; minimal ingredients", "v18 2:12 @sunnyfromsunnybread · v06 0:07 @brutechoi"),
      P("Best if very dehydrated", ["dehyd"], "Epi", "HPT6 Ultra Drop 10%", 1, "Strengthens the barrier; fixed her severe dehydration", "v22 0:42 @sunnyfromsunnybread"),
      P("Best if oily and red", ["oily", "red"], "SKIN1004", "Madagascar Centella Ampoule", 2, "Watery barrier serum; calms red bumps", "v45 0:36 @ginaseooo · v31 1:12 @charinecheungg", ["paid"]),
      P("Best if oily", ["oily"], "TIRTIR", "SOS Serum", 1, "Light centella jelly", "v35 0:43 @charinecheungg"),
      P("Best if oily", ["oily"], "Block/Blanc Nature", "Calming serum", 1, "Controls sebum, protects the barrier", "v24 1:08 @sunnyfromsunnybread", ["unc"]),
      P("Best if oily", ["oily"], "Unconfirmed", "Sebum Balancing RX131 Ampoule", 1, "Regulates oil and repairs the barrier", "v11 4:00 @sunnyfromsunnybread", ["unc"]),
    ],
  },
  {
    id: "moisturizer",
    name: "Moisturizer",
    when: "Morning and night",
    does: "Locks the water in. Oily skin still needs it: layer a light gel cream thinly instead of one heavy cream (v44 0:44).",
    why: "Toner and serum add water, but water on skin doesn’t stay put: it evaporates, and a damaged barrier lets it escape even faster. Hydrating ingredients like hyaluronic acid and glycerin pull water in, but if nothing sits on top, that water can evaporate into the air, and in dry air skin can end up tighter than before. A moisturizer does two things. Its emollients (squalane, fatty acids, ceramides) fill the cracks between dry skin cells so the surface is smooth again, and its lighter oils make a thin layer that slows water from leaving. Put it on while skin is still a little damp from your serum so it holds that water in. Oily skin still loses water, and that’s often why it overproduces oil, so use a light gel cream instead of skipping this step.",
    picks: [
      P("Best if oily but dehydrated", ["oily", "dehyd"], "Purito", "Oat-in Calming Gel Cream", 2, "Watery gel that won’t clog; layer up to 3 times", "v44 0:44 @ginaseooo · v38 2:09 @charinecheungg"),
      P("Best for oily-combo", ["oily"], "Aestura", "Atobarrier 365 Hydro Soothing Cream", 2, "Cooling gel with ceramides, beta-glucan and zinc", "v49 0:26 @yejee.lee · v43 1:10 @donatsuyang"),
      P("Best for combination skin", ["oily"], "Epi", "Double Up Cream", 1, "Panthenol and ectoin lock moisture in, lightly", "v10 3:33 · v16 1:37 @sunnyfromsunnybread"),
      P("Best if breaking out", ["acne"], "Dr.Althea", "345 Relief Cream", 1, "Barrier repair plus blemish care", "v43 2:05 @donatsuyang"),
    ],
    rest: [
      P("Best if oily", ["oily"], "Dieux", "Air Angel Peptide Plumping Gel Cream", 1, "Light, bouncy gel cream", ""),
    ],
  },
  {
    id: "barrier-cream",
    name: "Barrier cream or balm",
    when: "Night, or only on raw patches",
    does: "Seals everything in overnight so the barrier can repair (v02 2:14). With oily skin, use it only where it’s dry or raw.",
    why: "Your barrier is like a brick wall: skin cells are the bricks, and fats (ceramides, cholesterol and fatty acids) are the mortar that keeps water in. When the barrier is damaged, the mortar has gaps, and a light moisturizer alone often can’t keep water from escaping through them. A barrier cream or balm is the heavy top layer. It uses occlusives (petrolatum, dimethicone, shea butter) that leave a film on the skin, a bit like a lid on a pot, so the water from your toner, serum and moisturizer can’t evaporate. Many also add the same fats your barrier is missing, plus panthenol to calm it. With that layer on, skin stays hydrated long enough to rebuild its own barrier, and it does most of that repair overnight, which is why this step goes last, at night. It only seals in what’s under it, so put it on over your hydrating layers, not on dry skin.",
    picks: [
      P("Best if itchy or red", ["red"], "La Roche-Posay", "Cicaplast Baume B5", 4, "Panthenol balm that soothes itching, irritation and red splotches", "v35 1:19 @charinecheungg · v43 0:37 @donatsuyang · v05 0:42 @skinfiltrator · v10 4:16"),
      P("Best if rashy or burning", ["red"], "Aestura", "Atobarrier 365 Cream", 2, "Encapsulated ceramides and fatty acids; spot-use if oily", "v38 2:37 @charinecheungg · v05 0:28 @skinfiltrator"),
      P("Best for very dry patches", ["dry"], "Avène", "Cicalfate+ Restorative Protective Cream", 2, "Very thick restorative cream; night only", "v43 0:20 @donatsuyang · v46 1:47 @jordynwoodruff"),
      P("Best if acne-prone", ["acne"], "Dear, Klairs", "EGF Intensive Pro Cream", 1, "Light but protective; didn’t break her out", "v49 0:06 @yejee.lee"),
    ],
    rest: [
      P("Best if dehydrated", ["dehyd"], "Epi", "HPT6 10% Cream", 1, "Triple lipids lock hydration in all day", "v21 1:03 @sunnyfromsunnybread"),
      P("Best if acne-prone", ["acne"], "Dieux", "Mercy Recovery Cream", 1, "Richer but silky; colloidal oatmeal and glycerin", "v49 0:43 @yejee.lee"),
      P("Best for normal-dry skin", ["dry"], "Dear, Klairs", "Ceramide-Rich Moist Barrier Capsule Cream", 1, "Thicker barrier cream at night", "v18 2:25 @sunnyfromsunnybread", ["unc"]),
      P("Best for normal-dry skin", ["dry"], "CellFusionC", "Intensive M-Cream", 1, "“Too thick, but trust me, you need this”", "v18 2:29 @sunnyfromsunnybread", ["unc"]),
      P("Best if acne-prone", ["acne"], "SKIT", "B5 Barrier Cream (green tube)", 1, "The only one her acne-prone partner can use", "v24 1:43 @sunnyfromsunnybread", ["unc"]),
    ],
  },
  {
    id: "sunscreen",
    name: "Sunscreen",
    when: "Morning",
    does: "Sun damages the barrier further. Mineral or Korean filters irritate less; look for SPF 50+ and PA++++ (v48 1:43).",
    picks: [
      P("Best if very sensitive or acne-prone", ["red", "acne"], "Zeroid", "Easy Wash Mild Sun Cream", 1, "Safe even for eczema; non-comedogenic, washes off with one cleanse", "v20 0:30 · v24 1:52 @sunnyfromsunnybread"),
      P("Best if red", ["red"], "Tage", "Cica Tree Soothing Sun Fluid", 1, "Calming, low irritation, non-comedogenic", "v20 1:06 @sunnyfromsunnybread"),
      P("Best for a damaged barrier", ["dry"], "Dr.G", "Mineral Sunscreen", 1, "Mineral is less irritating; less white cast", "v10 4:51 @sunnyfromsunnybread", ["unc"]),
    ],
    rest: [
      P("Best if sensitive and oily", ["red", "oily"], "Some By Mi", "V10 Hyal Air Fit Sunscreen", 1, "Doesn’t break her out; reduces sebum and soothes", "v30 0:18 @charinecheungg", ["paid"]),
    ],
  },
];
