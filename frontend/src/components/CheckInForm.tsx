import { useState } from "react";
import type { DayEvent, Pin, PinKind } from "../api/types";
import { CONDITIONS, DAY_EVENT_LABELS, DAY_EVENTS } from "../lib/constants";
import { prettyDate } from "../lib/dates";
import { NEXT_STAGES, PIN_LABELS, isCondition, pinSummary, STAGE_LABELS, STAGES } from "../lib/stages";
import { FaceMap } from "./FaceMap";

export interface CheckIn {
  /** What happened today; optional, any mix except "nothing_new" goes alone. */
  events: DayEvent[];
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
 * it on a stage, change it or remove it. What happened today is optional. Controlled.
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

  // "Nothing new" and the others rule each other out; tapping a picked one unpicks it.
  const toggleEvent = (event: DayEvent) => {
    const events = value.events;
    let next: DayEvent[];
    if (events.includes(event)) next = events.filter((e) => e !== event);
    else if (event === "nothing_new") next = ["nothing_new"];
    else next = [...events.filter((e) => e !== "nothing_new"), event];
    onChange({ ...value, events: next });
  };

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

      <h2 id="events-h" style={{ marginTop: 20 }}>
        Overall <span className="muted" style={{ fontWeight: 500, fontSize: 14 }}>(pick any, optional)</span>
      </h2>
      <div className="chips" role="group" aria-labelledby="events-h">
        {DAY_EVENTS.map((event) => (
          <button
            key={event}
            type="button"
            className="toggle event-chip"
            data-event={event}
            aria-pressed={value.events.includes(event)}
            onClick={() => toggleEvent(event)}
          >
            <span className="event-swatch" aria-hidden="true" />
            {DAY_EVENT_LABELS[event]}
          </button>
        ))}
      </div>
    </>
  );
}
