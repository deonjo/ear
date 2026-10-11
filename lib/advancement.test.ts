import { describe, expect, it } from "vitest";
import { MIN_DAYS_ON_SET, evaluateReadiness } from "./advancement";
import { applyStep, initialEvents } from "./curriculum";
import { dayKey } from "./dates";
import type { ProgressEvent, SessionMode, SessionRecord } from "./types";

/** Local 10am on day `n` after Jan 1 2026. */
const day = (n: number, hour = 10) => new Date(2026, 0, 1 + n, hour).getTime();

let nextId = 0;
function session(opts: {
  at: number;
  items: string[];
  correct: number;
  total?: number;
  mode?: SessionMode;
  completed?: boolean;
}): SessionRecord {
  const total = opts.total ?? 20;
  return {
    id: `s${nextId++}`,
    profileId: "p",
    mode: opts.mode ?? "chords",
    startedAt: opts.at,
    endedAt: opts.at + 120_000,
    dayKey: dayKey(opts.at),
    targetCount: total,
    itemsInPlay: opts.items,
    completed: opts.completed ?? true,
    trials: Array.from({ length: opts.completed === false ? Math.min(5, total) : total }, (_, i) => ({
      target: opts.items[i % opts.items.length]!,
      response: i < opts.correct ? opts.items[i % opts.items.length]! : "wrong",
      correct: i < opts.correct,
      replays: 0,
      responseMs: 1000,
      at: opts.at + i,
    })),
  };
}

const RED_YELLOW: ProgressEvent[] = applyStep(initialEvents(day(-30)), { type: "add-chord", chordId: "yellow" }, "notes-first", day(0));
const RY = ["red", "yellow"];

function readiness(sessions: SessionRecord[], now: number, requiredPerfect = 3, events = RED_YELLOW) {
  return evaluateReadiness({ events, sessions, order: "notes-first", requiredPerfect, now });
}

describe("advancement rule", () => {
  it("is not ready on day one even with perfect sessions", () => {
    const sessions = [0, 1, 2].map((i) => session({ at: day(0, 10 + i), items: RY, correct: 20 }));
    const r = readiness(sessions, day(0, 18));
    expect(r.perfectMet).toBe(true);
    expect(r.daysMet).toBe(false);
    expect(r.ready).toBe(false);
  });

  it("needs at least 14 calendar days on the current set", () => {
    const sessions = [0, 1, 2].map((i) => session({ at: day(13, 10 + i), items: RY, correct: 20 }));
    expect(readiness(sessions, day(13, 18)).ready).toBe(false);
    expect(readiness(sessions, day(13, 18)).daysOnSet).toBe(MIN_DAYS_ON_SET - 1);
    const later = [0, 1, 2].map((i) => session({ at: day(14, 10 + i), items: RY, correct: 20 }));
    const r = readiness(later, day(14, 18));
    expect(r.daysOnSet).toBe(14);
    expect(r.ready).toBe(true);
    expect(r.next).toEqual({ type: "add-chord", chordId: "blue" });
  });

  it("is not ready after 14 days unless the last N completed sessions are all 100%", () => {
    const sessions = [
      session({ at: day(20, 9), items: RY, correct: 20 }),
      session({ at: day(20, 10), items: RY, correct: 19 }),
      session({ at: day(20, 11), items: RY, correct: 20 }),
      session({ at: day(20, 12), items: RY, correct: 20 }),
    ];
    const r = readiness(sessions, day(20, 18));
    expect(r.daysMet).toBe(true);
    expect(r.perfectStreak).toBe(2);
    expect(r.ready).toBe(false);
    // One more perfect session makes three in a row.
    expect(readiness([...sessions, session({ at: day(20, 13), items: RY, correct: 20 })], day(20, 18)).ready).toBe(true);
  });

  it("respects the configurable threshold", () => {
    const sessions = [session({ at: day(15, 9), items: RY, correct: 20 })];
    expect(readiness(sessions, day(15, 18), 1).ready).toBe(true);
    expect(readiness(sessions, day(15, 18), 3).ready).toBe(false);
  });

  it("ignores partial sessions, other sets, and sessions before the set started", () => {
    const sessions = [
      session({ at: day(-5), items: ["red"], correct: 20 }), // previous set
      session({ at: day(16, 9), items: RY, correct: 20 }),
      session({ at: day(16, 10), items: RY, correct: 20 }),
      session({ at: day(16, 11), items: RY, correct: 5, completed: false }), // partial: ignored
      session({ at: day(16, 12), items: ["red"], correct: 20 }), // wrong set: ignored
    ];
    const r = readiness(sessions, day(16, 18));
    expect(r.considered).toHaveLength(2);
    expect(r.ready).toBe(false);
    expect(readiness([...sessions, session({ at: day(16, 13), items: RY, correct: 20 })], day(16, 18)).ready).toBe(true);
  });

  it("counts real-piano sessions but not single-note sessions during chord stages", () => {
    const sessions = [
      session({ at: day(15, 9), items: RY, correct: 20, mode: "piano" }),
      session({ at: day(15, 10), items: RY, correct: 20, mode: "piano" }),
      session({ at: day(15, 11), items: RY, correct: 20, mode: "notes" }),
    ];
    expect(readiness(sessions, day(15, 18)).considered).toHaveLength(2);
  });

  it("uses single-note sessions to decide the note-names stage", () => {
    let events = initialEvents(day(-400));
    const whites = ["yellow", "blue", "black", "green", "orange", "purple", "pink", "brown"] as const;
    whites.forEach((id, i) => (events = applyStep(events, { type: "add-chord", chordId: id }, "notes-first", day(-380 + i * 20))));
    events = applyStep(events, { type: "unlock-note-names" }, "notes-first", day(0));
    const notes = ["do", "re", "mi", "fa", "sol", "la", "ti"];
    const chordOnly = [1, 2, 3].map((i) => session({ at: day(15, 9 + i), items: events.flatMap((e) => (e.type === "add-chord" ? [e.chordId] : [])), correct: 20 }));
    expect(readiness(chordOnly, day(15, 18), 3, events).ready).toBe(false);
    const noteSessions = [1, 2, 3].map((i) => session({ at: day(15, 12 + i), items: notes, correct: 20, mode: "notes" }));
    const r = readiness([...chordOnly, ...noteSessions], day(15, 18), 3, events);
    expect(r.ready).toBe(true);
    expect(r.next).toEqual({ type: "add-chord", chordId: "gray" });
  });

  it("is never ready once every stage is unlocked", () => {
    let events = initialEvents(day(-1000));
    const steps = ["yellow", "blue", "black", "green", "orange", "purple", "pink", "brown"] as const;
    steps.forEach((id, i) => (events = applyStep(events, { type: "add-chord", chordId: id }, "black-first", day(-900 + i * 20))));
    (["gray", "tan", "lightgreen", "lightpurple", "skyblue"] as const).forEach(
      (id, i) => (events = applyStep(events, { type: "add-chord", chordId: id }, "black-first", day(-500 + i * 20))),
    );
    events = applyStep(events, { type: "unlock-note-names" }, "black-first", day(-100));
    const notes = ["do", "re", "mi", "fa", "sol", "la", "ti"];
    const sessions = [1, 2, 3].map((i) => session({ at: day(0, 9 + i), items: notes, correct: 20, mode: "notes" }));
    const r = evaluateReadiness({ events, sessions, order: "black-first", requiredPerfect: 3, now: day(0, 18) });
    expect(r.perfectMet).toBe(true);
    expect(r.next).toBeNull();
    expect(r.ready).toBe(false);
  });
});
