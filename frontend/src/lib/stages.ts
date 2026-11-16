import type { Condition, Pin, PinKind, Stage, StageCounts, ZoneStages } from "../api/types";
import { CONDITIONS, ZONE_LABELS } from "./constants";

/** In the order a spot goes through them. */
export const STAGES: Stage[] = ["clogged", "coming_up", "active", "healing", "red_mark", "brown_mark"];

export const STAGE_LABELS: Record<Stage, { name: string; hint: string; one: string; many: string }> = {
  clogged: { name: "Clogged pores", hint: "Small bumps, blackheads, whiteheads", one: "clogged pore", many: "clogged pores" },
  coming_up: { name: "Coming up", hint: "Sore under the skin, no head yet", one: "coming up", many: "coming up" },
  active: { name: "Active pimples", hint: "Red and raised, or with a head", one: "active", many: "active" },
  healing: { name: "Healing", hint: "Going down, flat or scabbed", one: "healing", many: "healing" },
  red_mark: { name: "Red marks", hint: "Flat pink or red spot left behind", one: "red mark", many: "red marks" },
  brown_mark: { name: "Brown marks", hint: "Flat brown spot left behind", one: "brown mark", many: "brown marks" },
};

/** Where one spot can go next. Marks only fade, which is stepping them down. */
export const NEXT_STAGES: Record<Stage, Stage[]> = {
  clogged: ["coming_up"],
  coming_up: ["active"],
  active: ["healing"],
  healing: ["red_mark", "brown_mark"],
  red_mark: [],
  brown_mark: [],
};

export const NO_SPOTS: StageCounts = { clogged: 0, coming_up: 0, active: 0, healing: 0, red_mark: 0, brown_mark: 0 };

export const NO_STAGES = Object.fromEntries(
  Object.keys(ZONE_LABELS).map((zone) => [zone, NO_SPOTS]),
) as ZoneStages;

export const totalSpots = (counts: StageCounts) => STAGES.reduce((n, s) => n + counts[s], 0);

/** e.g. ["2 active", "1 brown mark"]; stages with no spots are left out. */
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
  red_mark: "Red mark",
  brown_mark: "Brown mark",
  dry: "Dry",
  red: "Red",
  oily: "Oily",
};

export const isCondition = (kind: PinKind): kind is Condition => (CONDITIONS as PinKind[]).includes(kind);

/** e.g. ["2 active", "1 brown mark", "dry (2)"]; spots first, in stage order. */
export function pinSummary(pins: Pin[]): string[] {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as StageCounts;
  const areas: Partial<Record<Condition, number>> = {};
  for (const { kind } of pins) {
    if (isCondition(kind)) areas[kind] = (areas[kind] ?? 0) + 1;
    else counts[kind] += 1;
  }
  return [
    ...spotSummary(counts),
    ...CONDITIONS.filter((c) => areas[c]).map((c) => `${c} (${areas[c]})`),
  ];
}
