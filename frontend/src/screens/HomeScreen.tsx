import { type CSSProperties, Suspense, lazy, useEffect, useRef, useState } from "react";
import { TunedPhoto, TuningProvider } from "../components/TunedPhoto";
import { LONG_DATE, prettyDate } from "../lib/dates";

/** The framing panel, only while developing; the built site never includes it. */
const PhotoTuner = import.meta.env.DEV ? lazy(() => import("../components/PhotoTuner")) : null;

/** The day each progress photo was taken, first to latest, as they play in the slider. */
const TAKEN = [
  "2024-09-20", "2024-09-20", "2024-10-17", "2024-11-27", "2024-12-01", "2024-12-01",
  "2024-12-03", "2024-12-21", "2024-12-21", "2024-12-26", "2025-03-22", "2025-04-03",
  "2025-04-05", "2025-04-08", "2025-04-14", "2025-04-14", "2025-05-02", "2025-05-25",
  "2025-05-25", "2025-06-30", "2025-06-30", "2025-07-12", "2025-10-15", "2025-10-15",
  "2026-02-13", "2026-03-18", "2026-04-06", "2026-05-20", "2026-06-24", "2026-08-03",
  "2026-10-22",
];

interface Frame {
  url: string;
  date: string;
}

/** Files in public/progress, numbered in play order. */
const FRAMES: Frame[] = TAKEN.map((date, i) => ({ url: `/progress/${String(i + 1).padStart(2, "0")}.jpg`, date }));

/** Photo numbers kept on disk but left out of the slider. 7 is Dec 3, 2024. */
const LEFT_OUT = new Set([7]);

/** The photos the slider plays through. */
const SLIDER_FRAMES = FRAMES.filter((_, i) => !LEFT_OUT.has(i + 1));

/** Shows HERO_PAIRS at the top of the page instead of the slider. Set to false to bring the slider back. */
const SHOW_PAIRS_IN_HERO = true;

/**
 * A face photo on this page: an untouched photo from public/progress/original, framed by its slot's
 * entry in src/lib/homePhotoFraming.json. Run the dev server and use "Tune photos" to change the framing.
 */
interface HomePhoto {
  slot: string;
  /** Number of the photo in public/progress/original (the same numbers as tools/photo-picker.html). */
  photo: number;
  date: string;
}

export const originalUrl = (n: number) => `/progress/original/${String(n).padStart(2, "0")}.jpg`;

/** Before/after pairs picked in tools/photo-picker.html. The sign-up screen shows the first one too. */
export const HERO_PAIRS: { before: HomePhoto; after: HomePhoto }[] = [
  {
    before: { slot: "hero-1-before", photo: 7, date: "2024-11-27" },
    after: { slot: "hero-1-after", photo: 47, date: "2026-11-03" },
  },
  {
    before: { slot: "hero-2-before", photo: 32, date: "2026-05-20" },
    after: { slot: "hero-2-after", photo: 51, date: "2026-11-03" },
  },
];

/** Thumbnail rows hold at most this many, split evenly. */
const THUMBS_PER_ROW = 9;

/** How see-through the photos beside the current one are, then the ones past those. */
const SIDE_FADE = 0.4;
const FAR_FADE = 0.15;

interface RoutineProduct {
  brand: string;
  product: string;
  /** Photo in public/products. Leave out until there is one. */
  image?: string;
}

interface Chapter {
  title: string;
  story: string;
  before: HomePhoto;
  after: HomePhoto;
  /** Where things ended up, for a routine that carries on past its "after". */
  now?: HomePhoto;
  routine: RoutineProduct[];
}

/** Each routine, what it did, and the photos from the start and end of it. */
const CHAPTERS: Chapter[] = [
  {
    title: "Calming my skin down",
    story: "This routine calmed my skin down. I stopped switching between so many products and chose three based on my skin type and concerns.",
    before: { slot: "routine-1-before", photo: 6, date: "2024-11-23" },
    after: { slot: "routine-1-after", photo: 24, date: "2025-06-30" },
    routine: [
      { brand: "La Roche-Posay", product: "Toleriane Hydrating Gentle Cleanser", image: "/products/la-roche-posay--toleriane-hydrating-gentle-cleanser.jpg" },
      { brand: "SKIN1004", product: "Madagascar Centella Ampoule", image: "/products/skin1004--madagascar-centella-ampoule.jpg" },
      { brand: "Purito", product: "Oat-in Calming Gel Cream", image: "/products/purito--oat-in-calming-gel-cream.jpg" },
    ],
  },
  {
    title: "Repairing my barrier",
    story: "This is how I've been repairing my skin barrier. Now my main focus is building a stronger barrier, and this is my current routine.",
    // Before: pair 3's left in the photo picker. After: pair 4's right.
    before: { slot: "routine-2-before", photo: 20, date: "2025-04-14" },
    after: { slot: "routine-2-after", photo: 29, date: "2026-02-13" },
    routine: [
      { brand: "107 Beauty", product: "Chaga Jelly Low pH Cleanser", image: "/products/107-beauty--chaga-jelly-low-ph-cleanser.jpg" },
      { brand: "107 Beauty", product: "Micro Drizzle Hydro Toner", image: "/products/107-beauty--micro-drizzle-hydro-toner.jpg" },
      { brand: "IUNIK", product: "Beta-Glucan Serum", image: "/products/iunik--beta-glucan-serum.jpg" },
      { brand: "Aestura", product: "Atobarrier 365 Hydro Soothing Cream", image: "/products/aestura--atobarrier-365-hydro-soothing-cream.jpg" },
    ],
  },
];

/** Photo of every product I've used. */
const PRODUCTS_PHOTO: string | null = "/proof/products.jpg";

/** The two things that cleared my skin, shown right under the photos. */
const WHAT_CLEARED = [
  {
    title: "Choosing the right products",
    body: ["I stopped switching between so many products and chose a few based on my skin type and concerns."],
  },
  {
    title: "Tracking my routine",
    body: [
      "This was the most important thing I did. Before I started, I kept switching products and had no idea what was helping and what was making it worse.",
      "Breakouts can feel like something you can't control. Writing down what you use and what your skin does each day gives you something you can control. When a breakout shows up, you look back at your log instead of guessing, and that takes a lot of the stress away. Less stress is better for your skin, too.",
    ],
  },
];

function PlayIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

/** Opacity of a photo `d` places away from the current one: solid, then see-through, then faint. */
function fade(d: number): number {
  if (d < 1) return 1 - d * (1 - SIDE_FADE);
  if (d < 2) return SIDE_FADE - (d - 1) * (SIDE_FADE - FAR_FADE);
  return FAR_FADE;
}

/** Drag or play through the progress photos, first to latest, with the ones either side showing through. */
function PhotoSlider({ frames }: { frames: Frame[] }) {
  // A fraction while dragging, so the strip glides; whole again when let go.
  const [pos, setPos] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [playing, setPlaying] = useState(false);
  const count = frames.length;
  const last = count - 1;
  const clamped = Math.min(Math.max(pos, 0), Math.max(last, 0));
  const current = Math.round(clamped);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setPos((p) => {
        const next = Math.round(p) + 1;
        if (next > last) {
          setPlaying(false);
          return p;
        }
        return next;
      });
    }, 1100);
    return () => clearInterval(timer);
  }, [playing, last]);

  function togglePlay() {
    if (playing) return setPlaying(false);
    if (current >= last) setPos(0);
    setDragging(false);
    setPlaying(true);
  }

  function pick(i: number) {
    setPlaying(false);
    setDragging(false);
    setPos(i);
  }

  function drag(p: number) {
    setPlaying(false);
    setDragging(true);
    setPos(p);
  }

  function snap() {
    setDragging(false);
    setPos((p) => Math.round(p));
  }

  return (
    <div className="slider">
      <div className={`peek-strip${dragging ? " dragging" : ""}`}>
        {frames.map((f, i) => {
          const d = Math.abs(i - clamped);
          const stage = i === last && count > 1 ? "Now" : i === 0 ? "Then" : "Along the way";
          return (
            <button
              key={f.url}
              type="button"
              className="peek-card"
              aria-current={i === current ? "true" : undefined}
              aria-label={`Photo ${i + 1} of ${count}, ${prettyDate(f.date, LONG_DATE)}`}
              onClick={() => pick(i)}
              style={{
                left: `${17 + (i - clamped) * 70}%`,
                opacity: fade(d),
                transform: `scale(${1 - Math.min(1, d) * 0.1})`,
                zIndex: 20 - Math.round(d * 2),
              }}
            >
              <img src={f.url} alt="" />
              <span className={`hero-pill${stage === "Now" ? " now" : ""}`}>{stage}</span>
              <span className="hero-pill counter">
                {i + 1} of {count}
              </span>
              <span className="hero-pill date">{prettyDate(f.date, LONG_DATE)}</span>
            </button>
          );
        })}
      </div>
      {count > 1 && (
        <>
          <div className="slider-controls">
            <button type="button" className="play" onClick={togglePlay} aria-label={playing ? "Pause" : "Play through photos"}>
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <label className="grow">
              <input
                type="range"
                min={0}
                max={last}
                step={0.01}
                value={clamped}
                onChange={(e) => drag(Number(e.target.value))}
                onPointerUp={snap}
                onKeyUp={snap}
                onBlur={snap}
                aria-label="Drag through progress photos"
              />
              <span className="slider-ends">
                <span>Then</span>
                <span>Now</span>
              </span>
            </label>
          </div>
          <div className="slider-thumbs" style={{ "--per-row": Math.ceil(count / Math.ceil(count / THUMBS_PER_ROW)) } as CSSProperties}>
            {frames.map((f, i) => (
              <button
                key={f.url}
                type="button"
                aria-pressed={i === current}
                aria-label={`Photo ${i + 1} of ${count}, ${prettyDate(f.date, LONG_DATE)}`}
                onClick={() => pick(i)}
              >
                <img src={f.url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ChapterPhoto({ label, photo }: { label: "Before" | "After" | "Now"; photo: HomePhoto }) {
  return (
    <figure>
      <TunedPhoto slot={photo.slot} src={originalUrl(photo.photo)} alt={label} />
      <span className={`hero-pill${label === "Before" ? "" : " now"}`}>{label}</span>
    </figure>
  );
}

/** The hook: one before/after at a time, the time between them, and thumbnails to switch pairs. */
function HeroCompare() {
  // Opens on the last pair (the right-hand thumbnail); the thumbnail on the left switches to the first.
  const [index, setIndex] = useState(HERO_PAIRS.length - 1);
  const { before, after } = HERO_PAIRS[index];
  return (
    <div className="compare-card">
      <div className="compare-photos">
        {([["Before", before], ["After", after]] as const).map(([label, photo]) => (
          <figure key={label}>
            <TunedPhoto slot={photo.slot} src={originalUrl(photo.photo)} alt={label} lazy={false} />
            <span className={`hero-pill${label === "Before" ? "" : " now"}`}>{label}</span>
          </figure>
        ))}
      </div>
      <div className="compare-foot">
        {HERO_PAIRS.length > 1 && (
          <div className="compare-pick" role="group" aria-label="Choose a before and after">
            {HERO_PAIRS.map((pair, i) => (
              <button key={pair.before.slot} type="button" aria-pressed={i === index} aria-label={`Before and after ${i + 1}`} onClick={() => setIndex(i)}>
                <TunedPhoto slot={pair.before.slot} src={originalUrl(pair.before.photo)} alt="" interactive={false} lazy={false} />
                <TunedPhoto slot={pair.after.slot} src={originalUrl(pair.after.photo)} alt="" interactive={false} lazy={false} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** A proof photo shown whole, or a marked slot until there is one. */
function ProofPhoto({ src, alt, slot }: { src: string | null; alt: string; slot: string }) {
  if (!src) return <div className="proof-photo empty">{slot}</div>;
  return <img className="proof-photo" src={src} alt={alt} loading="lazy" />;
}

/** The products in one routine, each with its photo, brand and name. */
function RoutineList({ routine }: { routine: RoutineProduct[] }) {
  return (
    <ul className="routine-list">
      {routine.map((r) => (
        <li key={r.product}>
          {r.image ? (
            <span className="product-photo small">
              <img src={r.image} alt="" loading="lazy" />
            </span>
          ) : (
            <span className="product-photo small empty" aria-hidden="true">
              ?
            </span>
          )}
          <span>
            <span className="brand">{r.brand}</span>
            <b>{r.product}</b>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * What signed-out visitors see instead of the product list: the same list blurred, with a lock and
 * a sign-up button on top. The blur is only a teaser: the names are still in the page's code.
 */
function LockedRoutine({ routine }: { routine: RoutineProduct[] }) {
  return (
    <div className="routine-locked">
      {/* inert: nobody can tab into or select the blurred rows; screen readers skip them too. */}
      <div className="routine-locked-blur" inert>
        <RoutineList routine={routine} />
      </div>
      <div className="routine-lock">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        <p>
          Sign up to see the {routine.length} products I used
        </p>
        <a className="btn primary" href="#/log">
          Sign up free
        </a>
      </div>
    </div>
  );
}

/** Landing page: my skin's progress, what cleared it, each routine, and every product I used. */
export function HomeScreen({ signedIn = true }: { signedIn?: boolean }) {
  const routines = useRef<HTMLElement>(null);

  return (
    <TuningProvider>
    <div className="landing">
      {PhotoTuner && (
        <Suspense fallback={null}>
          <PhotoTuner />
        </Suspense>
      )}
      <section className={`wrap hero${SHOW_PAIRS_IN_HERO ? " hero-compare" : ""}`}>
        <div className="hero-copy">
          <h2 className="display">
            How my skin <em>cleared up.</em>
          </h2>
          <div className="row">
            <a className="btn primary" href="#/log">
              {signedIn ? "Start your own log" : "Sign up to start logging"}
            </a>
            <button type="button" className="btn" onClick={() => routines.current?.scrollIntoView({ behavior: "smooth" })}>
              See what I did
            </button>
          </div>
        </div>
        {SHOW_PAIRS_IN_HERO ? <HeroCompare /> : <PhotoSlider frames={SLIDER_FRAMES} />}
      </section>

      <section>
        <div className="wrap stack">
          <div className="section-intro">
            <span className="eyebrow">01 · What cleared my skin</span>
            <h2 className="display">Two things cleared my skin.</h2>
            <p className="muted">
              Besides drinking water, getting enough sleep and keeping stress down, these are the two things you should be doing.
            </p>
          </div>
          <ol className="cleared">
            {WHAT_CLEARED.map((w, i) => (
              <li key={w.title}>
                <span className="cleared-num" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>{w.title}</h3>
                {w.body.map((line) => (
                  <p key={line} className="muted">
                    {line}
                  </p>
                ))}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band" ref={routines}>
        <div className="wrap stack">
          <div className="section-intro">
            <span className="eyebrow">02 · My routines</span>
            <h2 className="display">Two routines, and what each one did.</h2>
          </div>
          <ol className="chapters">
            {CHAPTERS.map((c, i) => (
              <li key={c.title} className="chapter">
                <div className="chapter-side before">
                  <ChapterPhoto label="Before" photo={c.before} />
                </div>
                <div className="chapter-copy">
                  <div className="chapter-meta">
                    <span className="eyebrow">Routine {i + 1}</span>
                  </div>
                  <h3 className="display">{c.title}</h3>
                  <p className="muted">{c.story}</p>
                  <span className="used-label">What I used</span>
                  {signedIn ? <RoutineList routine={c.routine} /> : <LockedRoutine routine={c.routine} />}
                </div>
                <div className="chapter-side after">
                  {/* One photo on the right: where the routine ended up. */}
                  {c.now ? <ChapterPhoto label="Now" photo={c.now} /> : <ChapterPhoto label="After" photo={c.after} />}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section>
        <div className="wrap stack">
          <div className="section-intro">
            <span className="eyebrow">03 · Every product I used</span>
            <h2 className="display">I tried a lot.</h2>
          </div>
          <ProofPhoto src={PRODUCTS_PHOTO} alt="Every skincare product I've used" slot="[Photo of all your products]" />
        </div>
      </section>

      <section className="wrap">
        <div className="cta">
          <div className="section-intro">
            <h2 className="display">
              Find out what works on <em>your</em> skin
            </h2>
            <p className="muted">Log your products, mark what you see on a face map, and take a photo each day.</p>
          </div>
          <a className="btn primary" href="#/log">
            {signedIn ? "Start your log" : "Sign up to start logging"}
          </a>
        </div>
      </section>
    </div>
    </TuningProvider>
  );
}
