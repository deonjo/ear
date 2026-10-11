import { noteToMidi } from "@/lib/solfege";

const WHITE_W = 30;
const WHITE_H = 150;
const BLACK_W = 18;
const BLACK_H = 92;
const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const IS_BLACK = [false, true, false, true, false, false, true, false, true, false, true, false];

function label(midi: number, spelled?: string): string {
  if (spelled) return spelled.replace("#", "♯").replace(/^([A-G])b/, "$1♭");
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

interface PianoKeyboardProps {
  /** Notes to highlight, e.g. ["B3", "D4", "G4"]. */
  notes: readonly string[];
  /** Lowest and highest keys drawn (inclusive). Defaults cover every chord: G3–F5. */
  from?: string;
  to?: string;
  className?: string;
}

/** Keyboard diagram with the exact keys to press highlighted. Middle C is marked. */
export function PianoKeyboard({ notes, from = "G3", to = "F5", className = "" }: PianoKeyboardProps) {
  const lo = noteToMidi(from);
  const hi = noteToMidi(to);
  const highlighted = new Map(notes.map((n) => [noteToMidi(n), n]));
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (!IS_BLACK[m % 12]) whites.push(m);
  const whiteIndex = new Map(whites.map((m, i) => [m, i]));
  const blacks: number[] = [];
  for (let m = lo; m <= hi; m++) if (IS_BLACK[m % 12] && whiteIndex.has(m - 1)) blacks.push(m);
  const width = whites.length * WHITE_W;
  const middleC = 60;

  return (
    <svg
      viewBox={`-1 -1 ${width + 2} ${WHITE_H + 22}`}
      className={className}
      role="img"
      aria-label={`Piano keyboard. Press ${notes.map((n) => label(noteToMidi(n), n)).join(", ")} together.`}
    >
      {whites.map((m, i) => {
        const on = highlighted.has(m);
        return (
          <g key={m}>
            <rect
              x={i * WHITE_W}
              y={0}
              width={WHITE_W}
              height={WHITE_H}
              rx={3}
              fill={on ? "var(--accent)" : "#fdfcf9"}
              stroke="#8a8478"
              strokeWidth={1}
            />
            {on && (
              <text x={i * WHITE_W + WHITE_W / 2} y={WHITE_H - 12} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--accent-ink)">
                {label(m, highlighted.get(m))}
              </text>
            )}
            {m === middleC && (
              <>
                <circle cx={i * WHITE_W + WHITE_W / 2} cy={WHITE_H + 9} r={3} fill="var(--muted)" />
                <text x={i * WHITE_W + WHITE_W / 2 + 7} y={WHITE_H + 13} fontSize={10} fill="var(--muted)">
                  middle C
                </text>
              </>
            )}
          </g>
        );
      })}
      {blacks.map((m) => {
        const on = highlighted.has(m);
        const x = (whiteIndex.get(m - 1)! + 1) * WHITE_W - BLACK_W / 2;
        return (
          <g key={m}>
            <rect x={x} y={0} width={BLACK_W} height={BLACK_H} rx={2.5} fill={on ? "var(--accent)" : "#22201d"} stroke={on ? "#0b1a44" : "#000"} strokeWidth={on ? 2 : 1} />
            {on && (
              <text x={x + BLACK_W / 2} y={BLACK_H - 10} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="var(--accent-ink)">
                {label(m, highlighted.get(m))}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
