"use client";

import { useState } from "react";
import { addDays, dayKey, formatDay, weekdayIndex } from "@/lib/dates";
import type { DayStat } from "@/lib/stats";

const CELL = 15;
const GAP = 3;
const ROW_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

function level(completed: number, goal: number): 0 | 1 | 2 | 3 {
  if (completed <= 0) return 0;
  if (completed >= goal) return 3;
  return completed / goal < 0.5 ? 1 : 2;
}

/** GitHub-style practice calendar: each square is a day, darker means more sessions; darkest means the daily goal was met. */
export function HabitCalendar({ days, goal, now }: { days: DayStat[]; goal: number; now: number }) {
  const [active, setActive] = useState<number | null>(null);
  const today = dayKey(now);
  const byKey = new Map(days.map((d) => [d.dayKey, d]));
  const first = days[0]?.dayKey ?? today;
  // Start the grid on the Monday on or before the first day.
  const gridStart = addDays(first, -weekdayIndex(first));
  const cells: string[] = [];
  for (let k = gridStart; k <= today; k = addDays(k, 1)) cells.push(k);
  const weeks = Math.ceil(cells.length / 7);

  const monthLabels: { col: number; label: string }[] = [];
  for (let w = 0; w < weeks; w++) {
    const k = cells[w * 7]!;
    const prev = w > 0 ? cells[(w - 1) * 7]! : null;
    if (!prev || k.slice(5, 7) !== prev.slice(5, 7)) monthLabels.push({ col: w, label: formatDay(k, { month: "short" }) });
  }

  const activeKey = active !== null ? cells[active] : undefined;
  const activeStat = activeKey ? byKey.get(activeKey) : undefined;
  const width = 30 + weeks * (CELL + GAP);
  const height = 18 + 7 * (CELL + GAP);

  return (
    <div>
      <div
        className="overflow-x-auto rounded-lg focus-visible:outline-offset-4"
        tabIndex={0}
        role="group"
        aria-label="Practice calendar. Use arrow keys to move between days."
        onFocus={() => setActive((a) => a ?? cells.length - 1)}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
        onKeyDown={(e) => {
          const moves: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
          const delta = moves[e.key];
          if (delta === undefined) return;
          e.preventDefault();
          setActive((a) => Math.min(cells.length - 1, Math.max(0, (a ?? cells.length - 1) + delta)));
        }}
      >
        <svg width={width} height={height} aria-hidden="true" className="block">
          {monthLabels.map((m) => (
            <text key={m.col} x={30 + m.col * (CELL + GAP)} y={11} fontSize={11} fill="var(--muted)">
              {m.label}
            </text>
          ))}
          {ROW_LABELS.map((l, r) =>
            l ? (
              <text key={r} x={0} y={18 + r * (CELL + GAP) + CELL - 3} fontSize={10} fill="var(--muted)">
                {l}
              </text>
            ) : null,
          )}
          {cells.map((k, i) => {
            const stat = byKey.get(k);
            const lv = level(stat?.completed ?? 0, goal);
            const col = Math.floor(i / 7);
            const row = i % 7;
            return (
              <rect
                key={k}
                x={30 + col * (CELL + GAP)}
                y={18 + row * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={3}
                fill={lv ? `var(--cal-${lv})` : "var(--surface-2)"}
                stroke={active === i ? "var(--ink)" : k === today ? "var(--muted)" : "none"}
                strokeWidth={active === i ? 2 : 1}
                onPointerEnter={() => setActive(i)}
              />
            );
          })}
        </svg>
      </div>
      <p className="mt-2 min-h-[1.5em] text-sm text-muted" aria-live="polite">
        {activeKey
          ? `${formatDay(activeKey, { weekday: "long", month: "short", day: "numeric" })}: ${activeStat?.completed ?? 0} of ${goal} sessions${
              activeStat?.partial ? ` (+${activeStat.partial} ended early)` : ""
            }`
          : "Each square is a day. Hover or use the arrow keys for details."}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted" aria-hidden="true">
        <span>None</span>
        <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "var(--surface-2)" }} />
        <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "var(--cal-1)" }} />
        <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "var(--cal-2)" }} />
        <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "var(--cal-3)" }} />
        <span>Daily goal met</span>
      </div>
    </div>
  );
}
