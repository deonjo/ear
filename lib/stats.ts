import { addDays, dayKey, daysBetween } from "./dates";
import type { SessionMode, SessionRecord, Trial } from "./types";

export interface Score {
  correct: number;
  total: number;
  /** Rounded percentage, 0 when there are no trials. */
  pct: number;
  /** Every answered trial was correct (and there was at least one). */
  perfect: boolean;
}

export function scoreTrials(trials: readonly Trial[]): Score {
  const total = trials.length;
  const correct = trials.filter((t) => t.correct).length;
  return { correct, total, pct: total ? Math.round((correct / total) * 100) : 0, perfect: total > 0 && correct === total };
}

export function sessionScore(session: Pick<SessionRecord, "trials">): Score {
  return scoreTrials(session.trials);
}

export function completedOn(sessions: readonly SessionRecord[], key: string): number {
  return sessions.filter((s) => s.completed && s.dayKey === key).length;
}

export function todayProgress(sessions: readonly SessionRecord[], goal: number, now: number) {
  const done = completedOn(sessions, dayKey(now));
  return { done, goal, met: done >= goal };
}

export interface Streaks {
  /** Consecutive days with at least one completed session, ending today (or yesterday if today has none yet). */
  current: number;
  longest: number;
  practiceDays: number;
  /** Days on which the daily goal was met. */
  goalDays: number;
  completedSessions: number;
}

export function streaks(sessions: readonly SessionRecord[], goal: number, now: number): Streaks {
  const perDay = new Map<string, number>();
  for (const s of sessions) if (s.completed) perDay.set(s.dayKey, (perDay.get(s.dayKey) ?? 0) + 1);
  const days = [...perDay.keys()].sort();

  let longest = 0;
  let run = 0;
  days.forEach((d, i) => {
    run = i > 0 && daysBetween(days[i - 1]!, d) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  });

  const today = dayKey(now);
  let cursor = perDay.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (perDay.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  return {
    current,
    longest,
    practiceDays: days.length,
    goalDays: [...perDay.values()].filter((n) => n >= goal).length,
    completedSessions: sessions.filter((s) => s.completed).length,
  };
}

export interface DayStat {
  dayKey: string;
  completed: number;
  partial: number;
  correct: number;
  total: number;
}

/** One entry per calendar day from `days - 1` days ago through today (oldest first). */
export function dailyHistory(sessions: readonly SessionRecord[], days: number, now: number): DayStat[] {
  const today = dayKey(now);
  const map = new Map<string, DayStat>();
  for (let i = days - 1; i >= 0; i--) {
    const key = addDays(today, -i);
    map.set(key, { dayKey: key, completed: 0, partial: 0, correct: 0, total: 0 });
  }
  for (const s of sessions) {
    const stat = map.get(s.dayKey);
    if (!stat) continue;
    if (s.completed) stat.completed++;
    else if (s.trials.length) stat.partial++;
    const score = sessionScore(s);
    stat.correct += score.correct;
    stat.total += score.total;
  }
  return [...map.values()];
}

export interface AccuracyPoint {
  dayKey: string;
  /** Pooled first-answer accuracy for the day, 0–100. */
  pct: number;
  trials: number;
  sessions: number;
}

/** Daily accuracy for completed sessions in the given modes, oldest first. */
export function accuracyByDay(sessions: readonly SessionRecord[], modes: readonly SessionMode[]): AccuracyPoint[] {
  const map = new Map<string, { correct: number; total: number; sessions: number }>();
  for (const s of sessions) {
    if (!s.completed || !modes.includes(s.mode)) continue;
    const score = sessionScore(s);
    const day = map.get(s.dayKey) ?? { correct: 0, total: 0, sessions: 0 };
    day.correct += score.correct;
    day.total += score.total;
    day.sessions++;
    map.set(s.dayKey, day);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, d]) => ({ dayKey: key, pct: d.total ? (d.correct / d.total) * 100 : 0, trials: d.total, sessions: d.sessions }));
}

export interface ConfusionMatrix {
  items: string[];
  /** counts[played][chosen] */
  counts: Record<string, Record<string, number>>;
  rowTotals: Record<string, number>;
  total: number;
}

/** Rows are what was played, columns are what the child chose. */
export function confusionMatrix(sessions: readonly SessionRecord[], items: readonly string[]): ConfusionMatrix {
  const counts: Record<string, Record<string, number>> = {};
  const rowTotals: Record<string, number> = {};
  for (const played of items) {
    counts[played] = Object.fromEntries(items.map((chosen) => [chosen, 0]));
    rowTotals[played] = 0;
  }
  let total = 0;
  for (const s of sessions) {
    for (const t of s.trials) {
      const row = counts[t.target];
      if (!row || !(t.response in row)) continue;
      row[t.response]!++;
      rowTotals[t.target]!++;
      total++;
    }
  }
  return { items: [...items], counts, rowTotals, total };
}

/** The most frequent mix-ups, largest first. */
export function topConfusions(matrix: ConfusionMatrix, limit = 3): { played: string; chosen: string; count: number; rate: number }[] {
  const out: { played: string; chosen: string; count: number; rate: number }[] = [];
  for (const played of matrix.items) {
    for (const chosen of matrix.items) {
      const count = matrix.counts[played]?.[chosen] ?? 0;
      if (played !== chosen && count > 0) out.push({ played, chosen, count, rate: count / (matrix.rowTotals[played] || 1) });
    }
  }
  return out.sort((a, b) => b.count - a.count || b.rate - a.rate).slice(0, limit);
}
