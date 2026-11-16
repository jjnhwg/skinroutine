import { useState } from "react";
import type { Pin, PinKind } from "../api/types";
import { CONDITIONS, RATING_LABELS, RATINGS } from "../lib/constants";
import { prettyDate } from "../lib/dates";
import { NEXT_STAGES, PIN_LABELS, isCondition, pinSummary, STAGE_LABELS, STAGES } from "../lib/stages";
import { FaceMap } from "./FaceMap";

export interface CheckIn {
  /** Optional overall score; null when not picked. */
  skin_score: number | null;
  pins: Pin[];
}

interface CheckInFormProps {
  value: CheckIn;
  onChange: (next: CheckIn) => void;
  /** The earlier day the spots were copied from, if they were. */
  carriedFrom?: string | null;
}

const hint = (kind: PinKind) =>
  isCondition(kind) ? `Mark where your skin feels ${kind}.` : STAGE_LABELS[kind].hint;

/**
 * Pick what you're marking, then tap the face exactly where it is. Tap a pin to move
 * it on a stage, change it or remove it. Overall score is optional. Controlled.
 */
export function CheckInForm({ value, onChange, carriedFrom }: CheckInFormProps) {
  const [kind, setKind] = useState<PinKind>("active");
  const [selected, setSelected] = useState<number | null>(null);
  const pins = value.pins;
  const chosen = selected !== null ? pins[selected] : undefined;

  const setPins = (next: Pin[]) => onChange({ ...value, pins: next });
  const add = (x: number, y: number) => {
    setPins([...pins, { x, y, kind }]);
    setSelected(null);
  };
  const update = (index: number, patch: Partial<Pin>) =>
    setPins(pins.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  const move = (index: number, dx: number, dy: number) => {
    const clamp = (n: number) => Math.min(1, Math.max(0, n));
    update(index, { x: clamp(pins[index].x + dx), y: clamp(pins[index].y + dy) });
  };
  const remove = (index: number) => {
    setPins(pins.filter((_, i) => i !== index));
    setSelected(null);
  };
  const summary = pinSummary(pins);

  const kindChip = (k: PinKind) => (
    <button
      key={k}
      type="button"
      className="toggle pin-chip"
      data-kind={k}
      aria-pressed={kind === k}
      onClick={() => setKind(k)}
    >
      <span className="pin-swatch" aria-hidden="true" />
      {PIN_LABELS[k]}
    </button>
  );

  return (
    <>
      <h2>How's your skin today?</h2>
      <p className="muted" style={{ margin: "-6px 0 0" }}>
        {carriedFrom
          ? `Started from your spots on ${prettyDate(carriedFrom)}. Tap a spot to move it on a stage, or remove it if it's gone.`
          : "Pick what you're marking, then tap exactly where it is. Leave the rest alone."}
      </p>

      <div className="pin-kinds">
        <div className="chips" role="group" aria-label="Spots">
          {STAGES.map(kindChip)}
        </div>
        <div className="chips" role="group" aria-label="Skin feels">
          {CONDITIONS.map(kindChip)}
        </div>
        <p className="muted pin-hint">
          <b>{PIN_LABELS[kind]}:</b> {hint(kind)}
        </p>
      </div>

      <FaceMap
        pins={pins}
        selected={selected}
        onAdd={add}
        onSelect={(i) => setSelected(selected === i ? null : i)}
        onMove={move}
        label="Face map: tap where each spot is"
      />

      <div className="pin-summary">
        <span className="muted">{summary.length ? summary.join(" · ") : "Nothing marked"}</span>
        {pins.length > 0 && (
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setPins([]);
              setSelected(null);
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {chosen && selected !== null && (
        <div className="zone-panel" aria-label="Selected pin">
          <div className="zone-panel-head">
            <h3 className="section-h" style={{ margin: 0 }}>
              {PIN_LABELS[chosen.kind]}
            </h3>
            <button type="button" className="link-btn" onClick={() => setSelected(null)}>
              Done
            </button>
          </div>
          {!isCondition(chosen.kind) && NEXT_STAGES[chosen.kind].length > 0 && (
            <div className="stage-moves" style={{ justifyContent: "flex-start", marginBottom: 10 }}>
              {NEXT_STAGES[chosen.kind].map((to) => (
                <button
                  key={to}
                  type="button"
                  className="stage-move"
                  onClick={() => update(selected, { kind: to })}
                >
                  → {PIN_LABELS[to]}
                </button>
              ))}
            </div>
          )}
          <div className="chips" role="group" aria-label="Change to">
            {(isCondition(chosen.kind) ? CONDITIONS : STAGES).map((k) => (
              <button
                key={k}
                type="button"
                className="toggle pin-chip"
                data-kind={k}
                aria-pressed={chosen.kind === k}
                onClick={() => update(selected, { kind: k })}
              >
                <span className="pin-swatch" aria-hidden="true" />
                {PIN_LABELS[k]}
              </button>
            ))}
          </div>
          <button type="button" className="link-btn pin-remove" onClick={() => remove(selected)}>
            Remove this pin
          </button>
        </div>
      )}

      <h2 id="score-h" style={{ marginTop: 20 }}>
        Overall <span className="muted" style={{ fontWeight: 500, fontSize: 14 }}>(optional)</span>
      </h2>
      <div className="ratings" role="group" aria-labelledby="score-h">
        {RATINGS.map((r) => (
          <button
            key={r}
            type="button"
            className="rating"
            aria-pressed={value.skin_score === r}
            aria-label={`${r} — ${RATING_LABELS[r]}`}
            style={{ ["--rc" as string]: `var(--r${r})` }}
            onClick={() => onChange({ ...value, skin_score: value.skin_score === r ? null : r })}
          >
            <span className="dot" style={{ background: `var(--r${r})` }} aria-hidden="true" />
            {r}
            <small>{RATING_LABELS[r]}</small>
          </button>
        ))}
      </div>
    </>
  );
}
