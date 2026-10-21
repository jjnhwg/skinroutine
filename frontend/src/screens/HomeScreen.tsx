import { useEffect, useRef, useState } from "react";
import { getDay, getPhotoDays } from "../api/days";
import type { Day } from "../api/types";
import { CameraIcon } from "../components/Icons";
import { LONG_DATE, prettyDate } from "../lib/dates";

/** At most this many days play in the slider, spread evenly from first to latest. */
const MAX_FRAMES = 12;

/** Fill in your own: "Dry", "Normal", "Combination", "Oily" or "Sensitive". */
const MY_SKIN_TYPE: string | null = null;
const SKIN_TYPES = ["Dry", "Normal", "Combination", "Oily", "Sensitive"];

const CONCERNS = [
  { title: "Clogged pores", where: "[Where, like nose and chin]", body: "[What they looked like and how long you had them.]" },
  { title: "[Second concern]", where: "[Where on your face]", body: "[Like breakouts that kept coming back in the same spot.]" },
  { title: "[Third concern]", where: "[Where on your face]", body: "[Like redness, rough texture, or dark marks.]" },
];

const STEPS = [
  { title: "[First thing you changed]", body: "[Why you changed it and what you noticed in your log.]", brand: "107", product: "Chaga Jelly Cleanser", colors: ["#A9B9A2", "#7E9277", "#DCE3D6"] },
  { title: "[Second change]", body: "[What it did for your skin.]", brand: "107", product: "Micro Drizzle Hydro Toner", colors: ["#F1E1DD", "#D8B7AE", "#E2C9C2"] },
  { title: "[Third change]", body: "[What it did for your skin.]", brand: "EADEM", product: "The Mark", colors: ["#E06A4F", "#B44A34", "#F2B8A8"] },
  { title: "[Fourth change]", body: "[What it did for your skin.]", brand: "AESTURA", product: "ATOBARRIER365 Water Cream", colors: ["#E4EAF4", "#4A63A8", "#CFD7E6"] },
];

interface Frame {
  date: string;
  url: string;
}

/** Evenly spaced picks from a sorted list, always keeping the first and last. */
function sample<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  return Array.from({ length: max }, (_, i) => items[Math.round((i * (items.length - 1)) / (max - 1))]);
}

function framePhoto(photos: Day["photos"]): string | null {
  return photos.front ?? photos.left ?? photos.right;
}

/** Every day with a photo, oldest first, for the then-and-now slider. */
function useFrames(): Frame[] | null {
  const [frames, setFrames] = useState<Frame[] | null>(null);

  useEffect(() => {
    let live = true;
    getPhotoDays()
      .then((dates) => Promise.all(sample(dates, MAX_FRAMES).map((date) => getDay(date))))
      .then((days) => {
        if (!live) return;
        const found = days.flatMap((d) => {
          const url = framePhoto(d.photos);
          return url ? [{ date: d.date, url }] : [];
        });
        setFrames(found);
      })
      .catch(() => live && setFrames([]));
    return () => {
      live = false;
    };
  }, []);

  return frames;
}

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

function TubeArt({ colors: [body, band, cap] }: { colors: string[] }) {
  return (
    <svg aria-hidden="true" width="26" height="42" viewBox="0 0 60 92">
      <rect x="16" y="4" width="28" height="66" rx="6" fill={body} />
      <rect x="16" y="38" width="28" height="14" fill={band} />
      <rect x="20" y="70" width="20" height="16" rx="3" fill={cap} />
    </svg>
  );
}

/** Drag or play through the daily photos, first to latest. */
function PhotoSlider({ frames }: { frames: Frame[] | null }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const count = frames?.length ?? 0;
  const last = count - 1;
  const current = Math.min(index, Math.max(last, 0));

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setIndex((i) => {
        if (i >= last) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 700);
    return () => clearInterval(timer);
  }, [playing, last]);

  function togglePlay() {
    if (playing) return setPlaying(false);
    if (current >= last) setIndex(0);
    setPlaying(true);
  }

  function pick(i: number) {
    setPlaying(false);
    setIndex(i);
  }

  if (!frames) return <div className="hero-photo" aria-busy="true" />;

  if (count === 0) {
    return (
      <div className="hero-photo">
        <CameraIcon size={34} />
        <span>Take a front photo on the Log page and your progress plays here.</span>
      </div>
    );
  }

  const frame = frames[current];
  const stage = current === last && count > 1 ? "Now" : current === 0 ? "Then" : "Along the way";

  return (
    <div className="slider">
      <div className="hero-photo">
        <img src={frame.url} alt={`Skin on ${prettyDate(frame.date, LONG_DATE)}`} />
        <span className={`hero-pill${stage === "Now" ? " now" : ""}`}>{stage}</span>
        <span className="hero-pill counter">
          {current + 1} of {count}
        </span>
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
                step={1}
                value={current}
                onChange={(e) => pick(Number(e.target.value))}
                aria-label="Drag through progress photos"
              />
              <span className="slider-ends">
                <span>Then</span>
                <span>Now</span>
              </span>
            </label>
          </div>
          <div className="slider-thumbs">
            {frames.map((f, i) => (
              <button
                key={f.date}
                type="button"
                aria-pressed={i === current}
                aria-label={`Photo ${i + 1} of ${count}, ${prettyDate(f.date, LONG_DATE)}`}
                onClick={() => pick(i)}
              >
                <img src={f.url} alt="" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Landing page: my skin's progress, what I was dealing with and what fixed it. */
export function HomeScreen() {
  const frames = useFrames();
  const story = useRef<HTMLElement>(null);

  return (
    <div className="landing">
      <section className="wrap hero">
        <div className="hero-copy">
          <h2 className="display">
            Drag to watch my skin <em>clear up.</em>
          </h2>
          <p className="lead">Every photo is real, in whatever angle and light I had. Slide from the start to now.</p>
          <div className="row">
            <a className="btn primary" href="#/log">
              Start your own log
            </a>
            <button type="button" className="btn" onClick={() => story.current?.scrollIntoView({ behavior: "smooth" })}>
              Read my story
            </button>
          </div>
        </div>
        <PhotoSlider frames={frames} />
      </section>

      <section className="band" ref={story}>
        <div className="wrap stack">
          <div className="section-intro">
            <span className="eyebrow">01 · What I was dealing with</span>
            <h2 className="display">This is what I saw in the mirror every day.</h2>
          </div>
          <div className="concerns">
            {CONCERNS.map((c) => (
              <article key={c.title} className="concern">
                <div className="concern-photo">[Close-up photo]</div>
                <div className="concern-body">
                  <h3>{c.title}</h3>
                  <span className="muted">Where: {c.where}</span>
                  <p className="muted">{c.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap split-row">
          <div className="section-intro">
            <span className="eyebrow">02 · My skin type</span>
            <h2 className="display">
              {MY_SKIN_TYPE ? `I had ${MY_SKIN_TYPE.toLowerCase()} skin.` : "I had [your skin type] skin."}
            </h2>
            <p className="muted">
              [What your skin type meant day to day, like an oily T-zone by noon or dry cheeks in winter.]
            </p>
          </div>
          <ul className="skin-types">
            {SKIN_TYPES.map((t) => (
              <li key={t} className={t === MY_SKIN_TYPE ? "on" : undefined}>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="band">
        <div className="wrap stack">
          <div className="section-intro">
            <span className="eyebrow">03 · What I did to fix it</span>
            <h2 className="display">One change at a time, logged every day.</h2>
          </div>
          <ol className="fix-steps">
            {STEPS.map((s, i) => (
              <li key={s.product}>
                <span className="step-n">{i + 1}</span>
                <div className="step-copy">
                  <h3>{s.title}</h3>
                  <p className="muted">{s.body}</p>
                </div>
                <div className="step-product">
                  <span className="step-art">
                    <TubeArt colors={s.colors} />
                  </span>
                  <span>
                    <span className="brand">{s.brand}</span>
                    <b>{s.product}</b>
                  </span>
                </div>
              </li>
            ))}
          </ol>
          <blockquote className="display">
            Your skin is probably already telling you what's wrong. You just need a record to see it.
          </blockquote>
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
            Start your log
          </a>
        </div>
      </section>
    </div>
  );
}
