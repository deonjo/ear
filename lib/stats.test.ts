import { describe, expect, it } from "vitest";
import { dayKey } from "./dates";
import { confusionMatrix, scoreTrials, streaks, topConfusions } from "./stats";
import type { SessionRecord, Trial } from "./types";

const day = (n: number, hour = 10) => new Date(2026, 2, 1 + n, hour).getTime();

function completed(at: number, trials: Trial[] = []): SessionRecord {
  return { id: String(at), profileId: "p", mode: "chords", startedAt: at, endedAt: at, dayKey: dayKey(at), targetCount: 20, itemsInPlay: [], completed: true, trials };
}

const t = (target: string, response: string): Trial => ({ target, response, correct: target === response, replays: 0, responseMs: 0, at: 0 });

describe("scoreTrials", () => {
  it("only calls a session perfect when every trial is correct", () => {
    expect(scoreTrials([t("red", "red"), t("red", "red")]).perfect).toBe(true);
    expect(scoreTrials([t("red", "red"), t("red", "yellow")])).toMatchObject({ correct: 1, total: 2, pct: 50, perfect: false });
    expect(scoreTrials([]).perfect).toBe(false);
  });
});

describe("streaks", () => {
  it("counts consecutive practice days and keeps yesterday's streak alive until today ends", () => {
    const sessions = [completed(day(0)), completed(day(1)), completed(day(2)), completed(day(4)), completed(day(5)), completed(day(5, 12))];
    expect(streaks(sessions, 2, day(5, 20))).toMatchObject({ current: 2, longest: 3, practiceDays: 5, goalDays: 1 });
    expect(streaks(sessions, 2, day(6, 9)).current).toBe(2);
    expect(streaks(sessions, 2, day(7, 9)).current).toBe(0);
  });
});

describe("confusionMatrix", () => {
  it("tallies played vs chosen", () => {
    const m = confusionMatrix([completed(day(0), [t("red", "red"), t("red", "yellow"), t("yellow", "red"), t("red", "yellow")])], ["red", "yellow"]);
    expect(m.counts.red).toEqual({ red: 1, yellow: 2 });
    expect(m.counts.yellow).toEqual({ red: 1, yellow: 0 });
    expect(topConfusions(m)[0]).toMatchObject({ played: "red", chosen: "yellow", count: 2 });
  });
});
