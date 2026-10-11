"use client";

import { useState } from "react";
import { HabitCalendar } from "@/components/charts/HabitCalendar";
import { CheckIcon } from "@/components/Icons";
import { ParentGate } from "@/components/ParentGate";
import { Card, ParentShell } from "@/components/ParentShell";
import { ProfileSwitcher } from "@/components/parent/ProfileBits";
import { useActiveProfile, useNow, useSessions } from "@/lib/hooks";
import { dailyHistory, sessionScore, streaks } from "@/lib/stats";

const MODE_LABEL = { chords: "Flags", piano: "Real piano", notes: "Single notes" } as const;
const PAGE = 50;
const WEEKS = 20;

export default function HistoryPage() {
  return (
    <ParentShell wide>
      <ParentGate>
        <History />
      </ParentGate>
    </ParentShell>
  );
}

function History() {
  const { loading, profiles, profile } = useActiveProfile();
  const sessions = useSessions(profile?.id);
  const now = useNow();
  const [shown, setShown] = useState(PAGE);

  if (loading || !sessions) return <p className="text-muted">Loading…</p>;
  if (!profile) return <p className="text-muted">Add a child on the home screen first.</p>;

  const goal = profile.settings.dailyGoal;
  const s = streaks(sessions, goal, now);
  const days = dailyHistory(sessions, WEEKS * 7, now);
  const log = [...sessions].filter((x) => x.trials.length > 0).reverse();
  const totalTrials = log.reduce((n, x) => n + x.trials.length, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">History</h1>
      <ProfileSwitcher profiles={profiles} active={profile} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Current streak" value={`${s.current} day${s.current === 1 ? "" : "s"}`} note="Days in a row with a completed session" />
        <Stat label="Best streak" value={`${s.longest} day${s.longest === 1 ? "" : "s"}`} />
        <Stat label="Daily goal met" value={`${s.goalDays} day${s.goalDays === 1 ? "" : "s"}`} note={`Goal: ${goal} sessions`} />
        <Stat label="Completed sessions" value={String(s.completedSessions)} note={`${s.practiceDays} practice days · ${totalTrials} answers`} />
      </div>

      <Card title={`Practice calendar · last ${WEEKS} weeks`}>
        <HabitCalendar days={days} goal={goal} now={now} />
        <p className="mt-3 text-sm text-muted">
          Short and often beats long and rare. Attaching sessions to things that already happen every day (breakfast, getting dressed, bath, bedtime) is the
          easiest way to keep the streak going.
        </p>
      </Card>

      <Card title="All sessions">
        {log.length === 0 ? (
          <p className="text-sm text-muted">No sessions yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="py-2 pr-3 font-medium">When</th>
                    <th className="py-2 pr-3 font-medium">Mode</th>
                    <th className="py-2 pr-3 font-medium">In play</th>
                    <th className="py-2 pr-3 text-right font-medium">Score</th>
                    <th className="py-2 pr-3 text-right font-medium">Length</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {log.slice(0, shown).map((x) => {
                    const score = sessionScore(x);
                    const mins = Math.max(1, Math.round((x.endedAt - x.startedAt) / 60_000));
                    return (
                      <tr key={x.id} className="border-t border-line">
                        <td className="py-2 pr-3">
                          {new Date(x.startedAt).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </td>
                        <td className="py-2 pr-3">{MODE_LABEL[x.mode]}</td>
                        <td className="py-2 pr-3">{x.itemsInPlay.length}</td>
                        <td className="py-2 pr-3 text-right">
                          <strong>
                            {score.correct}/{score.total}
                          </strong>{" "}
                          <span className="text-muted">({score.pct}%)</span>
                        </td>
                        <td className="py-2 pr-3 text-right text-muted">~{mins} min</td>
                        <td className="py-2">
                          {x.completed ? (
                            <span className="inline-flex items-center gap-1">
                              {score.perfect && <CheckIcon className="h-4 w-4 text-good" />}
                              Completed
                            </span>
                          ) : (
                            <span className="text-muted">
                              Ended early ({x.trials.length}/{x.targetCount})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {log.length > shown && (
              <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-3 rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-surface-2">
                Show more ({log.length - shown} older)
              </button>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-sm text-muted">{label}</h2>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
      {note && <p className="mt-1 text-sm text-muted">{note}</p>}
    </section>
  );
}
