"use client";

import Link from "next/link";
import { useEffect } from "react";
import { FlagChip } from "@/components/Flag";
import { Card, ParentShell } from "@/components/ParentShell";
import { AddProfileForm, GoalDots, ProfileSwitcher } from "@/components/parent/ProfileBits";
import { evaluateReadiness, MIN_DAYS_ON_SET } from "@/lib/advancement";
import { loadPiano } from "@/lib/audio";
import { getChord } from "@/lib/chords";
import { chordsInPlay, currentStage, describeStage, describeStep, isSingleNoteModeUnlocked } from "@/lib/curriculum";
import { useActiveProfile, useNow, useSessions } from "@/lib/hooks";
import { sessionScore, streaks, todayProgress } from "@/lib/stats";

const MODE_LABEL = { chords: "Flags", piano: "Real piano", notes: "Single notes" } as const;

export default function Home() {
  const { loading, profiles, profile } = useActiveProfile();
  const sessions = useSessions(profile?.id);
  const now = useNow();

  // Warm the piano samples so the first session starts quickly.
  useEffect(() => {
    if (profile) loadPiano().catch(() => {});
  }, [profile]);

  if (loading) {
    return (
      <ParentShell>
        <p className="text-muted">Loading…</p>
      </ParentShell>
    );
  }

  if (!profile) {
    return (
      <ParentShell>
        <div className="mx-auto max-w-xl space-y-6 py-6">
          <div className="flex h-24 w-24 items-center justify-center">
            <FlagChip chord={getChord("red")} size={96} label={false} />
          </div>
          <h1 className="text-3xl font-semibold">Welcome to Chord Flags</h1>
          <p className="text-lg text-muted">
            A calm helper for running the Eguchi Chord Identification Method at home. You run each short session; your child only sees colored flags and hears
            a piano.
          </p>
          <Card title="Add your child to begin">
            <AddProfileForm autoFocus />
            <p className="mt-3 text-sm text-muted">Everything stays on this device. There are no accounts, and nothing is ever uploaded.</p>
          </Card>
          <Link href="/how-it-works/" className="inline-block font-medium text-accent underline underline-offset-4">
            Read how the method works first
          </Link>
        </div>
      </ParentShell>
    );
  }

  const all = sessions ?? [];
  const settings = profile.settings;
  const today = todayProgress(all, settings.dailyGoal, now);
  const streak = streaks(all, settings.dailyGoal, now);
  const readiness = evaluateReadiness({ events: profile.events, sessions: all, order: settings.stageOrder, requiredPerfect: settings.perfectSessionsRequired, now });
  const chords = chordsInPlay(profile.events).map(getChord);
  const stage = currentStage(profile.events);
  const notesUnlocked = isSingleNoteModeUnlocked(profile.events);
  const lastSession = [...all].reverse().find((s) => s.trials.length > 0);

  return (
    <ParentShell>
      <div className="space-y-5">
        <ProfileSwitcher profiles={profiles} active={profile} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Card title="Today">
            <GoalDots done={today.done} goal={today.goal} />
            <p className="mt-2 text-muted">
              {today.done} of {today.goal} sessions{today.met ? ". Goal met, nice work." : ""}
            </p>
            {streak.current > 0 && (
              <p className="mt-1 text-sm text-muted">
                {streak.current}-day streak · best {streak.longest}
              </p>
            )}
          </Card>
          <Card title="Now practicing">
            <p className="font-medium">{describeStage(stage)}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {chords.map((c) => (
                <FlagChip key={c.id} chord={c} size={22} showPattern={settings.flagPatterns} />
              ))}
            </div>
            <p className="mt-2 text-sm text-muted">
              {readiness.daysOnSet === 0 ? "Started this set today" : `${readiness.daysOnSet} day${readiness.daysOnSet === 1 ? "" : "s"} on this set`} (at least{" "}
              {MIN_DAYS_ON_SET} before adding anything new).
            </p>
          </Card>
        </div>

        {readiness.ready && readiness.next && (
          <div role="status" className="rounded-2xl border border-good bg-good-soft p-4">
            <p className="font-semibold text-good">Ready for the next step: {describeStep(readiness.next).toLowerCase()}.</p>
            <p className="mt-1 text-sm">Open the parent dashboard to confirm. Nothing changes until you do.</p>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/session/"
            className="flex flex-1 items-center justify-center rounded-2xl bg-accent px-6 py-5 text-xl font-semibold text-accent-ink shadow-sm hover:opacity-95"
          >
            Start a session
          </Link>
          <Link href="/piano/" className="flex items-center justify-center rounded-2xl border border-line bg-surface px-6 py-5 font-semibold hover:bg-surface-2">
            Real piano mode
          </Link>
          {notesUnlocked && (
            <Link href="/notes/" className="flex items-center justify-center rounded-2xl border border-line bg-surface px-6 py-5 font-semibold hover:bg-surface-2">
              Single notes
            </Link>
          )}
        </div>
        <p className="text-sm text-muted">
          {settings.sessionLength} chords per session. Hand over the device after you tap start; to end early, hold the ✕ in the corner.
        </p>

        {lastSession && (
          <Card title="Last session">
            <p className="tabular-nums">
              <span className="text-2xl font-semibold">
                {sessionScore(lastSession).correct}/{sessionScore(lastSession).total}
              </span>{" "}
              <span className="text-muted">
                ({sessionScore(lastSession).pct}%) · {MODE_LABEL[lastSession.mode]} ·{" "}
                {new Date(lastSession.startedAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}
                {!lastSession.completed && " · ended early"}
              </span>
            </p>
          </Card>
        )}

        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/parent/" className="rounded-xl border border-line px-4 py-2.5 font-medium hover:bg-surface-2">
            Parent dashboard
          </Link>
          <Link href="/parent/history/" className="rounded-xl border border-line px-4 py-2.5 font-medium hover:bg-surface-2">
            History
          </Link>
          <Link href="/how-it-works/" className="rounded-xl border border-line px-4 py-2.5 font-medium hover:bg-surface-2">
            How it works
          </Link>
        </div>
      </div>
    </ParentShell>
  );
}
