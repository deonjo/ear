"use client";

import type { ChordDef } from "@/lib/chords";
import { Flag } from "../Flag";
import { StarIcon } from "../Icons";
import { useElementSize } from "../useElementSize";
import { bestGrid } from "./gridLayout";

export type FlagState = "idle" | "celebrate" | "reveal" | "dim";

interface FlagGridProps {
  chords: readonly ChordDef[];
  stateOf: (chord: ChordDef) => FlagState;
  onTap: (chord: ChordDef) => void;
  disabled?: boolean;
  showPatterns: boolean;
  /** Solfège syllables to show on a flag (note-names stage), low → high. */
  syllables?: { chordId: string; shown: string[] } | null;
}

const SPARKS: [number, number][] = [
  [-38, -34],
  [36, -40],
  [46, 4],
  [-44, 8],
  [-10, -50],
  [18, 30],
];

/** Every flag in play as a large tappable button (each cell is at least 120px). No text. */
export function FlagGrid({ chords, stateOf, onTap, disabled, showPatterns, syllables }: FlagGridProps) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const { cols, cell } = bestGrid(chords.length, size.width, size.height);
  const ready = size.width > 0;

  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center overflow-auto">
      {ready && (
        <div className="flex flex-wrap justify-center" style={{ width: cols * cell }}>
          {chords.map((chord) => {
            const state = stateOf(chord);
            const sylls = syllables?.chordId === chord.id ? syllables.shown : null;
            return (
              <button
                key={chord.id}
                type="button"
                aria-label={`${chord.colorName} flag`}
                disabled={disabled}
                onClick={() => onTap(chord)}
                className={`relative flex items-center justify-center rounded-3xl transition-opacity duration-300 focus-visible:outline-offset-[-6px] ${
                  state === "dim" ? "opacity-30" : "opacity-100"
                } ${disabled ? "cursor-default" : "cursor-pointer active:scale-[0.97]"}`}
                style={{ width: cell, height: cell }}
              >
                <Flag
                  chord={chord}
                  showPattern={showPatterns}
                  waving={state === "celebrate"}
                  halo={state === "celebrate" ? "gold" : state === "reveal" ? "soft" : null}
                  className="h-[88%] w-[88%]"
                />
                {state === "celebrate" && (
                  <span className="pointer-events-none absolute inset-0" aria-hidden="true">
                    <StarIcon className="star-pop absolute right-[10%] top-[6%] h-[22%] w-[22%] text-[#F5B700]" />
                    {SPARKS.map(([dx, dy], i) => (
                      <span
                        key={i}
                        className="sparkle absolute left-1/2 top-[40%] h-2.5 w-2.5 rounded-full"
                        style={
                          {
                            background: i % 2 ? "#FFD84D" : chord.color,
                            "--dx": `${dx}px`,
                            "--dy": `${dy}px`,
                            animationDelay: `${i * 40}ms`,
                          } as React.CSSProperties
                        }
                      />
                    ))}
                  </span>
                )}
                {sylls && sylls.length > 0 && (
                  <span className="pointer-events-none absolute left-[30%] top-[10%] flex h-[56%] flex-col-reverse items-start justify-center gap-[3%]" aria-hidden="true">
                    {sylls.map((s, i) => (
                      <span
                        key={`${s}-${i}`}
                        className="syllable-in rounded-full bg-white/95 px-[0.6em] py-[0.1em] font-bold leading-tight text-[#1e2229] shadow"
                        style={{ fontSize: Math.max(16, cell * 0.12) }}
                      >
                        {s}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
