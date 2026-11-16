// Barrier repair guide: creator-recommended products for each routine step.
// From the "Recommended: pick by your skin" board of the Barrier Repair Guide design.

export type Need = "oily" | "dehyd" | "red" | "dry" | "acne";

/**
 * Barrier ingredients grouped by the job they do. The guide explains each job once, in its
 * ingredient grid, and every product card sorts its ingredients under these same jobs,
 * so a card reads "Calms: Centella" instead of re-explaining centella each time.
 */
export const INGREDIENT_GROUPS = [
  {
    job: "Calms",
    title: "Calm irritation",
    what: "Centella calms redness and helps skin heal. Panthenol (vitamin B5) soothes and adds a little hydration.",
    items: ["Centella", "Panthenol"],
  },
  {
    job: "Hydrates",
    title: "Pull water into skin",
    what: "They draw water in and hold it there, so skin feels less tight.",
    items: ["Hyaluronic acid", "Glycerin", "Beta-glucan"],
  },
  {
    job: "Repairs",
    title: "Repair the barrier",
    what: "Ceramides, cholesterol and squalane are the fats in the mortar, so they fill the gaps.",
    items: ["Ceramides", "Cholesterol", "Squalane"],
  },
  {
    job: "Seals in",
    title: "Seal water in",
    what: "They leave a film on skin, like a lid on a pot, so the water underneath can’t escape.",
    items: ["Shea butter", "Mineral oil", "Beeswax"],
  },
] as const;

export type Ingredient = (typeof INGREDIENT_GROUPS)[number]["items"][number];

export interface GuideProduct {
  /** Who it's best for, e.g. "Best if oily". */
  label: string;
  needs: Need[];
  brand: string;
  name: string;
  /** How many independent creators recommended it. */
  creators: number;
  /** Key barrier ingredients, shown as chips. What each does is explained once in INGREDIENT_GROUPS. */
  has?: Ingredient[];
  /** Only what's specific to this product; generic ingredient benefits belong in INGREDIENT_GROUPS. */
  why: string;
  /** Video and timestamp, e.g. "v40 0:22 @charinecheungg". */
  source: string;
  paid?: boolean;
  /** The name wasn't fully readable in the video. */
  unconfirmed?: boolean;
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
  does?: string;
  /** Why the step matters, when it isn't obvious. General background, not from the videos. */
  why?: string;
  /** The site owner's own advice on this step. */
  note?: string;
  /** Not part of the base routine: add it once cleanser, moisturizer and sunscreen are settled. */
  later?: boolean;
  /** Shown in place of cards while this step's products haven't been added yet. */
  comingSoon?: string;
  /** Sort each product's ingredients by job ("Calms: …") instead of a plain list. */
  byJob?: boolean;
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
    why: "Sunscreen is made to stay on through sweat and water, so it’s full of film-formers, silicones and oils (and mineral filters that cling to skin). Water-based cleansers don’t dissolve that well, so one wash usually leaves a thin film behind that can clog pores and sit between your skin and your serums. Oil dissolves oil: a micellar water or cleansing milk breaks that film up first, so a gentle second cleanser can finish the job. Two gentle cleanses are kinder to a damaged barrier than one harsh cleanser or scrubbing harder. On mornings, or days without SPF or makeup, one cleanse is enough.",
    picks: [
      { ...P("", ["red"], "Bioderma", "Sensibio H2O Micellar Water", 2, "", ""), bestFor: "All skin types, including sensitive skin." },
      { ...P("", ["dry"], "ma:nyo", "Pure Cleansing Water Sensitive", 1, "", ""), bestFor: "Normal or dry skin. Skip it if you’re avoiding acids, since it has a salicylic acid derivative and gluconolactone." },
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
      { ...P("", ["oily", "dehyd"], "beplain", "Mung Bean pH-Balanced Cleansing Foam", 1, "", "v45 0:09 @ginaseooo"), bestFor: "Most skin types, especially oily or combination skin. Very dry or reactive skin should be careful, since alcohol is on its ingredient list." },
      { ...P("", ["oily", "acne"], "107 Beauty", "Chaga Jelly Low pH Cleanser", 1, "Its low pH is close to your skin’s own, so it’s easier on the barrier.", "v11 0:47 · v19 0:14 @sunnyfromsunnybread"), bestFor: "Combination or oily skin, especially if it’s acne-prone." },
      { ...P("", ["oily", "acne", "red"], "Vanicream", "Gentle Facial Cleanser", 2, "", "v40 0:22 @charinecheungg · v46 0:24 @jordynwoodruff"), bestFor: "All skin types. The best pick if your skin reacts to almost everything, since it leaves out most common irritants." },
      { ...P("", ["dry", "dehyd", "red"], "Haruharu Wonder", "Black Rice Moisture 5.5 Soft Cleansing Gel", 0, "pH 5.5 is close to your skin’s own, so it’s easier on the barrier.", "Your pick"), bestFor: "Most skin types, including sensitive skin. A good middle ground if gel-lotions feel too plain and foams feel too drying." },
      { ...P("", ["dry", "dehyd"], "Prequel", "Gleanser Non-Drying Glycerin Cleanser", 0, "About half the formula is glycerin, so it cleans without the tight feeling.", "Your pick"), bestFor: "Most skin types, especially normal to dry skin or any skin that feels tight after washing." },
      { ...P("", ["dry", "red"], "La Roche-Posay", "Toleriane Hydrating Gentle Cleanser", 0, "", "Your pick"), bestFor: "Dry to very dry skin, and sensitive skin." },
    ],
    rest: [],
  },
  {
    id: "toner",
    name: "Toner",
    when: "Morning and night",
    why: "With a damaged barrier, skin can’t hold on to water, so it loses moisture all day and feels tight even when it looks oily. That’s why the goal of toner while healing is hydration and calming, not exfoliating or “clearing pores”. Skip toners with acids (AHA, BHA, PHA), alcohol or fragrance, which strip and sting already-weak skin. Pick a plain hydrating toner (hyaluronic acid, beta-glucan, panthenol, centella) and pat on a few thin layers: several light coats soak in better than one heavy one, and they give your serum a damp base to sink into.",
    later: true,
    byJob: true,
    note: "Skip toner at first, especially if your skin feels heavy or breaks out easily. Stacking layers of toner can be too much and leave skin congested. Add it once your routine is settled and your skin is calm, so you can tell whether it actually helps.",
    picks: [
      { ...P("", ["dehyd"], "107 Beauty", "Micro Drizzle Hydro Toner", 1, "", "v11 1:50 · v19 0:21 · v24 0:41 @sunnyfromsunnybread"), has: ["Hyaluronic acid", "Glycerin", "Panthenol"], bestFor: "Most skin types, especially dehydrated, dry or sensitive skin." },
      { ...P("", ["red"], "Purito", "Unscented Centella Toner", 1, "", "v38 1:39 @charinecheungg"), has: ["Centella", "Hyaluronic acid", "Panthenol"], bestFor: "All skin types, especially red or sensitive skin." },
      { ...P("", ["oily"], "Anua", "Rice 70 Glow Milky Toner", 1, "", "v38 1:35 · v35 0:32 @charinecheungg", ["paid"]), has: ["Ceramides", "Hyaluronic acid", "Panthenol"], bestFor: "Most skin types. Very reactive skin should be careful, since it has niacinamide, arbutin and ascorbic acid." },
    ],
    rest: [
    ],
  },
  {
    id: "serum",
    name: "Serum",
    when: "Morning and night",
    does: "Each serum has one job, so pick it for the reason your skin needs it: calming red, irritated skin (centella, madecassoside), strengthening the barrier (ceramides, panthenol), or hydrating (beta-glucan, hyaluronic acid). Choose the one that matches what your skin needs most right now. Skip retinol, vitamin C and acids while healing.",
    why: "Serums are where most “active” products live, but a damaged barrier isn’t the time for actives. Retinol, vitamin C and exfoliating acids all work by pushing skin to turn over or by being slightly irritating, and broken skin can’t take that: it ends up redder, drier and more reactive. While healing, a serum has three jobs only: hydrate (beta-glucan, hyaluronic acid), repair (ceramides, panthenol, PDRN) and calm (centella, madecassoside). One or two gentle serums are plenty; layering lots of products means more chances to irritate. Bring actives back slowly, one at a time, once skin stops stinging and stays calm for a few weeks.",
    later: true,
    byJob: true,
    note: "Skip serums at first. Get your cleanser, moisturizer and sunscreen working, then add one serum and watch your skin for about 3 weeks before changing anything else.",
    picks: [
      { ...P("", ["dehyd", "red"], "IUNIK", "Beta-Glucan Serum", 3, "", "v01 0:24 @tiffkimmm · v40 1:14 @charinecheungg · v46 1:30 @jordynwoodruff"), has: ["Beta-glucan", "Glycerin"], bestFor: "All skin types, especially dry, dehydrated or sensitive skin." },
      { ...P("", ["dry"], "Anua", "7 Rice Ceramide Hydrating Barrier Serum", 3, "", "v38 1:58 · v44 0:33 · v45 0:36", ["paid"]), has: ["Ceramides", "Panthenol", "Hyaluronic acid"], bestFor: "Most skin types, especially normal, dry or combination skin. Very reactive skin should be careful, since it has niacinamide." },
      { ...P("", ["oily", "red"], "SKIN1004", "Madagascar Centella Ampoule", 2, "", "v45 0:36 @ginaseooo · v31 1:12 @charinecheungg", ["paid"]), has: ["Centella", "Glycerin"], bestFor: "All skin types, especially red or sensitive skin." },
      { ...P("", ["dehyd"], "Torriden", "DIVE-IN Low Molecule Hyaluronic Acid Serum", 1, "", "v46 1:30 @jordynwoodruff"), has: ["Hyaluronic acid", "Panthenol"], bestFor: "Dry, normal or combination skin. Not ideal for sensitive skin or rosacea." },
      { ...P("", [], "Dear, Klairs", "Blue Youth Activating Drops (EGF)", 2, "EGF is a growth factor meant to support skin repair, though the evidence is limited.", "v18 2:12 @sunnyfromsunnybread · v06 0:07 @brutechoi"), has: ["Hyaluronic acid"], bestFor: "All skin types. Check with a dermatologist first if you have psoriasis." },
      { ...P("", ["red"], "Purito", "Wonder Releaf Centella Serum Unscented", 0, "", "Your pick"), has: ["Centella", "Panthenol", "Hyaluronic acid"], bestFor: "All skin types, especially red or sensitive skin. It has niacinamide, and if you get fungal acne, check the ingredients first." },
    ],
    rest: [
    ],
  },
  {
    id: "moisturizer",
    name: "Moisturizer",
    when: "Morning and night",
    does: "Locks in the water from your earlier steps so it can’t evaporate. If your skin is oily, layer a light gel cream thinly instead of one heavy cream.",
    why: "Toner and serum add water, but water on skin doesn’t stay put: it evaporates, and a damaged barrier lets it escape even faster. Hydrating ingredients like hyaluronic acid and glycerin pull water in, but if nothing sits on top, that water can evaporate into the air, and in dry air skin can end up tighter than before. A moisturizer does two things. Its emollients (squalane, fatty acids, ceramides) fill the cracks between dry skin cells so the surface is smooth again, and its lighter oils make a thin layer that slows water from leaving. Put it on while skin is still a little damp from your serum so it holds that water in. Oily skin loses water too, and that’s often why it overproduces oil.",
    picks: [
      { ...P("", ["oily", "dehyd"], "Purito", "Oat-in Calming Gel Cream", 2, "Softens without feeling heavy.", "v44 0:44 @ginaseooo · v38 2:09 @charinecheungg"), has: ["Panthenol", "Beta-glucan", "Squalane"], bestFor: "Most skin types, especially sensitive, oily or dehydrated skin." },
      { ...P("", ["oily"], "Aestura", "Atobarrier 365 Hydro Soothing Cream", 2, "A light gel-cream.", "v49 0:26 @yejee.lee · v43 1:10 @donatsuyang"), has: ["Ceramides", "Cholesterol"], bestFor: "Most skin types, especially dehydrated or sensitive skin." },
      { ...P("", ["oily"], "Epi", "Double Up Cream", 1, "", "v10 3:33 · v16 1:37 @sunnyfromsunnybread"), has: ["Panthenol", "Squalane"], bestFor: "Dry or dehydrated skin. It has rosewood oil, an essential oil, so skip it if fragrance bothers you." },
      { ...P("", ["acne"], "Dr.Althea", "345 Relief Cream", 1, "", "v43 2:05 @donatsuyang"), has: ["Panthenol", "Centella", "Ceramides"], bestFor: "Most skin types, including acne-prone skin. Very reactive skin should be careful, since it has tea tree leaf water and niacinamide." },
      { ...P("", ["oily"], "Dieux", "Air Angel Peptide Plumping Gel Cream", 1, "", ""), has: ["Glycerin", "Hyaluronic acid", "Ceramides"], bestFor: "Most skin types, especially oily, combination or blemish-prone skin. Very sensitive skin should be careful, since it has some lactic acid." },
    ],
    rest: [
    ],
  },
  {
    id: "sunscreen",
    name: "Sunscreen",
    when: "Every morning, last step",
    does: "Protects your skin from UV every day, even when it’s cloudy or you’re mostly inside. Put it on as the last step of your morning routine, after moisturizer.",
    why: "UV damages the barrier and slows down healing, and it makes redness and the dark marks left by pimples last longer. A damaged barrier is also more easily irritated by the sun, so daily sunscreen protects all the repair work the rest of this routine is doing.",
    comingSoon: "I’ll add sunscreen products soon.",
    picks: [],
    rest: [],
  },
  {
    id: "barrier-cream",
    name: "Barrier cream or balm",
    when: "Night, or only on raw patches",
    does: "Seals everything in overnight so the barrier can repair. With oily skin, use it only where it’s dry or raw.",
    why: "Your barrier is like a brick wall: skin cells are the bricks, and fats (ceramides, cholesterol and fatty acids) are the mortar that keeps water in. When the barrier is damaged, the mortar has gaps, and a light moisturizer alone often can’t keep water from escaping through them. A barrier cream or balm is the heavy top layer. It uses occlusives (petrolatum, dimethicone, shea butter) that leave a film on the skin, a bit like a lid on a pot, so the water from your toner, serum and moisturizer can’t evaporate. Many also add the same fats your barrier is missing, plus panthenol to calm it. With that layer on, skin stays hydrated long enough to rebuild its own barrier, and it does most of that repair overnight, which is why this step goes last, at night. It only seals in what’s under it, so put it on over your hydrating layers, not on dry skin.",
    note: "These products are really heavy and can clog your pores, so only use this if your skin barrier is really damaged.",
    picks: [
      { ...P("", ["red"], "La Roche-Posay", "Cicaplast Baume B5", 4, "5% panthenol is a lot, and its centella is madecassoside, the most calming part of the plant.", "v35 1:19 @charinecheungg · v43 0:37 @donatsuyang · v05 0:42 @skinfiltrator · v10 4:16"), has: ["Panthenol", "Centella", "Shea butter"], bestFor: "Dry or sensitive skin. If you’re oily, use it only on dry or raw patches." },
      { ...P("", ["dry"], "Avène", "Cicalfate+ Restorative Protective Cream", 2, "", "v43 0:20 @donatsuyang · v46 1:47 @jordynwoodruff"), has: ["Glycerin", "Mineral oil", "Beeswax"], bestFor: "Dry or damaged skin. It may be too rich for oily or clog-prone skin." },
    ],
    rest: [
    ],
  },
];
