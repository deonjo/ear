import { describe, expect, it } from "vitest";
import { BLACK_CHORD_IDS, WHITE_CHORD_IDS } from "./chords";
import {
  applyStep,
  canChangeStageOrder,
  chordsInPlay,
  currentStage,
  initialEvents,
  isNoteNamesUnlocked,
  isSingleNoteModeUnlocked,
  nextStep,
  plateauInfo,
  stageItems,
} from "./curriculum";
import { SINGLE_NOTE_IDS } from "./solfege";
import type { ProgressEvent, StageOrder } from "./types";

const DAY = 86_400_000;

/** Applies every next step until `stop` returns true (or nothing is left). */
function advance(order: StageOrder, stop: (events: ProgressEvent[]) => boolean = () => false): ProgressEvent[] {
  let events = initialEvents(0);
  for (let i = 1; i < 40 && !stop(events); i++) {
    const step = nextStep(events, order);
    if (!step) break;
    events = applyStep(events, step, order, i * 20 * DAY);
  }
  return events;
}

describe("stage unlocking", () => {
  it("starts with red alone", () => {
    const events = initialEvents(0);
    expect(chordsInPlay(events)).toEqual(["red"]);
    expect(currentStage(events)).toEqual({ kind: "white", count: 1, total: 9 });
    expect(nextStep(events, "notes-first")).toEqual({ type: "add-chord", chordId: "yellow" });
  });

  it("adds the white-key chords one at a time in the fixed order", () => {
    let events = initialEvents(0);
    for (let i = 1; i < WHITE_CHORD_IDS.length; i++) {
      const step = nextStep(events, "notes-first");
      expect(step).toEqual({ type: "add-chord", chordId: WHITE_CHORD_IDS[i] });
      events = applyStep(events, step!, "notes-first", i);
      expect(chordsInPlay(events)).toEqual(WHITE_CHORD_IDS.slice(0, i + 1));
    }
  });

  it("keeps single-note quizzing locked until all nine white-key chords are done and the parent unlocks it", () => {
    const allWhite = advance("notes-first", (e) => chordsInPlay(e).length === 9);
    expect(isSingleNoteModeUnlocked(allWhite)).toBe(false);
    expect(nextStep(allWhite, "notes-first")).toEqual({ type: "unlock-note-names" });
    const notes = applyStep(allWhite, { type: "unlock-note-names" }, "notes-first", 1);
    expect(isSingleNoteModeUnlocked(notes)).toBe(true);
    expect(currentStage(notes)).toEqual({ kind: "note-names" });
    expect(stageItems(notes)).toEqual([...SINGLE_NOTE_IDS]);
  });

  it("notes-first: white → note names → black-key chords", () => {
    const events = advance("notes-first");
    const kinds = events.map((e) => (e.type === "unlock-note-names" ? "notes" : e.chordId));
    expect(kinds).toEqual([...WHITE_CHORD_IDS, "notes", ...BLACK_CHORD_IDS]);
    expect(nextStep(events, "notes-first")).toBeNull();
    expect(currentStage(events)).toEqual({ kind: "black", count: 5, total: 5 });
  });

  it("black-first: white → black-key chords → note names", () => {
    const events = advance("black-first");
    const kinds = events.map((e) => (e.type === "unlock-note-names" ? "notes" : e.chordId));
    expect(kinds).toEqual([...WHITE_CHORD_IDS, ...BLACK_CHORD_IDS, "notes"]);
    expect(nextStep(events, "black-first")).toBeNull();
  });

  it("never offers single notes or black keys while white-key chords remain", () => {
    for (const order of ["notes-first", "black-first"] as const) {
      advance(order, (events) => {
        if (chordsInPlay(events).length < 9) {
          expect(isNoteNamesUnlocked(events)).toBe(false);
          expect(nextStep(events, order)?.type).toBe("add-chord");
          const next = nextStep(events, order);
          expect(next?.type === "add-chord" && WHITE_CHORD_IDS.includes(next.chordId)).toBe(true);
        }
        return false;
      });
    }
  });

  it("refuses to skip ahead", () => {
    const events = initialEvents(0);
    expect(() => applyStep(events, { type: "add-chord", chordId: "blue" }, "notes-first", 1)).toThrow();
    expect(() => applyStep(events, { type: "unlock-note-names" }, "notes-first", 1)).toThrow();
  });

  it("locks the stage-order setting once a later stage has begun", () => {
    const allWhite = advance("notes-first", (e) => chordsInPlay(e).length === 9);
    expect(canChangeStageOrder(allWhite)).toBe(true);
    expect(canChangeStageOrder(applyStep(allWhite, { type: "unlock-note-names" }, "notes-first", 1))).toBe(false);
    expect(canChangeStageOrder(applyStep(allWhite, { type: "add-chord", chordId: "gray" }, "black-first", 1))).toBe(false);
  });
});

describe("plateauInfo", () => {
  const atCount = (n: number) => advance("notes-first", (e) => chordsInPlay(e).length === n);

  it("is quiet before five chords and after seven", () => {
    expect(plateauInfo(atCount(4), 10_000 * DAY).active).toBe(false);
    expect(plateauInfo(atCount(8), 10_000 * DAY).active).toBe(false);
  });

  it("turns on after more than six weeks at 5–7 chords", () => {
    const events = atCount(6);
    const fifthAt = events[4]!.at;
    expect(plateauInfo(events, fifthAt + 42 * DAY).active).toBe(false);
    expect(plateauInfo(events, fifthAt + 43 * DAY).active).toBe(true);
  });
});
