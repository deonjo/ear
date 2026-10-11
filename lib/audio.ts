"use client";

// Piano playback through Tone.js using bundled Salamander Grand Piano samples.
// The same samples, velocity, and envelope are used for every note, so a chord sounds
// identical every time it is played. There are no synthesized oscillators anywhere.

import type * as ToneNS from "tone";
import { asset } from "./basePath";

type Tone = typeof ToneNS;

/**
 * Sampled notes (Salamander records every third semitone). Tone.Sampler re-pitches the
 * nearest sample by at most one semitone using an exact 2^(n/12) playback rate, so every
 * pitch is precise to A440 tuning.
 */
const SAMPLE_FILES: Record<string, string> = {
  A3: "A3.mp3",
  C4: "C4.mp3",
  "D#4": "Ds4.mp3",
  "F#4": "Fs4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
  "D#5": "Ds5.mp3",
  "F#5": "Fs5.mp3",
};

export const CHORD_SECONDS = 2;
export const NOTE_SECONDS = 1.4;
const VELOCITY = 0.75;
const RELEASE_SECONDS = 0.9;

let tone: Tone | null = null;
let sampler: ToneNS.Sampler | null = null;
let loading: Promise<void> | null = null;

/** Downloads and decodes the samples. Safe to call repeatedly. */
export function loadPiano(): Promise<void> {
  if (sampler?.loaded) return Promise.resolve();
  if (!loading) {
    loading = (async () => {
      const Tone = await import("tone");
      tone = Tone;
      await new Promise<void>((resolve, reject) => {
        sampler = new Tone.Sampler({
          urls: SAMPLE_FILES,
          baseUrl: asset("/samples/salamander/"),
          release: RELEASE_SECONDS,
          onload: () => resolve(),
          onerror: (err) => reject(err),
        }).toDestination();
      });
    })();
    loading.catch(() => {
      loading = null;
      sampler = null;
    });
  }
  return loading;
}

export function isPianoLoaded(): boolean {
  return Boolean(sampler?.loaded);
}

/**
 * Must run inside a tap/click handler (iOS only allows audio to start from a user gesture).
 * Call loadPiano() first so Tone is already imported and resume() happens synchronously.
 */
export async function unlockAudio(): Promise<void> {
  // iOS 17+: use the playback audio session so the ring/silent switch doesn't mute the piano.
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (nav.audioSession) nav.audioSession.type = "playback";
  } catch {
    // Not supported; harmless.
  }
  const Tone = tone ?? (await import("tone"));
  tone = Tone;
  await Tone.start();
}

export function isAudioRunning(): boolean {
  return tone?.getContext().state === "running";
}

/** iOS can suspend audio when the app is backgrounded; resume on the next tap. */
export function resumeIfNeeded(): void {
  if (tone && tone.getContext().state !== "running") void tone.getContext().resume();
}

/** Strikes all notes together. Returns the duration in milliseconds. */
export function playChord(notes: readonly string[]): number {
  if (!tone || !sampler?.loaded) return 0;
  resumeIfNeeded();
  sampler.releaseAll();
  sampler.triggerAttackRelease([...notes], CHORD_SECONDS, tone.now() + 0.03, VELOCITY);
  return CHORD_SECONDS * 1000;
}

export function playNote(note: string, seconds = NOTE_SECONDS): number {
  if (!tone || !sampler?.loaded) return 0;
  resumeIfNeeded();
  sampler.releaseAll();
  sampler.triggerAttackRelease(note, seconds, tone.now() + 0.03, VELOCITY);
  return seconds * 1000;
}

export function stopAll(): void {
  sampler?.releaseAll();
}
