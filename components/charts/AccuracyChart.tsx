"use client";

import { useMemo, useState } from "react";
import { addDays, daysBetween, formatDay } from "@/lib/dates";
import type { AccuracyPoint } from "@/lib/stats";
import { useElementSize } from "../useElementSize";

export interface ChartSeries {
  key: string;
  label: string;
  /** CSS color for the line and markers (a --series-N token). */
  color: string;
  points: AccuracyPoint[];
}

export interface ChartMarker {
  dayKey: string;
  label: string;
  color: string;
}

const HEIGHT = 220;
const M = { top: 18, right: 44, bottom: 28, left: 40 };
const Y_TICKS = [0, 25, 50, 75, 100];

/** Daily first-answer accuracy, one line per mode. Vertical hairlines mark days a chord was added. */
export function AccuracyChart({ series, markers = [] }: { series: ChartSeries[]; markers?: ChartMarker[] }) {
  const [ref, { width }] = useElementSize<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const visible = series.filter((s) => s.points.length > 0);

  const days = useMemo(() => [...new Set(visible.flatMap((s) => s.points.map((p) => p.dayKey)))].sort(), [visible]);

  if (days.length === 0) {
    return (
      <div ref={ref} className="flex h-40 items-center justify-center rounded-xl bg-surface-2 text-sm text-muted">
        The chart fills in after the first completed session.
      </div>
    );
  }

  const first = days.length === 1 ? addDays(days[0]!, -1) : days[0]!;
  const last = days.length === 1 ? addDays(days[0]!, 1) : days[days.length - 1]!;
  const span = Math.max(1, daysBetween(first, last));
  const plotW = Math.max(10, width - M.left - M.right);
  const plotH = HEIGHT - M.top - M.bottom;
  const x = (key: string) => M.left + (daysBetween(first, key) / span) * plotW;
  const y = (pct: number) => M.top + (1 - pct / 100) * plotH;
  const showDots = days.length <= 60;
  const tickCount = Math.min(days.length === 1 ? 1 : 5, Math.max(2, Math.floor(plotW / 90)));
  const xTicks = days.length === 1 ? [days[0]!] : Array.from({ length: tickCount }, (_, i) => addDays(first, Math.round((i / (tickCount - 1)) * span)));

  const activeDay = active !== null ? days[active] : undefined;
  const activeMarkers = activeDay ? markers.filter((m) => m.dayKey === activeDay) : [];

  // End labels only when they cannot collide.
  const ends = visible.map((s) => s.points[s.points.length - 1]!);
  const endLabelsFit = ends.length < 2 || Math.abs(y(ends[0]!.pct) - y(ends[1]!.pct)) > 14;

  const nearest = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left;
    let best = 0;
    days.forEach((d, i) => {
      if (Math.abs(x(d) - px) < Math.abs(x(days[best]!) - px)) best = i;
    });
    return best;
  };

  const tooltipLeft = activeDay ? Math.min(Math.max(x(activeDay) - 80, 0), Math.max(0, width - 170)) : 0;

  return (
    <div>
      {visible.length > 1 && (
        <ul className="mb-2 flex flex-wrap gap-4 text-sm text-muted" aria-label="Legend">
          {visible.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span className="inline-block h-[2px] w-4 rounded" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div
        ref={ref}
        className="relative rounded-lg focus-visible:outline-offset-4"
        tabIndex={0}
        role="group"
        aria-label="Accuracy over time. Use the left and right arrow keys to read each day."
        onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((a) => a ?? days.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? days.length) - 1));
          else if (e.key === "ArrowRight") setActive((a) => Math.min(days.length - 1, (a ?? -1) + 1));
          else if (e.key === "Home") setActive(0);
          else if (e.key === "End") setActive(days.length - 1);
          else return;
          e.preventDefault();
        }}
      >
        {width > 0 && (
          <svg width={width} height={HEIGHT} aria-hidden="true" className="block">
            {Y_TICKS.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={M.left + plotW} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
                <text x={M.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)" className="tabular-nums">
                  {t}%
                </text>
              </g>
            ))}
            {xTicks.map((d) => (
              <text key={d} x={x(d)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">
                {formatDay(d)}
              </text>
            ))}
            {markers
              .filter((m) => m.dayKey >= first && m.dayKey <= last)
              .map((m) => (
                <g key={`${m.dayKey}-${m.label}`}>
                  <line x1={x(m.dayKey)} x2={x(m.dayKey)} y1={M.top} y2={M.top + plotH} stroke="var(--muted)" strokeOpacity={0.35} strokeWidth={1} />
                  <path d={`M${x(m.dayKey)} ${M.top - 12} l9 3.5 l-9 3.5 z`} fill={m.color} stroke="rgba(0,0,0,0.3)" strokeWidth={0.75} />
                  <line x1={x(m.dayKey)} x2={x(m.dayKey)} y1={M.top - 13} y2={M.top} stroke="var(--muted)" strokeWidth={1} />
                </g>
              ))}
            {visible.map((s) => (
              <g key={s.key}>
                <polyline
                  points={s.points.map((p) => `${x(p.dayKey)},${y(p.pct)}`).join(" ")}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {(showDots ? s.points : s.points.slice(-1)).map((p) => (
                  <circle key={p.dayKey} cx={x(p.dayKey)} cy={y(p.pct)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                ))}
                {endLabelsFit && (
                  <text
                    x={x(s.points[s.points.length - 1]!.dayKey) + 8}
                    y={y(s.points[s.points.length - 1]!.pct) + 4}
                    fontSize={12}
                    fontWeight={600}
                    fill="var(--ink)"
                  >
                    {Math.round(s.points[s.points.length - 1]!.pct)}%
                  </text>
                )}
              </g>
            ))}
            {activeDay && <line x1={x(activeDay)} x2={x(activeDay)} y1={M.top} y2={M.top + plotH} stroke="var(--ink)" strokeOpacity={0.5} strokeWidth={1} />}
          </svg>
        )}
        {activeDay && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-[170px] rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg"
            style={{ left: tooltipLeft }}
            role="status"
            aria-live="polite"
          >
            <p className="text-xs text-muted">{formatDay(activeDay, { weekday: "short", month: "short", day: "numeric" })}</p>
            {visible.map((s) => {
              const p = s.points.find((pt) => pt.dayKey === activeDay);
              return (
                <p key={s.key} className="mt-1 flex items-center gap-2">
                  <span className="inline-block h-[2px] w-3 rounded" style={{ background: s.color }} />
                  <strong className="tabular-nums">{p ? `${Math.round(p.pct)}%` : "–"}</strong>
                  <span className="text-xs text-muted">
                    {s.label}
                    {p ? ` · ${p.sessions} session${p.sessions === 1 ? "" : "s"}` : ""}
                  </span>
                </p>
              );
            })}
            {activeMarkers.map((m) => (
              <p key={m.label} className="mt-1 text-xs text-muted">
                {m.label}
              </p>
            ))}
          </div>
        )}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted">Show as table</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left tabular-nums">
            <thead className="text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">Day</th>
                {visible.map((s) => (
                  <th key={s.key} className="py-1 pr-3 font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d} className="border-t border-line">
                  <td className="py-1 pr-3">{formatDay(d, { weekday: "short", month: "short", day: "numeric" })}</td>
                  {visible.map((s) => {
                    const p = s.points.find((pt) => pt.dayKey === d);
                    return (
                      <td key={s.key} className="py-1 pr-3">
                        {p ? `${Math.round(p.pct)}% (${p.sessions})` : "–"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
