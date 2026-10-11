// Prints every chord's notes with MIDI numbers and A440 frequencies, for checking voicings
// against the reference app or a tuner. Run: npm run voicings  (Node 22.18+ runs TypeScript directly)
import { CHORDS } from "../lib/chords.ts";

const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (n: string) => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n)!;
  return (Number(m[3]) + 1) * 12 + SEMI[m[1]!]! + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
};
const hz = (m: number) => (440 * 2 ** ((m - 69) / 12)).toFixed(2);

console.log("#  Color          Notes (low→high)      MIDI          Hz");
for (const c of CHORDS) {
  const ms = c.notes.map(midi);
  console.log(
    `${String(c.order).padStart(2)} ${c.colorName.padEnd(14)} ${c.notes.join(" ").padEnd(21)} ${ms.join(" ").padEnd(13)} ${ms.map(hz).join(" / ")}`,
  );
}
