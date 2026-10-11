"use client";

import { useId } from "react";
import type { ChordDef, FlagPattern } from "@/lib/chords";

const PENNANT = "M25 12 L92 38 L25 64 Z";

function PatternTile({ pattern, ink }: { pattern: FlagPattern; ink: string }) {
  const s = { stroke: ink, strokeWidth: 1.6, fill: "none", strokeLinecap: "round" as const };
  switch (pattern) {
    case "dots":
      return <circle cx={3.5} cy={3.5} r={1.6} fill={ink} />;
    case "stripes-h":
      return <rect x={0} y={0} width={7} height={2.2} fill={ink} />;
    case "stripes-v":
      return <rect x={0} y={0} width={2.2} height={7} fill={ink} />;
    case "stripes-d":
    case "stripes-d2":
      return <rect x={0} y={0} width={2.4} height={7} fill={ink} />;
    case "grid":
      return <path d="M0 0.5 H7 M0.5 0 V7" {...s} strokeWidth={1.1} />;
    case "checker":
      return (
        <>
          <rect x={0} y={0} width={3.5} height={3.5} fill={ink} />
          <rect x={3.5} y={3.5} width={3.5} height={3.5} fill={ink} />
        </>
      );
    case "rings":
      return <circle cx={3.5} cy={3.5} r={2.2} {...s} strokeWidth={1.1} />;
    case "zigzag":
      return <polyline points="0,5 1.75,2 3.5,5 5.25,2 7,5" {...s} strokeWidth={1.2} />;
    case "cross":
      return <path d="M3.5 1.2 V5.8 M1.2 3.5 H5.8" {...s} strokeWidth={1.3} />;
    case "waves":
      return <path d="M0 4 Q1.75 1.5 3.5 4 T7 4" {...s} strokeWidth={1.2} />;
    case "diamonds":
      return <path d="M3.5 1 L6 3.5 L3.5 6 L1 3.5 Z" fill={ink} />;
    case "triangles":
      return <path d="M3.5 1.2 L6 5.8 L1 5.8 Z" fill={ink} />;
    case "none":
      return null;
  }
}

export interface FlagProps {
  chord: ChordDef;
  showPattern?: boolean;
  /** Waving celebration. */
  waving?: boolean;
  /** Soft glowing halo behind the flag. */
  halo?: "gold" | "soft" | null;
  className?: string;
}

/** A pennant on a pole. Purely visual; wrap it in a button to make it tappable. */
export function Flag({ chord, showPattern = false, waving = false, halo = null, className = "" }: FlagProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const patternId = `pat-${uid}`;
  const haloId = `halo-${uid}`;
  const usePattern = showPattern && chord.pattern !== "none";
  const rotate = chord.pattern === "stripes-d" ? 45 : chord.pattern === "stripes-d2" ? -45 : 0;

  return (
    <svg viewBox="0 0 100 100" className={`${waving ? "flag-wave" : ""} ${className}`} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={haloId}>
          <stop offset="0%" stopColor={halo === "gold" ? "#FFE680" : "#FFFFFF"} stopOpacity={0.95} />
          <stop offset="70%" stopColor={halo === "gold" ? "#FFD84D" : "#FFFFFF"} stopOpacity={0.35} />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
        {usePattern && (
          <pattern id={patternId} width={7} height={7} patternUnits="userSpaceOnUse" patternTransform={rotate ? `rotate(${rotate})` : undefined}>
            <g opacity={0.6}>
              <PatternTile pattern={chord.pattern} ink={chord.ink} />
            </g>
          </pattern>
        )}
      </defs>
      {halo && <circle className="flag-halo" cx={52} cy={48} r={50} fill={`url(#${haloId})`} style={{ transformBox: "fill-box", transformOrigin: "center" }} />}
      <ellipse cx={22} cy={95} rx={13} ry={2.6} fill="#000" opacity={0.1} />
      <g className="flag-whole">
        <rect x={19} y={8} width={6} height={87} rx={3} fill="#5B4636" />
        <circle cx={22} cy={8} r={5} fill="#E0A526" />
        <g className="flag-pennant">
          <path d={PENNANT} fill={chord.color} stroke="var(--flag-outline, rgba(0,0,0,0.28))" strokeWidth={1.4} strokeLinejoin="round" />
          {usePattern && <path d={PENNANT} fill={`url(#${patternId})`} />}
          <path d="M25 14 L84 37" stroke="#fff" strokeOpacity={0.22} strokeWidth={2.5} strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

/** Small flag for parent screens, optionally followed by its color name. */
export function FlagChip({
  chord,
  showPattern = false,
  size = 28,
  label = true,
}: {
  chord: ChordDef;
  showPattern?: boolean;
  size?: number;
  label?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block shrink-0" style={{ width: size, height: size }}>
        <Flag chord={chord} showPattern={showPattern} className="h-full w-full" />
      </span>
      {label ? <span>{chord.colorName}</span> : <span className="sr-only">{chord.colorName}</span>}
    </span>
  );
}
