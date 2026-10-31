import { useState } from "react";
import { GUIDE_STEPS, NEEDS, productImage, type GuideProduct, type Need } from "../lib/barrierGuide";

function Badges({ p, fits }: { p: GuideProduct; fits: boolean }) {
  return (
    <>
      {fits && <span className="badge fit">Fits your skin</span>}
      {p.paid && <span className="badge paid">PAID</span>}
      {p.unconfirmed && <span className="badge unc">Name unconfirmed</span>}
    </>
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

/** Barrier repair routine: each step's creator-recommended options, highlighted by skin need. */
export function GuideScreen() {
  const [need, setNeed] = useState<Need | "all">("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const filtering = need !== "all";
  const fits = (p: GuideProduct) => filtering && p.needs.includes(need);
  // Matches move first; the rest stay visible, just faded.
  const sorted = (list: GuideProduct[]) => (filtering ? [...list].sort((a, b) => Number(fits(b)) - Number(fits(a))) : list);
  const faded = (p: GuideProduct) => filtering && !fits(p);

  return (
    <div className="guide">
      <header className="guide-head">
        <span className="eyebrow">Barrier repair guide</span>
        <h2 className="display">Your routine, step by step. Pick what fits your skin.</h2>
        <p className="lead">
          <b>These products are for a damaged skin barrier and sensitive skin.</b> They’ll work whatever your main
          concern is, because a strong barrier makes your skin more tolerant, so it’s less likely to break out or get
          irritated. If you have a specific need, use{" "}
          <button
            type="button"
            className="link-btn"
            onClick={() => document.getElementById("guide-filter")?.scrollIntoView({ behavior: "smooth" })}
          >
            the skin type buttons
          </button>{" "}
          below to find the products made for it.
        </p>
        <p className="lead">
          There’s no single best product. Each option says who it’s best for, according to the creator who recommended it.
          Every one cites the video and timestamp.
        </p>

        <div className="guide-how">
          <div>
            <b>Every product here is gentle and made for sensitive skin.</b>
            <span>
              They skip the harsh stuff, so any of them is a safe place to start. You don’t need to find the perfect one.
            </span>
          </div>
          <div>
            <b>Try one, then watch how your skin reacts.</b>
            <span>
              Pick one per step and stick with it for about two weeks. If it stings, turns red, or breaks you out, swap
              it for another option in the same step.
            </span>
          </div>
          <div>
            <b>Prone to pimples?</b>
            <span>
              Gentle products are much less likely to break you out, but any new product can. Add one new thing at a
              time so you know which one caused it.
            </span>
          </div>
        </div>

        <div className="guide-filter" id="guide-filter">
          <div className="row" role="group" aria-label="Filter by skin type">
            {NEEDS.map((n) => (
              <button
                key={n.id}
                type="button"
                className="pill"
                aria-pressed={need === n.id}
                onClick={() => setNeed(n.id)}
              >
                {n.label}
              </button>
            ))}
          </div>
          <span className="muted">
            {filtering
              ? "Options that fit are highlighted and moved first. The rest are faded, not hidden."
              : "Pick one to highlight the options that fit you in every step."}
          </span>
        </div>

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
        const restFits = s.rest.filter(fits).length;
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
                </div>
                <p>
                  <b>What this step does: </b>
                  {s.does}
                </p>
                {s.why && (
                  <p>
                    <b>Why it’s needed: </b>
                    {s.why}
                  </p>
                )}
                {s.note && (
                  <p>
                    <b>My take: </b>
                    {s.note}
                  </p>
                )}
                {s.how && (
                  <>
                    <p>
                      <b>How to do it:</b>
                    </p>
                    <ol className="guide-how-to">
                      {s.how.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            </div>

            <div className="guide-picks">
              {sorted(s.picks).map((p) => (
                <article key={p.name} className={`pick${fits(p) ? " fits" : ""}${faded(p) ? " faded" : ""}`}>
                  {p.label && <div className="pick-label">{p.label}</div>}
                  <ProductPhoto p={p} />
                  <div className="pick-body">
                    <div>
                      <span className="brand">{p.brand}</span>
                      <span className="name">{p.name}</span>
                    </div>
                    {p.texture && (
                      <span>
                        <b>Texture: </b>
                        {p.texture}
                      </span>
                    )}
                    {p.bestFor && (
                      <span>
                        <b>Best skin type: </b>
                        {p.bestFor}
                      </span>
                    )}
                    <span>
                      <b>Why: </b>
                      {p.why}
                    </span>
                    <div className="pick-foot">
                      <div className="row">
                        <Badges p={p} fits={fits(p)} />
                      </div>
                      {p.source && <span className="source">{p.source}</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {s.rest.length > 0 && (
              <div className="guide-more">
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen({ ...open, [s.id]: !isOpen })}>
                  <span>
                    {s.rest.length} more options{restFits > 0 && ` · ${restFits} fit your skin`}
                  </span>
                  <span className="chev" aria-hidden="true">
                    {isOpen ? "Hide −" : "Show +"}
                  </span>
                </button>
                {isOpen && (
                  <ul>
                    {sorted(s.rest).map((p) => (
                      <li key={p.name} className={faded(p) ? "faded" : undefined}>
                        <ProductPhoto p={p} small />
                        <div className="more-main">
                          {p.label && <span className="more-label">{p.label}</span>}
                          <span className="name">
                            {p.brand} {p.name}
                          </span>
                          <span>{p.why}</span>
                        </div>
                        <div className="more-side">
                          <div className="row">
                            <Badges p={p} fits={fits(p)} />
                          </div>
                          {p.source && <span className="source">{p.source}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}

      <footer className="guide-foot muted">
        <span>
          A summary of creator advice, not medical advice. Follow for 4–6 weeks (8 if very damaged) before adding actives
          back (v46 2:12).
        </span>
        <span>See a dermatologist if skin hurts, blisters, swells, or acne doesn’t improve.</span>
      </footer>
    </div>
  );
}
