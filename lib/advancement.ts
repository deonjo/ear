import { countingModes, currentSetStartedAt, currentStage, nextStep, stageItems, type NextStep } from "./curriculum";
import { dayKey, daysBetween } from "./dates";
import { sessionScore } from "./stats";
import type { ProgressEvent, SessionRecord, StageOrder } from "./types";

/** Minimum calendar days on a set before anything new is added. */
export const MIN_DAYS_ON_SET = 14;

export interface Readiness {
  /** Both conditions are met and there is a next step. The parent still has to confirm it. */
  ready: boolean;
  next: NextStep | null;
  setStartedAt: number;
  daysOnSet: number;
  daysMet: boolean;
  /** Completed sessions at 100% in a row, most recent first (capped at `requiredPerfect`). */
  perfectStreak: number;
  requiredPerfect: number;
  perfectMet: boolean;
  /** The most recent completed sessions that the rule looked at. */
  considered: SessionRecord[];
}

function sameItems(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
}

/** Completed sessions on the current set that count toward mastering it, newest first. */
export function countingSessions(events: readonly ProgressEvent[], sessions: readonly SessionRecord[]): SessionRecord[] {
  const start = currentSetStartedAt(events);
  const modes = countingModes(currentStage(events));
  const items = stageItems(events);
  return sessions
    .filter((s) => s.completed && s.startedAt >= start && modes.includes(s.mode) && sameItems(s.itemsInPlay, items))
    .sort((a, b) => b.endedAt - a.endedAt);
}

/**
 * The advancement rule: at least 14 days on the current set AND the last N completed
 * sessions on it all at 100% (N is a setting, default 3), whichever takes longer.
 * Because every item in play appears at least once per session, a 100% session means
 * every chord in play was identified correctly.
 */
export function evaluateReadiness(params: {
  events: readonly ProgressEvent[];
  sessions: readonly SessionRecord[];
  order: StageOrder;
  requiredPerfect: number;
  now: number;
}): Readiness {
  const { events, sessions, order, now } = params;
  const requiredPerfect = Math.max(1, Math.round(params.requiredPerfect));
  const setStartedAt = currentSetStartedAt(events);
  const daysOnSet = Math.max(0, daysBetween(dayKey(setStartedAt), dayKey(now)));
  const daysMet = daysOnSet >= MIN_DAYS_ON_SET;

  const counted = countingSessions(events, sessions);
  const considered = counted.slice(0, requiredPerfect);
  let perfectStreak = 0;
  for (const s of considered) {
    if (!sessionScore(s).perfect) break;
    perfectStreak++;
  }
  const perfectMet = perfectStreak >= requiredPerfect;
  const next = nextStep(events, order);

  return {
    ready: next !== null && daysMet && perfectMet,
    next,
    setStartedAt,
    daysOnSet,
    daysMet,
    perfectStreak,
    requiredPerfect,
    perfectMet,
    considered,
  };
}
