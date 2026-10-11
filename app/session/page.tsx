"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChildTopBar, DoneScreen, StartOverlay } from "@/components/child/ChildChrome";
import { FlagGrid, type FlagState } from "@/components/child/FlagGrid";
import { ProgressDots } from "@/components/child/ProgressDots";
import { Flag } from "@/components/Flag";
import { useParentGate } from "@/components/ParentGate";
import { isPianoLoaded, loadPiano, playChord, playNote, unlockAudio } from "@/lib/audio";
import { getChord, type ChordDef } from "@/lib/chords";
import { chordsInPlay, isNoteNamesUnlocked } from "@/lib/curriculum";
import { enterFullscreen, exitFullscreen } from "@/lib/fullscreen";
import { useActiveProfile } from "@/lib/hooks";
import { solfegeFor } from "@/lib/solfege";
import type { Profile } from "@/lib/types";
import { useTrialRunner } from "@/lib/useTrialRunner";
import { useWakeLock } from "@/lib/wakeLock";

export default function SessionPage() {
  const router = useRouter();
  const { loading, profile } = useActiveProfile();
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!loading && !profile) router.replace("/");
  }, [loading, profile, router]);

  const exit = useCallback(() => {
    exitFullscreen();
    router.push("/");
  }, [router]);

  return (
    <div className="child-screen">
      {profile && <ChordSession key={`${profile.id}-${round}`} profile={profile} onAgain={() => setRound((r) => r + 1)} onExit={exit} />}
    </div>
  );
}

const ARPEGGIO = { startMs: 900, stepMs: 800, holdMs: 1000 };

function ChordSession({ profile, onAgain, onExit }: { profile: Profile; onAgain: () => void; onExit: () => void }) {
  const { lock } = useParentGate();
  useEffect(() => lock(), [lock]);

  // Fixed at mount: flags keep the same positions for the whole session.
  const [chords] = useState<ChordDef[]>(() => chordsInPlay(profile.events).map(getChord));
  const [noteNames] = useState(() => isNoteNamesUnlocked(profile.events));
  const { showStars, flagPatterns, sessionLength } = profile.settings;

  const [audio, setAudio] = useState<"loading" | "ready" | "error">(() => (isPianoLoaded() ? "ready" : "loading"));
  useEffect(() => {
    loadPiano().then(
      () => setAudio("ready"),
      () => setAudio("error"),
    );
  }, []);

  // Note-names stage: after a correct answer, play the chord's notes one at a time and show their syllables.
  const [syllables, setSyllables] = useState<{ chordId: string; shown: string[] } | null>(null);
  const arpTimers = useRef<number[]>([]);
  useEffect(() => () => arpTimers.current.forEach((id) => window.clearTimeout(id)), []);

  const onCorrect = useMemo(() => {
    if (!noteNames) return undefined;
    return (id: string) => {
      const notes = getChord(id as ChordDef["id"]).notes;
      notes.forEach((note, i) => {
        arpTimers.current.push(
          window.setTimeout(() => {
            playNote(note, 1.1);
            setSyllables({ chordId: id, shown: notes.slice(0, i + 1).map(solfegeFor) });
          }, ARPEGGIO.startMs + i * ARPEGGIO.stepMs),
        );
      });
      const total = ARPEGGIO.startMs + notes.length * ARPEGGIO.stepMs + ARPEGGIO.holdMs;
      arpTimers.current.push(window.setTimeout(() => setSyllables(null), total - 100));
      return total;
    };
  }, [noteNames]);

  const runner = useTrialRunner({
    profileId: profile.id,
    mode: "chords",
    items: chords.map((c) => c.id),
    target: sessionLength,
    play: (id) => playChord(getChord(id as ChordDef["id"]).notes),
    onCorrect,
  });
  const { phase, trials } = runner;
  useWakeLock(phase !== "ready" && phase !== "done");

  const last = trials[trials.length - 1];
  const stateOf = (chord: ChordDef): FlagState => {
    if (phase === "correct" && last?.target === chord.id) return "celebrate";
    if (phase === "reveal") return last?.target === chord.id ? "reveal" : "dim";
    return "idle";
  };

  const start = () => {
    void unlockAudio(); // first, while still inside the tap (iOS)
    enterFullscreen();
    void runner.start();
  };

  const end = async () => {
    await runner.end();
    onExit();
  };

  if (phase === "done") {
    return (
      <DoneScreen stars={trials.filter((t) => t.correct).length} showStars={showStars} onHome={onExit} onAgain={onAgain}>
        {chords.map((chord, i) => (
          <span
            key={chord.id}
            className="block h-24 w-24 sm:h-32 sm:w-32"
            style={{ "--wave-delay": `${i * 150}ms`, "--wave-count": 3 } as React.CSSProperties}
          >
            <Flag chord={chord} showPattern={flagPatterns} waving className="h-full w-full" />
          </span>
        ))}
      </DoneScreen>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ChildTopBar onEnd={end} onReplay={runner.replay} canReplay={phase === "listening"}>
        <ProgressDots total={runner.sequence.length} trials={trials} showStars={showStars} />
      </ChildTopBar>
      <div className="relative min-h-0 flex-1 p-1 sm:p-2">
        <FlagGrid chords={chords} stateOf={stateOf} onTap={(c) => runner.answer(c.id)} showPatterns={flagPatterns} syllables={syllables} />
        {phase === "ready" && <StartOverlay loading={audio === "loading"} error={audio === "error"} onStart={start} />}
      </div>
    </div>
  );
}
