import { describe, expect, it } from "vitest";
import { BLACK_CHORD_IDS, CHORDS, WHITE_CHORD_IDS } from "./chords";
import { noteToMidi, solfegeFor } from "./solfege";

// The agreed voicings (matching https://pganssle.github.io/cim/ _data/chords.yml as of Oct 2026).
// If you change lib/chords.ts on purpose, update this table in the same commit.
const EXPECTED: Record<string, string[]> = {
  red: ["C4", "E4", "G4"],
  yellow: ["C4", "F4", "A4"],
  blue: ["B3", "D4", "G4"],
  black: ["A3", "C4", "F4"],
  green: ["D4", "G4", "B4"],
  orange: ["E4", "G4", "C5"],
  purple: ["F4", "A4", "C5"],
  pink: ["G4", "B4", "D5"],
  brown: ["G4", "C5", "E5"],
  gray: ["A3", "C#4", "E4"],
  tan: ["D4", "F#4", "A4"],
  lightgreen: ["E4", "G#4", "B4"],
  lightpurple: ["Bb3", "D4", "F4"],
  skyblue: ["Eb4", "G4", "Bb4"],
};

describe("chord config", () => {
  it("has the 14 chords in the fixed learning order", () => {
    expect(CHORDS.map((c) => c.id)).toEqual(Object.keys(EXPECTED));
    expect(CHORDS.map((c) => c.order)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    expect(WHITE_CHORD_IDS).toHaveLength(9);
    expect(BLACK_CHORD_IDS).toHaveLength(5);
  });

  it("uses exactly the agreed voicings", () => {
    for (const chord of CHORDS) expect(chord.notes, chord.id).toEqual(EXPECTED[chord.id]);
  });

  it("lists notes low to high", () => {
    for (const chord of CHORDS) {
      const midi = chord.notes.map(noteToMidi);
      expect([...midi].sort((a, b) => a - b), chord.id).toEqual(midi);
    }
  });

  it("stays within one semitone of a bundled sample (A3–F#5)", () => {
    for (const chord of CHORDS) for (const n of chord.notes) expect(noteToMidi(n)).toBeGreaterThanOrEqual(noteToMidi("A3"));
    for (const chord of CHORDS) for (const n of chord.notes) expect(noteToMidi(n)).toBeLessThanOrEqual(noteToMidi("F#5"));
  });

  it("gives every chord a distinct color and pattern", () => {
    expect(new Set(CHORDS.map((c) => c.color.toLowerCase())).size).toBe(14);
    expect(new Set(CHORDS.map((c) => c.pattern)).size).toBe(14);
  });

  it("names chord notes with fixed-do solfège", () => {
    expect(EXPECTED.red!.map(solfegeFor)).toEqual(["do", "mi", "sol"]);
    expect(EXPECTED.gray!.map(solfegeFor)).toEqual(["la", "di", "mi"]);
    expect(EXPECTED.skyblue!.map(solfegeFor)).toEqual(["me", "sol", "te"]);
  });
});
