import type { Condition, Pin, PinKind, Stage, StageCounts, ZoneStages } from "../api/types";
import { CONDITION_LABELS, CONDITIONS, ZONE_LABELS } from "./constants";

/** In the order a spot goes through them. */
export const STAGES: Stage[] = ["clogged", "coming_up", "active", "healing"];

export const STAGE_LABELS: Record<Stage, { name: string; hint: string; one: string; many: string }> = {
  clogged: { name: "Clogged pores", hint: "Small bumps, blackheads, whiteheads", one: "clogged pore", many: "clogged pores" },
  coming_up: { name: "Coming up", hint: "Sore under the skin, no head yet", one: "coming up", many: "coming up" },
  active: { name: "Active pimples", hint: "Red and raised, or with a head", one: "active", many: "active" },
  healing: { name: "Healing", hint: "Going down, scabbed, or a flat mark left behind", one: "healing", many: "healing" },
};

/** Where one spot can go next. Healing is the last stage; once it's gone, remove the pin. */
export const NEXT_STAGES: Record<Stage, Stage[]> = {
  clogged: ["coming_up"],
  coming_up: ["active"],
  active: ["healing"],
  healing: [],
};

export const NO_SPOTS: StageCounts = { clogged: 0, coming_up: 0, active: 0, healing: 0 };

export const NO_STAGES = Object.fromEntries(
  Object.keys(ZONE_LABELS).map((zone) => [zone, NO_SPOTS]),
) as ZoneStages;

export const totalSpots = (counts: StageCounts) => STAGES.reduce((n, s) => n + counts[s], 0);

/** e.g. ["2 active", "1 healing"]; stages with no spots are left out. */
export function spotSummary(counts: StageCounts): string[] {
  return STAGES.filter((s) => counts[s] > 0).map(
    (s) => `${counts[s]} ${counts[s] === 1 ? STAGE_LABELS[s].one : STAGE_LABELS[s].many}`,
  );
}

/** What a pin is called on its own, e.g. on its chip and in its label. */
export const PIN_LABELS: Record<PinKind, string> = {
  clogged: "Clogged pore",
  coming_up: "Coming up",
  active: "Active pimple",
  healing: "Healing",
  red: CONDITION_LABELS.red,
};

export const isCondition = (kind: PinKind): kind is Condition => (CONDITIONS as PinKind[]).includes(kind);

/** e.g. ["2 active", "1 healing", "red / irritated (2)"]; spots first, in stage order. */
export function pinSummary(pins: Pin[]): string[] {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as StageCounts;
  const areas: Partial<Record<Condition, number>> = {};
  for (const { kind } of pins) {
    if (isCondition(kind)) areas[kind] = (areas[kind] ?? 0) + 1;
    else counts[kind] += 1;
  }
  return [
    ...spotSummary(counts),
    ...CONDITIONS.filter((c) => areas[c]).map((c) => `${CONDITION_LABELS[c].toLowerCase()} (${areas[c]})`),
  ];
}
