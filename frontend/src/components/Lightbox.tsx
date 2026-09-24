import { useCallback, useEffect, useRef, useState } from "react";

interface LightboxProps {
  photos: string[];
  startIndex: number;
  onClose: () => void;
}

/** Full-screen photo viewer with arrow-key paging and a focus trap. */
export function Lightbox({ photos, startIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const step = useCallback(
    (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length),
    [photos.length],
  );

  useEffect(() => {
    closeRef.current?.focus();
  }, [index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "Tab") {
        const focusable = [...(boxRef.current?.querySelectorAll("button") ?? [])];
        if (!focusable.length) return;
        const at = focusable.indexOf(document.activeElement as HTMLButtonElement);
        e.preventDefault();
        focusable[(at + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      ref={boxRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <img src={photos[index]} alt={`Photo ${index + 1} of ${photos.length}`} />
      <button className="close" aria-label="Close" ref={closeRef} onClick={onClose}>
        ×
      </button>
      {photos.length > 1 && (
        <>
          <button className="nav prev" aria-label="Previous photo" onClick={() => step(-1)}>
            ‹
          </button>
          <button className="nav next" aria-label="Next photo" onClick={() => step(1)}>
            ›
          </button>
        </>
      )}
    </div>
  );
}
