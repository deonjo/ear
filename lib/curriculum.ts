import { BLACK_CHORD_IDS, WHITE_CHORD_IDS, getChord, type ChordId } from "./chords";
import { SINGLE_NOTE_IDS } from "./solfege";
import type { ProgressEvent, SessionMode, StageOrder } from "./types";

/**
 * Stages, in order:
 *   1. White-key chords, one at a time: red alone, then +yellow, +blue … up to all nine.
 *   2./3. Note names (fixed-do solfège + single-note mode) and black-key chords,
 *         in the order chosen by the parent (`StageOrder`).
 */
export type Stage =
  | { kind: "white"; count: number; total: number }
  | { kind: "note-names" }
  | { kind: "black"; count: number; total: number };

export type NextStep = { type: "add-chord"; chordId: ChordId } | { type: "unlock-note-names" };

/** A fresh profile starts with red alone. */
export function initialEvents(at: number): ProgressEvent[] {
  return [{ type: "add-chord", chordId: WHITE_CHORD_IDS[0]!, at }];
}

/** Chords currently in play, in the order they were added. */
export function chordsInPlay(events: readonly ProgressEvent[]): ChordId[] {
  return events.flatMap((e) => (e.type === "add-chord" ? [e.chordId] : []));
}

export function isNoteNamesUnlocked(events: readonly ProgressEvent[]): boolean {
  return events.some((e) => e.type === "unlock-note-names");
}

/** Single-note quizzing is only ever available once the note-names stage has been unlocked. */
export const isSingleNoteModeUnlocked = isNoteNamesUnlocked;

/** When the current set began: the time of the latest progression step. */
export function currentSetStartedAt(events: readonly ProgressEvent[]): number {
  const last = events[events.length - 1];
  if (!last) throw new Error("Profile has no progress events");
  return last.at;
}

export function currentStage(events: readonly ProgressEvent[]): Stage {
  const last = events[events.length - 1];
  if (!last) throw new Error("Profile has no progress events");
  if (last.type === "unlock-note-names") return { kind: "note-names" };
  const chords = chordsInPlay(events);
  if (getChord(last.chordId).group === "black") {
    return { kind: "black", count: chords.filter((id) => getChord(id).group === "black").length, total: BLACK_CHORD_IDS.length };
  }
  return { kind: "white", count: chords.filter((id) => getChord(id).group === "white").length, total: WHITE_CHORD_IDS.length };
}

/** The step the parent could confirm next, or null when every stage is unlocked. */
export function nextStep(events: readonly ProgressEvent[], order: StageOrder): NextStep | null {
  const chords = new Set(chordsInPlay(events));
  const nextWhite = WHITE_CHORD_IDS.find((id) => !chords.has(id));
  if (nextWhite) return { type: "add-chord", chordId: nextWhite };

  const nextBlack = BLACK_CHORD_IDS.find((id) => !chords.has(id));
  const notesDone = isNoteNamesUnlocked(events);
  const addBlack: NextStep | null = nextBlack ? { type: "add-chord", chordId: nextBlack } : null;
  const unlockNotes: NextStep | null = notesDone ? null : { type: "unlock-note-names" };

  return order === "notes-first" ? (unlockNotes ?? addBlack) : (addBlack ?? unlockNotes);
}

/** Appends `step`, refusing anything other than the next step (the app never skips ahead). */
export function applyStep(events: readonly ProgressEvent[], step: NextStep, order: StageOrder, at: number): ProgressEvent[] {
  const expected = nextStep(events, order);
  const same =
    expected !== null &&
    expected.type === step.type &&
    (step.type !== "add-chord" || (expected.type === "add-chord" && expected.chordId === step.chordId));
  if (!same) throw new Error("That step is not the next one in the curriculum");
  return [...events, step.type === "add-chord" ? { type: "add-chord", chordId: step.chordId, at } : { type: "unlock-note-names", at }];
}

/** The order of the two later stages can only change before either of them has begun. */
export function canChangeStageOrder(events: readonly ProgressEvent[]): boolean {
  const blackStarted = chordsInPlay(events).some((id) => getChord(id).group === "black");
  return !blackStarted && !isNoteNamesUnlocked(events);
}

/** Session modes whose results decide whether the current stage is mastered. */
export function countingModes(stage: Stage): SessionMode[] {
  return stage.kind === "note-names" ? ["notes"] : ["chords", "piano"];
}

/** The exact items a counting session must have had in play to count toward the current stage. */
export function stageItems(events: readonly ProgressEvent[]): string[] {
  return currentStage(events).kind === "note-names" ? [...SINGLE_NOTE_IDS] : chordsInPlay(events);
}

export const PLATEAU_MIN_CHORDS = 5;
export const PLATEAU_MAX_CHORDS = 7;
export const PLATEAU_DAYS = 42;

/** A long stay at 5–7 chords is common; the dashboard reassures parents after six weeks. */
export function plateauInfo(events: readonly ProgressEvent[], now: number): { active: boolean; since: number | null; days: number } {
  const chords = chordsInPlay(events);
  const count = chords.length;
  const stage = currentStage(events);
  const fifth = events.filter((e) => e.type === "add-chord")[PLATEAU_MIN_CHORDS - 1];
  if (stage.kind !== "white" || count < PLATEAU_MIN_CHORDS || count > PLATEAU_MAX_CHORDS || !fifth) {
    return { active: false, since: null, days: 0 };
  }
  const days = Math.floor((now - fifth.at) / 86_400_000);
  return { active: days > PLATEAU_DAYS, since: fifth.at, days };
}

export function describeStage(stage: Stage): string {
  switch (stage.kind) {
    case "white":
      return `White-key chords · ${stage.count} of ${stage.total}`;
    case "black":
      return `Black-key chords · ${stage.count} of ${stage.total}`;
    case "note-names":
      return "Note names (solfège)";
  }
}

export function describeStep(step: NextStep): string {
  return step.type === "add-chord" ? `Add the ${getChord(step.chordId).colorName.toLowerCase()} chord` : "Unlock note names";
}
