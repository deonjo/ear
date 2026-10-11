"use client";

import { useId, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Flag } from "@/components/Flag";
import { ParentGate } from "@/components/ParentGate";
import { Card, ParentShell } from "@/components/ParentShell";
import { ProfileSwitcher } from "@/components/parent/ProfileBits";
import { downloadJson, exportBackup, importBackup } from "@/lib/backup";
import { CHORDS } from "@/lib/chords";
import { canChangeStageOrder } from "@/lib/curriculum";
import { dayKey } from "@/lib/dates";
import { useActiveProfile } from "@/lib/hooks";
import { deleteProfile, renameProfile, resetProfile, updateSettings } from "@/lib/repo";
import { SETTINGS_LIMITS, type Profile, type ProfileSettings } from "@/lib/types";

export default function SettingsPage() {
  return (
    <ParentShell>
      <ParentGate>
        <Settings />
      </ParentGate>
    </ParentShell>
  );
}

function Settings() {
  const { loading, profiles, profile } = useActiveProfile();
  if (loading) return <p className="text-muted">Loading…</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      {profile ? (
        <>
          <ProfileSwitcher profiles={profiles} active={profile} />
          <ProfileSettingsForm key={profile.id} profile={profile} />
        </>
      ) : (
        <p className="text-muted">Add a child on the home screen to change their settings.</p>
      )}
      <BackupCard />
    </div>
  );
}

function ProfileSettingsForm({ profile }: { profile: Profile }) {
  const s = profile.settings;
  const set = (patch: Partial<ProfileSettings>) => void updateSettings(profile.id, patch);
  const orderLocked = !canChangeStageOrder(profile.events);
  const [name, setName] = useState(profile.name);
  const [dialog, setDialog] = useState<"reset" | "delete" | null>(null);

  return (
    <>
      <Card title={`${profile.name}'s sessions`}>
        <div className="space-y-6">
          <label className="flex flex-col gap-1">
            <span className="font-medium">Name</span>
            <span className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => void renameProfile(profile.id, name)}
                maxLength={40}
                className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-ink"
              />
            </span>
          </label>

          <Slider
            label="Chords per session"
            hint="The target number of tries. Never fewer than the chords in play, so each one comes up at least once."
            value={s.sessionLength}
            {...SETTINGS_LIMITS.sessionLength}
            onChange={(v) => set({ sessionLength: v })}
          />
          <Slider label="Daily goal" hint="Sessions per day. Four or five short ones work better than one long one." value={s.dailyGoal} {...SETTINGS_LIMITS.dailyGoal} onChange={(v) => set({ dailyGoal: v })} />
          <Slider
            label="Perfect sessions needed to advance"
            hint="How many of the most recent completed sessions must all be 100% (on top of at least 14 days on the set)."
            value={s.perfectSessionsRequired}
            {...SETTINGS_LIMITS.perfectSessionsRequired}
            onChange={(v) => set({ perfectSessionsRequired: v })}
          />

          <Toggle
            label="Show stars for correct answers"
            hint="Your child sees a star in the progress row for each correct answer. Missed answers just fill in, never a red mark."
            checked={s.showStars}
            onChange={(v) => set({ showStars: v })}
          />
          <div>
            <Toggle
              label="Colorblind-friendly patterns on flags"
              hint="Adds a distinct pattern to each flag so colors that look alike can still be told apart."
              checked={s.flagPatterns}
              onChange={(v) => set({ flagPatterns: v })}
            />
            <div className="mt-3 flex flex-wrap gap-1" aria-hidden="true">
              {CHORDS.map((c) => (
                <span key={c.id} className="h-10 w-10">
                  <Flag chord={c} showPattern={s.flagPatterns} className="h-full w-full" />
                </span>
              ))}
            </div>
          </div>

          <fieldset disabled={orderLocked} className="disabled:opacity-60">
            <legend className="font-medium">After the nine white-key chords</legend>
            <p className="mt-1 text-sm text-muted">
              Published descriptions of the method differ on which comes next. {orderLocked && "This can't change now that a later stage has started."}
            </p>
            <div className="mt-2 space-y-2">
              {(
                [
                  ["notes-first", "Note names first, then black-key chords"],
                  ["black-first", "Black-key chords first, then note names"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                  <input type="radio" name="order" value={value} checked={s.stageOrder === value} onChange={() => set({ stageOrder: value })} className="h-4 w-4 accent-[var(--accent)]" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Card>

      <Card title="Start over">
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setDialog("reset")} className="rounded-xl border border-danger px-4 py-2.5 font-medium text-danger hover:bg-danger-soft">
            Reset {profile.name}&apos;s progress
          </button>
          <button type="button" onClick={() => setDialog("delete")} className="rounded-xl border border-line px-4 py-2.5 font-medium text-muted hover:bg-surface-2">
            Delete this profile
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">Export a backup first if you might want this history later.</p>
      </Card>

      <ConfirmDialog
        open={dialog === "reset"}
        title={`Reset ${profile.name}'s progress?`}
        confirmLabel="Reset progress"
        tone="danger"
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          await resetProfile(profile.id);
          setDialog(null);
        }}
      >
        <p>All sessions are deleted and training starts again from red alone. The name and settings stay.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "delete"}
        title={`Delete ${profile.name}?`}
        confirmLabel="Delete profile"
        tone="danger"
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          await deleteProfile(profile.id);
          setDialog(null);
        }}
      >
        <p>The profile and its whole history are removed from this device. This can&apos;t be undone.</p>
      </ConfirmDialog>
    </>
  );
}

function BackupCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: "good" | "danger"; text: string } | null>(null);
  return (
    <Card title="Backup">
      <p className="text-sm text-muted">
        Your data lives only in this browser. Export a backup file now and then, and keep it somewhere safe. Importing merges the file into what&apos;s here (records
        with the same id are replaced).
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={async () => downloadJson(await exportBackup(), `chord-flags-backup-${dayKey(Date.now())}.json`)}
          className="rounded-xl bg-accent px-4 py-2.5 font-semibold text-accent-ink"
        >
          Export backup (JSON)
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-line px-4 py-2.5 font-medium hover:bg-surface-2">
          Import backup…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              const result = await importBackup(JSON.parse(await file.text()));
              setMessage({ tone: "good", text: `Imported ${result.profiles} profile(s) and ${result.sessions} session(s).` });
            } catch (err) {
              setMessage({ tone: "danger", text: err instanceof SyntaxError ? "That file isn't valid JSON." : err instanceof Error ? err.message : "Import failed." });
            }
          }}
        />
      </div>
      {message && (
        <p role="status" className={`mt-3 text-sm ${message.tone === "good" ? "text-good" : "text-danger"}`}>
          {message.text}
        </p>
      )}
    </Card>
  );
}

function Slider({ label, hint, value, min, max, onChange }: { label: string; hint: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <output htmlFor={id} className="text-xl font-semibold tabular-nums">
          {value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--accent)]"
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
        {hint}
      </p>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-hint`}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-line"}`}
      >
        <span className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
