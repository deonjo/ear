"use client";

import Link from "next/link";
import { useState } from "react";
import { AccuracyChart, type ChartMarker } from "@/components/charts/AccuracyChart";
import { ConfusionMatrix } from "@/components/charts/ConfusionMatrix";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Flag, FlagChip } from "@/components/Flag";
import { CheckIcon } from "@/components/Icons";
import { ParentGate } from "@/components/ParentGate";
import { Card, ParentShell } from "@/components/ParentShell";
import { AddProfileForm, GoalDots, ProfileSwitcher } from "@/components/parent/ProfileBits";
import { evaluateReadiness, MIN_DAYS_ON_SET } from "@/lib/advancement";
import { getChord } from "@/lib/chords";
import {
  chordsInPlay,
  currentSetStartedAt,
  currentStage,
  describeStage,
  describeStep,
  isSingleNoteModeUnlocked,
  plateauInfo,
  type NextStep,
} from "@/lib/curriculum";
import { addDays, dayKey } from "@/lib/dates";
import { useActiveProfile, useNow, useSessions } from "@/lib/hooks";
import { confirmStep } from "@/lib/repo";
import { SINGLE_NOTE_IDS } from "@/lib/solfege";
import { accuracyByDay, confusionMatrix, sessionScore, streaks, todayProgress, topConfusions } from "@/lib/stats";
import type { Profile, SessionRecord } from "@/lib/types";

export default function DashboardPage() {
  return (
    <ParentShell wide>
      <ParentGate>
        <Dashboard />
      </ParentGate>
    </ParentShell>
  );
}

type Range = "set" | "30d" | "all";
const RANGES: { value: Range; label: string }[] = [
  { value: "set", label: "Current set" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];
const MODE_LABEL = { chords: "Flags", piano: "Real piano", notes: "Single notes" } as const;

function Dashboard() {
  const { loading, profiles, profile } = useActiveProfile();
  const sessions = useSessions(profile?.id);
  const now = useNow();

  if (loading || (profile && !sessions)) return <p className="text-muted">Loading…</p>;
  if (!profile) {
    return (
      <Card title="Add a child to get started">
        <AddProfileForm autoFocus />
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/parent/settings/" className="text-sm font-medium text-accent underline underline-offset-4">
          Settings for {profile.name}
        </Link>
      </div>
      <ProfileSwitcher profiles={profiles} active={profile} />
      <ProfileDashboard key={profile.id} profile={profile} sessions={sessions ?? []} now={now} />
    </div>
  );
}

function ProfileDashboard({ profile, sessions, now }: { profile: Profile; sessions: SessionRecord[]; now: number }) {
  const { settings, events } = profile;
  const [confirming, setConfirming] = useState<NextStep | null>(null);
  const [range, setRange] = useState<Range>("set");
  const [matrixMode, setMatrixMode] = useState<"chords" | "notes">("chords");

  const today = todayProgress(sessions, settings.dailyGoal, now);
  const streak = streaks(sessions, settings.dailyGoal, now);
  const readiness = evaluateReadiness({ events, sessions, order: settings.stageOrder, requiredPerfect: settings.perfectSessionsRequired, now });
  const stage = currentStage(events);
  const chords = chordsInPlay(events).map(getChord);
  const plateau = plateauInfo(events, now);
  const notesUnlocked = isSingleNoteModeUnlocked(events);

  const completed = sessions.filter((s) => s.completed);
  const recent = [...sessions].filter((s) => s.trials.length > 0).reverse().slice(0, 8);
  const lastFive = [...completed].reverse().slice(0, 5);
  const recentPct = lastFive.length
    ? Math.round(lastFive.reduce((sum, s) => sum + sessionScore(s).correct, 0) / Math.max(1, lastFive.reduce((sum, s) => sum + sessionScore(s).total, 0)) * 100)
    : null;

  const rangeStart = range === "set" ? currentSetStartedAt(events) : range === "30d" ? new Date(`${addDays(dayKey(now), -29)}T00:00:00`).getTime() : 0;
  const inRange = sessions.filter((s) => s.startedAt >= rangeStart);
  const chordSeries = accuracyByDay(inRange, ["chords", "piano"]);
  const noteSeries = accuracyByDay(inRange, ["notes"]);
  const markers: ChartMarker[] = events.map((e) =>
    e.type === "add-chord"
      ? { dayKey: dayKey(e.at), label: `Added ${getChord(e.chordId).colorName.toLowerCase()}`, color: getChord(e.chordId).color }
      : { dayKey: dayKey(e.at), label: "Unlocked note names", color: "#ffffff" },
  );

  const chordMatrix = confusionMatrix(
    inRange.filter((s) => s.mode !== "notes"),
    chords.map((c) => c.id),
  );
  const noteMatrix = confusionMatrix(
    inRange.filter((s) => s.mode === "notes"),
    [...SINGLE_NOTE_IDS],
  );
  const showNotes = notesUnlocked && matrixMode === "notes";
  const matrix = showNotes ? noteMatrix : chordMatrix;
  const mixups = topConfusions(matrix, 3);
  const nameOf = (id: string) => (showNotes ? id : getChord(id as Parameters<typeof getChord>[0]).colorName);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Today">
          <GoalDots done={today.done} goal={today.goal} />
          <p className="mt-2 text-sm text-muted">
            {today.done} of {today.goal} sessions
          </p>
        </Card>
        <Card title="Days on this set">
          <p className="text-3xl font-semibold">{readiness.daysOnSet}</p>
          <p className="text-sm text-muted">Minimum {MIN_DAYS_ON_SET} before adding anything new</p>
        </Card>
        <Card title="Recent accuracy">
          <p className="text-3xl font-semibold">{recentPct === null ? "–" : `${recentPct}%`}</p>
          <p className="text-sm text-muted">Last {lastFive.length || 5} completed sessions</p>
        </Card>
        <Card title="Streak">
          <p className="text-3xl font-semibold">
            {streak.current} day{streak.current === 1 ? "" : "s"}
          </p>
          <p className="text-sm text-muted">Best {streak.longest} · goal met on {streak.goalDays} days</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Current stage">
          <p className="font-medium">{describeStage(stage)}</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {chords.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                <FlagChip chord={c} size={26} showPattern={settings.flagPatterns} />
                <span className="text-muted">{c.notes.join(" ")}</span>
              </li>
            ))}
          </ul>
          {notesUnlocked && <p className="mt-3 text-sm text-muted">Note names are on: after each correct chord the app plays its notes and shows the syllables.</p>}
        </Card>

        <Card title="Next step">
          {readiness.next === null ? (
            <p>Every stage is unlocked. Keep sessions short and playful.</p>
          ) : (
            <>
              <ul className="space-y-2">
                <ChecklistItem done={readiness.daysMet}>
                  At least {MIN_DAYS_ON_SET} days on this set <span className="text-muted">(day {readiness.daysOnSet})</span>
                </ChecklistItem>
                <ChecklistItem done={readiness.perfectMet}>
                  Last {readiness.requiredPerfect} completed {stage.kind === "note-names" ? "single-note " : ""}sessions all at 100%{" "}
                  <span className="text-muted">
                    ({readiness.perfectStreak} of {readiness.requiredPerfect})
                  </span>
                </ChecklistItem>
              </ul>
              {readiness.ready ? (
                <div className="mt-4 rounded-xl border border-good bg-good-soft p-3" role="status">
                  <p className="font-semibold text-good">Ready for the next step</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">The next step becomes available when both are checked. The app never advances on its own.</p>
              )}
              <button
                type="button"
                disabled={!readiness.ready}
                onClick={() => setConfirming(readiness.next)}
                className="mt-4 flex items-center gap-2 rounded-xl bg-accent px-4 py-3 font-semibold text-accent-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                {readiness.next.type === "add-chord" && (
                  <span className="h-6 w-6">
                    <Flag chord={getChord(readiness.next.chordId)} className="h-full w-full" />
                  </span>
                )}
                {describeStep(readiness.next)}
              </button>
            </>
          )}
        </Card>
      </div>

      {plateau.active && (
        <div role="note" className="rounded-2xl border border-line bg-accent-soft p-5">
          <p className="font-semibold">A long stay at {chords.length} chords is normal.</p>
          <p className="mt-1 text-muted">
            {profile.name} has been working with 5–7 chords for about {Math.floor(plateau.days / 7)} weeks. Many children plateau here for a while before things click. Keep
            sessions short and fun, keep the corrections neutral, and let the 100% rule decide when to move on. Taking a few days off when interest dips is fine.
          </p>
        </div>
      )}

      <Card title="Recent sessions" action={<Link href="/parent/history/" className="text-sm text-accent underline underline-offset-4">Full history</Link>}>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">No sessions yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((s) => {
              const score = sessionScore(s);
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    {new Date(s.startedAt).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    <span className="text-muted"> · {MODE_LABEL[s.mode]}</span>
                  </span>
                  <span className="flex items-center gap-2 tabular-nums">
                    {!s.completed && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">ended early</span>}
                    {score.perfect && s.completed && <CheckIcon className="h-4 w-4 text-good" title="100%" />}
                    <strong>
                      {score.correct}/{score.total}
                    </strong>
                    <span className="w-10 text-right text-muted">{score.pct}%</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <section className="space-y-4" aria-labelledby="progress-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="progress-heading" className="text-lg font-semibold">
            Progress
          </h2>
          <div role="radiogroup" aria-label="Time range" className="flex rounded-xl border border-line bg-surface p-1 text-sm">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={range === r.value}
                onClick={() => setRange(r.value)}
                className={`rounded-lg px-3 py-1.5 ${range === r.value ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <Card title="Accuracy over time">
          <p className="-mt-2 mb-3 text-sm text-muted">First-answer accuracy per day, completed sessions only. Flags mark days a step was added.</p>
          <AccuracyChart
            series={[
              { key: "chords", label: "Chords", color: "var(--series-1)", points: chordSeries },
              { key: "notes", label: "Single notes", color: "var(--series-2)", points: noteSeries },
            ]}
            markers={markers}
          />
        </Card>
        <Card
          title="Which chords get mixed up"
          action={
            notesUnlocked ? (
              <div role="radiogroup" aria-label="Matrix" className="flex rounded-lg border border-line p-0.5 text-sm">
                {(["chords", "notes"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={matrixMode === m}
                    onClick={() => setMatrixMode(m)}
                    className={`rounded-md px-2.5 py-1 ${matrixMode === m ? "bg-ink text-bg" : "text-muted"}`}
                  >
                    {m === "chords" ? "Chords" : "Single notes"}
                  </button>
                ))}
              </div>
            ) : undefined
          }
        >
          {mixups.length > 0 && (
            <p className="mb-3 text-sm">
              Most common:{" "}
              {mixups.map((m, i) => (
                <span key={`${m.played}-${m.chosen}`}>
                  {i > 0 && "; "}
                  {nameOf(m.played)} heard as {nameOf(m.chosen)} ({m.count}×)
                </span>
              ))}
            </p>
          )}
          <ConfusionMatrix
            matrix={matrix}
            items={
              showNotes
                ? SINGLE_NOTE_IDS.map((id) => ({ id, label: id }))
                : chords.map((c) => ({
                    id: c.id,
                    label: c.colorName,
                    icon: (
                      <span className="inline-block h-6 w-6 shrink-0">
                        <Flag chord={c} showPattern={settings.flagPatterns} className="h-full w-full" />
                      </span>
                    ),
                  }))
            }
          />
        </Card>
      </section>

      <ConfirmDialog
        open={confirming !== null}
        title={confirming ? `${describeStep(confirming)}?` : ""}
        confirmLabel={confirming ? describeStep(confirming) : "Confirm"}
        onCancel={() => setConfirming(null)}
        onConfirm={async () => {
          if (confirming) await confirmStep(profile.id, confirming);
          setConfirming(null);
        }}
      >
        {confirming?.type === "add-chord" ? (
          <>
            <p>
              From the next session, {getChord(confirming.chordId).colorName.toLowerCase()} joins the mix ({chords.length + 1} chords), in random order.
            </p>
            <p>The {MIN_DAYS_ON_SET}-day clock and the 100% streak start over for the new set.</p>
          </>
        ) : (
          <>
            <p>After each correct chord, the app will play its notes one at a time and show their fixed-do syllables (do re mi…) on the flag.</p>
            <p>Single-note mode becomes available on the home screen. Its sessions decide when this stage is mastered.</p>
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}

function ChecklistItem({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${done ? "border-good bg-good text-white" : "border-line"}`}
        aria-hidden="true"
      >
        {done && <CheckIcon className="h-3 w-3" />}
      </span>
      <span>
        <span className="sr-only">{done ? "Done: " : "Not yet: "}</span>
        {children}
      </span>
    </li>
  );
}
