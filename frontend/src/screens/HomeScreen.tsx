import { type CSSProperties, useEffect, useRef, useState } from "react";
import { LONG_DATE, prettyDate } from "../lib/dates";

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

/** Thumbnail rows hold at most this many, split evenly. */
const THUMBS_PER_ROW = 9;

/** How see-through the photos beside the current one are, then the ones past those. */
const SIDE_FADE = 0.4;
const FAR_FADE = 0.15;

const SYMPTOMS = [
  "Pimples that keep coming back",
  "Clogged pores and blackheads",
  "Whiteheads",
  "Red marks that stay after a pimple heals",
  "Redness and irritation",
  "Skin that's oily but still feels dry",
  "Not knowing which product is causing what",
];

interface RoutineProduct {
  brand: string;
  product: string;
  /** Photo in public/products. Leave out until there is one. */
  image?: string;
}

/** A photo framed by hand for one spot, shown whole rather than trimmed to fit. */
interface FramedPhoto extends Frame {
  width: number;
  height: number;
}

interface Chapter {
  title: string;
  story: string;
  /** A number is that photo in public/progress, as in the slider's "1 of 31". */
  before: number | FramedPhoto;
  after: number | FramedPhoto;
  /** Where things ended up, for a routine that carries on past its "after". */
  now?: FramedPhoto;
  routine: RoutineProduct[];
}

/** Each routine, what it did, and the photos from the start and end of it. */
const CHAPTERS: Chapter[] = [
  {
    title: "Calming my skin down",
    story: "This routine calmed my skin down. I stopped switching between so many products and chose three based on my skin type and concerns.",
    before: { url: "/progress/framed/2024-11-23-from-06-1.jpg", date: "2024-11-23", width: 945, height: 784 },
    after: { url: "/progress/framed/2025-06-30-from-24-1.jpg", date: "2025-06-30", width: 945, height: 784 },
    routine: [
      { brand: "La Roche-Posay", product: "Toleriane Hydrating Gentle Cleanser", image: "/products/la-roche-posay--toleriane-hydrating-gentle-cleanser.jpg" },
      { brand: "SKIN1004", product: "Madagascar Centella Ampoule", image: "/products/skin1004--madagascar-centella-ampoule.jpg" },
      { brand: "Purito", product: "Oat-in Calming Gel Cream", image: "/products/purito--oat-in-calming-gel-cream.jpg" },
    ],
  },
  {
    title: "Rushing into new products, then building my barrier back",
    story: "I thought my skin barrier was healed, so I tried a bunch of new products and irritated my skin again. This time I knew how to heal it back. Now my main focus is building a stronger barrier, and this is my current routine.",
    before: { url: "/progress/framed/2026-02-13-from-29-1.jpg", date: "2026-02-13", width: 945, height: 784 },
    after: { url: "/progress/framed/2026-05-20-from-32-1.jpg", date: "2026-05-20", width: 945, height: 784 },
    now: { url: "/progress/framed/2026-10-22-from-35-1.jpg", date: "2026-10-22", width: 945, height: 784 },
    routine: [
      { brand: "107 Beauty", product: "Chaga Jelly Low pH Cleanser", image: "/products/107-beauty--chaga-jelly-low-ph-cleanser.jpg" },
      { brand: "107 Beauty", product: "Micro Drizzle Hydro Toner", image: "/products/107-beauty--micro-drizzle-hydro-toner.jpg" },
      { brand: "IUNIK", product: "Beta-Glucan Serum", image: "/products/iunik--beta-glucan-serum.jpg" },
      { brand: "Aestura", product: "Atobarrier 365 Hydro Soothing Cream", image: "/products/aestura--atobarrier-365-hydro-soothing-cream.jpg" },
    ],
  },
];

const MISTAKES = [
  { title: "Switching between too many products", body: "I kept switching between so many products. [What that did to your skin.]" },
  { title: "[What ruined my barrier]", body: "[What you did, and how your skin reacted.]" },
  { title: "[Another mistake]", body: "[What you'd do differently now.]" },
];

/** Screenshots of my log for two products, in date order. */
const LOG_SCREENSHOTS = [
  { src: "/proof/log-dr-althea.png", alt: "My notes from patch testing Dr. Althea 345 Relief Cream in May: itchy bumps on my right jaw, then redness, so I stopped using it." },
  { src: "/proof/log-aestura.png", alt: "My notes from patch testing Aestura soothing cream in July: skin felt good with no breakouts, so it became my main moisturizer." },
];
/** Photo of every product I've used. */
const PRODUCTS_PHOTO: string | null = "/proof/products.jpg";

/** Why I started logging, and what it caught. */
const LOG_STORY = [
  "My first step in clearing up my skin was logging everything, because I kept switching between so many products that I couldn't tell what was helping and what was making it worse.",
  "So I started writing down what I used and what my skin was doing.",
  "That's how I caught Dr. Althea 345 Relief Cream: itchy bumps on my jaw, then redness, so I stopped using it (not saying it won't work for you, it just didn't work for my skin). Aestura's soothing cream left my skin feeling good with no breakouts, so it became my main moisturizer.",
];

const NOTICED = "[How you noticed your skin clearing up: what changed first, and what in your log showed it.]";

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

function ChapterPhoto({ label, photo }: { label: "Before" | "After" | "Now"; photo: number | FramedPhoto }) {
  const framed = typeof photo === "number" ? null : photo;
  const frame = framed ?? FRAMES[(photo as number) - 1];
  const date = prettyDate(frame.date, LONG_DATE);
  return (
    <figure>
      <img
        src={frame.url}
        alt={`${label}, ${date}`}
        loading="lazy"
        className={framed ? "framed" : undefined}
        width={framed?.width}
        height={framed?.height}
      />
      <span className={`hero-pill${label === "Before" ? "" : " now"}`}>{label}</span>
      <figcaption className="muted">{date}</figcaption>
    </figure>
  );
}

/** A proof photo shown whole, or a marked slot until there is one. */
function ProofPhoto({ src, alt, slot }: { src: string | null; alt: string; slot: string }) {
  if (!src) return <div className="proof-photo empty">{slot}</div>;
  return <img className="proof-photo" src={src} alt={alt} loading="lazy" />;
}

/** Landing page: my skin's progress, my log, what I was dealing with, each routine, every product I used, and my mistakes. */
export function HomeScreen({ signedIn = true }: { signedIn?: boolean }) {
  const log = useRef<HTMLElement>(null);

  return (
    <div className="landing">
      <section className="wrap hero">
        <div className="hero-copy">
          <h2 className="display">
            Drag to watch my skin <em>clear up.</em>
          </h2>
          <p className="lead">Every photo is real, in whatever angle and light I had. Slide from the start to now, then see the log behind it.</p>
          <div className="row">
            <a className="btn primary" href="#/log">
              {signedIn ? "Start your own log" : "Sign up to start logging"}
            </a>
            <button type="button" className="btn" onClick={() => log.current?.scrollIntoView({ behavior: "smooth" })}>
              See my log
            </button>
          </div>
        </div>
        <PhotoSlider frames={FRAMES} />
      </section>

      <section className="band" ref={log}>
        <div className="wrap stack">
          <div className="section-intro">
            <span className="eyebrow">01 · My log</span>
            <h2 className="display">I wrote down what I used and what I saw.</h2>
          </div>
          <div className="log-proof">
            <div className="log-screenshots">
              {LOG_SCREENSHOTS.map((shot) => (
                <img key={shot.src} className="log-screenshot" src={shot.src} alt={shot.alt} loading="lazy" />
              ))}
            </div>
            <div className="log-story">
              {LOG_STORY.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
          <div className="noticed">
            <h3>How I noticed it clearing up</h3>
            <p className="muted">{NOTICED}</p>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap split-row">
          <div className="section-intro">
            <span className="eyebrow">02 · My skin</span>
            <h2 className="display">I was dealing with what most people with acne deal with.</h2>
            <p className="muted">
              If any of this sounds familiar, you don't need more products. You need a solid routine.
            </p>
          </div>
          <ul className="symptoms">
            {SYMPTOMS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="band">
        <div className="wrap stack">
          <div className="section-intro">
            <span className="eyebrow">03 · My routines</span>
            <h2 className="display">Two routines, and what each one did.</h2>
          </div>
          <ol className="chapters">
            {CHAPTERS.map((c, i) => (
              <li key={c.title} className="chapter">
                <div className={`before-after${c.now ? " three" : ""}`}>
                  <ChapterPhoto label="Before" photo={c.before} />
                  <ChapterPhoto label="After" photo={c.after} />
                  {c.now && <ChapterPhoto label="Now" photo={c.now} />}
                </div>
                <div className="chapter-copy">
                  <span className="eyebrow">Routine {i + 1}</span>
                  <h3 className="display">{c.title}</h3>
                  <p className="muted">{c.story}</p>
                  <ul className="routine-list">
                    {c.routine.map((r) => (
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
                </div>
              </li>
            ))}
          </ol>
          <blockquote className="display">
            Your skin is probably already telling you what's wrong. You just need a record to see it.
          </blockquote>
        </div>
      </section>

      <section>
        <div className="wrap stack">
          <div className="section-intro">
            <span className="eyebrow">04 · Every product I used</span>
            <h2 className="display">I really did try all of this.</h2>
            <p className="muted">Two years of testing products.</p>
          </div>
          <ProofPhoto src={PRODUCTS_PHOTO} alt="Every skincare product I've used" slot="[Photo of all your products]" />
        </div>
      </section>

      <section>
        <div className="wrap stack">
          <div className="section-intro">
            <span className="eyebrow">05 · My mistakes</span>
            <h2 className="display">What I got wrong along the way.</h2>
          </div>
          <ol className="mistakes">
            {MISTAKES.map((m) => (
              <li key={m.title}>
                <h3>{m.title}</h3>
                <p className="muted">{m.body}</p>
              </li>
            ))}
          </ol>
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
  );
}
