import { useState } from "react";
import { GUIDE_STEPS, INGREDIENT_GROUPS, productImage, type GuideProduct } from "../lib/barrierGuide";

/** A product's ingredients sorted by what they do, e.g. "Calms: Centella, Panthenol". */
function IngredientJobs({ p, byJob }: { p: GuideProduct; byJob?: boolean }) {
  const has: readonly string[] = p.has ?? [];
  if (!byJob) {
    return has.length > 0 ? (
      <span className="pick-jobs">
        <b>Key ingredients:</b> {has.join(", ")}
      </span>
    ) : null;
  }
  const rows = INGREDIENT_GROUPS.map((g) => ({ ...g, found: g.items.filter((i) => has.includes(i)) })).filter(
    (g) => g.found.length > 0,
  );
  if (rows.length === 0) return null;
  return (
    <ul className="pick-jobs" aria-label="Key ingredients">
      {rows.map((g) => (
        <li key={g.job}>
          <b>{g.job}:</b> {g.found.join(", ")}
        </li>
      ))}
    </ul>
  );
}

/** The product's photo, or its brand's initial until a photo is added. */
function ProductPhoto({ p, small }: { p: GuideProduct; small?: boolean }) {
  const [missing, setMissing] = useState(false);
  const cls = `product-photo${small ? " small" : ""}`;
  if (missing) {
    return (
      <div className={`${cls} empty`} aria-hidden="true">
        {p.brand.charAt(0)}
      </div>
    );
  }
  return (
    <div className={cls}>
      <img src={productImage(p)} alt={`${p.brand} ${p.name}`} loading="lazy" onError={() => setMissing(true)} />
    </div>
  );
}

/** Barrier repair routine: each step's creator-recommended options. */
export function GuideScreen() {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="guide">
      <header className="guide-head">
        <span className="eyebrow">Barrier repair guide</span>
        <h2 className="display">Your routine, step by step. Pick what fits your skin.</h2>
        <p className="lead">
          <b>Made for a damaged barrier and sensitive skin, and just as good for keeping a healthy one strong.</b> A
          stronger barrier makes skin more tolerant, so this helps whatever your main concern is. It’s a good routine if
          you’re just starting skincare, and worth keeping after your skin heals. Each product says who it’s best for.
        </p>

        <section className="guide-base" aria-labelledby="guide-start-h">
          <b id="guide-start-h">How to start</b>
          <ol className="guide-timeline">
            <li>
              <span className="chip accent">First 4–6 weeks</span>
              <details className="guide-fold">
                <summary>Find a base routine that doesn’t break you out.</summary>
                <span>
                  Just a gentle cleanser, a moisturizer and sunscreen. With only three products, a breakout’s cause is
                  easy to find, and everything you add later goes on top. Give it 4–6 weeks: clogged pores can take that
                  long to show up.
                </span>
              </details>
            </li>
            <li>
              <span className="chip accent">The whole time</span>
              <details className="guide-fold">
                <summary>Be patient. It’s the hardest part, and it matters most.</summary>
                <span>It’s tempting to try lots of new products to heal faster, but that usually sets you back:</span>
                <ul>
                  <li>Every new product is another chance to irritate skin that’s already struggling.</li>
                  <li>Start several at once and break out, and you won’t know which one did it.</li>
                  <li>A damaged barrier needs weeks of calm. More products won’t speed that up.</li>
                </ul>
                <span className="guide-voice">
                  I learned this the hard way: I kept switching to something new, and that was a mistake.
                </span>
              </details>
            </li>
            <li>
              <span className="chip accent">Once skin stays calm</span>
              <details className="guide-fold">
                <summary>Add one product at a time.</summary>
                <span>
                  Add a toner or serum and give it about 3 weeks. Gentle products rarely break you out, but any new one
                  can. If it stings, turns red or breaks you out, swap it for another option in the same step.
                </span>
              </details>
            </li>
          </ol>
        </section>

        <section className="guide-base" aria-labelledby="guide-ingredients-h">
          <b id="guide-ingredients-h">What ingredients are good for your skin barrier?</b>
          <span>
            You’ll see these again and again in this guide, on purpose. Each product lists its ingredients under these same
            jobs, so you can see why they’re in there.
          </span>
          <ul className="guide-ingredients">
            {INGREDIENT_GROUPS.map(({ title, items, what }) => (
              <li key={title}>
                <b>{title}</b>
                <span className="guide-ingredient-names">{items.join(", ")}</span>
                <span>{what}</span>
              </li>
            ))}
          </ul>
          <details className="guide-fold">
            <summary>Why these help</summary>
            <span>
              Your barrier is like a brick wall: skin cells are the bricks, and fats are the mortar holding them together.
              When it’s damaged, the mortar has gaps, so water escapes and irritants get in. These ingredients fill the
              gaps, put water back and calm skin while it heals.
            </span>
            <span>
              Seeing them on a label is a good sign, not a guarantee. How much is in it and what else is in the formula
              matter too, so still try one new product at a time.
            </span>
          </details>
        </section>

        <details className="guide-base guide-fold">
          <summary>These are options, not the only products that can work.</summary>
          <span>
            I chose these because they’re made for sensitive skin and they’ve worked for me and my friends, so any of them
            is a safe place to start. You don’t need the perfect one. Some suit drier skin, some suit oily skin, and some
            may not work for you at all.
          </span>
          <span>
            Other products may work even better. Just make sure they’re made for sensitive skin, and learn which ingredients
            your skin reacts to. Niacinamide is a common one, so check the ingredient list before you buy.
          </span>
        </details>

        {/* Buttons, not #anchors: the hash holds the app's route. */}
        <nav className="row" aria-label="Steps">
          {GUIDE_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="pill"
              onClick={() => document.getElementById(`step-${s.id}`)?.scrollIntoView({ behavior: "smooth" })}
            >
              {i + 1} · {s.name}
            </button>
          ))}
        </nav>
      </header>

      {GUIDE_STEPS.map((s, i) => {
        const isOpen = !!open[s.id];
        return (
          <section key={s.id} id={`step-${s.id}`} className="guide-step" aria-labelledby={`step-${s.id}-h`}>
            <div className="guide-step-head">
              <span className="step-num" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <div className="row">
                  <h3 id={`step-${s.id}-h`}>{s.name}</h3>
                  <span className="chip accent">{s.when}</span>
                  {s.later && <span className="chip">Add later</span>}
                </div>
                {s.does && (
                  <p>
                    <b>What this step does: </b>
                    {s.does}
                  </p>
                )}
                {s.note && (
                  <p>
                    <b>My take: </b>
                    {s.note}
                  </p>
                )}
                {s.why && (
                  <details className="guide-fold">
                    <summary>Why it’s needed</summary>
                    <span>{s.why}</span>
                  </details>
                )}
              </div>
            </div>

            {s.comingSoon && (
              <div className="guide-soon">
                <span className="chip">Coming soon</span>
                <span>{s.comingSoon}</span>
              </div>
            )}

            <div className="guide-picks">
              {s.picks.map((p) => (
                <article key={p.name} className="pick">
                  {p.label && <div className="pick-label">{p.label}</div>}
                  <ProductPhoto p={p} />
                  <div className="pick-body">
                    <div>
                      <span className="brand">{p.brand}</span>
                      <span className="name">{p.name}</span>
                    </div>
                    {p.bestFor && (
                      <span>
                        <b>Best skin type: </b>
                        {p.bestFor}
                      </span>
                    )}
                    <IngredientJobs p={p} byJob={s.byJob} />
                    {p.why && (
                      <span>
                        <b>Also: </b>
                        {p.why}
                      </span>
                    )}
                    {p.unconfirmed && (
                      <div className="pick-foot">
                        <div className="row">
                          <span className="badge unc">Name unconfirmed</span>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {s.rest.length > 0 && (
              <div className="guide-more">
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen({ ...open, [s.id]: !isOpen })}>
                  <span>
                    {s.rest.length} more options
                  </span>
                  <span className="chev" aria-hidden="true">
                    {isOpen ? "Hide −" : "Show +"}
                  </span>
                </button>
                {isOpen && (
                  <ul>
                    {s.rest.map((p) => (
                      <li key={p.name}>
                        <ProductPhoto p={p} small />
                        <div className="more-main">
                          {p.label && <span className="more-label">{p.label}</span>}
                          <span className="name">
                            {p.brand} {p.name}
                          </span>
                          <IngredientJobs p={p} byJob={s.byJob} />
                          {p.why && <span>{p.why}</span>}
                        </div>
                        {p.unconfirmed && (
                          <div className="more-side">
                            <div className="row">
                              <span className="badge unc">Name unconfirmed</span>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
