"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { stopAll } from "./audio";
import { generateSequence, sessionLength } from "./randomizer";
import { discardIfEmpty, saveTrials, startSession } from "./repo";
import type { SessionMode, Trial } from "./types";

/**
 * ready      waiting for the grown-up to tap play
 * pause      short silence before the next sound
 * listening  the sound has played; waiting for a tap
 * correct    celebrating (and, in the note-names stage, playing the notes one by one)
 * reveal     neutral correction: the right answer is highlighted and played once more
 * done       session finished
 */
export type Phase = "ready" | "pause" | "listening" | "correct" | "reveal" | "done";

export const TIMING = {
  pauseMs: 900,
  correctMs: 1300,
  revealDelayMs: 450,
  afterRevealMs: 600,
};

interface Options {
  profileId: string;
  mode: SessionMode;
  items: readonly string[];
  target: number;
  /** Plays an item and returns how long the sound lasts (ms). */
  play: (item: string) => number;
  /** Optional extra step after a correct answer; returns the extra time it needs (ms). */
  onCorrect?: (item: string) => number;
}

export function useTrialRunner({ profileId, mode, items, target, play, onCorrect }: Options) {
  // One fixed, valid order per session. Mount a new runner (change its React key) for a new session.
  const [sequence] = useState(() => generateSequence(items, sessionLength(target, items.length)));
  const [itemsInPlay] = useState(() => [...items]);

  const [phase, setPhaseState] = useState<Phase>("ready");
  const [trials, setTrials] = useState<Trial[]>([]);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);

  const phaseRef = useRef<Phase>("ready");
  const trialsRef = useRef<Trial[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const soundStartRef = useRef(0);
  const replaysRef = useRef(0);
  const timers = useRef(new Set<number>());
  const playRef = useRef(play);
  const onCorrectRef = useRef(onCorrect);
  useEffect(() => {
    playRef.current = play;
    onCorrectRef.current = onCorrect;
  });

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current.clear();
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((id) => window.clearTimeout(id));
      pending.clear();
      stopAll();
    };
  }, []);

  const index = trials.length;
  const current = sequence[Math.min(index, sequence.length - 1)]!;

  // Each trial: a short pause, then the sound.
  useEffect(() => {
    if (phase !== "pause") return;
    const id = window.setTimeout(() => {
      replaysRef.current = 0;
      soundStartRef.current = performance.now();
      playRef.current(sequence[trialsRef.current.length]!);
      setLastAnswer(null);
      setPhase("listening");
    }, TIMING.pauseMs);
    return () => window.clearTimeout(id);
  }, [phase, sequence, setPhase]);

  const advance = useCallback(() => {
    setPhase(trialsRef.current.length >= sequence.length ? "done" : "pause");
  }, [sequence.length, setPhase]);

  const start = useCallback(async () => {
    if (phaseRef.current !== "ready") return;
    phaseRef.current = "pause";
    const record = await startSession({ profileId, mode, itemsInPlay, targetCount: sequence.length });
    sessionIdRef.current = record.id;
    setPhase("pause");
  }, [profileId, mode, itemsInPlay, sequence.length, setPhase]);

  const answer = useCallback(
    (choice: string) => {
      if (phaseRef.current !== "listening") return;
      const target = sequence[trialsRef.current.length]!;
      const correct = choice === target;
      const trial: Trial = {
        target,
        response: choice,
        correct,
        replays: replaysRef.current,
        responseMs: Math.round(performance.now() - soundStartRef.current),
        at: Date.now(),
      };
      const next = [...trialsRef.current, trial];
      trialsRef.current = next;
      setTrials(next);
      setLastAnswer(choice);
      if (sessionIdRef.current) void saveTrials(sessionIdRef.current, next, next.length >= sequence.length);

      if (correct) {
        setPhase("correct");
        const extra = onCorrectRef.current?.(target) ?? 0;
        later(advance, Math.max(TIMING.correctMs, extra));
      } else {
        setPhase("reveal");
        later(() => {
          const ms = playRef.current(target);
          later(advance, ms + TIMING.afterRevealMs);
        }, TIMING.revealDelayMs);
      }
    },
    [sequence, setPhase, later, advance],
  );

  const replay = useCallback(() => {
    if (phaseRef.current !== "listening") return;
    replaysRef.current++;
    playRef.current(sequence[trialsRef.current.length]!);
  }, [sequence]);

  /** Ends now. Answered trials are already saved; an empty session is discarded. */
  const end = useCallback(async () => {
    clearTimers();
    stopAll();
    const id = sessionIdRef.current;
    if (id) await discardIfEmpty(id);
  }, [clearTimers]);

  return { phase, sequence, current, index, trials, lastAnswer, start, answer, replay, end };
}
