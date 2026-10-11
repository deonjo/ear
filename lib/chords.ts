// Verify these voicings against the reference implementation at https://pganssle.github.io/cim/ before use.
//
// This file is the single source of truth for every chord the app can play.
// Notes are listed low to high in scientific pitch notation (C4 = middle C, A4 = 440 Hz).
// Each chord is ALWAYS played at exactly this pitch and voicing: never transpose,
// change octave, re-voice, or swap the instrument.

export type ChordId =
  | "red"
  | "yellow"
  | "blue"
  | "black"
  | "green"
  | "orange"
  | "purple"
  | "pink"
  | "brown"
  | "gray"
  | "tan"
  | "lightgreen"
  | "lightpurple"
  | "skyblue";

export type ChordGroup = "white" | "black";

/** Optional colorblind-friendly overlay drawn on the flag (off by default). */
export type FlagPattern =
  | "none"
  | "dots"
  | "stripes-h"
  | "stripes-v"
  | "stripes-d"
  | "grid"
  | "checker"
  | "rings"
  | "zigzag"
  | "cross"
  | "stripes-d2"
  | "waves"
  | "diamonds"
  | "triangles";

export interface ChordDef {
  id: ChordId;
  /** Position in the learning order, 1–14. */
  order: number;
  group: ChordGroup;
  /** Parent-facing name. Never shown on the child's screen. */
  colorName: string;
  /** Flag fill. */
  color: string;
  /** Contrasting ink for outlines and patterns on top of `color`. */
  ink: string;
  /** Notes low → high. */
  notes: readonly string[];
  pattern: FlagPattern;
}

export const CHORDS: readonly ChordDef[] = [
  // White-key chords
  { id: "red", order: 1, group: "white", colorName: "Red", color: "#D62839", ink: "#FFFFFF", notes: ["C4", "E4", "G4"], pattern: "none" },
  { id: "yellow", order: 2, group: "white", colorName: "Yellow", color: "#FFD23F", ink: "#3A2F00", notes: ["C4", "F4", "A4"], pattern: "dots" },
  { id: "blue", order: 3, group: "white", colorName: "Blue", color: "#1D4ED8", ink: "#FFFFFF", notes: ["B3", "D4", "G4"], pattern: "stripes-h" },
  { id: "black", order: 4, group: "white", colorName: "Black", color: "#1A1A1A", ink: "#FFFFFF", notes: ["A3", "C4", "F4"], pattern: "stripes-v" },
  { id: "green", order: 5, group: "white", colorName: "Green", color: "#15803D", ink: "#FFFFFF", notes: ["D4", "G4", "B4"], pattern: "stripes-d" },
  { id: "orange", order: 6, group: "white", colorName: "Orange", color: "#F97316", ink: "#2B1200", notes: ["E4", "G4", "C5"], pattern: "grid" },
  { id: "purple", order: 7, group: "white", colorName: "Purple", color: "#7E22CE", ink: "#FFFFFF", notes: ["F4", "A4", "C5"], pattern: "checker" },
  { id: "pink", order: 8, group: "white", colorName: "Pink", color: "#FF6FB5", ink: "#3D0021", notes: ["G4", "B4", "D5"], pattern: "rings" },
  { id: "brown", order: 9, group: "white", colorName: "Brown", color: "#7C4A21", ink: "#FFFFFF", notes: ["G4", "C5", "E5"], pattern: "zigzag" },
  // Black-key chords
  { id: "gray", order: 10, group: "black", colorName: "Gray", color: "#9CA3AF", ink: "#111827", notes: ["A3", "C#4", "E4"], pattern: "cross" },
  { id: "tan", order: 11, group: "black", colorName: "Tan", color: "#D6B88A", ink: "#2E2010", notes: ["D4", "F#4", "A4"], pattern: "stripes-d2" },
  { id: "lightgreen", order: 12, group: "black", colorName: "Light green", color: "#9BE15D", ink: "#14300A", notes: ["E4", "G#4", "B4"], pattern: "waves" },
  { id: "lightpurple", order: 13, group: "black", colorName: "Light purple", color: "#C9A9F5", ink: "#2A0F4F", notes: ["Bb3", "D4", "F4"], pattern: "diamonds" },
  { id: "skyblue", order: 14, group: "black", colorName: "Sky blue", color: "#5BC0F8", ink: "#062A40", notes: ["Eb4", "G4", "Bb4"], pattern: "triangles" },
];

const BY_ID = new Map<ChordId, ChordDef>(CHORDS.map((c) => [c.id, c]));

export const WHITE_CHORD_IDS: readonly ChordId[] = CHORDS.filter((c) => c.group === "white").map((c) => c.id);
export const BLACK_CHORD_IDS: readonly ChordId[] = CHORDS.filter((c) => c.group === "black").map((c) => c.id);

export function getChord(id: ChordId): ChordDef {
  const chord = BY_ID.get(id);
  if (!chord) throw new Error(`Unknown chord: ${id}`);
  return chord;
}

export function isChordId(value: string): value is ChordId {
  return BY_ID.has(value as ChordId);
}
