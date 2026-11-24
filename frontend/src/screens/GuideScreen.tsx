import { useState, type ReactNode } from "react";
import { GUIDE_STEPS, INGREDIENT_GROUPS, productImage, skinTypeOnly, type GuideProduct } from "../lib/barrierGuide";

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

/** One recommended product's card: photo, name, and who it suits. */
function PickCard({ p }: { p: GuideProduct }) {
  return (
    <article className="pick">
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
            {skinTypeOnly(p.bestFor)}
          </span>
        )}
        {p.why && <span className="muted">{p.why}</span>}
        {p.unconfirmed && (
          <div className="pick-foot">
            <div className="row">
              <span className="badge unc">Name unconfirmed</span>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Shown over a step's products while signed out: the cards underneath are blurred
 * and can't be read, clicked or tabbed into, and these two links lead to the sign-up card.
 */
function LockedPicks({ children, more }: { children: ReactNode; more: number }) {
  return (
    <div className="guide-locked">
      {/* inert: no clicks or keyboard focus. aria-hidden: screen readers skip what sighted people can't read. */}
      <div className="guide-locked-blur" inert aria-hidden="true">
        {children}
      </div>
      <div className="guide-lock">
        <b>Log in to see the products{more > 0 ? ` (and ${more} more options)` : ""}</b>
        <div className="row">
          {/* #/log shows the sign-up card while signed out; #/login shows the log-in form. */}
          <a className="btn primary small" href="#/log">
            Sign up free
          </a>
          <a className="btn small" href="#/login">
            Log in
          </a>
        </div>
      </div>
    </div>
  );
}

/** Barrier repair routine: each step's creator-recommended options. Signed out, the steps show but the products are blurred. */
export function GuideScreen({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="guide">
      <header className="guide-head">
        <span className="eyebrow">Barrier repair guide</span>
        <h2 className="display">Your routine, step by step. Pick what fits your skin.</h2>

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
            You’ll find these again and again in the products below, on purpose.
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

            {signedIn ? (
              <div className="guide-picks">{s.picks.map((p) => <PickCard key={p.name} p={p} />)}</div>
            ) : (
              s.picks.length > 0 && (
                <LockedPicks more={s.rest.length}>
                  <div className="guide-picks">{s.picks.map((p) => <PickCard key={p.name} p={p} />)}</div>
                </LockedPicks>
              )
            )}

            {/* The extra options stay hidden until signed in; the lock above counts them. */}
            {signedIn && s.rest.length > 0 && (
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
