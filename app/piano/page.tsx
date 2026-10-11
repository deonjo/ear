"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Flag } from "@/components/Flag";
import { CheckIcon } from "@/components/Icons";
import { Card, ParentShell } from "@/components/ParentShell";
import { PianoKeyboard } from "@/components/PianoKeyboard";
import { getChord, type ChordDef } from "@/lib/chords";
import { chordsInPlay, isNoteNamesUnlocked } from "@/lib/curriculum";
import { useActiveProfile } from "@/lib/hooks";
import { generateSequence, sessionLength } from "@/lib/randomizer";
import { discardIfEmpty, saveTrials, startSession } from "@/lib/repo";
import { solfegeFor } from "@/lib/solfege";
import { scoreTrials } from "@/lib/stats";
import type { Profile, Trial } from "@/lib/types";
import { useWakeLock } from "@/lib/wakeLock";

export default function PianoPage() {
  const router = useRouter();
  const { loading, profile } = useActiveProfile();
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!loading && !profile) router.replace("/");
  }, [loading, profile, router]);

  return (
    <ParentShell>
      {profile ? <PianoSession key={`${profile.id}-${round}`} profile={profile} onAgain={() => setRound((r) => r + 1)} /> : <p className="text-muted">Loading…</p>}
    </ParentShell>
  );
}

type Step = "intro" | "prompt" | "correct" | "wrong" | "done";

function PianoSession({ profile, onAgain }: { profile: Profile; onAgain: () => void }) {
  const [chords] = useState<ChordDef[]>(() => chordsInPlay(profile.events).map(getChord));
  const [noteNames] = useState(() => isNoteNamesUnlocked(profile.events));
  const [sequence] = useState(() =>
    generateSequence(
      chords.map((c) => c.id),
      sessionLength(profile.settings.sessionLength, chords.length),
    ),
  );
  const [step, setStep] = useState<Step>("intro");
  const [trials, setTrials] = useState<Trial[]>([]);
  const sessionId = useRef<string | null>(null);
  const promptAt = useRef(0);
  const nextButton = useRef<HTMLButtonElement>(null);
  useWakeLock(step !== "intro" && step !== "done");

  const index = trials.length;
  const target = getChord(sequence[Math.min(index, sequence.length - 1)]!);
  const last = trials[trials.length - 1];
  const score = scoreTrials(trials);

  const begin = async () => {
    const record = await startSession({ profileId: profile.id, mode: "piano", itemsInPlay: chords.map((c) => c.id), targetCount: sequence.length });
    sessionId.current = record.id;
    promptAt.current = performance.now();
    setStep("prompt");
    window.scrollTo({ top: 0 });
  };

  const next = useCallback(() => {
    if (trials.length >= sequence.length) {
      setStep("done");
    } else {
      promptAt.current = performance.now();
      setStep("prompt");
    }
  }, [trials.length, sequence.length]);

  const record = useCallback(
    (choice: ChordDef) => {
      if (step !== "prompt") return;
      const t = sequence[trials.length]!;
      const trial: Trial = {
        target: t,
        response: choice.id,
        correct: choice.id === t,
        replays: 0,
        responseMs: Math.round(performance.now() - promptAt.current),
        at: Date.now(),
      };
      const all = [...trials, trial];
      setTrials(all);
      if (sessionId.current) void saveTrials(sessionId.current, all, all.length >= sequence.length);
      setStep(trial.correct ? "correct" : "wrong");
    },
    [step, sequence, trials],
  );

  // A correct answer moves on by itself unless there are syllables to sing first.
  useEffect(() => {
    if (step === "correct" && !noteNames) {
      const id = window.setTimeout(next, 1100);
      return () => window.clearTimeout(id);
    }
    if (step === "correct" || step === "wrong") nextButton.current?.focus();
  }, [step, noteNames, next]);

  // Number keys 1–9 record an answer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (step !== "prompt" || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= chords.length && n <= 9) record(chords[n - 1]!);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, chords, record]);

  const endEarly = async () => {
    if (sessionId.current) await discardIfEmpty(sessionId.current);
    setStep("done");
  };

  if (step === "intro") {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold">Real piano mode</h1>
        <TuningReminder />
        <Card title="How it works">
          <ol className="list-decimal space-y-1.5 pl-5 text-muted">
            <li>The screen shows which chord to play, with the exact keys highlighted.</li>
            <li>Play all the notes together, firmly, and hold for about 2 seconds. Keep the child from seeing which keys you press.</li>
            <li>The child points to (or names) a color flag. Tap the color they chose.</li>
            <li>If the answer is wrong, show the right flag and play the chord once more. No “wrong”, just the right flag.</li>
          </ol>
          <p className="mt-3 text-sm text-muted">
            {sequence.length} chords this session · {chords.length} in play. Sessions here count toward the daily goal and the advancement rule, just like app sessions.
          </p>
        </Card>
        <button type="button" onClick={begin} className="w-full rounded-2xl bg-accent px-6 py-4 text-lg font-semibold text-accent-ink sm:w-auto">
          Start session
        </button>
      </div>
    );
  }

  if (step === "done") {
    const final = scoreTrials(trials);
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold">{trials.length >= sequence.length ? "All done" : "Session ended early"}</h1>
        <Card>
          <p className="text-4xl font-semibold tabular-nums">
            {final.correct} / {final.total}
          </p>
          <p className="text-muted">{final.total ? `${final.pct}% correct` : "No answers were recorded, so nothing was saved."}</p>
          {trials.length > 0 && trials.length < sequence.length && <p className="mt-2 text-sm text-muted">Saved as a partial session.</p>}
        </Card>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onAgain} className="rounded-xl bg-accent px-5 py-3 font-semibold text-accent-ink">
            Another session
          </button>
          <Link href="/" className="rounded-xl border border-line px-5 py-3 font-semibold">
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-lg font-semibold tabular-nums">
          Chord {Math.min(index + (step === "prompt" ? 1 : 0), sequence.length)} of {sequence.length}
        </p>
        <p className="tabular-nums text-muted">
          Score {score.correct}/{score.total}
        </p>
        <button type="button" onClick={endEarly} className="rounded-lg border border-line px-3 py-1.5 text-sm">
          End session
        </button>
      </div>

      {step === "prompt" ? (
        <Card>
          <div className="flex items-center gap-3">
            <span className="h-14 w-14 shrink-0">
              <Flag chord={target} showPattern={profile.settings.flagPatterns} className="h-full w-full" />
            </span>
            <div>
              <p className="text-sm text-muted">Play this chord</p>
              <p className="text-2xl font-semibold">{target.colorName}</p>
            </div>
          </div>
          <PianoKeyboard notes={target.notes} className="mt-4 w-full" />
          <p className="mt-2 text-sm text-muted">
            Keys, low to high: <strong className="text-ink">{target.notes.join(" · ")}</strong>. Press all of them together and hold about 2 seconds.
          </p>
        </Card>
      ) : (
        <Card className={step === "correct" ? "border-good bg-good-soft" : "border-warn bg-warn-soft"}>
          <div role="status" aria-live="polite">
            {step === "correct" ? (
              <p className="flex items-center gap-2 text-xl font-semibold text-good">
                <CheckIcon className="h-6 w-6" /> {getChord(last!.target as ChordDef["id"]).colorName}, that&apos;s right!
              </p>
            ) : (
              <>
                <p className="text-lg font-semibold">
                  It was {getChord(last!.target as ChordDef["id"]).colorName.toLowerCase()} (they chose {getChord(last!.response as ChordDef["id"]).colorName.toLowerCase()}).
                </p>
                <p className="mt-1">Calmly show the {getChord(last!.target as ChordDef["id"]).colorName.toLowerCase()} flag and play the chord once more.</p>
              </>
            )}
            {step === "correct" && noteNames && (
              <p className="mt-2">
                Now play the notes one at a time, low to high, and sing: <strong>{getChord(last!.target as ChordDef["id"]).notes.map(solfegeFor).join(" · ")}</strong>
              </p>
            )}
          </div>
          {(step === "wrong" || noteNames) && (
            <button ref={nextButton} type="button" onClick={next} className="mt-4 rounded-xl bg-accent px-5 py-3 font-semibold text-accent-ink">
              {trials.length >= sequence.length ? "Finish" : "Next chord"}
            </button>
          )}
        </Card>
      )}

      <section aria-label="What did the child choose?">
        <h2 className="mb-2 text-sm font-medium text-muted">What did the child choose?</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
          {chords.map((chord, i) => (
            <button
              key={chord.id}
              type="button"
              onClick={() => record(chord)}
              disabled={step !== "prompt"}
              className="flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-line bg-surface p-2 font-semibold transition-opacity disabled:opacity-40"
            >
              <span className="h-16 w-16">
                <Flag chord={chord} showPattern={profile.settings.flagPatterns} className="h-full w-full" />
              </span>
              <span>
                {chord.colorName}
                {i < 9 && <span className="ml-1 text-xs font-normal text-muted">({i + 1})</span>}
              </span>
            </button>
          ))}
        </div>
      </section>
      <TuningReminder compact />
    </div>
  );
}

function TuningReminder({ compact = false }: { compact?: boolean }) {
  if (compact) return <p className="text-sm text-muted">Reminder: the piano must be tuned to A440 (standard concert pitch).</p>;
  return (
    <div role="note" className="rounded-2xl border border-warn bg-warn-soft p-4">
      <p className="font-semibold text-warn">Your piano must be tuned to A440.</p>
      <p className="mt-1 text-sm">
        Absolute pitch is learned from the exact frequencies your child hears. A piano that has drifted flat or sharp teaches the wrong pitches, so have it tuned to standard
        concert pitch (A = 440 Hz) before using this mode. A digital piano at its default tuning is fine.
      </p>
    </div>
  );
}
