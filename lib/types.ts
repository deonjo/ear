import type { ChordId } from "./chords";

/** chords: app plays the chord · piano: parent plays a real piano · notes: single-note solfège. */
export type SessionMode = "chords" | "piano" | "notes";

/** Which later stage comes right after the nine white-key chords. */
export type StageOrder = "notes-first" | "black-first";

export interface ProfileSettings {
  /** Target number of trials per session (10–30). */
  sessionLength: number;
  /** Sessions per day to aim for. */
  dailyGoal: number;
  /** How many of the most recent completed sessions must all be 100% before advancing. */
  perfectSessionsRequired: number;
  /** Colorblind-friendly patterns on flags. */
  flagPatterns: boolean;
  stageOrder: StageOrder;
  /** Show a star for each correct answer on the child's progress row. */
  showStars: boolean;
}

/** Progress is an append-only log; everything else (stage, chords in play, set start) derives from it. */
export type ProgressEvent =
  | { type: "add-chord"; chordId: ChordId; at: number }
  | { type: "unlock-note-names"; at: number };

export interface Profile {
  id: string;
  name: string;
  createdAt: number;
  settings: ProfileSettings;
  events: ProgressEvent[];
}

export interface Trial {
  /** Chord id or note id that was played. */
  target: string;
  /** Chord id or note id the child chose. */
  response: string;
  correct: boolean;
  /** Extra plays requested within the trial. */
  replays: number;
  /** From the start of the sound (or the prompt, in piano mode) to the answer. */
  responseMs: number;
  at: number;
}

export interface SessionRecord {
  id: string;
  profileId: string;
  mode: SessionMode;
  startedAt: number;
  /** Updated after every trial, so a session that stops early is still saved. */
  endedAt: number;
  /** Local calendar day (YYYY-MM-DD) the session started on. */
  dayKey: string;
  /** Trials planned for this session. */
  targetCount: number;
  itemsInPlay: string[];
  /** True once every planned trial was answered. */
  completed: boolean;
  trials: Trial[];
}

export const SETTINGS_LIMITS = {
  sessionLength: { min: 10, max: 30 },
  dailyGoal: { min: 1, max: 10 },
  perfectSessionsRequired: { min: 1, max: 10 },
} as const;

export const DEFAULT_SETTINGS: ProfileSettings = {
  sessionLength: 20,
  dailyGoal: 5,
  perfectSessionsRequired: 3,
  flagPatterns: false,
  stageOrder: "notes-first",
  showStars: true,
};
