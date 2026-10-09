import type { Angle } from "../api/types";
import { PHOTO_MAX, resizeImage } from "../lib/image";
import { CameraIcon } from "./Icons";
import { useToast } from "./Toast";

const LABELS: Record<Angle, string> = { front: "Front", left: "Left side", right: "Right side" };
const ALT: Record<Angle, string> = { front: "Front photo", left: "Left photo", right: "Right photo" };

/** Where to put your face, so day-to-day photos line up. Drawn over the preview. */
function Guide({ angle }: { angle: Angle }) {
  const front = angle === "front";
  return (
    <svg
      className="photo-guide"
      viewBox="0 0 100 130"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid={`guide-${angle}`}
      data-guide={front ? "front" : "profile"}
      data-mirrored={angle === "right" ? "true" : undefined}
      style={angle === "right" ? { transform: "scaleX(-1)" } : undefined}
    >
      {front ? (
        <>
          <ellipse cx="50" cy="62" rx="27" ry="37" />
          <line x1="28" y1="55" x2="72" y2="55" />
          <line x1="50" y1="25" x2="50" y2="99" strokeDasharray="2 3" />
        </>
      ) : (
        // A face looking left: forehead, nose, lips, chin, then jaw back to the ear.
        <path d="M58 22 C40 22 33 36 33 50 L26 62 L33 66 L32 74 L35 79 L33 88 C36 97 46 100 56 97 C64 95 70 88 70 80 L72 64 C76 44 72 22 58 22 Z" />
      )}
    </svg>
  );
}

interface PhotoCaptureProps {
  angle: Angle;
  /** The saved photo's URL, or a picked photo still waiting to upload (a data URL). */
  url: string | null;
  onPick: (dataUrl: string) => void;
  onRemove: () => void;
  onOpen: () => void;
}

/** One photo slot: camera or file pick, or paste while the slot is focused. */
export function PhotoCapture({ angle, url, onPick, onRemove, onOpen }: PhotoCaptureProps) {
  const toast = useToast();
  const label = LABELS[angle];

  async function take(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Only images can be added.");
      return;
    }
    try {
      onPick(await resizeImage(file, PHOTO_MAX));
    } catch {
      toast("Couldn't read that image.");
    }
  }

  return (
    <div className="capture">
      <div
        className="capture-frame"
        tabIndex={0}
        aria-label={`${label} photo slot — paste an image here`}
        onPaste={(e) => {
          const item = Array.from(e.clipboardData.items).find(
            (i) => i.kind === "file" && i.type.startsWith("image/"),
          );
          if (!item) return;
          e.preventDefault();
          void take(item.getAsFile());
        }}
      >
        {url ? (
          <button type="button" className="capture-open" aria-label={`Enlarge ${angle} photo`} onClick={onOpen}>
            <img src={url} alt={ALT[angle]} />
          </button>
        ) : (
          <label className="capture-empty">
            <CameraIcon />
            <span>{label}</span>
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="sr-only"
              aria-label={`Take or choose a ${angle} photo`}
              onChange={(e) => {
                void take(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        )}
        <Guide angle={angle} />
      </div>
      {url && (
        <div className="row" style={{ marginTop: 6, justifyContent: "space-between" }}>
          <label className="link-btn">
            Retake
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="sr-only"
              aria-label={`Retake the ${angle} photo`}
              onChange={(e) => {
                void take(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <button type="button" className="link-btn" aria-label={`Remove ${angle} photo`} onClick={onRemove}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
