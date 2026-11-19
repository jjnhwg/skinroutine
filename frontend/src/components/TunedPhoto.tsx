import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { MAX_ZOOM, MIN_ZOOM, SAVED_FRAMING, TuningContext, framingOf, useTuning, type FramingMap, type Framing } from "../lib/photoFraming";

/** Holds the live framing so edits show on the page straight away. Without edits it's just the saved file. */
export function TuningProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  const [framing, setFraming] = useState<FramingMap>(SAVED_FRAMING);
  const [saved, setSaved] = useState<FramingMap>(SAVED_FRAMING);
  const [selected, select] = useState<string | null>(null);
  const update = (slot: string, change: Partial<Framing>) =>
    setFraming((all) => {
      const next = { ...framingOf(all, slot), ...change };
      next.zoom = Math.min(Math.max(next.zoom, MIN_ZOOM), MAX_ZOOM);
      return { ...all, [slot]: next };
    });
  const replace = (slot: string, f: Framing) => setFraming((all) => ({ ...all, [slot]: f }));
  return (
    <TuningContext.Provider value={{ on, setOn, framing, saved, setSaved, selected, select, update, replace }}>
      {children}
    </TuningContext.Provider>
  );
}

/** Width ÷ height of each photo once it has loaded, shared by every box showing it. */
const aspects = new Map<string, number>();

/**
 * A photo placed in its box by its framing. The box's size comes from CSS; the photo is drawn
 * just big enough to cover it at zoom 1, then moved, zoomed and turned around the box's middle.
 */
export function TunedPhoto({
  slot,
  src,
  alt,
  interactive = true,
  lazy = true,
}: {
  slot: string;
  src: string;
  alt: string;
  /** False for small copies (like the hero's thumbnails): they follow the framing but can't be edited. */
  interactive?: boolean;
  lazy?: boolean;
}) {
  const tuning = useTuning();
  const f = framingOf(tuning?.framing ?? SAVED_FRAMING, slot);
  const [aspect, setAspect] = useState(() => aspects.get(src) ?? 0.75);
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  const editable = Boolean(tuning?.on && interactive);
  const selected = editable && tuning?.selected === slot;

  function measure() {
    const el = img.current;
    if (!el?.naturalWidth) return;
    const a = el.naturalWidth / el.naturalHeight;
    aspects.set(src, a);
    setAspect(a);
  }
  // A cached photo can finish loading before React is listening.
  useEffect(measure, [src]);

  // Scroll to zoom the selected photo. Added by hand because React's wheel listener can't stop the page scrolling.
  useEffect(() => {
    const el = box.current;
    if (!el || !selected || !tuning) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      tuning.update(slot, { zoom: framingOf(tuning.framing, slot).zoom * Math.exp(-e.deltaY * 0.0015) });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [selected, tuning, slot]);

  function down(e: PointerEvent<HTMLDivElement>) {
    if (!editable || !tuning) return;
    e.preventDefault();
    if (!selected) return tuning.select(slot); // first click picks the photo; drag after that
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: f.x, y: f.y };
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || !tuning || !img.current) return;
    // Undo the photo's turn so dragging right always moves it right on screen.
    const r = (-f.rotate * Math.PI) / 180;
    const dx = e.clientX - start.px, dy = e.clientY - start.py;
    const along = dx * Math.cos(r) - dy * Math.sin(r);
    const across = dx * Math.sin(r) + dy * Math.cos(r);
    tuning.update(slot, { x: start.x - along / img.current.offsetWidth, y: start.y - across / img.current.offsetHeight });
  }

  const up = () => (drag.current = null);

  return (
    <div
      ref={box}
      className={`tuned-photo${editable ? " editable" : ""}${selected ? " selected" : ""}`}
      onPointerDown={editable ? down : undefined}
      onPointerMove={selected ? move : undefined}
      onPointerUp={selected ? up : undefined}
      onPointerCancel={selected ? up : undefined}
    >
      <img
        ref={img}
        src={src}
        alt={alt}
        loading={lazy ? "lazy" : undefined}
        draggable={false}
        onLoad={measure}
        style={{
          // Covers the box at zoom 1: as wide as the box, or as tall, whichever needs the bigger photo.
          width: `calc(${f.zoom} * max(100cqw, 100cqh * ${aspect}))`,
          // The photo's top-left starts at the box's middle. Shift it so (x, y) is there, then turn around that point.
          transform: `rotate(${f.rotate}deg) translate(${-f.x * 100}%, ${-f.y * 100}%)`,
        }}
      />
    </div>
  );
}
