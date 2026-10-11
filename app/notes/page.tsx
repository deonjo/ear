"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChildTopBar, DoneScreen, StartOverlay } from "@/components/child/ChildChrome";
import { bestGrid } from "@/components/child/gridLayout";
import { ProgressDots } from "@/components/child/ProgressDots";
import { StarIcon } from "@/components/Icons";
import { useParentGate } from "@/components/ParentGate";
import { ParentShell } from "@/components/ParentShell";
import { useElementSize } from "@/components/useElementSize";
import { isPianoLoaded, loadPiano, playNote, unlockAudio } from "@/lib/audio";
import { isSingleNoteModeUnlocked } from "@/lib/curriculum";
import { enterFullscreen, exitFullscreen } from "@/lib/fullscreen";
import { useActiveProfile } from "@/lib/hooks";
import { SINGLE_NOTES, SINGLE_NOTE_IDS, getSingleNote } from "@/lib/solfege";
import type { Profile } from "@/lib/types";
import { useTrialRunner } from "@/lib/useTrialRunner";
import { useWakeLock } from "@/lib/wakeLock";

export default function NotesPage() {
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

  if (!profile) return <div className="child-screen" />;

  if (!isSingleNoteModeUnlocked(profile.events)) {
    return (
      <ParentShell>
        <div className="mx-auto max-w-xl space-y-4 py-10 text-center">
          <h1 className="text-2xl font-semibold">Single-note mode is locked</h1>
          <p className="text-muted">
            Single notes come only after all nine white-key chords are mastered. When the dashboard shows that {profile.name} is ready, you can unlock the
            note-names stage there.
          </p>
          <Link href="/" className="inline-block rounded-xl bg-accent px-5 py-3 font-semibold text-accent-ink">
            Back home
          </Link>
        </div>
      </ParentShell>
    );
  }

  return (
    <div className="child-screen">
      <NoteSession key={`${profile.id}-${round}`} profile={profile} onAgain={() => setRound((r) => r + 1)} onExit={exit} />
    </div>
  );
}

function NoteSession({ profile, onAgain, onExit }: { profile: Profile; onAgain: () => void; onExit: () => void }) {
  const { lock } = useParentGate();
  useEffect(() => lock(), [lock]);
  const { showStars, sessionLength } = profile.settings;

  const [audio, setAudio] = useState<"loading" | "ready" | "error">(() => (isPianoLoaded() ? "ready" : "loading"));
  useEffect(() => {
    loadPiano().then(
      () => setAudio("ready"),
      () => setAudio("error"),
    );
  }, []);

  const runner = useTrialRunner({
    profileId: profile.id,
    mode: "notes",
    items: SINGLE_NOTE_IDS,
    target: sessionLength,
    play: (id) => playNote(getSingleNote(id).note),
  });
  const { phase, trials } = runner;
  useWakeLock(phase !== "ready" && phase !== "done");
  const last = trials[trials.length - 1];

  const [ref, size] = useElementSize<HTMLDivElement>();
  const { cols, cell } = bestGrid(SINGLE_NOTES.length, size.width, size.height);

  const start = () => {
    void unlockAudio();
    enterFullscreen();
    void runner.start();
  };

  if (phase === "done") {
    return <DoneScreen stars={trials.filter((t) => t.correct).length} showStars={showStars} onHome={onExit} onAgain={onAgain}>{null}</DoneScreen>;
  }

  return (
    <div className="flex h-full flex-col">
      <ChildTopBar
        onEnd={async () => {
          await runner.end();
          onExit();
        }}
        onReplay={runner.replay}
        canReplay={phase === "listening"}
      >
        <ProgressDots total={runner.sequence.length} trials={trials} showStars={showStars} />
      </ChildTopBar>
      <div className="relative min-h-0 flex-1 p-1 sm:p-2">
        <div ref={ref} className="flex h-full w-full items-center justify-center overflow-auto">
          {size.width > 0 && (
            <div className="flex flex-wrap justify-center" style={{ width: cols * cell }}>
              {SINGLE_NOTES.map((n) => {
                const celebrate = phase === "correct" && last?.target === n.id;
                const reveal = phase === "reveal" && last?.target === n.id;
                const dim = phase === "reveal" && !reveal;
                return (
                  <button
                    key={n.id}
                    type="button"
                    aria-label={n.id}
                    onClick={() => runner.answer(n.id)}
                    className={`relative flex p-[6%] transition-opacity duration-300 ${dim ? "opacity-30" : ""}`}
                    style={{ width: cell, height: cell }}
                  >
                    <span
                      className={`flex h-full w-full items-center justify-center rounded-[28%] bg-white font-bold text-[#1e2229] shadow-md ${
                        celebrate ? "ring-8 ring-[#FFD84D]" : reveal ? "ring-8 ring-white" : ""
                      }`}
                      style={{ fontSize: cell * 0.26 }}
                    >
                      <span className={celebrate ? "star-pop inline-block" : ""}>{n.id}</span>
                    </span>
                    {celebrate && <StarIcon className="star-pop absolute right-0 top-0 h-[30%] w-[30%] text-[#F5B700]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {phase === "ready" && <StartOverlay loading={audio === "loading"} error={audio === "error"} onStart={start} />}
      </div>
    </div>
  );
}
