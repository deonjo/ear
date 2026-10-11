"use client";

import { useState } from "react";
import type { ConfusionMatrix as Matrix } from "@/lib/stats";

export interface MatrixItem {
  id: string;
  label: string;
  /** Small identity glyph (a flag) shown in headers. */
  icon?: React.ReactNode;
}

/** Binned so each step reads distinctly; 0 stays the plain surface. */
function heatLevel(rate: number): 0 | 1 | 2 | 3 | 4 {
  if (rate <= 0) return 0;
  if (rate < 0.1) return 1;
  if (rate < 0.25) return 2;
  if (rate < 0.5) return 3;
  return 4;
}

/** Rows: what was played. Columns: what the child chose. Off-diagonal shading shows mix-ups. */
export function ConfusionMatrix({ matrix, items }: { matrix: Matrix; items: MatrixItem[] }) {
  const [focus, setFocus] = useState<{ played: string; chosen: string } | null>(null);
  const byId = new Map(items.map((i) => [i.id, i]));

  if (matrix.total === 0) {
    return <p className="rounded-xl bg-surface-2 p-4 text-sm text-muted">No answers in this range yet.</p>;
  }

  const readout = (() => {
    if (!focus) return "Hover or focus a cell for details. Shading shows how often one chord was mistaken for another.";
    const n = matrix.counts[focus.played]?.[focus.chosen] ?? 0;
    const total = matrix.rowTotals[focus.played] ?? 0;
    const played = byId.get(focus.played)?.label ?? focus.played;
    const chosen = byId.get(focus.chosen)?.label ?? focus.chosen;
    const pct = total ? Math.round((n / total) * 100) : 0;
    if (focus.played === focus.chosen) return `${played}: identified correctly ${n} of ${total} times (${pct}%).`;
    return `${played} was played and ${chosen} was chosen ${n} of ${total} times (${pct}%).`;
  })();

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-[2px] text-sm tabular-nums">
          <caption className="sr-only">Confusion matrix: rows are the chord played, columns are the chord chosen, values are the share of answers for that row.</caption>
          <thead>
            <tr>
              <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-muted">
                Played ↓ · Chose →
              </th>
              {matrix.items.map((id) => (
                <th key={id} scope="col" className="px-1 py-1 font-medium" title={byId.get(id)?.label}>
                  <span className="flex justify-center">{byId.get(id)?.icon ?? byId.get(id)?.label}</span>
                  <span className="sr-only">{byId.get(id)?.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.items.map((played) => {
              const total = matrix.rowTotals[played] ?? 0;
              return (
                <tr key={played}>
                  <th scope="row" className="whitespace-nowrap px-2 py-1 text-left font-medium">
                    <span className="flex items-center gap-1.5">
                      {byId.get(played)?.icon}
                      {byId.get(played)?.label}
                    </span>
                  </th>
                  {matrix.items.map((chosen) => {
                    const n = matrix.counts[played]?.[chosen] ?? 0;
                    const rate = total ? n / total : 0;
                    const diagonal = played === chosen;
                    const level = diagonal ? 0 : heatLevel(rate);
                    const style = diagonal
                      ? { background: "var(--surface-2)", color: "var(--ink)" }
                      : level
                        ? { background: `var(--heat-${level})`, color: `var(--heat-ink-${level})` }
                        : { color: "var(--muted)" };
                    return (
                      <td
                        key={chosen}
                        tabIndex={0}
                        onPointerEnter={() => setFocus({ played, chosen })}
                        onFocus={() => setFocus({ played, chosen })}
                        className={`h-10 min-w-10 rounded-md px-1 text-center outline-offset-1 hover:outline hover:outline-2 hover:outline-[var(--ink)] ${diagonal ? "font-semibold" : ""}`}
                        style={style}
                        aria-label={`${byId.get(played)?.label} played, ${byId.get(chosen)?.label} chosen: ${n} of ${total}`}
                      >
                        {total === 0 ? "" : n === 0 ? (diagonal ? "0%" : "·") : `${Math.round(rate * 100)}%`}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 min-h-[2.5em] text-sm text-muted" aria-live="polite">
        {readout}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted" aria-hidden="true">
        <span>Mix-ups:</span>
        <span>rare</span>
        {[1, 2, 3, 4].map((l) => (
          <span key={l} className="inline-block h-3 w-5 rounded-sm" style={{ background: `var(--heat-${l})` }} />
        ))}
        <span>often (half or more)</span>
      </div>
    </div>
  );
}
