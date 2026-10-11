// Fixed-do solfège: "do" is always C, whatever key the music is in.
// Chromatic syllables follow the note's spelling (C# = di, Bb = te).

const SYLLABLES: Record<string, string> = {
  C: "do",
  "C#": "di",
  Db: "ra",
  D: "re",
  "D#": "ri",
  Eb: "me",
  E: "mi",
  F: "fa",
  "F#": "fi",
  Gb: "se",
  G: "sol",
  "G#": "si",
  Ab: "le",
  A: "la",
  "A#": "li",
  Bb: "te",
  B: "ti",
};

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export interface ParsedNote {
  letter: string;
  accidental: "" | "#" | "b";
  octave: number;
}

export function parseNote(note: string): ParsedNote {
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(note);
  if (!match) throw new Error(`Invalid note: ${note}`);
  return { letter: match[1]!, accidental: (match[2] ?? "") as ParsedNote["accidental"], octave: Number(match[3]) };
}

/** MIDI number, e.g. C4 = 60, A4 = 69. */
export function noteToMidi(note: string): number {
  const { letter, accidental, octave } = parseNote(note);
  const offset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return (octave + 1) * 12 + SEMITONES[letter]! + offset;
}

export function solfegeFor(note: string): string {
  const { letter, accidental } = parseNote(note);
  const syllable = SYLLABLES[letter + accidental];
  if (!syllable) throw new Error(`No syllable for ${note}`);
  return syllable;
}

export type NoteId = "do" | "re" | "mi" | "fa" | "sol" | "la" | "ti";

export interface SingleNoteDef {
  id: NoteId;
  /** Always played at exactly this pitch. */
  note: string;
}

/** Notes used by single-note mode: the white keys from middle C up. */
export const SINGLE_NOTES: readonly SingleNoteDef[] = [
  { id: "do", note: "C4" },
  { id: "re", note: "D4" },
  { id: "mi", note: "E4" },
  { id: "fa", note: "F4" },
  { id: "sol", note: "G4" },
  { id: "la", note: "A4" },
  { id: "ti", note: "B4" },
];

export const SINGLE_NOTE_IDS: readonly NoteId[] = SINGLE_NOTES.map((n) => n.id);

export function getSingleNote(id: string): SingleNoteDef {
  const def = SINGLE_NOTES.find((n) => n.id === id);
  if (!def) throw new Error(`Unknown note id: ${id}`);
  return def;
}
