import { createContext, useContext } from "react";
import savedFraming from "./homePhotoFraming.json";

/**
 * How one photo sits in its box on the home page.
 * x, y   = the point of the photo shown at the middle of the box, as fractions of the photo (0–1, from its top-left)
 * zoom   = 1 just fills the box; 2 is twice as close
 * rotate = degrees clockwise
 */
export interface Framing {
  x: number;
  y: number;
  zoom: number;
  rotate: number;
}

export type FramingMap = Record<string, Framing>;

export const DEFAULT_FRAMING: Framing = { x: 0.5, y: 0.5, zoom: 1, rotate: 0 };
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
export const SAVED_FRAMING = savedFraming as FramingMap;

interface Tuning {
  /** Edit mode is on: clicking a photo selects it, dragging moves it. */
  on: boolean;
  setOn: (on: boolean) => void;
  framing: FramingMap;
  /** What's in homePhotoFraming.json, to tell what's unsaved. */
  saved: FramingMap;
  setSaved: (f: FramingMap) => void;
  selected: string | null;
  select: (slot: string | null) => void;
  update: (slot: string, change: Partial<Framing>) => void;
  /** Replaces one photo's framing outright, such as undoing back to the saved one. */
  replace: (slot: string, framing: Framing) => void;
}

export const TuningContext = createContext<Tuning | null>(null);

export const useTuning = () => useContext(TuningContext);

export const framingOf = (map: FramingMap, slot: string): Framing => map[slot] ?? DEFAULT_FRAMING;
